// app.js - adds password-based login (client-only, uses SubtleCrypto SHA-256 for hashing)
// 3-file project: index.html, style.css, app.js
(function(){
  'use strict';

  // Helpers
  const $ = (s, ctx=document) => ctx.querySelector(s);
  const $$ = (s, ctx=document) => Array.from((ctx||document).querySelectorAll(s));
  const ITEMS_KEY = 'ims_v5_items';
  const SESSION_KEY = 'ims_v5_session';
  const USERS_KEY = 'ims_v5_users';

  // DOM refs
  const loginScreen = $('#loginScreen');
  const tabSignIn = $('#tabSignIn');
  const tabRegister = $('#tabRegister');
  const signInForm = $('#signInForm');
  const registerForm = $('#registerForm');
  const loginSubmit = $('#loginSubmit');
  const registerSubmit = $('#registerSubmit');
  const loginEmailMain = $('#loginEmailMain');
  const loginPasswordMain = $('#loginPasswordMain');
  const regEmailMain = $('#regEmailMain');
  const regPasswordMain = $('#regPasswordMain');
  const regRoleMain = $('#regRoleMain');
  const regError = $('#regError');

  const mainHeader = $('#mainHeader');
  const dashboard = $('#dashboard');
  const mainContent = $('#mainContent');
  const footer = $('#footer');
  const roleBadge = $('#roleBadge');
  const signOutBtn = $('#signOutBtn');
  const sessionInfo = $('#sessionInfo');

  const addBtn = $('#addBtn');
  const searchInput = $('#searchInput');
  const categoryFilter = $('#categoryFilter');
  const sortSelect = $('#sortSelect');
  const listContainer = $('#listContainer');
  const tableWrapper = $('#tableWrapper');
  const tableBody = $('#tableBody');
  const modal = $('#modal');
  const itemForm = $('#itemForm');
  const cancelBtn = $('#cancelBtn');
  const modalTitle = $('#modalTitle');
  const dashboardFeatures = $('#dashboardFeatures');

  const themeToggle = $('#themeToggle');
  const THEME_KEY = 'ims_v5_theme';
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  function applyTheme(explicit){ const t = explicit ?? localStorage.getItem(THEME_KEY) ?? (prefersDark?'dark':'light'); document.documentElement.setAttribute('data-theme', t==='dark'?'dark':'light'); localStorage.setItem(THEME_KEY,t); themeToggle.textContent = t==='dark'?'Light':'Dark'; }
  themeToggle.addEventListener('click', ()=>{ const cur = document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light'; applyTheme(cur==='dark'?'light':'dark'); });
  applyTheme();

  // State
  let items = [];
  let editingId = null;

  // Default items
  const defaultItems = [
    {id: genId(), name:'USB-C Cable', sku:'CAB-001', description:'1m braided cable', price:4.99, stock:120, reorder:20, archived:false},
    {id: genId(), name:'Wireless Mouse', sku:'MSE-202', description:'Bluetooth mouse', price:15.5, stock:7, reorder:10, archived:false},
    {id: genId(), name:'Laptop Stand', sku:'STD-55', description:'Adjustable stand', price:29.99, stock:3, reorder:5, archived:false},
  ];

  // Initialize users + default admin
  (async function ensureUsers(){
    const users = loadUsers();
    if(!users || users.length === 0){
      // create default admin with password admin123
      const hash = await sha256Hex('admin123');
      const admin = { email: 'admin@example.com', passwordHash: hash, role: 'admin', createdAt: Date.now() };
      saveUsers([admin]);
      console.info('Created default admin: admin@example.com / admin123');
    }
  })();

  // Load items from storage on startup
  setTimeout(()=>{ const loaded = loadItems(); if(!loaded){ items = defaultItems.slice(); saveItems(items); } else items = loaded.slice(); }, 200);

  // AUTH UI tabs
  tabSignIn.addEventListener('click', ()=>{ signInForm.style.display='block'; registerForm.style.display='none'; });
  tabRegister.addEventListener('click', ()=>{ signInForm.style.display='none'; registerForm.style.display='block'; });

  // Registration handler
  registerSubmit.addEventListener('click', async ()=>{
    regError.textContent = '';
    const email = (regEmailMain.value || '').trim().toLowerCase();
    const pwd = regPasswordMain.value || '';
    const role = regRoleMain.value || 'viewer';
    if(!email || !pwd){ regError.textContent = 'Email and password required'; return; }
    try{
      await registerUser(email, pwd, role);
      alert('Registered and signed in as ' + email + ' ('+role+')');
      // proceed to dashboard
      postLogin({ email, role });
    }catch(err){
      regError.textContent = err.message;
    }
  });

  // Login handler
  loginSubmit.addEventListener('click', async ()=>{
    const email = (loginEmailMain.value || '').trim().toLowerCase();
    const pwd = loginPasswordMain.value || '';
    if(!email || !pwd){ alert('Enter email and password'); return; }
    try{
      const user = await loginUser(email, pwd);
      postLogin({ email: user.email, role: user.role });
    }catch(err){
      alert('Login failed: ' + err.message);
    }
  });

  // Post-login: hide login screen, show dashboard and store session
  function postLogin(session){
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: session.email, role: session.role, ts: Date.now() }));
    loginScreen.style.display = 'none';
    mainHeader.style.display = 'flex';
    dashboard.style.display = 'block';
    mainContent.style.display = 'block';
    footer.style.display = 'block';
    updateSessionUI();
    render();
  }

  // Sign out
  signOutBtn.addEventListener('click', ()=>{
    localStorage.removeItem(SESSION_KEY);
    // show login screen
    loginScreen.style.display = 'flex';
    mainHeader.style.display = 'none';
    dashboard.style.display = 'none';
    mainContent.style.display = 'none';
    footer.style.display = 'none';
    // clear login inputs
    loginEmailMain.value = '';
    loginPasswordMain.value = '';
  });

  // Update session UI & dashboard features
  function updateSessionUI(){
    const s = getSession();
    if(!s){ sessionInfo.textContent = 'Not signed in'; signOutBtn.style.display='none'; roleBadge.textContent=''; dashboardFeatures.innerHTML=''; }
    else { sessionInfo.textContent = s.email + ' ('+s.role+')'; signOutBtn.style.display='inline-block'; roleBadge.textContent = s.role.toUpperCase(); updateDashboardFeatures(); }
    secureUI();
  }

  function updateDashboardFeatures(){
    const role = currentRole() || 'none';
    const total = items.filter(i=> !i.archived).length;
    const archived = items.filter(i=> i.archived).length;
    let html = '<strong>Role:</strong> '+role.toUpperCase() + ' &nbsp; ';
    if(role === 'admin') html += '<span class="muted-small">Admin: full access (create/edit/delete/archive)</span>';
    if(role === 'manager') html += '<span class="muted-small">Manager: create & edit (no delete)</span>';
    if(role === 'viewer') html += '<span class="muted-small">Viewer: read-only</span>';
    html += '<div style="margin-top:6px"><strong>Total items:</strong> '+total+' • <strong>Archived:</strong> '+archived+'</div>';
    dashboardFeatures.innerHTML = html;
  }

  // Permissions
  function currentRole(){ const s = getSession(); return s?.role ?? null; }
  function hasPermission(action){ const role = currentRole(); if(!role) return false; if(role==='admin') return true; if(role==='manager') return (action==='create'||action==='read'||action==='update'); if(role==='viewer') return action==='read'; return false; }

  // Secure UI controls
  function secureUI(){
    addBtn.disabled = !hasPermission('create');
    $$('button[data-action="delete"]').forEach(b=> b.disabled = !hasPermission('delete'));
    $$('button[data-action="edit"]').forEach(b=> b.disabled = !hasPermission('update'));
    $$('button[data-action="archive"]').forEach(b=> b.disabled = !hasPermission('update'));
  }

  // Render items (archived only in archive view)
  function render(){
    const wide = window.matchMedia('(min-width:880px)').matches;
    const q = (searchInput.value||'').trim().toLowerCase();
    const category = categoryFilter.value;
    const sortOpt = sortSelect.value;
    let visible = items.slice();

    if(category === 'all') visible = visible.filter(i=> !i.archived);
    else if(category === 'archived') visible = visible.filter(i=> i.archived);
    else if(category === 'low') visible = visible.filter(i=> !i.archived && Number(i.stock) <= Number(i.reorder));

    if(q) visible = visible.filter(it=> (it.name+' '+it.sku+' '+(it.description||'')).toLowerCase().includes(q));

    switch(sortOpt){
      case 'name_asc': visible.sort((a,b)=>a.name.localeCompare(b.name)); break;
      case 'name_desc': visible.sort((a,b)=>b.name.localeCompare(a.name)); break;
      case 'price_asc': visible.sort((a,b)=>a.price - b.price); break;
      case 'price_desc': visible.sort((a,b)=>b.price - a.price); break;
      case 'stock_asc': visible.sort((a,b)=>a.stock - b.stock); break;
      case 'stock_desc': visible.sort((a,b)=>b.stock - a.stock); break;
    }

    if(wide){
      tableWrapper.style.display = 'block'; listContainer.style.display = 'none'; tableBody.innerHTML='';
      visible.forEach(it=>{
        const tr = document.createElement('tr'); tr.dataset.id = it.id;
        tr.innerHTML = `
          <td><strong>${escapeHtml(it.name)}</strong><div class="meta">${escapeHtml(it.description||'')}</div></td>
          <td>${escapeHtml(it.sku)}</td>
          <td>$${Number(it.price).toFixed(2)}</td>
          <td>${it.stock}</td>
          <td><div class="badges">${it.archived?'<span class="badge archived">Archived</span>':''}${(!it.archived && Number(it.stock) <= Number(it.reorder)?'<span class="badge low">Low Stock</span>':'')}</div></td>
          <td class="actions"><button data-action="edit" class="btn">Edit</button><button data-action="archive" class="btn ghost">${it.archived?'Unarchive':'Archive'}</button><button data-action="delete" class="btn">Delete</button></td>
        `;
        tableBody.appendChild(tr);
      });
    } else {
      tableWrapper.style.display = 'none'; listContainer.style.display = 'grid'; listContainer.innerHTML='';
      visible.forEach(it=>{
        const card = document.createElement('article'); card.className='card'; card.dataset.id = it.id;
        card.innerHTML = `
          <h3>${escapeHtml(it.name)} <span class="muted">${escapeHtml(it.sku)}</span></h3>
          <div class="meta">${escapeHtml(it.description||'')}</div>
          <div class="flex"><div class="muted-small">Price: $${Number(it.price).toFixed(2)}</div><div class="muted-small">Stock: ${it.stock}</div><div class="spacer"></div><div class="badges">${it.archived?'<span class="badge archived">Archived</span>':''}${(!it.archived && Number(it.stock) <= Number(it.reorder)?'<span class="badge low">Low Stock</span>':'')}</div></div>
          <div class="actions"><button data-action="edit" class="btn">Edit</button><button data-action="archive" class="btn ghost">${it.archived?'Unarchive':'Archive'}</button><button data-action="delete" class="btn">Delete</button></div>
        `;
        listContainer.appendChild(card);
      });
    }
    updateSessionUI();
    secureUI();
  }

  // Event delegation for edit/archive/delete
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const action = btn.dataset.action;
    const parent = btn.closest('[data-id]');
    if(!parent) return;
    const id = parent.dataset.id;
    const item = items.find(x=>x.id===id);
    if(!item) return;

    if(action === 'edit'){
      if(!hasPermission('update')){ showForbidden(); return; }
      openForm(item);
    } else if(action === 'archive'){
      if(!hasPermission('update')){ showForbidden(); return; }
      item.archived = !item.archived;
      saveItems(items); render(); showNotice(item.archived ? 'Moved to archive' : 'Restored from archive');
    } else if(action === 'delete'){
      if(!hasPermission('delete')){ showForbidden(); return; }
      if(!confirm('Delete item permanently? This cannot be undone.')) return;
      items = items.filter(x=>x.id!==id);
      saveItems(items); render(); showNotice('Deleted');
    }
  });

  // Add/Edit form
  addBtn.addEventListener('click', ()=>{ if(!hasPermission('create')){ showForbidden(); return; } openForm(); });
  function openForm(item){
    editingId = item?.id ?? null;
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
    $('#name').value = item?.name ?? '';
    $('#sku').value = item?.sku ?? '';
    $('#description').value = item?.description ?? '';
    $('#price').value = item?.price ?? '';
    $('#stock').value = item?.stock ?? '';
    $('#reorder').value = item?.reorder ?? '';
    modalTitle.textContent = editingId ? 'Edit Item' : 'Add Item';
    $('#forbiddenNotice').style.display = hasPermission(editingId ? 'update' : 'create') ? 'none' : 'block';
  }
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
  function closeModal(){ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); itemForm.reset(); editingId = null; }

  // Validation & submit
  function validateForm(){
    const name = $('#name').value.trim(); const sku = $('#sku').value.trim();
    const price = Number($('#price').value); const stock = Number($('#stock').value); const reorder = Number($('#reorder').value);
    $('#nameError').textContent = name ? '' : 'Name required';
    $('#skuError').textContent = sku ? '' : 'SKU required';
    $('#priceError').textContent = (isNaN(price) || price <= 0) ? 'Price must be a positive number' : '';
    $('#stockError').textContent = (isNaN(stock) || stock < 0) ? 'Stock must be zero or greater' : '';
    $('#reorderError').textContent = (isNaN(reorder) || reorder < 0) ? 'Reorder threshold must be zero or greater' : '';
    return !($('#nameError').textContent||$('#skuError').textContent||$('#priceError').textContent||$('#stockError').textContent||$('#reorderError').textContent);
  }
  itemForm.addEventListener('input', ()=>{ validateForm(); });
  itemForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    if(!hasPermission(editingId ? 'update' : 'create')){ $('#forbiddenNotice').style.display = 'block'; return; }
    if(!validateForm()) return;
    const payload = {
      id: editingId ?? genId(),
      name: $('#name').value.trim(),
      sku: $('#sku').value.trim(),
      description: $('#description').value.trim(),
      price: Number($('#price').value),
      stock: Number($('#stock').value),
      reorder: Number($('#reorder').value),
      archived: false
    };
    if(editingId){
      const idx = items.findIndex(x=>x.id===editingId); if(idx>=0) items[idx] = {...items[idx], ...payload}; showNotice('Saved');
    } else { items.unshift(payload); showNotice('Created'); }
    saveItems(items); render(); closeModal();
  });

  // Search + filters + sort (debounced)
  const debouncedRender = debounce(()=>render(), 200);
  searchInput.addEventListener('input', debouncedRender);
  categoryFilter.addEventListener('change', render);
  sortSelect.addEventListener('change', render);

  // Double click to edit card
  listContainer.addEventListener('dblclick', (e)=>{
    const card = e.target.closest('.card'); if(!card) return;
    const id = card.dataset.id; const it = items.find(x=>x.id===id);
    if(it && hasPermission('update')) openForm(it);
  });

  // Keyboard escape to close modal
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ if(modal.classList.contains('open')) closeModal(); } });

  // Storage helpers
  function saveItems(list){ localStorage.setItem(ITEMS_KEY, JSON.stringify(list)); }
  function loadItems(){ try{ const r = localStorage.getItem(ITEMS_KEY); if(!r) return null; return JSON.parse(r);}catch(e){return null} }

  function loadUsers(){ try{ const r = localStorage.getItem(USERS_KEY); if(!r) return []; return JSON.parse(r);}catch(e){return []} }
  function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

  function getSession(){ try{ const r = localStorage.getItem(SESSION_KEY); if(!r) return null; return JSON.parse(r);}catch(e){return null} }

  // User functions: sha256 hashing via SubtleCrypto
  async function sha256Hex(message){
    const enc = new TextEncoder().encode(message);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function registerUser(email, password, role){
    const users = loadUsers();
    if(users.find(u=>u.email === email)) throw new Error('Email already registered');
    const hash = await sha256Hex(password);
    const user = { email, passwordHash: hash, role, createdAt: Date.now() };
    users.push(user); saveUsers(users);
    // set session
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, role: user.role, ts: Date.now() }));
    // ensure items loaded and render
    const loaded = loadItems(); if(!loaded){ items = defaultItems.slice(); saveItems(items); } else items = loaded.slice();
    return user;
  }

  async function loginUser(email, password){
    const users = loadUsers();
    const u = users.find(x=>x.email === email);
    if(!u) throw new Error('No such user');
    const hash = await sha256Hex(password);
    if(hash !== u.passwordHash) throw new Error('Invalid credentials');
    localStorage.setItem(SESSION_KEY, JSON.stringify({ email: u.email, role: u.role, ts: Date.now() }));
    // ensure items loaded
    const loaded = loadItems(); if(!loaded){ items = defaultItems.slice(); saveItems(items); } else items = loaded.slice();
    return u;
  }

  // Helpers
  function genId(){ return 'id_'+Math.random().toString(36).slice(2,9); }
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function showNotice(text){ const el = document.createElement('div'); el.className='sheet'; el.style.position='fixed'; el.style.right='12px'; el.style.bottom='12px'; el.style.zIndex=9999; el.style.padding='10px'; el.textContent=text; document.body.appendChild(el); setTimeout(()=>el.remove(),1800); }
  function showForbidden(){ const el = document.createElement('div'); el.className='field-error'; el.textContent='403 Forbidden — your role cannot do that.'; document.body.appendChild(el); setTimeout(()=>el.remove(),2000); }
  function debounce(fn, ms=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }

  // Initial UI: if session exists, show dashboard; else show login screen
  (function init(){
    const s = getSession();
    if(s){ loginScreen.style.display='none'; mainHeader.style.display='flex'; dashboard.style.display='block'; mainContent.style.display='block'; footer.style.display='block'; updateSessionUI(); render(); }
    else { loginScreen.style.display='flex'; mainHeader.style.display='none'; dashboard.style.display='none'; mainContent.style.display='none'; footer.style.display='none'; }
  })();

  function updateSessionUI(){ const s = getSession(); if(!s){ sessionInfo.textContent='Not signed in'; signOutBtn.style.display='none'; roleBadge.textContent=''; } else { sessionInfo.textContent = s.email + ' ('+s.role+')'; signOutBtn.style.display='inline-block'; roleBadge.textContent = s.role.toUpperCase(); } secureUI(); updateDashboardFeatures(); }

})();
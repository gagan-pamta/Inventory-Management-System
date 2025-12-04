📦 Inventory Management Web App
🔥 Overview

A fully client-side Inventory Management System built using HTML, CSS, and Vanilla JavaScript.
Mobile-first, responsive, with a complete login system, CRUD, dark mode, filters, sorting, and role-based access.

🔐 Authentication System
Email + Password Login

Users register with email, password, and role.

Users can sign in after registration.

Passwords are hashed using SHA-256 before saving (demo only).

Default Admin Account
Email: admin@example.com
Password: admin123

Roles & Permissions
Role	Add	Edit	Archive	Delete	View
Admin	✔️	✔️	✔️	✔️	✔️
Manager	✔️	✔️	✔️	❌	✔️
Viewer	❌	❌	❌	❌	✔️

Buttons automatically hide/disable based on role.

Forbidden actions show a 403-style warning.

📁 Inventory Management
CRUD (Create, Read, Update, Delete)

Add new items

Edit existing items

Delete items (admin only)

Archive items (hidden from main list)

Item Structure

Each item contains:

name

sku

description

price

stockQuantity

reorderThreshold

Low Stock Badge

Displayed automatically when:

stockQuantity <= reorderThreshold

🔍 Search, Filters & Sorting
Powerful Search

Debounced search across:

Name

SKU

Description

Filters

All Items

Archived Items

Low Stock

Sorting Options

Name (A–Z / Z–A)

Price (Low–High / High–Low)

Stock (Low–High / High–Low)

🎨 UI / UX Features
Responsive Layout

Mobile → Card view

Desktop → Table/grid layout

Dark Mode

Auto-detects system preference

User choice stored in localStorage

Accessibility

Keyboard-friendly

ESC closes modals

ARIA labels applied

Focus outlines visible

Extra UI Features

Skeleton loading screens

Inline form validation

Clean modal UI

Smooth interactions

🛠️ Technology Stack
Core Tech

HTML5

CSS3 (Flexbox, Grid, Dark Mode)

JavaScript (Vanilla)

Browser Features Used

localStorage

Event Delegation

SubtleCrypto (SHA-256 hashing)

Debounce logic

📂 Project Structure
inventory-app/
 ├── index.html      # UI layout + login screen + dashboard
 ├── style.css       # Full design + responsive + dark mode
 └── app.js          # All logic (auth + CRUD + filters + rendering)

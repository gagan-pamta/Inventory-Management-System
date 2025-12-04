Inventory Management Web App
Overview

This project is a fully client-side Inventory Management System built using HTML, CSS, and vanilla JavaScript, following a mobile-first and responsive design.
It includes CRUD operations, a login system with role-based permissions, dark mode, filters, sorting, and localStorage persistence.

Features
## Authentication (Email + Password)

Users can Register with email, password, and a role.

Users can Sign In using email & password.

Passwords are hashed using SHA-256 (browser SubtleCrypto) before being saved.

Default admin is auto-created:

Email: admin@example.com
Password: admin123


User session is stored in localStorage.

## Role-Based Access
Role	Add	Edit	Archive	Delete	View
Admin	✔️	✔️	✔️	✔️	✔️
Manager	✔️	✔️	✔️	❌	✔️
Viewer	❌	❌	❌	❌	✔️

UI hides or disables buttons depending on user role.

Forbidden actions trigger a 403-style message.

Inventory Management
## CRUD Operations

Create new inventory items

Edit existing items

Archive items (removes them from main display)

Delete items (admin only)

Confirm dialogs before destructive actions

## Item Fields

Each item contains:

name

sku

description

price

stockQuantity

reorderThreshold

## Low Stock Indicators

Items automatically get a Low Stock badge when:

stockQuantity <= reorderThreshold

## Search, Filters & Sorting

Debounced search (name, SKU, description)

Category filters:

All

Archived

Low Stock

Sorting options:

Name ↑/↓

Price ↑/↓

Stock ↑/↓

UI & Experience
## Responsive Layout

Mobile → Card layout

Desktop → Table/grid layout

## Dark Mode

Follows system preference by default

User selection stored in localStorage

## Accessibility

Keyboard navigable

ESC closes modals

ARIA labels used across UI

Focus-visible outlines included

## UX Enhancements

Skeleton loaders on first load

Inline validation for price & stock

Clean confirmation dialogs

Smooth transitions

Technology Stack
## Frontend

HTML5

CSS3

Grid, Flexbox

CSS Variables

Dark Mode

JavaScript (Vanilla)

localStorage persistence

SHA-256 hashing

Event delegation

Debounce utilities

## Project Structure
inventory-app/
 ├── index.html
 ├── style.css
 └── app.js

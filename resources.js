// ============================================================================
// CESS — resources.js
// Reads the `resources` Firestore collection and renders it on:
//   - index.html      (#featuredResources)
//   - resources.html  (#resourcesList, with search + category filter)
//
// Expected resource document shape (collection: resources):
// {
//   title, description, category, fileUrl (Google Drive link),
//   date (Timestamp), author, visibility: 'public' | 'member'
// }
//
// Visibility handling:
//   - Public pages only ever request/display resources where
//     visibility == 'public'. Member-only resources are shown in the
//     member dashboard (member-dashboard.js) after login, and are
//     protected server-side by Firestore Security Rules regardless of
//     what this file requests.
// ============================================================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function resourceCardHTML(r) {
  return `
    <div class="card">
      <span class="card-tag">${r.category || 'General'}</span>
      <h3>${r.title || 'Untitled resource'}</h3>
      <p>${(r.description || '').slice(0, 100)}${r.description && r.description.length > 100 ? '…' : ''}</p>
      <div class="card-meta">
        <span>${r.author || 'CESS'}</span>
        <span>${formatDate(r.date)}</span>
      </div>
      ${r.fileUrl ? `<a href="${r.fileUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-small mt-1">Open resource</a>` : ''}
    </div>
  `;
}

function emptyState(message) {
  return `<div class="state-block">${message}</div>`;
}
function errorState(message) {
  return `<div class="state-block" style="border-color: var(--color-alert); color: var(--color-alert);">${message}</div>`;
}

// ---------------------------------------------------------------------------
// Homepage: 3 featured public resources
// ---------------------------------------------------------------------------
async function renderFeaturedResources() {
  const el = document.getElementById('featuredResources');
  if (!el) return;
  try {
    const q = query(
      collection(db, 'resources'),
      where('visibility', '==', 'public'),
      orderBy('date', 'desc'),
      limit(3)
    );
    const snap = await getDocs(q);
    el.innerHTML = snap.empty
      ? emptyState('No public resources published yet.')
      : snap.docs.map(d => resourceCardHTML(d.data())).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Resources could not be loaded right now.');
  }
}

// ---------------------------------------------------------------------------
// resources.html: public list with search + category filter
// ---------------------------------------------------------------------------
let allResources = [];

function applyResourceFilters() {
  const list = document.getElementById('resourcesList');
  if (!list) return;

  const term = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
  const category = document.getElementById('resourceCategoryFilter')?.value || '';

  const filtered = allResources.filter(r => {
    const matchesSearch = !term || (r.title || '').toLowerCase().includes(term);
    const matchesCategory = !category || r.category === category;
    return matchesSearch && matchesCategory;
  });

  list.innerHTML = filtered.length > 0
    ? filtered.map(resourceCardHTML).join('')
    : emptyState('No resources match your search or filter.');
}

async function renderResourcesList() {
  const list = document.getElementById('resourcesList');
  if (!list) return;
  try {
    const q = query(
      collection(db, 'resources'),
      where('visibility', '==', 'public'),
      orderBy('date', 'desc')
    );
    const snap = await getDocs(q);
    allResources = snap.docs.map(d => d.data());

    if (allResources.length === 0) {
      list.innerHTML = emptyState('No public resources published yet.');
      return;
    }
    applyResourceFilters();

    document.getElementById('resourceSearch')?.addEventListener('input', applyResourceFilters);
    document.getElementById('resourceCategoryFilter')?.addEventListener('change', applyResourceFilters);
  } catch (err) {
    console.error(err);
    list.innerHTML = errorState('Resources could not be loaded right now. Please try again later.');
  }
}

renderFeaturedResources();
renderResourcesList();

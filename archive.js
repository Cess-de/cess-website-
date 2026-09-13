// ============================================================================
// CESS — archive.js
// Reads the `publicArchive` Firestore collection ONLY. This collection is
// entirely separate from `internalDocuments`, `meetings`, `reports`, and
// `handover` — those are never queried from this file or any public page.
// Firestore Security Rules additionally block public read access to those
// collections, so this separation is enforced twice.
//
// Expected document shape (collection: publicArchive):
// {
//   title, description, category, driveLink, date (Timestamp)
// }
// ============================================================================

import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function archiveCardHTML(a) {
  return `
    <div class="card">
      <span class="card-tag">${a.category || 'General'}</span>
      <h3>${a.title || 'Untitled document'}</h3>
      <p>${a.description || ''}</p>
      <div class="card-meta">
        <span>${formatDate(a.date)}</span>
      </div>
      ${a.driveLink ? `<a href="${a.driveLink}" target="_blank" rel="noopener" class="btn btn-secondary btn-small mt-1">View document</a>` : ''}
    </div>
  `;
}

function emptyState(message) {
  return `<div class="state-block">${message}</div>`;
}
function errorState(message) {
  return `<div class="state-block" style="border-color: var(--color-alert); color: var(--color-alert);">${message}</div>`;
}

let allArchiveItems = [];

function applyArchiveFilters() {
  const list = document.getElementById('archiveList');
  if (!list) return;

  const term = (document.getElementById('archiveSearch')?.value || '').toLowerCase();
  const category = document.getElementById('archiveCategoryFilter')?.value || '';

  const filtered = allArchiveItems.filter(a => {
    const matchesSearch = !term || (a.title || '').toLowerCase().includes(term);
    const matchesCategory = !category || a.category === category;
    return matchesSearch && matchesCategory;
  });

  list.innerHTML = filtered.length > 0
    ? filtered.map(archiveCardHTML).join('')
    : emptyState('No archive items match your search or filter.');
}

async function renderArchive() {
  const list = document.getElementById('archiveList');
  if (!list) return;
  try {
    const q = query(collection(db, 'publicArchive'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    allArchiveItems = snap.docs.map(d => d.data());

    if (allArchiveItems.length === 0) {
      list.innerHTML = emptyState('No public archive items have been published yet.');
      return;
    }
    applyArchiveFilters();

    document.getElementById('archiveSearch')?.addEventListener('input', applyArchiveFilters);
    document.getElementById('archiveCategoryFilter')?.addEventListener('change', applyArchiveFilters);
  } catch (err) {
    console.error(err);
    list.innerHTML = errorState('The archive could not be loaded right now. Please try again later.');
  }
}

renderArchive();

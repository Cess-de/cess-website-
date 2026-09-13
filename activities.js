// ============================================================================
// CESS — activities.js
// Reads the `activities` Firestore collection and renders it on:
//   - index.html      (#latestActivities, top 3, any status)
//   - activities.html (#activitiesList, with search + filters)
//   - activity-details.html (#activityContent, single doc by ?id=)
//
// Expected activity document shape (collection: activities):
// {
//   title, description, date (Timestamp), location, category,
//   imageUrl, status: 'upcoming' | 'ongoing' | 'past',
//   registrationLink, registrationInfo, objectives: [string],
//   gallery: [string urls], driveLink
// }
// ============================================================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, doc, getDoc, query, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function formatDate(ts) {
  if (!ts) return 'Date to be announced';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function statusBadgeClass(status) {
  if (status === 'upcoming') return 'badge-upcoming';
  if (status === 'ongoing') return 'badge-open';
  return 'badge-closed';
}

function activityCardHTML(id, a) {
  return `
    <div class="card">
      <div class="card-media">${a.imageUrl ? `<img src="${a.imageUrl}" alt="${a.title}" loading="lazy">` : '<span>No image</span>'}</div>
      <span class="card-tag">${a.category || 'General'}</span>
      <h3>${a.title || 'Untitled activity'}</h3>
      <p>${(a.description || '').slice(0, 110)}${a.description && a.description.length > 110 ? '…' : ''}</p>
      <div class="card-meta">
        <span>${formatDate(a.date)}</span>
        <span class="badge ${statusBadgeClass(a.status)}">${a.status || 'upcoming'}</span>
      </div>
      <a href="activity-details.html?id=${id}" class="btn btn-secondary btn-small mt-1">View details</a>
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
// Homepage: latest 3 activities
// ---------------------------------------------------------------------------
async function renderLatestActivities() {
  const el = document.getElementById('latestActivities');
  if (!el) return;
  try {
    const q = query(collection(db, 'activities'), orderBy('date', 'desc'), limit(3));
    const snap = await getDocs(q);
    if (snap.empty) {
      el.innerHTML = emptyState('No activities published yet. Check back soon.');
      return;
    }
    el.innerHTML = snap.docs.map(d => activityCardHTML(d.id, d.data())).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Activities could not be loaded right now.');
  }
}

// ---------------------------------------------------------------------------
// activities.html: full list with client-side search/filter
// ---------------------------------------------------------------------------
let allActivities = [];

function applyActivityFilters() {
  const list = document.getElementById('activitiesList');
  if (!list) return;

  const searchTerm = (document.getElementById('activitySearch')?.value || '').toLowerCase();
  const category = document.getElementById('categoryFilter')?.value || '';
  const status = document.getElementById('statusFilter')?.value || '';

  const filtered = allActivities.filter(({ data }) => {
    const matchesSearch = !searchTerm || (data.title || '').toLowerCase().includes(searchTerm);
    const matchesCategory = !category || data.category === category;
    const matchesStatus = !status || data.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (filtered.length === 0) {
    list.innerHTML = emptyState('No activities match your search or filters.');
    return;
  }
  list.innerHTML = filtered.map(({ id, data }) => activityCardHTML(id, data)).join('');
}

async function renderActivitiesList() {
  const list = document.getElementById('activitiesList');
  if (!list) return;
  try {
    const q = query(collection(db, 'activities'), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    allActivities = snap.docs.map(d => ({ id: d.id, data: d.data() }));

    if (allActivities.length === 0) {
      list.innerHTML = emptyState('No activities published yet. Check back soon.');
      return;
    }
    applyActivityFilters();

    document.getElementById('activitySearch')?.addEventListener('input', applyActivityFilters);
    document.getElementById('categoryFilter')?.addEventListener('change', applyActivityFilters);
    document.getElementById('statusFilter')?.addEventListener('change', applyActivityFilters);
  } catch (err) {
    console.error(err);
    list.innerHTML = errorState('Activities could not be loaded right now. Please try again later.');
  }
}

// ---------------------------------------------------------------------------
// activity-details.html: single activity by ?id=
// ---------------------------------------------------------------------------
async function renderActivityDetails() {
  const root = document.getElementById('activityContent');
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const loadingEl = document.getElementById('activityLoading');
  const notFoundEl = document.getElementById('activityNotFound');

  if (!id) {
    loadingEl.classList.add('hidden');
    notFoundEl.classList.remove('hidden');
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'activities', id));
    if (!snap.exists()) {
      loadingEl.classList.add('hidden');
      notFoundEl.classList.remove('hidden');
      return;
    }
    const a = snap.data();

    document.title = `${a.title} — CESS`;
    document.getElementById('activityCategory').textContent = a.category || 'General';
    document.getElementById('activityTitle').textContent = a.title || 'Untitled activity';
    document.getElementById('activityDate').textContent = formatDate(a.date);
    document.getElementById('activityLocation').textContent = a.location || 'Location to be announced';
    const statusEl = document.getElementById('activityStatus');
    statusEl.textContent = a.status || 'upcoming';
    statusEl.classList.add(statusBadgeClass(a.status));
    document.getElementById('activityDescription').textContent = a.description || 'No description provided.';

    const cover = document.getElementById('activityCover');
    if (a.imageUrl) {
      cover.innerHTML = `<img src="${a.imageUrl}" alt="${a.title}" style="width:100%; height:100%; object-fit:cover;">`;
    }

    // Objectives
    const objectivesBlock = document.getElementById('objectivesBlock');
    const objectivesList = document.getElementById('activityObjectives');
    if (Array.isArray(a.objectives) && a.objectives.length > 0) {
      objectivesList.innerHTML = a.objectives.map(o => `<li>— ${o}</li>`).join('');
    } else {
      objectivesBlock.classList.add('hidden');
    }

    // Registration
    const regBlock = document.getElementById('registrationBlock');
    const regInfo = document.getElementById('registrationInfo');
    const regLink = document.getElementById('registrationLink');
    if (a.registrationInfo || a.registrationLink) {
      regInfo.textContent = a.registrationInfo || 'Registration details will be shared with members.';
      if (a.registrationLink) {
        regLink.href = a.registrationLink;
        regLink.classList.remove('hidden');
      }
    } else {
      regBlock.classList.add('hidden');
    }

    // Gallery
    const galleryBlock = document.getElementById('galleryBlock');
    const galleryEl = document.getElementById('activityGallery');
    if (Array.isArray(a.gallery) && a.gallery.length > 0) {
      galleryEl.innerHTML = a.gallery.map(url => `
        <div class="card-media"><img src="${url}" alt="Activity gallery image" loading="lazy"></div>
      `).join('');
    } else {
      galleryBlock.classList.add('hidden');
    }

    // Related activities (same category, excluding current)
    const relatedEl = document.getElementById('relatedActivities');
    try {
      const relatedSnap = await getDocs(query(collection(db, 'activities'), orderBy('date', 'desc'), limit(6)));
      const related = relatedSnap.docs
        .filter(d => d.id !== id && d.data().category === a.category)
        .slice(0, 3);
      relatedEl.innerHTML = related.length > 0
        ? related.map(d => activityCardHTML(d.id, d.data())).join('')
        : emptyState('No related activities yet.');
    } catch {
      relatedEl.innerHTML = emptyState('Related activities could not be loaded.');
    }

    loadingEl.classList.add('hidden');
    root.classList.remove('hidden');
  } catch (err) {
    console.error(err);
    loadingEl.classList.add('hidden');
    notFoundEl.classList.remove('hidden');
  }
}

// Run the appropriate renderer based on which elements exist on this page
renderLatestActivities();
renderActivitiesList();
renderActivityDetails();

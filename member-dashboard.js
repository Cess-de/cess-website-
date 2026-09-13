// ============================================================================
// CESS — member-dashboard.js
// Populates the member dashboard once auth-guard.js confirms the user is
// authorized (event: 'cess-authorized'). Reads announcements (audience
// public/member), upcoming activities, and resources (visibility public
// or member). All of this is additionally enforced by Firestore Security
// Rules — this file only controls what's *requested* and displayed.
// ============================================================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, query, where, orderBy, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function formatDate(ts) {
  if (!ts) return 'Date to be announced';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
function emptyState(msg) { return `<div class="state-block">${msg}</div>`; }
function errorState(msg) { return `<div class="state-block" style="border-color:var(--color-alert); color:var(--color-alert);">${msg}</div>`; }

function announcementCard(a) {
  return `<div class="card"><span class="card-tag">${a.audience === 'member' ? 'Members only' : 'Public'}</span><h3>${a.title}</h3><p>${a.body || ''}</p><div class="card-meta"><span>${formatDate(a.date)}</span></div></div>`;
}
function activityCard(a, id) {
  return `<div class="card"><span class="card-tag">${a.category || 'General'}</span><h3>${a.title}</h3><p>${(a.description||'').slice(0,90)}…</p><div class="card-meta"><span>${formatDate(a.date)}</span><span>${a.location||''}</span></div><a href="activity-details.html?id=${id}" class="btn btn-secondary btn-small mt-1">View details</a></div>`;
}
function resourceCard(r) {
  return `<div class="card"><span class="card-tag">${r.category||'General'}</span><h3>${r.title}</h3><p>${(r.description||'').slice(0,90)}</p>${r.fileUrl ? `<a href="${r.fileUrl}" target="_blank" rel="noopener" class="btn btn-secondary btn-small mt-1">Open resource</a>` : ''}</div>`;
}

async function loadOverview() {
  const el = document.getElementById('overviewSummary');
  try {
    const [annSnap, actSnap] = await Promise.all([
      getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(2))),
      getDocs(query(collection(db, 'activities'), where('status', '==', 'upcoming'), orderBy('date', 'asc'), limit(2)))
    ]);
    const cards = [
      ...annSnap.docs.map(d => announcementCard(d.data())),
      ...actSnap.docs.map(d => activityCard(d.data(), d.id))
    ];
    el.innerHTML = cards.length ? cards.join('') : emptyState('Nothing new to show right now.');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Overview could not be loaded.');
  }
}

async function loadAnnouncements() {
  const el = document.getElementById('memberAnnouncements');
  try {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc')));
    el.innerHTML = snap.empty ? emptyState('No announcements yet.') : snap.docs.map(d => announcementCard(d.data())).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Announcements could not be loaded. You may need to be logged in with an active membership.');
  }
}

async function loadActivities() {
  const el = document.getElementById('memberActivities');
  try {
    const snap = await getDocs(query(collection(db, 'activities'), where('status', 'in', ['upcoming', 'ongoing']), orderBy('date', 'asc')));
    el.innerHTML = snap.empty ? emptyState('No upcoming activities right now.') : snap.docs.map(d => activityCard(d.data(), d.id)).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Activities could not be loaded.');
  }
}

async function loadResources() {
  const el = document.getElementById('memberResources');
  try {
    const snap = await getDocs(query(collection(db, 'resources'), where('visibility', 'in', ['public', 'member']), orderBy('date', 'desc')));
    el.innerHTML = snap.empty ? emptyState('No resources available yet.') : snap.docs.map(d => resourceCard(d.data())).join('');
  } catch (err) {
    console.error(err);
    el.innerHTML = errorState('Resources could not be loaded.');
  }
}

function loadProfile(profile, user) {
  document.getElementById('profileEmail').textContent = user.email;
  document.getElementById('profileCohort').textContent = profile.cohort || '—';
  document.getElementById('profileDepartment').textContent = profile.department || 'Civil Engineering';
  document.getElementById('profileStatus').textContent = profile.status || 'active';
}

window.addEventListener('cess-authorized', (e) => {
  const { user, profile } = e.detail;
  loadOverview();
  loadAnnouncements();
  loadActivities();
  loadResources();
  loadProfile(profile, user);
});

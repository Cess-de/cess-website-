// ============================================================================
// CESS — leadership-dashboard.js
// Full CRUD for leadership-managed collections. Runs once auth-guard.js
// confirms the signed-in user has role 'leadership' or 'admin' (event:
// 'cess-authorized'). All writes are additionally validated server-side
// by Firestore Security Rules — a malicious or buggy client cannot bypass
// role checks by editing this file.
// ============================================================================

import { db } from './firebase-config.js';
import {
  collection, getDocs, addDoc, deleteDoc, doc, updateDoc,
  query, orderBy, serverTimestamp, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let currentRole = 'leadership';

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function toTimestamp(dateInputValue) {
  return dateInputValue ? Timestamp.fromDate(new Date(dateInputValue)) : serverTimestamp();
}

function rowError(colspan, msg) {
  return `<tr><td colspan="${colspan}" style="color:var(--color-alert);">${msg}</td></tr>`;
}

function closeModal(el) {
  el.closest('.modal-overlay').classList.remove('open');
}

// ---------------------------------------------------------------------------
// Generic delete handler wiring for a table
// ---------------------------------------------------------------------------
function wireDelete(tableId, collectionName, reload) {
  document.getElementById(tableId).addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-delete-id]');
    if (!btn) return;
    if (!confirm('Delete this record? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, collectionName, btn.dataset.deleteId));
      reload();
    } catch (err) {
      console.error(err);
      alert('Could not delete. You may not have permission for this action.');
    }
  });
}

// ---------------------------------------------------------------------------
// ACTIVITIES
// ---------------------------------------------------------------------------
async function loadActivities() {
  const tbody = document.querySelector('#activitiesTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'activities'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="5">No activities yet.</td></tr>' :
      snap.docs.map(d => {
        const a = d.data();
        return `<tr>
          <td>${a.title}</td><td>${a.category||''}</td><td>${fmtDate(a.date)}</td>
          <td><span class="badge">${a.status||''}</span></td>
          <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td>
        </tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(5, 'Could not load activities.');
  }
}

document.getElementById('formActivity').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'activities'), {
      title: f.get('title'), description: f.get('description'),
      date: toTimestamp(f.get('date')), location: f.get('location'),
      category: f.get('category'), status: f.get('status'),
      imageUrl: f.get('imageUrl') || '', registrationLink: f.get('registrationLink') || '',
      createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadActivities();
  } catch (err) {
    console.error(err);
    alert('Could not save activity. You may not have permission.');
  }
});
wireDelete('activitiesTable', 'activities', loadActivities);

// ---------------------------------------------------------------------------
// ANNOUNCEMENTS
// ---------------------------------------------------------------------------
async function loadAnnouncements() {
  const tbody = document.querySelector('#announcementsTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="4">No announcements yet.</td></tr>' :
      snap.docs.map(d => {
        const a = d.data();
        return `<tr><td>${a.title}</td><td>${a.audience}</td><td>${fmtDate(a.date)}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(4, 'Could not load announcements.');
  }
}

document.getElementById('formAnnouncement').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'announcements'), {
      title: f.get('title'), body: f.get('body'), audience: f.get('audience'),
      date: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadAnnouncements();
  } catch (err) {
    console.error(err);
    alert('Could not save announcement. You may not have permission.');
  }
});
wireDelete('announcementsTable', 'announcements', loadAnnouncements);

// ---------------------------------------------------------------------------
// RESOURCES
// ---------------------------------------------------------------------------
async function loadResources() {
  const tbody = document.querySelector('#resourcesTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'resources'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="4">No resources yet.</td></tr>' :
      snap.docs.map(d => {
        const r = d.data();
        return `<tr><td>${r.title}</td><td>${r.category||''}</td><td>${r.visibility}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(4, 'Could not load resources.');
  }
}

document.getElementById('formResource').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'resources'), {
      title: f.get('title'), description: f.get('description'), category: f.get('category'),
      fileUrl: f.get('fileUrl'), visibility: f.get('visibility'),
      author: 'CESS Committee', date: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadResources();
  } catch (err) {
    console.error(err);
    alert('Could not save resource. You may not have permission.');
  }
});
wireDelete('resourcesTable', 'resources', loadResources);

// ---------------------------------------------------------------------------
// PUBLIC ARCHIVE
// ---------------------------------------------------------------------------
async function loadArchive() {
  const tbody = document.querySelector('#archiveTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'publicArchive'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="4">No public archive items yet.</td></tr>' :
      snap.docs.map(d => {
        const a = d.data();
        return `<tr><td>${a.title}</td><td>${a.category||''}</td><td>${fmtDate(a.date)}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(4, 'Could not load public archive.');
  }
}

document.getElementById('formArchive').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'publicArchive'), {
      title: f.get('title'), description: f.get('description'), category: f.get('category'),
      driveLink: f.get('driveLink'), date: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadArchive();
  } catch (err) {
    console.error(err);
    alert('Could not publish to archive. You may not have permission.');
  }
});
wireDelete('archiveTable', 'publicArchive', loadArchive);

// ---------------------------------------------------------------------------
// COMMITTEES
// ---------------------------------------------------------------------------
async function loadCommittees() {
  const tbody = document.querySelector('#committeesTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'committees'), orderBy('term', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="5">No committee records yet.</td></tr>' :
      snap.docs.map(d => {
        const c = d.data();
        return `<tr><td>${c.term}</td><td>${c.president||''}</td><td>${c.vicePresident||''}</td><td>${c.secretary||''}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(5, 'Could not load committees.');
  }
}

document.getElementById('formCommittee').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'committees'), {
      term: f.get('term'), president: f.get('president'), vicePresident: f.get('vicePresident'),
      secretary: f.get('secretary'), media: f.get('media'), finance: f.get('finance'),
      otherPositions: f.get('otherPositions'), createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadCommittees();
  } catch (err) {
    console.error(err);
    alert('Could not save committee record. You may not have permission.');
  }
});
wireDelete('committeesTable', 'committees', loadCommittees);

// ---------------------------------------------------------------------------
// MEETINGS (internal)
// ---------------------------------------------------------------------------
async function loadMeetings() {
  const tbody = document.querySelector('#meetingsTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'meetings'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="3">No meeting records yet.</td></tr>' :
      snap.docs.map(d => {
        const m = d.data();
        return `<tr><td>${m.title}</td><td>${fmtDate(m.date)}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(3, 'Could not load meetings. Leadership access is required.');
  }
}

document.getElementById('formMeeting').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'meetings'), {
      title: f.get('title'), date: toTimestamp(f.get('date')),
      attendees: f.get('attendees'), agenda: f.get('agenda'),
      decisions: f.get('decisions'), minutes: f.get('minutes'),
      attachments: f.get('attachments'), createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadMeetings();
  } catch (err) {
    console.error(err);
    alert('Could not save meeting record. You may not have permission.');
  }
});
wireDelete('meetingsTable', 'meetings', loadMeetings);

// ---------------------------------------------------------------------------
// REPORTS (internal)
// ---------------------------------------------------------------------------
async function loadReports() {
  const tbody = document.querySelector('#reportsTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'reports'), orderBy('date', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="4">No reports yet.</td></tr>' :
      snap.docs.map(d => {
        const r = d.data();
        return `<tr><td>${r.title}</td><td>${r.type||''}</td><td>${fmtDate(r.date)}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(4, 'Could not load reports. Leadership access is required.');
  }
}

document.getElementById('formReport').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'reports'), {
      title: f.get('title'), type: f.get('type'), date: toTimestamp(f.get('date')),
      description: f.get('description'), fileUrl: f.get('fileUrl'), createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadReports();
  } catch (err) {
    console.error(err);
    alert('Could not save report. You may not have permission.');
  }
});
wireDelete('reportsTable', 'reports', loadReports);

// ---------------------------------------------------------------------------
// INTERNAL DOCUMENTS
// ---------------------------------------------------------------------------
async function loadInternal() {
  const tbody = document.querySelector('#internalTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'internalDocuments'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="3">No internal documents yet.</td></tr>' :
      snap.docs.map(d => {
        const i = d.data();
        return `<tr><td>${i.title}</td><td>${i.category||''}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(3, 'Could not load internal documents. Leadership access is required.');
  }
}

document.getElementById('formInternal').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'internalDocuments'), {
      title: f.get('title'), category: f.get('category'), driveLink: f.get('driveLink'),
      notes: f.get('notes'), createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadInternal();
  } catch (err) {
    console.error(err);
    alert('Could not save internal document. You may not have permission.');
  }
});
wireDelete('internalTable', 'internalDocuments', loadInternal);

// ---------------------------------------------------------------------------
// HANDOVER
// ---------------------------------------------------------------------------
async function loadHandover() {
  const tbody = document.querySelector('#handoverTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'handover'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="3">No handover entries yet.</td></tr>' :
      snap.docs.map(d => {
        const h = d.data();
        return `<tr><td>${h.title}</td><td>${h.type||''}</td>
        <td class="table-actions"><button class="btn btn-small btn-secondary" data-delete-id="${d.id}">Delete</button></td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(3, 'Could not load handover archive. Leadership access is required.');
  }
}

document.getElementById('formHandover').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = new FormData(e.target);
  try {
    await addDoc(collection(db, 'handover'), {
      title: f.get('title'), type: f.get('type'), details: f.get('details'),
      link: f.get('link'), createdAt: serverTimestamp()
    });
    e.target.reset();
    closeModal(e.target);
    loadHandover();
  } catch (err) {
    console.error(err);
    alert('Could not save handover entry. You may not have permission.');
  }
});
wireDelete('handoverTable', 'handover', loadHandover);

// ---------------------------------------------------------------------------
// USERS & ROLES (admin-only writes; leadership can view)
// ---------------------------------------------------------------------------
async function loadUsers() {
  const tbody = document.querySelector('#usersTable tbody');
  try {
    const snap = await getDocs(collection(db, 'users'));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="6">No users found.</td></tr>' :
      snap.docs.map(d => {
        const u = d.data();
        const roleControl = currentRole === 'admin'
          ? `<select data-role-select="${d.id}">
              <option value="member" ${u.role==='member'?'selected':''}>member</option>
              <option value="leadership" ${u.role==='leadership'?'selected':''}>leadership</option>
              <option value="admin" ${u.role==='admin'?'selected':''}>admin</option>
            </select>`
          : u.role;
        return `<tr>
          <td>${u.name||''}</td><td>${u.email||''}</td><td>${u.cohort||''}</td>
          <td>${roleControl}</td><td>${u.status||'active'}</td>
          <td>${currentRole === 'admin' ? `<button class="btn btn-small btn-secondary" data-save-role="${d.id}">Save role</button>` : '—'}</td>
        </tr>`;
      }).join('');

    if (currentRole === 'admin') {
      tbody.querySelectorAll('[data-save-role]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = btn.dataset.saveRole;
          const select = tbody.querySelector(`[data-role-select="${uid}"]`);
          try {
            await updateDoc(doc(db, 'users', uid), { role: select.value });
            alert('Role updated.');
          } catch (err) {
            console.error(err);
            alert('Could not update role. Admin permission required.');
          }
        });
      });
    }
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(6, 'Could not load users.');
  }
}

// ---------------------------------------------------------------------------
// CONTACT MESSAGES (read-only here)
// ---------------------------------------------------------------------------
async function loadMessages() {
  const tbody = document.querySelector('#messagesTable tbody');
  try {
    const snap = await getDocs(query(collection(db, 'contactMessages'), orderBy('createdAt', 'desc')));
    tbody.innerHTML = snap.empty ? '<tr><td colspan="5">No messages yet.</td></tr>' :
      snap.docs.map(d => {
        const m = d.data();
        return `<tr><td>${m.name}</td><td>${m.email}</td><td>${m.subject}</td><td>${(m.message||'').slice(0,60)}…</td><td>${fmtDate(m.createdAt)}</td></tr>`;
      }).join('');
  } catch (err) {
    console.error(err);
    tbody.innerHTML = rowError(5, 'Could not load contact messages.');
  }
}

// ---------------------------------------------------------------------------
// OVERVIEW
// ---------------------------------------------------------------------------
async function loadOverview() {
  try {
    const [usersSnap, activitiesSnap, announcementsSnap, internalSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'activities')),
      getDocs(collection(db, 'announcements')),
      getDocs(collection(db, 'internalDocuments'))
    ]);
    document.getElementById('ovMembers').textContent = usersSnap.size;
    document.getElementById('ovActivities').textContent = activitiesSnap.docs.filter(d => d.data().status === 'upcoming').length;
    document.getElementById('ovAnnouncements').textContent = announcementsSnap.size;
    document.getElementById('ovDocuments').textContent = internalSnap.size;

    const recentRows = activitiesSnap.docs.slice(0, 3).map(d => `<tr><td>Activity</td><td>${d.data().title}</td><td>${fmtDate(d.data().date)}</td></tr>`);
    document.querySelector('#recentTable tbody').innerHTML = recentRows.length ? recentRows.join('') : '<tr><td colspan="3">Nothing recent.</td></tr>';
  } catch (err) {
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Bootstrap once authorized
// ---------------------------------------------------------------------------
window.addEventListener('cess-authorized', (e) => {
  currentRole = e.detail.profile.role;
  loadOverview();
  loadActivities();
  loadAnnouncements();
  loadResources();
  loadArchive();
  loadCommittees();
  loadMeetings();
  loadReports();
  loadInternal();
  loadHandover();
  loadUsers();
  loadMessages();
});

// ============================================================================
// CESS — user.js
// Shared helpers for reading the current user's session and Firestore
// profile (role, name, cohort, etc). Used by dashboards, auth-guard, and
// any public page that wants to show "Logged in as ..." state in the nav.
// ============================================================================

import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Fetch a user's Firestore profile document by uid.
 * Returns null if it doesn't exist.
 */
export async function getUserProfile(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    return snap.exists() ? snap.data() : null;
  } catch (err) {
    console.error('Failed to load user profile:', err);
    return null;
  }
}

/**
 * Resolves once with { user, profile } — profile is null if signed out
 * or if no Firestore profile document exists yet.
 */
export function getCurrentSession() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        resolve({ user: null, profile: null });
        return;
      }
      const profile = await getUserProfile(user.uid);
      resolve({ user, profile });
    });
  });
}

/**
 * Updates any element with [data-user-name] / [data-user-role] on the page
 * once the session is known — used for lightweight "logged in as" nav state
 * on public pages. Safe to call on pages with no such elements.
 */
export async function reflectSessionInNav() {
  const { user, profile } = await getCurrentSession();
  if (!user) return;

  document.querySelectorAll('[data-user-name]').forEach(el => {
    el.textContent = profile?.name || user.email;
  });
  document.querySelectorAll('[data-user-role]').forEach(el => {
    el.textContent = profile?.role || 'member';
  });
}

reflectSessionInNav();

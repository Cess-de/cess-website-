// ============================================================================
// CESS — auth-guard.js
// Client-side route protection for member/leadership dashboard pages.
//
// IMPORTANT: this is a UX convenience only (avoids flashing protected
// content, redirects people who shouldn't be here). It is NOT the real
// security boundary — Firestore Security Rules are the real boundary and
// enforce the same role checks server-side regardless of what this file
// does. Never rely on this file alone to protect data.
//
// Usage: set `window.CESS_REQUIRED_ROLES = ['member','leadership','admin']`
// (or a subset) in the page's inline script BEFORE this file loads, then
// include this as a module script.
// ============================================================================

import { getCurrentSession } from './user.js';

const requiredRoles = window.CESS_REQUIRED_ROLES || ['member', 'leadership', 'admin'];

(async function guard() {
  const { user, profile } = await getCurrentSession();

  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  if (!profile) {
    // Signed in but no Firestore profile — treat as incomplete account.
    console.warn('No profile document found for this user.');
    window.location.href = 'login.html';
    return;
  }

  if (!requiredRoles.includes(profile.role)) {
    // Wrong dashboard for this role — send them to the correct one.
    if (profile.role === 'member') {
      window.location.href = 'member-dashboard.html';
    } else {
      window.location.href = 'index.html';
    }
    return;
  }

  // Authorized: reveal the page content and broadcast the profile so the
  // dashboard's own script can render user-specific UI without refetching.
  document.documentElement.classList.add('cess-authorized');
  window.dispatchEvent(new CustomEvent('cess-authorized', { detail: { user, profile } }));
})();

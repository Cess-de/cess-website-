// ============================================================================
// CESS — auth.js
// Handles login, signup, and logout using Firebase Authentication
// (Email/Password only, per project requirements).
// New users are written to Firestore `users/{uid}` with role "member" by
// default. Role upgrades (leadership/admin) are done manually by an admin
// in the Firebase Console or the leadership dashboard — never by the user.
// ============================================================================

import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const errorBox = document.getElementById('authError');
const successBox = document.getElementById('authSuccess');

function showError(message) {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.add('show');
  if (successBox) successBox.classList.remove('show');
}

function showSuccess(message) {
  if (!successBox) return;
  successBox.textContent = message;
  successBox.classList.add('show');
  if (errorBox) errorBox.classList.remove('show');
}

function friendlyAuthError(code) {
  const map = {
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/invalid-credential': 'Incorrect email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.'
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function redirectAfterLogin(role) {
  if (role === 'leadership' || role === 'admin') {
    window.location.href = 'leadership-dashboard.html';
  } else {
    window.location.href = 'member-dashboard.html';
  }
}

// -------------------- LOGIN --------------------
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('loginSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const { getUserProfile } = await import('./user.js');
      const profile = await getUserProfile(cred.user.uid);
      redirectAfterLogin(profile ? profile.role : 'member');
    } catch (err) {
      console.error(err);
      showError(friendlyAuthError(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log in';
    }
  });
}

// -------------------- SIGNUP --------------------
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('signupSubmit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const cohort = document.getElementById('signupCohort').value.trim();
    const password = document.getElementById('signupPassword').value;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // Create the Firestore profile document. Role is always "member" —
      // this is enforced again server-side in Firestore Security Rules,
      // so this client-side default cannot be tampered with to self-promote.
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        role: 'member',
        cohort,
        department: 'Civil Engineering',
        joinedAt: serverTimestamp(),
        status: 'active'
      });

      showSuccess('Account created. Redirecting to your dashboard…');
      setTimeout(() => redirectAfterLogin('member'), 1000);
    } catch (err) {
      console.error(err);
      showError(friendlyAuthError(err.code));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create account';
    }
  });
}

// -------------------- LOGOUT (used by dashboards) --------------------
export async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}

// Expose logout globally for inline onclick handlers in dashboard HTML
window.cessLogout = logout;

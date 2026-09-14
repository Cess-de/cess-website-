// ============================================================
// CESS — Central Session Manager
// Civil Engineering Student Society
// ============================================================

import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// ============================================================
// Internal Session State
// ============================================================

let currentUser = null;
let currentProfile = null;
let authReady = false;

let authReadyPromiseResolve;

const authReadyPromise = new Promise((resolve) => {
  authReadyPromiseResolve = resolve;
});


// ============================================================
// Single Firebase Authentication Listener
// ============================================================

onAuthStateChanged(auth, async (user) => {

  currentUser = user;
  currentProfile = null;

  try {

    // --------------------------------------------------------
    // No authenticated user
    // --------------------------------------------------------

    if (!user) {
      authReady = true;

      authReadyPromiseResolve();

      return;
    }


    // --------------------------------------------------------
    // Authenticated user exists
    // Load Firestore profile
    // --------------------------------------------------------

    const profileRef = doc(db, "users", user.uid);

    const profileSnap = await getDoc(profileRef);


    if (profileSnap.exists()) {

      currentProfile = {
        uid: user.uid,
        ...profileSnap.data()
      };

    } else {

      console.warn(
        "[CESS Session] Authenticated user has no Firestore profile:",
        user.uid
      );

      currentProfile = null;
    }

  } catch (error) {

    console.error(
      "[CESS Session] Failed to load user profile:",
      error
    );

    currentProfile = null;

  } finally {

    authReady = true;

    authReadyPromiseResolve();
  }

});


// ============================================================
// Wait Until Firebase Has Determined Authentication State
// ============================================================

export async function waitForAuthReady() {

  if (authReady) {
    return;
  }

  await authReadyPromise;
}


// ============================================================
// Get Current User
// ============================================================

export async function getCurrentUser() {

  await waitForAuthReady();

  return currentUser;
}


// ============================================================
// Get Current Firestore Profile
// ============================================================

export async function getCurrentProfile() {

  await waitForAuthReady();

  return currentProfile;
}


// ============================================================
// Get Complete Current Session
// ============================================================

export async function getCurrentSession() {

  await waitForAuthReady();

  return {
    user: currentUser,
    profile: currentProfile
  };
}


// ============================================================
// Check Authentication
// ============================================================

export async function isAuthenticated() {

  await waitForAuthReady();

  return currentUser !== null;
}


// ============================================================
// Check User Role
// ============================================================

export async function hasRole(...allowedRoles) {

  await waitForAuthReady();

  if (!currentUser || !currentProfile) {
    return false;
  }

  return allowedRoles.includes(currentProfile.role);
}


// ============================================================
// Refresh Current Firestore Profile
// ============================================================

export async function refreshCurrentProfile() {

  await waitForAuthReady();

  if (!currentUser) {

    currentProfile = null;

    return null;
  }


  try {

    const profileRef = doc(
      db,
      "users",
      currentUser.uid
    );

    const profileSnap = await getDoc(profileRef);


    if (!profileSnap.exists()) {

      currentProfile = null;

      return null;
    }


    currentProfile = {
      uid: currentUser.uid,
      ...profileSnap.data()
    };


    return currentProfile;

  } catch (error) {

    console.error(
      "[CESS Session] Failed to refresh profile:",
      error
    );

    currentProfile = null;

    return null;
  }
}


// ============================================================
// Update Navigation User Information
// ============================================================

export async function updateSessionUI() {

  const {
    user,
    profile
  } = await getCurrentSession();


  // ----------------------------------------------------------
  // User name
  // ----------------------------------------------------------

  const nameElements =
    document.querySelectorAll("[data-user-name]");


  nameElements.forEach((element) => {

    if (profile?.name) {

      element.textContent = profile.name;

    } else if (user?.displayName) {

      element.textContent = user.displayName;

    } else {

      element.textContent = "عضو CESS";
    }

  });


  // ----------------------------------------------------------
  // User email
  // ----------------------------------------------------------

  const emailElements =
    document.querySelectorAll("[data-user-email]");


  emailElements.forEach((element) => {

    element.textContent =
      profile?.email ||
      user?.email ||
      "";
  });


  // ----------------------------------------------------------
  // User role
  // ----------------------------------------------------------

  const roleElements =
    document.querySelectorAll("[data-user-role]");


  roleElements.forEach((element) => {

    element.textContent =
      profile?.role ||
      "";
  });


  // ----------------------------------------------------------
  // User cohort
  // ----------------------------------------------------------

  const cohortElements =
    document.querySelectorAll("[data-user-cohort]");


  cohortElements.forEach((element) => {

    element.textContent =
      profile?.cohort ||
      "";
  });
}


// ============================================================
// Debug Helper
// ============================================================

export function getSessionState() {

  return {
    authReady,
    user: currentUser,
    profile: currentProfile
  };
}


// ============================================================
// Global Debug Access
// ============================================================

window.CESSSession = {
  getCurrentUser,
  getCurrentProfile,
  getCurrentSession,
  isAuthenticated,
  hasRole,
  refreshCurrentProfile,
  updateSessionUI,
  getSessionState
};

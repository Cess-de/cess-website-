/* =========================================================
   CESS — Authentication & Role Authority
   =========================================================
   Runtime:
   - Firebase Compat 10.12.2
   - ES Module
   - Email / Password Authentication
   - Firestore user profiles
   - Role-based access
   - Status-based access

   Requires:
   - firebase-config.js loaded before this module

   firebase-config.js provides:
   - window.auth
   - window.db
   - window.CESS_CONFIG
   ========================================================= */


/* =========================================================
   CONFIG
   ========================================================= */

const CESS_CONFIG = window.CESS_CONFIG || {};

const COLLECTIONS = CESS_CONFIG.collections || {};

const ROLES = CESS_CONFIG.roles || {
  MEMBER: "member",
  LEADERSHIP: "leadership",
  ADMIN: "admin"
};

const STATUSES = CESS_CONFIG.statuses || {
  ACTIVE: "active",
  INACTIVE: "inactive",
  SUSPENDED: "suspended"
};


/* =========================================================
   FIREBASE HANDLES
   ========================================================= */

const auth = window.auth;
const db = window.db;

if (!auth || !db) {
  throw new Error(
    "[CESS Auth] Firebase is not initialized. " +
    "Load firebase-config.js before auth.js."
  );
}


/* =========================================================
   INTERNAL STATE
   ========================================================= */

let profileCache = null;

let authResolved = false;

let resolveAuthReady;

const authReady = new Promise((resolve) => {
  resolveAuthReady = resolve;
});


/* =========================================================
   PROFILE
   ========================================================= */

/**
 * Get the Firestore profile for the currently
 * authenticated Firebase user.
 *
 * @param {boolean} force
 * @returns {Promise<Object|null>}
 */
async function getCurrentUserProfile(force = false) {

  if (profileCache && !force) {
    return profileCache;
  }

  const user = auth.currentUser;

  if (!user) {
    profileCache = null;
    return null;
  }

  try {

    const collectionName =
      COLLECTIONS.USERS || "users";

    const snap = await db
      .collection(collectionName)
      .doc(user.uid)
      .get();

    if (!snap.exists) {

      profileCache = null;

      return null;
    }

    profileCache = {
      uid: user.uid,
      ...snap.data()
    };

    return profileCache;

  } catch (error) {

    console.error(
      "[CESS Auth] Failed to fetch user profile:",
      error
    );

    return null;
  }
}


/* =========================================================
   CACHE
   ========================================================= */

function clearProfileCache() {

  profileCache = null;
}


/* =========================================================
   AUTH STATE
   ========================================================= */

auth.onAuthStateChanged((user) => {

  authResolved = true;

  if (!user) {
    clearProfileCache();
  }

  if (typeof resolveAuthReady === "function") {
    resolveAuthReady(user);
  }
});


/**
 * Wait until Firebase Auth finishes its
 * initial state resolution.
 *
 * @returns {Promise<firebase.User|null>}
 */
function ready() {

  if (authResolved) {
    return Promise.resolve(auth.currentUser);
  }

  return authReady;
}


/* =========================================================
   CURRENT USER
   ========================================================= */

function getLoggedInUser() {

  return auth.currentUser;
}


/* =========================================================
   ROLE REDIRECT
   ========================================================= */

function redirectToRoleHome(role) {

  switch (role) {

    case ROLES.ADMIN:
      window.location.replace("admin.html");
      return;

    case ROLES.LEADERSHIP:
      window.location.replace("leadership.html");
      return;

    case ROLES.MEMBER:
      window.location.replace("member.html");
      return;

    default:
      window.location.replace("index.html");
      return;
  }
}


/* =========================================================
   REGISTRATION
   ========================================================= */

/**
 * Register a new CESS member.
 *
 * Firestore document:
 * users/{uid}
 *
 * Required fields:
 * - uid
 * - name
 * - email
 * - batch
 * - cohort
 * - role
 * - status
 * - createdAt
 */
async function registerUser(options = {}) {

  const {
    fullName,
    email,
    password,
    batch
  } = options;


  if (!fullName || !email || !password) {

    throw new Error(
      "missing-registration-fields"
    );
  }


  /* -----------------------------------------
     Create Firebase Auth account
     ----------------------------------------- */

  const credential =
    await auth.createUserWithEmailAndPassword(
      email.trim(),
      password
    );

  const user = credential.user;

  if (!user) {
    throw new Error(
      "registration-user-missing"
    );
  }

  const uid = user.uid;


  try {

    /* ---------------------------------------
       Create Firestore profile
       --------------------------------------- */

    await db
      .collection(
        COLLECTIONS.USERS || "users"
      )
      .doc(uid)
      .set({

        uid,

        name: fullName.trim(),

        email: email.trim(),

        batch: batch
          ? String(batch).trim()
          : "",

        cohort: batch
          ? String(batch).trim()
          : "",

        role: ROLES.MEMBER,

        status: STATUSES.ACTIVE,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp()
      });


    clearProfileCache();

    return user;


  } catch (error) {

    console.error(
      "[CESS Auth] Failed to create Firestore profile:",
      error
    );


    /* ---------------------------------------
       Roll back Auth account
       --------------------------------------- */

    try {

      await user.delete();

    } catch (rollbackError) {

      console.error(
        "[CESS Auth] Failed to roll back Auth account:",
        rollbackError
      );
    }


    throw error;
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

  const normalizedEmail =
    String(email || "").trim();


  if (!normalizedEmail || !password) {

    throw new Error(
      "missing-login-fields"
    );
  }


  /* -----------------------------------------
     Firebase Authentication
     ----------------------------------------- */

  await auth.signInWithEmailAndPassword(
    normalizedEmail,
    password
  );


  clearProfileCache();


  /* -----------------------------------------
     Firestore profile
     ----------------------------------------- */

  const profile =
    await getCurrentUserProfile(true);


  if (!profile) {

    await auth.signOut();

    clearProfileCache();

    throw new Error(
      "missing-profile"
    );
  }


  /* -----------------------------------------
     Account status
     ----------------------------------------- */

  if (
    profile.status === STATUSES.SUSPENDED
  ) {

    await auth.signOut();

    clearProfileCache();

    throw new Error(
      "suspended"
    );
  }


  if (
    profile.status === STATUSES.INACTIVE
  ) {

    await auth.signOut();

    clearProfileCache();

    throw new Error(
      "inactive"
    );
  }


  /* -----------------------------------------
     Role validation
     ----------------------------------------- */

  const validRoles = [
    ROLES.MEMBER,
    ROLES.LEADERSHIP,
    ROLES.ADMIN
  ];


  if (!validRoles.includes(profile.role)) {

    await auth.signOut();

    clearProfileCache();

    throw new Error(
      "invalid-role"
    );
  }


  /* -----------------------------------------
     Redirect
     ----------------------------------------- */

  redirectToRoleHome(
    profile.role
  );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

  try {

    await auth.signOut();

  } catch (error) {

    console.error(
      "[CESS Auth] Logout failed:",
      error
    );

    throw error;

  } finally {

    clearProfileCache();

    window.location.replace(
      "index.html"
    );
  }
}


/* =========================================================
   PASSWORD RESET
   ========================================================= */

async function sendPasswordReset(email) {

  const normalizedEmail =
    String(email || "").trim();

  if (!normalizedEmail) {

    throw new Error(
      "missing-email"
    );
  }

  await auth.sendPasswordResetEmail(
    normalizedEmail
  );
}


/* =========================================================
   PAGE GUARD
   ========================================================= */

/**
 * Protect a page by role and account status.
 *
 * Example:
 *
 * guardPage(
 *   [ROLES.ADMIN],
 *   async (profile) => {
 *     // authorized
 *   }
 * );
 */
async function guardPage(
  allowedRoles = [],
  onAuthorized = null
) {

  /* -----------------------------------------
     Wait for Firebase Auth
     ----------------------------------------- */

  await ready();


  const user =
    auth.currentUser;


  /* -----------------------------------------
     Not authenticated
     ----------------------------------------- */

  if (!user) {

    window.location.replace(
      "login.html"
    );

    return;
  }


  /* -----------------------------------------
     Load Firestore profile
     ----------------------------------------- */

  const profile =
    await getCurrentUserProfile(true);


  if (!profile) {

    await auth.signOut();

    clearProfileCache();

    window.location.replace(
      "login.html"
    );

    return;
  }


  /* -----------------------------------------
     Suspended
     ----------------------------------------- */

  if (
    profile.status ===
    STATUSES.SUSPENDED
  ) {

    await auth.signOut();

    clearProfileCache();

    showAuthMessage(
      "auth.suspended",
      "Account suspended."
    );

    window.location.replace(
      "login.html"
    );

    return;
  }


  /* -----------------------------------------
     Inactive
     ----------------------------------------- */

  if (
    profile.status ===
    STATUSES.INACTIVE
  ) {

    await auth.signOut();

    clearProfileCache();

    showAuthMessage(
      "auth.inactive",
      "Your account is inactive."
    );

    window.location.replace(
      "login.html"
    );

    return;
  }


  /* -----------------------------------------
     Validate role
     ----------------------------------------- */

  if (
    !Array.isArray(allowedRoles)
    || !allowedRoles.includes(
      profile.role
    )
  ) {

    redirectToRoleHome(
      profile.role
    );

    return;
  }


  /* -----------------------------------------
     Authorized
     ----------------------------------------- */

  if (
    typeof onAuthorized === "function"
  ) {

    try {

      await onAuthorized(
        profile
      );

    } catch (error) {

      console.error(
        "[CESS Auth] Authorized callback failed:",
        error
      );

      throw error;
    }
  }
}


/* =========================================================
   AUTH MESSAGE
   ========================================================= */

function showAuthMessage(
  translationKey,
  fallback
) {

  try {

    const translate =
      window.t ||
      ((key) => key);

    const message =
      translate(translationKey);

    if (
      typeof window.toastError ===
      "function"
    ) {

      window.toastError(
        message !== translationKey
          ? message
          : fallback
      );
    }

  } catch (error) {

    console.warn(
      "[CESS Auth] Could not show auth message:",
      error
    );
  }
}


/* =========================================================
   FRIENDLY AUTH ERRORS
   ========================================================= */

function friendlyAuthError(error) {

  const translate =
    window.t ||
    ((key) => key);


  if (!error) {

    return translate(
      "auth.err.generic"
    );
  }


  /* -----------------------------------------
     Custom CESS errors
     ----------------------------------------- */

  const customErrors = {

    "suspended":
      "auth.suspended",

    "inactive":
      "auth.inactive",

    "missing-profile":
      "auth.err.userNotFound",

    "invalid-role":
      "auth.err.generic",

    "missing-login-fields":
      "auth.err.generic",

    "missing-registration-fields":
      "auth.err.generic"
  };


  if (
    customErrors[error.message]
  ) {

    return translate(
      customErrors[
        error.message
      ]
    );
  }


  /* -----------------------------------------
     Firebase Auth errors
     ----------------------------------------- */

  const firebaseErrors = {

    "auth/email-already-in-use":
      "auth.err.emailInUse",

    "auth/invalid-email":
      "auth.err.invalidEmail",

    "auth/weak-password":
      "auth.err.weakPassword",

    "auth/user-not-found":
      "auth.err.userNotFound",

    "auth/wrong-password":
      "auth.err.wrongPassword",

    "auth/invalid-credential":
      "auth.err.wrongPassword",

    "auth/too-many-requests":
      "auth.err.tooMany"
  };


  const key =
    firebaseErrors[
      error.code
    ];


  if (key) {

    return translate(key);
  }


  return (
    error.message ||
    translate("auth.err.generic")
  );
}


/* =========================================================
   PUBLIC API
   ========================================================= */

export {

  getCurrentUserProfile,

  redirectToRoleHome,

  loginUser,

  registerUser,

  logoutUser,

  sendPasswordReset,

  guardPage,

  friendlyAuthError,

  getLoggedInUser,

  clearProfileCache,

  ready,

  showAuthMessage,

  ROLES,

  STATUSES,

  COLLECTIONS
};


/* =========================================================
   GLOBAL COMPATIBILITY
   =========================================================

   Keep these because some existing CESS pages may still
   access the authentication functions through window.
   ========================================================= */

window.CESS_AUTH = {

  getCurrentUserProfile,

  redirectToRoleHome,

  loginUser,

  registerUser,

  logoutUser,

  sendPasswordReset,

  guardPage,

  friendlyAuthError,

  getLoggedInUser,

  clearProfileCache,

  ready,

  showAuthMessage,

  ROLES,

  STATUSES,

  COLLECTIONS
};


/* Legacy globals */

window.getCurrentUserProfile =
  getCurrentUserProfile;

window.redirectToRoleHome =
  redirectToRoleHome;

window.loginUser =
  loginUser;

window.registerUser =
  registerUser;

window.logoutUser =
  logoutUser;

window.sendPasswordReset =
  sendPasswordReset;

window.guardPage =
  guardPage;

window.friendlyAuthError =
  friendlyAuthError;

window.getLoggedInUser =
  getLoggedInUser;

window.clearProfileCache =
  clearProfileCache;

window.authReady =
  ready;

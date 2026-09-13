/* =========================================================
   CESS — Centralized Authentication & Role Logic
   =========================================================
   Every dashboard page includes this file AFTER firebase-config.js.
   All role checks live here so there is exactly one place to
   audit for security-sensitive logic.

   IMPORTANT: This file provides a better USER EXPERIENCE
   (hiding pages a user shouldn't see, redirecting them).
   It is NOT the real security boundary — Firestore Security
   Rules are. A user can disable JavaScript or edit the DOM,
   but they cannot bypass server-enforced Firestore rules.
   ========================================================= */

/**
 * Fetches the current user's role document from Firestore.
 * Returns null if not logged in or the user doc doesn't exist yet.
 */
async function getCurrentUserProfile() {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const doc = await db.collection(CESS_CONFIG.collections.USERS).doc(user.uid).get();
    if (!doc.exists) return null;
    return { uid: user.uid, ...doc.data() };
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
}

/**
 * Guards a page: requires the user to be logged in AND to hold
 * one of the allowedRoles. Redirects safely otherwise.
 * Call this at the top of member.html / leadership.html / admin.html scripts.
 *
 * NOTE: This client-side guard is a convenience redirect only.
 * The real protection is that Firestore rules will reject any
 * read/write this page attempts if the role doesn't match —
 * so even if someone bypasses this redirect, they get no data.
 */
function guardPage(allowedRoles, onAuthorized) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const profile = await getCurrentUserProfile();

    if (!profile || !allowedRoles.includes(profile.role)) {
      // Not authorized for this page — send to their correct home
      redirectToRoleHome(profile ? profile.role : null);
      return;
    }

    onAuthorized(profile);
  });
}

/**
 * Sends a logged-in user to the dashboard that matches their role.
 */
function redirectToRoleHome(role) {
  switch (role) {
    case CESS_CONFIG.roles.ADMIN:
      window.location.href = "admin.html";
      break;
    case CESS_CONFIG.roles.LEADERSHIP:
      window.location.href = "leadership.html";
      break;
    case CESS_CONFIG.roles.MEMBER:
      window.location.href = "member.html";
      break;
    default:
      window.location.href = "index.html";
  }
}

/**
 * Registers a new user with role hard-set to "member".
 * Users can never choose their own role at signup.
 */
async function registerUser({ fullName, email, password, batch }) {
  const credential = await auth.createUserWithEmailAndPassword(email, password);
  const uid = credential.user.uid;

  await db.collection(CESS_CONFIG.collections.USERS).doc(uid).set({
    name: fullName,
    email: email,
    batch: batch,
    role: CESS_CONFIG.roles.MEMBER, // enforced default — never trust client input for this field
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return credential.user;
}

/**
 * Logs a user in, then redirects to their role's dashboard.
 */
async function loginUser(email, password) {
  await auth.signInWithEmailAndPassword(email, password);
  const profile = await getCurrentUserProfile();
  redirectToRoleHome(profile ? profile.role : null);
}

/**
 * Signs the current user out and returns to the public homepage.
 */
async function logoutUser() {
  await auth.signOut();
  window.location.href = "index.html";
}

/**
 * Sends a password reset email.
 */
async function sendPasswordReset(email) {
  await auth.sendPasswordResetEmail(email);
}

/**
 * Friendly, non-technical error messages for common auth failures.
 * Keeps user-facing errors simple and professional per spec.
 */
function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use": "This email is already registered. Try logging in instead.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with this email.",
    "auth/wrong-password": "Incorrect password. Please try again.",
     "auth/invalid-credential": "Incorrect email or password. Please try again.",
    "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
    "auth/network-request-failed": "Network error. Please check your connection."
  };
  return map[error.code] || "Something went wrong. Please try again.";
}

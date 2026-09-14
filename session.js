/* =========================================================
   CESS — Centralized Session & Authentication
   =========================================================
   The ONLY place that calls onAuthStateChanged, reads the
   current user's profile, or performs role-based redirects.
   Every dashboard page imports guardPage() from here.

   IMPORTANT: This module provides a better USER EXPERIENCE
   (hiding pages a user shouldn't see, redirecting them). It is
   NOT the real security boundary — Firestore Security Rules are.
   A user can disable JavaScript or call Firestore directly from
   the console, but they cannot bypass server-enforced rules.
   ========================================================= */

import {
  auth, db, CESS_CONFIG,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail,
  doc, getDoc, setDoc, serverTimestamp
} from "./firebase.js";

let cachedProfile = null;
let cachedUser = null;
let authResolved = false;
const authWaiters = [];

// Fire exactly one onAuthStateChanged listener for the whole app.
onAuthStateChanged(auth, async (user) => {
  cachedUser = user;
  cachedProfile = user ? await fetchProfile(user.uid) : null;
  authResolved = true;
  authWaiters.splice(0).forEach((resolve) => resolve());
});

async function fetchProfile(uid) {
  try {
    const snap = await getDoc(doc(db, CESS_CONFIG.collections.USERS, uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
}

/** Resolves once Firebase has determined the initial auth state. Avoids race conditions. */
function whenAuthResolved() {
  if (authResolved) return Promise.resolve();
  return new Promise((resolve) => authWaiters.push(resolve));
}

/** Returns { user, profile } for the currently signed-in visitor, or nulls. */
export async function getCurrentSession() {
  await whenAuthResolved();
  return { user: cachedUser, profile: cachedProfile };
}

/** Forces a fresh read of the current user's profile (e.g. after editing it). */
export async function refreshProfile() {
  if (!cachedUser) return null;
  cachedProfile = await fetchProfile(cachedUser.uid);
  return cachedProfile;
}

export function redirectToRoleHome(role) {
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
 * Guards a dashboard page: requires sign-in AND an allowed role AND
 * active status. Calls onAuthorized(profile) once confirmed, otherwise
 * redirects. Call this once at the top of member/leadership/admin pages.
 */
export async function guardPage(allowedRoles, onAuthorized) {
  const { user, profile } = await getCurrentSession();

  if (!user) {
    window.location.href = "login.html";
    return;
  }
  if (!profile) {
    // Authenticated but no Firestore profile yet (e.g. write failed mid-registration).
    window.location.href = "login.html?missingProfile=1";
    return;
  }
  if (profile.status === CESS_CONFIG.statuses.SUSPENDED) {
    await signOut(auth);
    window.location.href = "login.html?suspended=1";
    return;
  }
  if (!allowedRoles.includes(profile.role)) {
    redirectToRoleHome(profile.role);
    return;
  }
  onAuthorized(profile);
}

/** Registers a new user. Role/status are always server-side defaults — never trust client input. */
export async function registerUser({ name, email, password, cohort, department }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = credential.user.uid;

  await setDoc(doc(db, CESS_CONFIG.collections.USERS, uid), {
    uid,
    name,
    email,
    cohort: cohort || "",
    department: department || "",
    role: CESS_CONFIG.roles.MEMBER,      // enforced default
    status: CESS_CONFIG.statuses.ACTIVE, // enforced default
    photoUrl: "",
    phone: "",
    bio: "",
    joinedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return credential.user;
}

export async function loginUser(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
  const profile = await refreshProfile();
  if (profile && profile.status === CESS_CONFIG.statuses.SUSPENDED) {
    await signOut(auth);
    throw { code: "auth/account-suspended" };
  }
  redirectToRoleHome(profile ? profile.role : null);
}

export async function logoutUser() {
  await signOut(auth);
  window.location.href = "index.html";
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}

/** Friendly, non-technical error messages for common auth failures. */
export function friendlyAuthError(error) {
  const map = {
    "auth/email-already-in-use": { en: "This email is already registered. Try logging in instead.", ar: "هذا البريد الإلكتروني مسجل بالفعل. حاول تسجيل الدخول بدلاً من ذلك." },
    "auth/invalid-email": { en: "Please enter a valid email address.", ar: "يرجى إدخال بريد إلكتروني صحيح." },
    "auth/weak-password": { en: "Password should be at least 6 characters.", ar: "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل." },
    "auth/user-not-found": { en: "No account found with this email.", ar: "لا يوجد حساب بهذا البريد الإلكتروني." },
    "auth/wrong-password": { en: "Incorrect password. Please try again.", ar: "كلمة المرور غير صحيحة. حاول مرة أخرى." },
    "auth/invalid-credential": { en: "Incorrect email or password.", ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
    "auth/too-many-requests": { en: "Too many attempts. Please wait a moment and try again.", ar: "محاولات كثيرة جدًا. يرجى الانتظار قليلاً والمحاولة مرة أخرى." },
    "auth/network-request-failed": { en: "Network error. Please check your connection.", ar: "خطأ في الشبكة. يرجى التحقق من اتصالك." },
    "auth/account-suspended": { en: "This account has been suspended. Contact CESS leadership for help.", ar: "تم تعليق هذا الحساب. يرجى التواصل مع قيادة الجمعية." }
  };
  return map[error.code] || { en: "Something went wrong. Please try again.", ar: "حدث خطأ ما. يرجى المحاولة مرة أخرى." };
}

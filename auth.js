// ============================================================
// CESS — Authentication System
// Civil Engineering Student Society
// ============================================================

import { auth, db } from "./firebase-config.js";
import {
  getCurrentSession
} from "./session.js";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// ============================================================
// Configuration
// ============================================================

const LOGIN_PAGE = "login.html";
const MEMBER_PAGE = "member-dashboard.html";
const LEADERSHIP_PAGE = "leadership-dashboard.html";


// ============================================================
// DOM Helpers
// ============================================================

function getElement(id) {
  return document.getElementById(id);
}


function showError(message) {

  const errorBox = getElement("authError");

  if (!errorBox) {
    console.error("[CESS Auth]", message);
    return;
  }

  errorBox.textContent = message;
  errorBox.style.display = "block";

  const successBox = getElement("authSuccess");

  if (successBox) {
    successBox.style.display = "none";
  }
}


function showSuccess(message) {

  const successBox = getElement("authSuccess");

  if (!successBox) {
    console.log("[CESS Auth]", message);
    return;
  }

  successBox.textContent = message;
  successBox.style.display = "block";

  const errorBox = getElement("authError");

  if (errorBox) {
    errorBox.style.display = "none";
  }
}


function clearMessages() {

  const errorBox = getElement("authError");

  if (errorBox) {
    errorBox.textContent = "";
    errorBox.style.display = "none";
  }

  const successBox = getElement("authSuccess");

  if (successBox) {
    successBox.textContent = "";
    successBox.style.display = "none";
  }
}


function setButtonLoading(button, loading, loadingText) {

  if (!button) {
    return;
  }

  if (loading) {

    button.dataset.originalText =
      button.textContent;

    button.disabled = true;

    button.textContent =
      loadingText || "جاري التنفيذ...";

  } else {

    button.disabled = false;

    button.textContent =
      button.dataset.originalText ||
      button.textContent;
  }
}


// ============================================================
// Firebase Error Translation
// ============================================================

function translateFirebaseError(error) {

  console.error("[CESS Auth Error]", error);

  const code = error?.code || "";

  switch (code) {

    case "auth/email-already-in-use":
      return "هذا البريد الإلكتروني مسجل بالفعل. جرّب تسجيل الدخول بدلًا من إنشاء حساب جديد.";

    case "auth/invalid-email":
      return "البريد الإلكتروني غير صحيح.";

    case "auth/weak-password":
      return "كلمة المرور ضعيفة. استخدم كلمة مرور أقوى.";

    case "auth/password-does-not-meet-requirements":
      return "كلمة المرور لا تستوفي متطلبات الأمان المطلوبة.";

    case "auth/user-not-found":
      return "لا يوجد حساب بهذا البريد الإلكتروني.";

    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";

    case "auth/user-disabled":
      return "هذا الحساب تم تعطيله. تواصل مع إدارة CESS.";

    case "auth/too-many-requests":
      return "تمت محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.";

    case "auth/network-request-failed":
      return "تعذر الاتصال بخدمة Firebase. تأكد من الإنترنت وحاول مرة أخرى.";

    case "auth/operation-not-allowed":
      return "تسجيل الدخول بالبريد الإلكتروني غير مفعّل في Firebase.";

    case "permission-denied":
      return "تم رفض الوصول إلى قاعدة البيانات. تحقق من Firestore Rules.";

    case "failed-precondition":
      return "قاعدة البيانات غير جاهزة بالشكل المطلوب.";

    case "unavailable":
      return "خدمة قاعدة البيانات غير متاحة حاليًا. حاول مرة أخرى.";

    default:
      return error?.message ||
        "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }
}


// ============================================================
// Validate Signup Form
// ============================================================

function validateSignup(name, email, cohort, password) {

  if (!name.trim()) {
    return "اكتب الاسم الكامل.";
  }

  if (!email.trim()) {
    return "اكتب البريد الإلكتروني.";
  }

  if (!cohort.trim()) {
    return "اكتب الدفعة أو الفوج.";
  }

  if (!password) {
    return "اكتب كلمة المرور.";
  }

  if (password.length < 6) {
    return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
  }

  return null;
}


// ============================================================
// Validate Login Form
// ============================================================

function validateLogin(email, password) {

  if (!email.trim()) {
    return "اكتب البريد الإلكتروني.";
  }

  if (!password) {
    return "اكتب كلمة المرور.";
  }

  return null;
}


// ============================================================
// Create Firestore User Profile
// ============================================================

async function createUserProfile(firebaseUser, data) {

  const userRef = doc(
    db,
    "users",
    firebaseUser.uid
  );


  const profile = {

    uid: firebaseUser.uid,

    name: data.name,

    email: firebaseUser.email,

    cohort: data.cohort,

    department: "Civil Engineering",

    role: "member",

    status: "active",

    joinedAt: serverTimestamp(),

    updatedAt: serverTimestamp()
  };


  await setDoc(
    userRef,
    profile
  );


  // ----------------------------------------------------------
  // Verify that the profile really exists
  // ----------------------------------------------------------

  const verification =
    await getDoc(userRef);


  if (!verification.exists()) {

    throw new Error(
      "تم إنشاء حساب Firebase لكن لم يتم إنشاء ملف العضو في Firestore."
    );
  }


  return verification.data();
}


// ============================================================
// SIGN UP
// ============================================================

export async function signup() {

  clearMessages();


  const name =
    getElement("signupName")?.value.trim() || "";

  const email =
    getElement("signupEmail")?.value.trim() || "";

  const cohort =
    getElement("signupCohort")?.value.trim() || "";

  const password =
    getElement("signupPassword")?.value || "";

  const submitButton =
    getElement("signupSubmit");


  // ----------------------------------------------------------
  // Validate
  // ----------------------------------------------------------

  const validationError =
    validateSignup(
      name,
      email,
      cohort,
      password
    );


  if (validationError) {

    showError(validationError);

    return;
  }


  setButtonLoading(
    submitButton,
    true,
    "جاري إنشاء الحساب..."
  );


  let firebaseUser = null;


  try {

    // --------------------------------------------------------
    // 1. Create Firebase Authentication Account
    // --------------------------------------------------------

    const credential =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );


    firebaseUser =
      credential.user;


    // --------------------------------------------------------
    // 2. Add Display Name
    // --------------------------------------------------------

    await updateProfile(
      firebaseUser,
      {
        displayName: name
      }
    );


    // --------------------------------------------------------
    // 3. Create Firestore Profile
    // --------------------------------------------------------

    await createUserProfile(
      firebaseUser,
      {
        name,
        email,
        cohort
      }
    );


    // --------------------------------------------------------
    // 4. Force-refresh session information
    // --------------------------------------------------------

    await new Promise(
      (resolve) => setTimeout(resolve, 300)
    );


    // --------------------------------------------------------
    // 5. Success
    // --------------------------------------------------------

    showSuccess(
      "تم إنشاء حسابك بنجاح. سيتم تحويلك إلى لوحة العضو..."
    );


    // --------------------------------------------------------
    // 6. Redirect
    // --------------------------------------------------------

    setTimeout(() => {

      window.location.replace(
        MEMBER_PAGE
      );

    }, 800);


  } catch (error) {

    // --------------------------------------------------------
    // IMPORTANT:
    // If Auth account was created but Firestore failed,
    // remove the newly-created Auth account.
    // This prevents orphan accounts.
    // --------------------------------------------------------

    if (firebaseUser) {

      try {

        await deleteUser(firebaseUser);

        console.warn(
          "[CESS Auth] Rolled back newly-created Auth user."
        );

      } catch (rollbackError) {

        console.error(
          "[CESS Auth] Rollback failed:",
          rollbackError
        );
      }
    }


    try {

      await signOut(auth);

    } catch (signOutError) {

      console.error(
        "[CESS Auth] Cleanup signOut failed:",
        signOutError
      );
    }


    showError(
      translateFirebaseError(error)
    );


  } finally {

    setButtonLoading(
      submitButton,
      false
    );
  }
}


// ============================================================
// LOGIN
// ============================================================

export async function login() {

  clearMessages();


  const email =
    getElement("loginEmail")?.value.trim() || "";

  const password =
    getElement("loginPassword")?.value || "";

  const submitButton =
    getElement("loginSubmit");


  // ----------------------------------------------------------
  // Validate
  // ----------------------------------------------------------

  const validationError =
    validateLogin(
      email,
      password
    );


  if (validationError) {

    showError(validationError);

    return;
  }


  setButtonLoading(
    submitButton,
    true,
    "جاري تسجيل الدخول..."
  );


  try {

    // --------------------------------------------------------
    // 1. Firebase Authentication
    // --------------------------------------------------------

    const credential =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );


    const firebaseUser =
      credential.user;


    // --------------------------------------------------------
    // 2. Get Firestore Profile
    // --------------------------------------------------------

    const profileRef =
      doc(
        db,
        "users",
        firebaseUser.uid
      );


    const profileSnap =
      await getDoc(profileRef);


    // --------------------------------------------------------
    // 3. Profile missing
    // --------------------------------------------------------

    if (!profileSnap.exists()) {

      await signOut(auth);

      throw new Error(
        "حساب Firebase موجود، ولكن ملف العضو غير موجود في Firestore. تم تسجيل الخروج لحماية الحساب."
      );
    }


    const profile =
      profileSnap.data();


    // --------------------------------------------------------
    // 4. Validate Role
    // --------------------------------------------------------

    const role =
      profile.role || "member";


    // --------------------------------------------------------
    // 5. Redirect According To Role
    // --------------------------------------------------------

    showSuccess(
      "تم تسجيل الدخول بنجاح. جاري فتح حسابك..."
    );


    setTimeout(() => {

      if (
        role === "admin" ||
        role === "leadership"
      ) {

        window.location.replace(
          LEADERSHIP_PAGE
        );

        return;
      }


      window.location.replace(
        MEMBER_PAGE
      );

    }, 500);


  } catch (error) {

    showError(
      translateFirebaseError(error)
    );

  } finally {

    setButtonLoading(
      submitButton,
      false
    );
  }
}


// ============================================================
// LOGOUT
// ============================================================

export async function logout() {

  try {

    // --------------------------------------------------------
    // Always attempt Firebase sign out
    // --------------------------------------------------------

    await signOut(auth);

  } catch (error) {

    console.error(
      "[CESS Auth] Logout error:",
      error
    );

  } finally {

    // --------------------------------------------------------
    // IMPORTANT:
    // Even if something unexpected happens, leave the
    // protected page and return to login.
    // --------------------------------------------------------

    window.location.replace(
      LOGIN_PAGE
    );
  }
}


// ============================================================
// Check Existing Session On Login Page
// ============================================================

async function redirectIfAlreadyLoggedIn() {

  try {

    const {
      user,
      profile
    } = await getCurrentSession();


    if (!user || !profile) {
      return;
    }


    const role =
      profile.role || "member";


    if (
      role === "admin" ||
      role === "leadership"
    ) {

      window.location.replace(
        LEADERSHIP_PAGE
      );

      return;
    }


    window.location.replace(
      MEMBER_PAGE
    );

  } catch (error) {

    console.error(
      "[CESS Auth] Existing-session check failed:",
      error
    );
  }
}


// ============================================================
// Form Event Binding
// ============================================================

function initializeAuthForms() {

  const loginForm =
    getElement("loginForm");

  const signupForm =
    getElement("signupForm");


  // ----------------------------------------------------------
  // Login
  // ----------------------------------------------------------

  if (loginForm) {

    loginForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        await login();
      }
    );
  }


  // ----------------------------------------------------------
  // Signup
  // ----------------------------------------------------------

  if (signupForm) {

    signupForm.addEventListener(
      "submit",
      async (event) => {

        event.preventDefault();

        await signup();
      }
    );
  }
}


// ============================================================
// Global Logout Function
// ============================================================
//
// Existing HTML buttons use:
// onclick="cessLogout()"
//
// We keep this global function for compatibility.
// ============================================================

window.cessLogout = logout;


// ============================================================
// Global Login / Signup Access
// ============================================================

window.CESSAuth = {

  login,

  signup,

  logout
};


// ============================================================
// Initialize
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    initializeAuthForms();

    // Only redirect automatically if we are on login page.
    if (
      window.location.pathname.endsWith(
        LOGIN_PAGE
      )
    ) {

      redirectIfAlreadyLoggedIn();
    }
  }
);

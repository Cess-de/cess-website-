/* =========================================================
   CESS — Firebase Configuration
   =========================================================
   INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a project (Spark / free plan is enough).
   3. Add a Web App inside that project.
   4. Copy the config object Firebase gives you and paste
      the real values below, replacing the placeholders.
   5. Enable "Email/Password" under Authentication > Sign-in method.
   6. Create a Firestore database (production mode) under Firestore Database.
   7. Paste the rules from firestore.rules into the Firestore Rules tab.

   Do NOT commit real API keys to a PUBLIC repository if your
   Firebase project has sensitive server-side logic. For a
   Firestore + Auth web app like this, the config values below
   are not secret (they identify the project, not authorize
   access) — real protection comes from Firestore Security Rules,
   not from hiding this file. Still, avoid publishing service
   account keys or admin credentials anywhere in this repo.
   ========================================================= */

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDN_7TJTRb-qeWKnc8Tvabfv6Ry_DHe3Ks",
  authDomain: "cess-website.firebaseapp.com",
  projectId: "cess-website",
  storageBucket: "cess-website.firebasestorage.app",
  messagingSenderId: "692636042706",
  appId: "1:692636042706:web:50cdd4cebd0e66426fb40b",
  measurementId: "G-3RFMM5CLEW"
};

// Initialize Firebase (compat SDK — no build step required)
firebase.initializeApp(firebaseConfig);

// Shared references used across all pages/scripts
const auth = firebase.auth();
const db = firebase.firestore();

/* =========================================================
   Centralized constants — change once, applies everywhere
   ========================================================= */
const CESS_CONFIG = {
  logoPath: "cess-logo.png", // Replace this file later; every page references this constant, not a hard-coded path
  contactEmail: "cess.civil.engineering@gmail.com",
  roles: {
    MEMBER: "member",
    LEADERSHIP: "leadership",
    ADMIN: "admin"
  },
  collections: {
    USERS: "users",
    ACTIVITIES: "activities",
    ANNOUNCEMENTS: "announcements",
    RESOURCES: "resources",
    PUBLIC_ARCHIVE: "publicArchive",
    HISTORY: "history",
    COMMITTEES: "committees",
    MEETINGS: "meetings",
    REPORTS: "reports",
    INTERNAL_DOCUMENTS: "internalDocuments",
    HANDOVER: "handover",
    SETTINGS: "settings"
  }
};

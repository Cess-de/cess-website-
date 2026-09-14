/* =========================================================
   CESS — Firebase Core (Modular SDK)
   =========================================================
   Single point of Firebase initialization for the entire app.
   Every other module imports `auth` and `db` from HERE ONLY.
   No other file may call initializeApp() or getAuth()/getFirestore().

   INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a project (Spark / free plan is enough).
   3. Add a Web App inside that project.
   4. Copy the config object Firebase gives you into firebaseConfig below.
   5. Enable "Email/Password" under Authentication > Sign-in method.
   6. Create a Firestore database (production mode).
   7. Paste the contents of firestore.rules into the Firestore Rules tab.

   The values below identify the project — they are not secret.
   Real protection comes from Firestore Security Rules, not from
   hiding this file. Never put service-account keys, Apps Script
   secrets, or Drive credentials in any frontend file.
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Re-export the modular functions so every other file imports
// them from this one place — no page re-imports the CDN URL directly.
export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
};

/* =========================================================
   Centralized constants — change once, applies everywhere
   ========================================================= */
export const CESS_CONFIG = {
  logoPath: "assets/cess-logo.png", // Replace this file later; every page references this constant
  contactEmail: "cess.civil.engineering@gmail.com",
  roles: {
    MEMBER: "member",
    LEADERSHIP: "leadership",
    ADMIN: "admin"
  },
  statuses: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended"
  },
  collections: {
    USERS: "users",
    ACTIVITIES: "activities",
    ANNOUNCEMENTS: "announcements",
    RESOURCES: "resources",
    HISTORY: "history",
    PUBLIC_ARCHIVE: "publicArchive",
    MEETINGS: "meetings",
    REPORTS: "reports",
    COMMITTEES: "committees",
    INTERNAL_DOCUMENTS: "internalDocuments",
    HANDOVER: "handover",
    SETTINGS: "settings"
  },
  activityCategories: ["workshop", "lecture", "competition", "volunteering", "meeting", "social", "training", "campaign", "other"],
  resourceCategories: ["lecture", "book", "course", "software", "engineering", "academic", "career", "other"],
  handoverCategories: ["finance", "media", "membership", "activities", "administration", "documents", "accounts", "other"]
};

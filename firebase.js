/* =========================================================
   CESS — Firebase Core (Modular SDK)
   =========================================================
   Single point of Firebase initialization for the entire app.
   Every other module imports `auth` and `db` from HERE ONLY.
   No other file may call initializeApp() or getAuth()/getFirestore().

   INSTRUCTIONS:
   1. Go to https://console.firebase.google.com
   2. Create a Firebase project (Spark / free plan is enough).
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


/* =========================================================
   Firebase Configuration
   CESS — The Technological University
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDN_7TRb-qeWKnc8Tvabfv6Ry_DHe3Ks",
  authDomain: "cess-website.firebaseapp.com",
  projectId: "cess-website",
  storageBucket: "cess-website.firebasestorage.app",
  messagingSenderId: "692636042706",
  appId: "1:692636042706:web:50cdd4cebd0e66426fb40b",
  measurementId: "G-3RFMM5CLEW"
};


/* =========================================================
   Initialize Firebase
   ========================================================= */

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);


/* =========================================================
   Re-export Firebase functions
   =========================================================
   Every other module imports Firebase functions from this file.
   No page re-imports the Firebase CDN URLs directly.
   ========================================================= */

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
   Centralized CESS Configuration
   ========================================================= */

export const CESS_CONFIG = {

  /* ---------------------------------------------------------
     General
     --------------------------------------------------------- */

  logoPath: "assets/cess-logo.png",

  contactEmail: "cess.civil.engineering@gmail.com",


  /* ---------------------------------------------------------
     User Roles
     --------------------------------------------------------- */

  roles: {
    MEMBER: "member",
    LEADERSHIP: "leadership",
    ADMIN: "admin"
  },


  /* ---------------------------------------------------------
     User Statuses
     --------------------------------------------------------- */

  statuses: {
    ACTIVE: "active",
    INACTIVE: "inactive",
    SUSPENDED: "suspended"
  },


  /* ---------------------------------------------------------
     Firestore Collections
     --------------------------------------------------------- */

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


  /* ---------------------------------------------------------
     Activity Categories
     --------------------------------------------------------- */

  activityCategories: [
    "workshop",
    "lecture",
    "competition",
    "volunteering",
    "meeting",
    "social",
    "training",
    "campaign",
    "other"
  ],


  /* ---------------------------------------------------------
     Resource Categories
     --------------------------------------------------------- */

  resourceCategories: [
    "lecture",
    "book",
    "course",
    "software",
    "engineering",
    "academic",
    "career",
    "other"
  ],


  /* ---------------------------------------------------------
     Handover Categories
     --------------------------------------------------------- */

  handoverCategories: [
    "finance",
    "media",
    "membership",
    "activities",
    "administration",
    "documents",
    "accounts",
    "other"
  ]

};

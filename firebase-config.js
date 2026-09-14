// ============================================================
// CESS — Firebase Configuration
// Civil Engineering Student Society
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


// ------------------------------------------------------------
// Firebase Web App Configuration
// ------------------------------------------------------------

const firebaseConfig = {
  apiKey: "AIzaSyDN_7TJTRb-qeWKnc8Tvabfv6Ry_DHe3Ks",
  authDomain: "cess-website.firebaseapp.com",
  projectId: "cess-website",
  storageBucket: "cess-website.firebasestorage.app",
  messagingSenderId: "692636042706",
  appId: "1:692636042706:web:50cdd4cebd0e66426fb40b",
  measurementId: "G-3RFMM5CLEW"
};


// ------------------------------------------------------------
// Initialize Firebase
// ------------------------------------------------------------

const app = initializeApp(firebaseConfig);


// ------------------------------------------------------------
// Firebase Authentication
// ------------------------------------------------------------

const auth = getAuth(app);


// Keep the user signed in when the page is refreshed
// or the browser is closed and opened again.
await setPersistence(auth, browserLocalPersistence);


// ------------------------------------------------------------
// Firestore Database
// ------------------------------------------------------------

const db = getFirestore(app);


// ------------------------------------------------------------
// Exports
// ------------------------------------------------------------

export {
  app,
  auth,
  db
};

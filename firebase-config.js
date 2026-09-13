// ============================================================================
// CESS — Firebase configuration & initialization
//
// Replace the placeholder values below with your actual Firebase project
// config. You get these from: Firebase Console → Project Settings →
// General → "Your apps" → Web app → SDK setup and configuration.
//
// This file is imported (as a module) by every page that needs Firebase.
// It uses the Firebase v10 modular SDK loaded directly from the CDN, so
// no build step, npm, or Node.js is required — works from any browser,
// including on an iPhone.
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// TODO: Replace with your real Firebase config (Spark/free plan is sufficient)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };

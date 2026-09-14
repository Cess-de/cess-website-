/* =========================================================
   CESS — Authoritative Firebase initialization
   =========================================================
   Single source of truth.

   Every page must load:
   1. Firebase Compat CDN scripts
   2. This file
   3. Application JavaScript

   Runtime:
   Firebase Compat 10.12.2

   IMPORTANT:
   This project intentionally uses the Compat / namespaced
   API consistently. Do not add random modular Firebase
   imports to individual application files.
   ========================================================= */


/* =========================================================
   1. Firebase SDK safety check
   ========================================================= */

if (typeof firebase === "undefined") {
  throw new Error(
    "CESS Firebase SDK is not loaded. " +
    "Load Firebase Compat scripts before firebase-config.js."
  );
}


/* =========================================================
   2. Firebase project configuration
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
   3. Initialize Firebase exactly once
   ========================================================= */

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


/* =========================================================
   4. Canonical Firebase services
   ========================================================= */

const auth = firebase.auth();
const db = firebase.firestore();


/* =========================================================
   5. Firestore settings
   =========================================================
   IMPORTANT:
   This must happen immediately after obtaining the
   Firestore instance and before application code starts
   using Firestore.
   ========================================================= */

try {

  db.settings({
    ignoreUndefinedProperties: true
  });

} catch (error) {

  console.warn(
    "[CESS Firebase] Firestore settings could not be applied:",
    error
  );

}


/* =========================================================
   6. CESS application configuration
   ========================================================= */

const CESS_CONFIG = {

  firebaseConfig,

  /* -------------------------------------------------------
     Roles
     ------------------------------------------------------- */

  roles: {

    MEMBER: "member",

    LEADERSHIP: "leadership",

    ADMIN: "admin"

  },


  /* -------------------------------------------------------
     User statuses
     ------------------------------------------------------- */

  statuses: {

    ACTIVE: "active",

    INACTIVE: "inactive",

    SUSPENDED: "suspended"

  },


  /* -------------------------------------------------------
     Firestore collections
     ------------------------------------------------------- */

  collections: {

    USERS:
      "users",

    ACTIVITIES:
      "activities",

    ANNOUNCEMENTS:
      "announcements",

    RESOURCES:
      "resources",

    PUBLIC_ARCHIVE:
      "publicArchive",

    HISTORY:
      "history",

    COMMITTEES:
      "committees",

    MEETINGS:
      "meetings",

    REPORTS:
      "reports",

    INTERNAL_DOCUMENTS:
      "internalDocuments",

    HANDOVER:
      "handover",

    SETTINGS:
      "settings"

  },


  /* -------------------------------------------------------
     Website information
     ------------------------------------------------------- */

  site: {

    name:
      "CESS",

    fullName:
      "Civil Engineering Student Society",

    contactEmail:
      "cess.civil.engineering@gmail.com",

    logoPath:
      "cess-logo.png",

    universityEn:
      "The Technological University",

    universityAr:
      "الجامعة التكنولوجية",

    departmentEn:
      "Civil Engineering Department",

    departmentAr:
      "قسم الهندسة المدنية"

  },


  /* -------------------------------------------------------
     General limits
     ------------------------------------------------------- */

  limits: {

    publicQueryMax:
      50,

    adminUsersMax:
      500,

    adminActivitiesMax:
      500

  }

};


/* =========================================================
   7. Global CESS configuration
   ========================================================= */

window.CESS_CONFIG = CESS_CONFIG;


/* =========================================================
   8. Global Firebase handles
   ========================================================= */

window.CESS_FIREBASE = {

  app:
    firebase.app(),

  auth,

  db,

  FieldValue:
    firebase.firestore.FieldValue,

  Timestamp:
    firebase.firestore.Timestamp

};


/* =========================================================
   9. Legacy aliases
   =========================================================
   These are intentionally preserved because some older
   CESS files may still expect window.auth / window.db.
   ========================================================= */

window.auth = auth;

window.db = db;


/* =========================================================
   10. Development diagnostic
   ========================================================= */

console.info(
  "[CESS Firebase] Initialized successfully:",
  {
    projectId: firebaseConfig.projectId,
    runtime: "Firebase Compat 10.12.2",
    auth: !!auth,
    firestore: !!db
  }
);

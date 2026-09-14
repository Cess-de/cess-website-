/* =========================================================
   CESS — Firestore Services
   =========================================================
   Runtime:
   - Firebase Compat 10.12.2
   - ES Module
   - Uses window.db / window.firebase from firebase-config.js

   UI key:
   - archive -> Firestore collection: publicArchive

   Security:
   - User role/status updates intentionally write ONLY
     the fields allowed by Firestore Security Rules.
   ========================================================= */

import {
  COLLECTIONS,
  LIMITS
} from "../config.js";


/* =========================================================
   FIREBASE HANDLES
   ========================================================= */

const db = window.db;
const firebase = window.firebase;

if (!db || !firebase) {
  throw new Error(
    "CESS services: Firebase is not initialized. " +
    "Load firebase-config.js before importing services."
  );
}

const FieldValue = firebase.firestore.FieldValue;


/* =========================================================
   COLLECTIONS
   ========================================================= */

const C = {
  ...COLLECTIONS,

  /*
    Defensive fallbacks.
    These are only used if a collection key is missing
    from js/config.js.
  */
  USERS: COLLECTIONS.USERS || "users",
  ACTIVITIES: COLLECTIONS.ACTIVITIES || "activities",
  ANNOUNCEMENTS: COLLECTIONS.ANNOUNCEMENTS || "announcements",
  RESOURCES: COLLECTIONS.RESOURCES || "resources",
  PUBLIC_ARCHIVE: COLLECTIONS.PUBLIC_ARCHIVE || "publicArchive",
  HISTORY: COLLECTIONS.HISTORY || "history",
  COMMITTEES: COLLECTIONS.COMMITTEES || "committees",
  MEETINGS: COLLECTIONS.MEETINGS || "meetings",
  REPORTS: COLLECTIONS.REPORTS || "reports",
  INTERNAL_DOCUMENTS:
    COLLECTIONS.INTERNAL_DOCUMENTS || "internalDocuments",
  HANDOVER: COLLECTIONS.HANDOVER || "handover",
  SETTINGS: COLLECTIONS.SETTINGS || "settings"
};


/* =========================================================
   HELPERS
   ========================================================= */

function mapSnapshot(snap) {
  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
}


function mapUserSnapshot(snap) {
  return snap.docs.map((doc) => ({
    uid: doc.id,
    ...doc.data()
  }));
}


function serverTimestamp() {
  return FieldValue.serverTimestamp();
}


/* =========================================================
   GENERIC COLLECTION SERVICE FACTORY
   ========================================================= */

export function svc(collectionName, options = {}) {
  const {
    publicFilter = null,
    orderField = null,
    orderDir = "desc"
  } = options;

  return {

    /* -----------------------------------------------------
       LIST PUBLIC
       ----------------------------------------------------- */

    async listPublic(override = {}) {
      let query = db.collection(collectionName);

      if (publicFilter) {
        query = query.where(
          publicFilter[0],
          publicFilter[1],
          publicFilter[2]
        );
      }

      const field =
        override.orderField !== undefined
          ? override.orderField
          : orderField;

      const direction =
        override.orderDir !== undefined
          ? override.orderDir
          : orderDir;

      if (field) {
        query = query.orderBy(field, direction);
      }

      const max =
        override.max ||
        LIMITS.PUBLIC_QUERY_MAX ||
        50;

      query = query.limit(max);

      const snap = await query.get();

      return mapSnapshot(snap);
    },


    /* -----------------------------------------------------
       LIST ALL
       ----------------------------------------------------- */

    async listAll(override = {}) {
      let query = db.collection(collectionName);

      const field =
        override.orderField !== undefined
          ? override.orderField
          : orderField;

      const direction =
        override.orderDir !== undefined
          ? override.orderDir
          : orderDir;

      if (field) {
        query = query.orderBy(field, direction);
      }

      const max =
        override.max ||
        500;

      query = query.limit(max);

      const snap = await query.get();

      return mapSnapshot(snap);
    },


    /* -----------------------------------------------------
       GET ONE
       ----------------------------------------------------- */

    async get(id) {
      if (!id) {
        throw new Error(
          `Cannot get ${collectionName}: missing document ID.`
        );
      }

      const snap = await db
        .collection(collectionName)
        .doc(id)
        .get();

      if (!snap.exists) {
        return null;
      }

      return {
        id: snap.id,
        ...snap.data()
      };
    },


    /* -----------------------------------------------------
       CREATE
       ----------------------------------------------------- */

    async create(data, uid = null) {
      const payload = {
        ...data,

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        createdBy: uid || null,
        updatedBy: uid || null
      };

      const ref = await db
        .collection(collectionName)
        .add(payload);

      return ref.id;
    },


    /* -----------------------------------------------------
       UPDATE
       ----------------------------------------------------- */

    async update(id, patch, uid = null) {
      if (!id) {
        throw new Error(
          `Cannot update ${collectionName}: missing document ID.`
        );
      }

      await db
        .collection(collectionName)
        .doc(id)
        .update({
          ...patch,

          updatedAt: serverTimestamp(),
          updatedBy: uid || null
        });
    },


    /* -----------------------------------------------------
       DELETE
       ----------------------------------------------------- */

    async remove(id) {
      if (!id) {
        throw new Error(
          `Cannot delete ${collectionName}: missing document ID.`
        );
      }

      await db
        .collection(collectionName)
        .doc(id)
        .delete();
    }
  };
}


/* =========================================================
   CONTENT SERVICES
   ========================================================= */

export const activitiesService = svc(
  C.ACTIVITIES,
  {
    publicFilter: ["published", "==", true],
    orderField: "date",
    orderDir: "desc"
  }
);


export const announcementsService = svc(
  C.ANNOUNCEMENTS,
  {
    publicFilter: ["published", "==", true],
    orderField: "date",
    orderDir: "desc"
  }
);


export const resourcesService = svc(
  C.RESOURCES,
  {
    publicFilter: ["published", "==", true],
    orderField: "createdAt",
    orderDir: "desc"
  }
);


export const archiveService = svc(
  C.PUBLIC_ARCHIVE,
  {
    publicFilter: ["published", "==", true],
    orderField: "createdAt",
    orderDir: "desc"
  }
);


export const historyService = svc(
  C.HISTORY,
  {
    publicFilter: ["published", "==", true],
    orderField: "order",
    orderDir: "asc"
  }
);


export const meetingsService = svc(
  C.MEETINGS,
  {
    orderField: "date",
    orderDir: "desc"
  }
);


export const reportsService = svc(
  C.REPORTS,
  {
    orderField: "createdAt",
    orderDir: "desc"
  }
);


export const committeesService = svc(
  C.COMMITTEES,
  {
    orderField: "createdAt",
    orderDir: "desc"
  }
);


export const internalDocumentsService = svc(
  C.INTERNAL_DOCUMENTS,
  {
    orderField: "createdAt",
    orderDir: "desc"
  }
);


export const handoverService = svc(
  C.HANDOVER,
  {
    orderField: "createdAt",
    orderDir: "desc"
  }
);


/* =========================================================
   USERS SERVICE
   =========================================================
   IMPORTANT:

   Firestore Rules currently allow an Admin to change only:
     - role
     - status

   Therefore these two functions MUST NOT send:
     - updatedAt
     - updatedBy
     - any other field

   This keeps the service and Security Rules synchronized.
   ========================================================= */

export async function listUsers() {
  const snap = await db
    .collection(C.USERS)
    .orderBy("name", "asc")
    .limit(
      LIMITS.ADMIN_USERS ||
      500
    )
    .get();

  return mapUserSnapshot(snap);
}


export async function getUser(uid) {
  if (!uid) {
    throw new Error("Cannot get user: missing UID.");
  }

  const snap = await db
    .collection(C.USERS)
    .doc(uid)
    .get();

  if (!snap.exists) {
    return null;
  }

  return {
    uid: snap.id,
    ...snap.data()
  };
}


export async function updateUserRole(
  uid,
  role
) {
  if (!uid) {
    throw new Error("Cannot update user role: missing UID.");
  }

  if (!role) {
    throw new Error("Cannot update user role: missing role.");
  }

  /*
    DO NOT add updatedAt / updatedBy here.
    Firestore Rules intentionally allow only role/status.
  */

  await db
    .collection(C.USERS)
    .doc(uid)
    .update({
      role
    });
}


export async function updateUserStatus(
  uid,
  status
) {
  if (!uid) {
    throw new Error("Cannot update user status: missing UID.");
  }

  if (!status) {
    throw new Error("Cannot update user status: missing status.");
  }

  /*
    DO NOT add updatedAt / updatedBy here.
    Firestore Rules intentionally allow only role/status.
  */

  await db
    .collection(C.USERS)
    .doc(uid)
    .update({
      status
    });
}


export async function deleteUser(uid) {
  if (!uid) {
    throw new Error("Cannot delete user: missing UID.");
  }

  await db
    .collection(C.USERS)
    .doc(uid)
    .delete();
}


/*
  Named users service object.
  Useful for code that prefers:
    usersService.list()
    usersService.updateRole()
*/

export const usersService = {
  list: listUsers,
  get: getUser,
  updateRole: updateUserRole,
  updateStatus: updateUserStatus,
  delete: deleteUser
};


/* =========================================================
   SETTINGS SERVICE
   ========================================================= */

export const settingsService = {

  async get(docId) {
    if (!docId) {
      throw new Error(
        "Cannot get settings: missing document ID."
      );
    }

    const snap = await db
      .collection(C.SETTINGS)
      .doc(docId)
      .get();

    return snap.exists
      ? snap.data()
      : null;
  },


  async set(
    docId,
    data,
    uid = null
  ) {
    if (!docId) {
      throw new Error(
        "Cannot save settings: missing document ID."
      );
    }

    await db
      .collection(C.SETTINGS)
      .doc(docId)
      .set(
        {
          ...data,

          updatedAt: serverTimestamp(),
          updatedBy: uid || null
        },
        {
          merge: true
        }
      );
  },


  /*
    Alias used by some dashboard code.
    Example:
      settingsService.getSingleton("site")
  */

  async getSingleton(docId) {
    return this.get(docId);
  },


  async setSingleton(
    docId,
    data,
    uid = null
  ) {
    return this.set(
      docId,
      data,
      uid
    );
  }
};


/* =========================================================
   SERVICES MAP
   =========================================================
   This is the central service registry used by CMS/admin/
   leadership pages.
   ========================================================= */

export const SERVICES = {

  activities:
    activitiesService,

  announcements:
    announcementsService,

  resources:
    resourcesService,

  /*
    UI key:
      archive

    Firestore:
      publicArchive
  */
  archive:
    archiveService,

  history:
    historyService,

  meetings:
    meetingsService,

  reports:
    reportsService,

  committees:
    committeesService,

  internalDocuments:
    internalDocumentsService,

  handover:
    handoverService
};


/* =========================================================
   BACKWARD-COMPATIBILITY GLOBAL
   =========================================================
   Keeps compatibility with older files that may still use:

     window.CESS_SERVICES.activities
     window.CESS_SERVICES.users
     window.CESS_SERVICES.settings

   New code should prefer ES module imports.
   ========================================================= */

window.CESS_SERVICES = {
  ...SERVICES,

  users:
    usersService,

  settings:
    settingsService,

  svc
};

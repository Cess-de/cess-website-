/* =========================================================
   CESS — Collection Services
   =========================================================
   One named service per Firestore collection, all built on the
   shared CRUD factory. Import the specific service(s) a page needs,
   e.g.:  import { activitiesService } from "../services/collections.js";
   ========================================================= */

import { createService } from "./firestore-service.js";
import { db, doc, getDoc, setDoc, updateDoc, getDocs, collection, query, where, serverTimestamp } from "../core/firebase.js";
import { CESS_CONFIG } from "../core/firebase.js";

export const activitiesService = createService(CESS_CONFIG.collections.ACTIVITIES, { orderByField: "date", orderDirection: "desc" });
export const announcementsService = createService(CESS_CONFIG.collections.ANNOUNCEMENTS, { orderByField: "createdAt" });
export const resourcesService = createService(CESS_CONFIG.collections.RESOURCES, { orderByField: "createdAt" });
export const historyService = createService(CESS_CONFIG.collections.HISTORY, { orderByField: "order", orderDirection: "asc" });
export const publicArchiveService = createService(CESS_CONFIG.collections.PUBLIC_ARCHIVE, { orderByField: "date", orderDirection: "desc" });
export const meetingsService = createService(CESS_CONFIG.collections.MEETINGS, { orderByField: "date", orderDirection: "desc" });
export const reportsService = createService(CESS_CONFIG.collections.REPORTS, { orderByField: "periodStart", orderDirection: "desc" });
export const committeesService = createService(CESS_CONFIG.collections.COMMITTEES, { orderByField: "createdAt" });
export const internalDocumentsService = createService(CESS_CONFIG.collections.INTERNAL_DOCUMENTS, { orderByField: "createdAt" });
export const handoverService = createService(CESS_CONFIG.collections.HANDOVER, { orderByField: "createdAt" });

/* ---------- Users (special-cased: no generic publish/feature semantics) ---------- */

export const usersService = {
  async list() {
    const snap = await getDocs(collection(db, CESS_CONFIG.collections.USERS));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
  async getById(uid) {
    const snap = await getDoc(doc(db, CESS_CONFIG.collections.USERS, uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },
  /** Admin-only in Firestore rules. Refuses client-side to self-demote/self-delete guard patterns downstream. */
  async setRole(uid, role) {
    await updateDoc(doc(db, CESS_CONFIG.collections.USERS, uid), { role, updatedAt: serverTimestamp() });
  },
  async setStatus(uid, status) {
    await updateDoc(doc(db, CESS_CONFIG.collections.USERS, uid), { status, updatedAt: serverTimestamp() });
  },
  async updateOwnProfile(uid, data) {
    const { role, status, uid: _uid, email, ...safeData } = data; // role/status/uid/email are never client-writable here
    await updateDoc(doc(db, CESS_CONFIG.collections.USERS, uid), { ...safeData, updatedAt: serverTimestamp() });
  }
};

/* ---------- Settings (singleton documents) ---------- */

export const settingsService = {
  async getSite() {
    const snap = await getDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "site"));
    return snap.exists() ? snap.data() : null;
  },
  async saveSite(data, uid) {
    await setDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "site"), { ...data, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
  },
  async getSocialLinks() {
    const snap = await getDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "socialLinks"));
    return snap.exists() ? snap.data() : {};
  },
  async saveSocialLinks(data, uid) {
    await setDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "socialLinks"), { ...data, updatedAt: serverTimestamp(), updatedBy: uid }, { merge: true });
  },
  async getPublicStatistics() {
    const snap = await getDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "publicStatistics"));
    return snap.exists() ? snap.data() : {};
  },
  /**
   * Recomputes stats from live collections. Kept as a controlled admin
   * action (not a Cloud Function trigger) since the project targets the
   * free Firebase Spark plan with no server-side aggregation billing.
   */
  async refreshPublicStatistics(uid) {
    const [activitiesSnap, usersSnap, resourcesSnap, historySnap] = await Promise.all([
      getDocs(query(collection(db, CESS_CONFIG.collections.ACTIVITIES), where("published", "==", true))),
      getDocs(collection(db, CESS_CONFIG.collections.USERS)),
      getDocs(query(collection(db, CESS_CONFIG.collections.RESOURCES), where("published", "==", true))),
      getDocs(collection(db, CESS_CONFIG.collections.HISTORY))
    ]);
    const membersCount = usersSnap.docs.filter((d) => {
      const role = d.data().role;
      return role === CESS_CONFIG.roles.MEMBER || role === CESS_CONFIG.roles.LEADERSHIP;
    }).length;
    const yearsCount = new Set(historySnap.docs.map((d) => d.data().year).filter(Boolean)).size;

    const stats = {
      activitiesCount: activitiesSnap.size,
      membersCount,
      yearsCount,
      resourcesCount: resourcesSnap.size,
      manualOverride: false,
      updatedAt: serverTimestamp(),
      updatedBy: uid
    };
    await setDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "publicStatistics"), stats, { merge: true });
    return stats;
  },
  async saveManualStatistics(stats, uid) {
    await setDoc(doc(db, CESS_CONFIG.collections.SETTINGS, "publicStatistics"), {
      ...stats, manualOverride: true, updatedAt: serverTimestamp(), updatedBy: uid
    }, { merge: true });
  }
};

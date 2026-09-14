/* =========================================================
   CESS — Generic Firestore Data-Service Factory
   =========================================================
   No UI component talks to Firestore directly. Every collection
   gets a small service object (see services/*.js) built from this
   factory, so CRUD behavior, audit fields, and error shape stay
   consistent across all ~11 content collections.
   ========================================================= */

import {
  db, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit as fsLimit, serverTimestamp
} from "../core/firebase.js";
import { getCurrentSession } from "../core/session.js";

/**
 * Builds a CRUD service bound to one Firestore collection.
 * @param {string} collectionName
 * @param {object} opts
 *   opts.orderByField   - default field for listAll()/listPublished() ordering
 *   opts.orderDirection - "asc" | "desc" (default "desc")
 */
export function createService(collectionName, opts = {}) {
  const orderField = opts.orderByField || "createdAt";
  const orderDir = opts.orderDirection || "desc";
  const col = collection(db, collectionName);

  function sortByOrderField(docs) {
    return [...docs].sort((a, b) => {
      let av = a[orderField];
      let bv = b[orderField];
      av = av?.toMillis ? av.toMillis() : av;
      bv = bv?.toMillis ? bv.toMillis() : bv;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      if (av < bv) return orderDir === "asc" ? -1 : 1;
      if (av > bv) return orderDir === "asc" ? 1 : -1;
      return 0;
    });
  }

  async function currentUid() {
    const { user } = await getCurrentSession();
    return user ? user.uid : null;
  }

  return {
    /**
     * Fetches every document (leadership/admin views — rules allow this for
     * their role). NOTE: Firestore's orderBy() silently excludes documents
     * that are missing the ordered field entirely — a real risk with
     * legacy/imported records (see migration notes in SETUP-GUIDE.md). If
     * documents seem to be missing from an admin list, check they have the
     * `${orderField}` field set, not just that the fetch failed.
     */
    async listAll(max = 200) {
      const q = query(col, orderBy(orderField, orderDir), fsLimit(max));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    },

    /**
     * Fetches only published documents — required shape for public rules
     * (see firestore.rules). Sorted client-side by the collection's
     * configured order field: adding orderBy() to this query would need a
     * Firestore composite index (where + orderBy on different fields)
     * created manually in the console before the query works, which is an
     * easy way to ship a broken public page. Client-side sort avoids that
     * deploy trap at the cost of sorting after fetch rather than in Firestore.
     */
    async listPublished(max = 50) {
      const q = query(col, where("published", "==", true), fsLimit(max));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return sortByOrderField(docs);
    },

    /** Fetches only published + featured documents. Same client-side sort as listPublished(). */
    async listFeatured(max = 12) {
      const q = query(col, where("published", "==", true), where("featured", "==", true), fsLimit(max));
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return sortByOrderField(docs);
    },

    async getById(id) {
      const snap = await getDoc(doc(db, collectionName, id));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },

    /** Creates a document with server-managed audit fields. Client-supplied createdBy/createdAt is always overwritten. */
    async create(data) {
      const uid = await currentUid();
      const ref = await addDoc(col, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: uid,
        updatedBy: uid
      });
      return ref.id;
    },

    /** Updates a document. createdAt/createdBy are never touched here — only updatedAt/updatedBy. */
    async update(id, data) {
      const uid = await currentUid();
      const { createdAt, createdBy, ...safeData } = data;
      await updateDoc(doc(db, collectionName, id), {
        ...safeData,
        updatedAt: serverTimestamp(),
        updatedBy: uid
      });
    },

    async remove(id) {
      await deleteDoc(doc(db, collectionName, id));
    },

    async setPublished(id, published) {
      const uid = await currentUid();
      await updateDoc(doc(db, collectionName, id), {
        published,
        updatedAt: serverTimestamp(),
        updatedBy: uid
      });
    },

    async setFeatured(id, featured) {
      const uid = await currentUid();
      await updateDoc(doc(db, collectionName, id), {
        featured,
        updatedAt: serverTimestamp(),
        updatedBy: uid
      });
    }
  };
}

/* =========================================================
   CESS — Admin Dashboard Logic
   =========================================================
   Admin can manage users/roles, all content collections, social
   links, and the public-statistics aggregate document.

   SECURITY NOTE: Every write this file performs is re-checked
   server-side by Firestore rules for the "admin" role. This
   client code is a convenience UI; a user cannot gain these
   abilities by editing this file locally, because the rules
   enforce role on the server, not the client.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.ADMIN], () => {
    loadUsersTable();
    loadAdminActivitiesTable();
    loadAdminCollectionCards(CESS_CONFIG.collections.ANNOUNCEMENTS, "admin-announcements");
    loadAdminCollectionCards(CESS_CONFIG.collections.RESOURCES, "admin-resources");
    loadAdminCollectionCards(CESS_CONFIG.collections.PUBLIC_ARCHIVE, "admin-archive");
    loadAdminCollectionCards(CESS_CONFIG.collections.HISTORY, "admin-history");
    loadSocialLinksForm();
    loadStatsPreview();
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);

  document.getElementById("social-links-form").addEventListener("submit", saveSocialLinks);
  document.getElementById("refresh-stats-btn").addEventListener("click", refreshStatistics);

  document.getElementById("new-activity-btn").addEventListener("click", () => {
    alert(
      getLang() === "ar"
        ? "لإضافة نشاط جديد، أضف مستندًا في مجموعة Firestore 'activities' من لوحة Firebase أو ابنِ نموذجًا مخصصًا. هذا النموذج الأساسي يوضح البنية المطلوبة."
        : "To add a new activity, add a document to the 'activities' Firestore collection from the Firebase console, or build a custom form. This starter focuses on correct structure and security over a full custom CMS UI."
    );
  });
  ["new-announcement-btn", "new-resource-btn", "new-archive-btn", "new-history-btn"].forEach((id) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", () => {
        alert(
          getLang() === "ar"
            ? "أضف مستندًا جديدًا من لوحة Firebase Firestore باستخدام الحقول الموضحة في وثائق المشروع."
            : "Add a new document from the Firebase Firestore console using the fields documented in the project's setup guide."
        );
      });
    }
  });
});

/* ---------- Users & Roles ---------- */

async function loadUsersTable() {
  const tbody = document.getElementById("users-table");
  if (!tbody) return;

  try {
    const snapshot = await db.collection(CESS_CONFIG.collections.USERS).get();
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No users yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${data.name || "—"}</td>
        <td>${data.batch || "—"}</td>
        <td>
          <select data-uid="${doc.id}" class="role-select">
            <option value="member" ${data.role === "member" ? "selected" : ""}>member</option>
            <option value="leadership" ${data.role === "leadership" ? "selected" : ""}>leadership</option>
            <option value="admin" ${data.role === "admin" ? "selected" : ""}>admin</option>
          </select>
        </td>
        <td><button class="btn btn-outline save-role-btn" data-uid="${doc.id}">Save</button></td>
      `;
      tbody.appendChild(row);
    });

    tbody.querySelectorAll(".save-role-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const uid = btn.getAttribute("data-uid");
        const select = tbody.querySelector(`.role-select[data-uid="${uid}"]`);
        const newRole = select.value;
        try {
          // Admin assigning another user's role — permitted by Firestore
          // rules for admin only. Users can never write their own role field.
          await db.collection(CESS_CONFIG.collections.USERS).doc(uid).update({ role: newRole });
          btn.textContent = "Saved ✓";
          setTimeout(() => (btn.textContent = "Save"), 1500);
        } catch (err) {
          console.error("Failed to update role:", err);
          alert(getLang() === "ar" ? "تعذر تحديث الدور." : "Failed to update role.");
        }
      });
    });
  } catch (err) {
    console.error("Failed to load users:", err);
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Unable to load users right now.</td></tr>`;
  }
}

/* ---------- Activities Table (Admin) ---------- */

async function loadAdminActivitiesTable() {
  const tbody = document.getElementById("admin-activities-table");
  if (!tbody) return;

  try {
    const snapshot = await db.collection(CESS_CONFIG.collections.ACTIVITIES).orderBy("date", "desc").get();
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="4" class="empty-state">No activities available yet.</td></tr>`;
      return;
    }
    tbody.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${pickLang(data, "title")}</td>
        <td>${formatDate(data.date)}</td>
        <td>${data.published ? "✅" : "—"}</td>
        <td>
          <button class="btn btn-outline toggle-publish-btn" data-id="${doc.id}" data-published="${!!data.published}">
            ${data.published ? "Unpublish" : "Publish"}
          </button>
          <button class="btn btn-danger delete-activity-btn" data-id="${doc.id}">Delete</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    tbody.querySelectorAll(".toggle-publish-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const currentlyPublished = btn.getAttribute("data-published") === "true";
        try {
          await db.collection(CESS_CONFIG.collections.ACTIVITIES).doc(id).update({
            published: !currentlyPublished,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          loadAdminActivitiesTable();
        } catch (err) {
          console.error("Failed to toggle publish state:", err);
          alert(getLang() === "ar" ? "تعذر تحديث حالة النشر." : "Failed to update publish state.");
        }
      });
    });

    tbody.querySelectorAll(".delete-activity-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-id");
        const confirmMsg = getLang() === "ar" ? "هل أنت متأكد من حذف هذا النشاط؟" : "Delete this activity? This cannot be undone.";
        if (!confirm(confirmMsg)) return;
        try {
          await db.collection(CESS_CONFIG.collections.ACTIVITIES).doc(id).delete();
          loadAdminActivitiesTable();
        } catch (err) {
          console.error("Failed to delete activity:", err);
          alert(getLang() === "ar" ? "تعذر حذف النشاط." : "Failed to delete activity.");
        }
      });
    });
  } catch (err) {
    console.error("Failed to load activities:", err);
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Unable to load activities right now.</td></tr>`;
  }
}

/* ---------- Generic content collection cards (Announcements, Resources, Archive, History) ---------- */

async function loadAdminCollectionCards(collectionName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () => db.collection(collectionName).get(),
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "card";
        item.innerHTML = `
          <div class="card-body">
            <h3>${pickLang(data, "title") || data.stage || "Untitled"}</h3>
            ${"published" in data ? `<p>${getLang() === "ar" ? "الحالة" : "Status"}: ${data.published ? "✅ Published" : "— Draft"}</p>` : ""}
            <button class="btn btn-danger delete-doc-btn" data-collection="${collectionName}" data-id="${doc.id}">Delete</button>
          </div>
        `;
        container.appendChild(item);
      });

      container.querySelectorAll(".delete-doc-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const coll = btn.getAttribute("data-collection");
          const id = btn.getAttribute("data-id");
          const confirmMsg = getLang() === "ar" ? "هل أنت متأكد من الحذف؟" : "Delete this item? This cannot be undone.";
          if (!confirm(confirmMsg)) return;
          try {
            await db.collection(coll).doc(id).delete();
            loadAdminCollectionCards(collectionName, containerId);
          } catch (err) {
            console.error("Failed to delete item:", err);
            alert(getLang() === "ar" ? "تعذر الحذف." : "Failed to delete item.");
          }
        });
      });
    },
    () => renderEmptyState(container, "No items available yet.", "لا توجد عناصر متاحة حتى الآن.")
  );
}

/* ---------- Social Links ---------- */

async function loadSocialLinksForm() {
  try {
    const doc = await db.collection(CESS_CONFIG.collections.SETTINGS).doc("socialLinks").get();
    if (!doc.exists) return;
    const data = doc.data();
    ["facebook", "instagram", "telegram", "whatsapp", "linkedin", "youtube"].forEach((platform) => {
      const input = document.getElementById(`social-${platform}`);
      if (input && data[platform]) input.value = data[platform];
    });
  } catch (err) {
    console.error("Failed to load social links:", err);
  }
}

async function saveSocialLinks(e) {
  e.preventDefault();
  const successEl = document.getElementById("social-save-success");
  successEl.classList.remove("visible");

  const links = {
    facebook: document.getElementById("social-facebook").value.trim(),
    instagram: document.getElementById("social-instagram").value.trim(),
    telegram: document.getElementById("social-telegram").value.trim(),
    whatsapp: document.getElementById("social-whatsapp").value.trim(),
    linkedin: document.getElementById("social-linkedin").value.trim(),
    youtube: document.getElementById("social-youtube").value.trim()
  };

  try {
    await db.collection(CESS_CONFIG.collections.SETTINGS).doc("socialLinks").set(links, { merge: true });
    successEl.classList.add("visible");
    setTimeout(() => successEl.classList.remove("visible"), 2000);
  } catch (err) {
    console.error("Failed to save social links:", err);
    alert(getLang() === "ar" ? "تعذر حفظ روابط التواصل." : "Failed to save social links.");
  }
}

/* ---------- Public Statistics Aggregate ----------
   Because the project must stay on the free Firebase Spark plan
   (no paid Cloud Functions to auto-aggregate on every write),
   the registered-students count is refreshed here by an authenticated
   admin action rather than a server-side trigger. Firestore rules
   restrict writes to this aggregate document to admin only, and
   restrict reads of the full 'users' collection to admin/leadership —
   the public only ever reads this pre-computed aggregate document,
   never the users collection directly. */

async function loadStatsPreview() {
  try {
    const doc = await db.collection(CESS_CONFIG.collections.SETTINGS).doc("publicStatistics").get();
    const data = doc.exists ? doc.data() : {};
    document.getElementById("stat-preview-activities").textContent = data.activitiesCount ?? "—";
    document.getElementById("stat-preview-members").textContent = data.registeredStudentsCount ?? "—";
  } catch (err) {
    console.error("Failed to load statistics preview:", err);
  }
}

async function refreshStatistics() {
  const successEl = document.getElementById("stats-save-success");
  successEl.classList.remove("visible");

  try {
    const [activitiesSnap, usersSnap] = await Promise.all([
      db.collection(CESS_CONFIG.collections.ACTIVITIES).where("published", "==", true).get(),
      db.collection(CESS_CONFIG.collections.USERS).get()
    ]);

    // Count only member + leadership roles — never admin — per spec section 11
    const registeredStudentsCount = usersSnap.docs.filter((doc) => {
      const role = doc.data().role;
      return role === CESS_CONFIG.roles.MEMBER || role === CESS_CONFIG.roles.LEADERSHIP;
    }).length;

    await db.collection(CESS_CONFIG.collections.SETTINGS).doc("publicStatistics").set({
      activitiesCount: activitiesSnap.size,
      registeredStudentsCount: registeredStudentsCount,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    loadStatsPreview();
    successEl.classList.add("visible");
    setTimeout(() => successEl.classList.remove("visible"), 2000);
  } catch (err) {
    console.error("Failed to refresh statistics:", err);
    alert(getLang() === "ar" ? "تعذر تحديث الإحصائيات." : "Failed to refresh statistics.");
  }
}

/* =========================================================
   CESS — Leadership Dashboard Logic
   =========================================================
   Leadership can view/manage activities, announcements,
   resources, public archive, and the private leadership
   archive (meetings, reports, committees, internal documents,
   handover). Leadership CANNOT manage users/roles or site
   settings — those controls simply don't exist on this page,
   and Firestore rules reject any attempt to write to
   admin-only fields even if attempted directly.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.LEADERSHIP, CESS_CONFIG.roles.ADMIN], () => {
    loadActivitiesTable();
    loadAnnouncements("leadership-announcements");
    loadResources("leadership-resources");
    loadArchive("leadership-public-archive");
    loadInternalCollection("meetings", "leadership-meetings");
    loadInternalCollection("reports", "leadership-reports");
    loadInternalCollection("committees", "leadership-committees");
    loadInternalCollection("internalDocuments", "leadership-internal-documents");
    loadInternalCollection("handover", "leadership-handover");
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

/* Shows ALL activities (published + unpublished) since leadership
   needs to see drafts. Firestore rules permit this read for
   leadership/admin roles only. */
async function loadActivitiesTable() {
  const tbody = document.getElementById("leadership-activities-table");
  if (!tbody) return;

  try {
    const snapshot = await db.collection(CESS_CONFIG.collections.ACTIVITIES).orderBy("date", "desc").get();
    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="3" class="empty-state">No activities available yet.</td></tr>`;
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
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error("Failed to load activities:", err);
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Unable to load activities right now.</td></tr>`;
  }
}

/* Generic loader for private leadership-archive collections.
   These collections are only readable by leadership/admin per
   Firestore rules — members and the public get permission-denied. */
async function loadInternalCollection(collectionName, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () => db.collection(collectionName).orderBy("createdAt", "desc").get(),
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "card";
        item.innerHTML = `
          <div class="card-body">
            <h3>${pickLang(data, "title") || data.title || "Untitled"}</h3>
            <p>${pickLang(data, "description") || data.description || ""}</p>
            ${data.driveLink ? `<a href="${data.driveLink}" target="_blank" rel="noopener" class="btn btn-outline">Open</a>` : ""}
          </div>
        `;
        container.appendChild(item);
      });
    },
    () => renderEmptyState(container, "No items available yet.", "لا توجد عناصر متاحة حتى الآن.")
  );
}

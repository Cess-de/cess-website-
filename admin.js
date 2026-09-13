async function loadAdminActivitiesTable() {
  const tbody = document.getElementById("admin-activities-table");
  if (!tbody) return;
  try {
    const snapshot = await db
      .collection(CESS_CONFIG.collections.ACTIVITIES)
      .orderBy("date", "desc")
      .get();
    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            No activities available yet.
          </td>
        </tr>
      `;
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
          <button
            class="btn btn-outline toggle-publish-btn"
            data-id="${doc.id}"
            data-published="${!!data.published}"
          >
            ${data.published ? "Unpublish" : "Publish"}
          </button>
          <button
            class="btn btn-danger delete-activity-btn"
            data-id="${doc.id}"
          >
            Delete
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
    // =========================
    // Publish / Unpublish
    // =========================
    tbody
      .querySelectorAll(".toggle-publish-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const currentlyPublished =
            btn.getAttribute("data-published") === "true";
          try {
            await db
              .collection(CESS_CONFIG.collections.ACTIVITIES)
              .doc(id)
              .update({
                published: !currentlyPublished,
                updatedAt:
                  firebase.firestore.FieldValue.serverTimestamp()
              });
            await loadAdminActivitiesTable();
          } catch (err) {
            console.error(
              "Failed to toggle publish state:",
              err
            );
            alert(
              getLang() === "ar"
                ? "تعذر تحديث حالة النشر."
                : "Failed to update publish state."
            );
          }
        });
      });
    // =========================
    // Delete Activity
    // =========================
    tbody
      .querySelectorAll(".delete-activity-btn")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const id = btn.getAttribute("data-id");
          const confirmMsg =
            getLang() === "ar"
              ? "هل أنت متأكد من حذف هذا النشاط؟"
              : "Delete this activity? This cannot be undone.";
          if (!confirm(confirmMsg)) return;
          try {
            await db
              .collection(CESS_CONFIG.collections.ACTIVITIES)
              .doc(id)
              .delete();
            await loadAdminActivitiesTable();
          } catch (err) {
            console.error(
              "Failed to delete activity:",
              err
            );
            alert(
              getLang() === "ar"
                ? "تعذر حذف النشاط."
                : "Failed to delete activity."
            );
          }
        });
      });
  } catch (err) {
    console.error(
      "Failed to load activities:",
      err
    );
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          ${err.code || "ERROR"} — ${err.message || "Unknown error"}
        </td>
      </tr>
    `;
  }
}

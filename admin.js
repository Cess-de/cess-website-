// ============================================================
// CESS ADMIN DASHBOARD
// ============================================================
// ============================================================
// USERS & ROLES
// ============================================================
async function loadUsersTable() {
  const tbody = document.getElementById("users-table");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="4" class="empty-state">
        Loading users...
      </td>
    </tr>
  `;
  try {
    const snapshot = await db
      .collection(CESS_CONFIG.collections.USERS)
      .get();
    console.log("CESS USERS:", snapshot.size);
    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            No registered users yet.
          </td>
        </tr>
      `;
      return;
    }
    const currentUser = auth.currentUser;
    tbody.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const uid = doc.id;
      const name = data.name || "—";
      const batch = data.batch || "—";
      const role = data.role || "member";
      const isCurrentAdmin =
        currentUser && currentUser.uid === uid;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${escapeAdminHtml(name)}</td>
        <td>${escapeAdminHtml(batch)}</td>
        <td>
          <select
            class="role-select"
            data-id="${uid}"
            ${isCurrentAdmin ? "disabled" : ""}
          >
            <option value="member" ${role === "member" ? "selected" : ""}>
              Member
            </option>
            <option value="leadership" ${role === "leadership" ? "selected" : ""}>
              Leadership
            </option>
            <option value="admin" ${role === "admin" ? "selected" : ""}>
              Admin
            </option>
          </select>
        </td>
        <td>
          ${
            isCurrentAdmin
              ? `
                <span style="font-size:0.85rem;color:var(--color-text-muted);">
                  Current Admin
                </span>
              `
              : `
                <button
                  class="btn btn-primary save-role-btn"
                  data-id="${uid}"
                >
                  Save
                </button>
              `
          }
        </td>
      `;
      tbody.appendChild(row);
    });
    // ----------------------------------------------------------
    // SAVE ROLE
    // ----------------------------------------------------------
    tbody
      .querySelectorAll(".save-role-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const uid = button.getAttribute("data-id");
          const select = tbody.querySelector(
            `.role-select[data-id="${uid}"]`
          );
          if (!select) return;
          const newRole = select.value;
          if (!["member", "leadership", "admin"].includes(newRole)) {
            alert(
              getLang() === "ar"
                ? "الدور المحدد غير صالح."
                : "Invalid role selected."
            );
            return;
          }
          const oldText = button.textContent;
          button.disabled = true;
          button.textContent =
            getLang() === "ar"
              ? "جارٍ الحفظ..."
              : "Saving...";
          try {
            await db
              .collection(CESS_CONFIG.collections.USERS)
              .doc(uid)
              .update({
                role: newRole
              });
            console.log(
              "ROLE UPDATED:",
              uid,
              newRole
            );
            alert(
              getLang() === "ar"
                ? "تم تحديث الدور بنجاح."
                : "Role updated successfully."
            );
            await loadUsersTable();
          } catch (err) {
            console.error(
              "FAILED TO UPDATE ROLE:",
              err
            );
            alert(
              getLang() === "ar"
                ? `تعذر تحديث الدور.\n${err.code || ""}\n${err.message || ""}`
                : `Failed to update role.\n${err.code || ""}\n${err.message || ""}`
            );
            button.disabled = false;
            button.textContent = oldText;
          }
        });
      });
  } catch (err) {
    console.error(
      "FAILED TO LOAD USERS:",
      err
    );
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          ${escapeAdminHtml(err.code || "ERROR")}
          —
          ${escapeAdminHtml(err.message || "Unable to load users.")}
        </td>
      </tr>
    `;
  }
}
// ============================================================
// ADMIN ACTIVITIES
// ============================================================
async function loadAdminActivitiesTable() {
  const tbody = document.getElementById(
    "admin-activities-table"
  );
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
        <td>
          ${escapeAdminHtml(
            pickLang(data, "title") || "—"
          )}
        </td>
        <td>
          ${escapeAdminHtml(
            formatDate(data.date) || "—"
          )}
        </td>
        <td>
          ${data.published ? "✅" : "—"}
        </td>
        <td>
          <button
            class="btn btn-outline toggle-publish-btn"
            data-id="${doc.id}"
            data-published="${!!data.published}"
          >
            ${
              data.published
                ? "Unpublish"
                : "Publish"
            }
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
    // ----------------------------------------------------------
    // PUBLISH / UNPUBLISH
    // ----------------------------------------------------------
    tbody
      .querySelectorAll(".toggle-publish-btn")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const id =
              button.getAttribute("data-id");
            const currentlyPublished =
              button.getAttribute(
                "data-published"
              ) === "true";
            try {
              await db
                .collection(
                  CESS_CONFIG.collections.ACTIVITIES
                )
                .doc(id)
                .update({
                  published:
                    !currentlyPublished,
                  updatedAt:
                    firebase.firestore
                      .FieldValue
                      .serverTimestamp()
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
          }
        );
      });
    // ----------------------------------------------------------
    // DELETE ACTIVITY
    // ----------------------------------------------------------
    tbody
      .querySelectorAll(".delete-activity-btn")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const id =
              button.getAttribute("data-id");
            const confirmMsg =
              getLang() === "ar"
                ? "هل أنت متأكد من حذف هذا النشاط؟"
                : "Delete this activity? This cannot be undone.";
            if (!confirm(confirmMsg)) {
              return;
            }
            try {
              await db
                .collection(
                  CESS_CONFIG.collections.ACTIVITIES
                )
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
          }
        );
      });
  } catch (err) {
    console.error(
      "Failed to load activities:",
      err
    );
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          ${escapeAdminHtml(
            err.code || "ERROR"
          )}
          —
          ${escapeAdminHtml(
            err.message ||
            "Unable to load activities."
          )}
        </td>
      </tr>
    `;
  }
}
// ============================================================
// GENERIC ADMIN COLLECTION CARDS
// ============================================================
async function loadAdminCollectionCards(
  collectionName,
  containerId
) {
  const container =
    document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `
    <p class="empty-state">
      Loading...
    </p>
  `;
  try {
    const snapshot = await db
      .collection(collectionName)
      .get();
    if (snapshot.empty) {
      container.innerHTML = `
        <p class="empty-state">
          No items available yet.
        </p>
      `;
      return;
    }
    container.innerHTML = "";
    snapshot.forEach((doc) => {
      const data = doc.data();
      const title =
        pickLang(data, "title") ||
        data.name ||
        data.label ||
        "Untitled";
      const description =
        pickLang(data, "description") ||
        data.description ||
        "";
      const published =
        data.published === true;
      const card =
        document.createElement("article");
      card.className = "card";
      card.innerHTML = `
        <h3>
          ${escapeAdminHtml(title)}
        </h3>
        ${
          description
            ? `
              <p>
                ${escapeAdminHtml(
                  description
                )}
              </p>
            `
            : ""
        }
        <p>
          <strong>
            Published:
          </strong>
          ${published ? "Yes" : "No"}
        </p>
        <button
          class="btn btn-danger admin-delete-card-btn"
          data-id="${doc.id}"
        >
          Delete
        </button>
      `;
      container.appendChild(card);
    });
    container
      .querySelectorAll(
        ".admin-delete-card-btn"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const id =
              button.getAttribute("data-id");
            const confirmMsg =
              getLang() === "ar"
                ? "هل أنت متأكد من حذف هذا العنصر؟"
                : "Delete this item? This cannot be undone.";
            if (!confirm(confirmMsg)) {
              return;
            }
            try {
              await db
                .collection(collectionName)
                .doc(id)
                .delete();
              await loadAdminCollectionCards(
                collectionName,
                containerId
              );
            } catch (err) {
              console.error(
                "Failed to delete item:",
                err
              );
              alert(
                getLang() === "ar"
                  ? "تعذر حذف العنصر."
                  : "Failed to delete item."
              );
            }
          }
        );
      });
  } catch (err) {
    console.error(
      `Failed to load ${collectionName}:`,
      err
    );
    container.innerHTML = `
      <p class="empty-state">
        ${escapeAdminHtml(
          err.code || "ERROR"
        )}
        —
        ${escapeAdminHtml(
          err.message ||
          "Unable to load data."
        )}
      </p>
    `;
  }
}
// ============================================================
// SOCIAL LINKS
// ============================================================
async function loadSocialLinksForm() {
  try {
    const doc = await db
      .collection(CESS_CONFIG.collections.SETTINGS)
      .doc("socialLinks")
      .get();
    if (!doc.exists) {
      return;
    }
    const data = doc.data() || {};
    const fields = {
      facebook: "social-facebook",
      instagram: "social-instagram",
      telegram: "social-telegram",
      whatsapp: "social-whatsapp",
      linkedin: "social-linkedin",
      youtube: "social-youtube"
    };
    Object.keys(fields).forEach((key) => {
      const input =
        document.getElementById(fields[key]);
      if (input) {
        input.value = data[key] || "";
      }
    });
  } catch (err) {
    console.error(
      "Failed to load social links:",
      err
    );
  }
}
async function saveSocialLinks(event) {
  event.preventDefault();
  const data = {
    facebook:
      document.getElementById(
        "social-facebook"
      )?.value.trim() || "",
    instagram:
      document.getElementById(
        "social-instagram"
      )?.value.trim() || "",
    telegram:
      document.getElementById(
        "social-telegram"
      )?.value.trim() || "",
    whatsapp:
      document.getElementById(
        "social-whatsapp"
      )?.value.trim() || "",
    linkedin:
      document.getElementById(
        "social-linkedin"
      )?.value.trim() || "",
    youtube:
      document.getElementById(
        "social-youtube"
      )?.value.trim() || ""
  };
  try {
    await db
      .collection(CESS_CONFIG.collections.SETTINGS)
      .doc("socialLinks")
      .set(
        data,
        { merge: true }
      );
    const success =
      document.getElementById(
        "social-save-success"
      );
    if (success) {
      success.classList.add("visible");
    }
    alert(
      getLang() === "ar"
        ? "تم حفظ روابط التواصل."
        : "Social links saved."
    );
  } catch (err) {
    console.error(
      "Failed to save social links:",
      err
    );
    alert(
      getLang() === "ar"
        ? `تعذر حفظ الروابط.\n${err.code || ""}\n${err.message || ""}`
        : `Failed to save social links.\n${err.code || ""}\n${err.message || ""}`
    );
  }
}
// ============================================================
// PUBLIC STATISTICS
// ============================================================
async function loadStatsPreview() {
  try {
    const doc = await db
      .collection(CESS_CONFIG.collections.SETTINGS)
      .doc("publicStatistics")
      .get();
    if (!doc.exists) {
      return;
    }
    const data = doc.data() || {};
    const activitiesEl =
      document.getElementById(
        "stat-preview-activities"
      );
    const membersEl =
      document.getElementById(
        "stat-preview-members"
      );
    if (activitiesEl) {
      activitiesEl.textContent =
        data.activities ?? "—";
    }
    if (membersEl) {
      membersEl.textContent =
        data.members ?? "—";
    }
  } catch (err) {
    console.error(
      "Failed to load statistics:",
      err
    );
  }
}
async function refreshStatistics() {
  try {
    // ----------------------------------------------------------
    // Published activities
    // ----------------------------------------------------------
    const activitiesSnapshot =
      await db
        .collection(
          CESS_CONFIG.collections.ACTIVITIES
        )
        .where("published", "==", true)
        .get();
    // ----------------------------------------------------------
    // Users
    // ----------------------------------------------------------
    const usersSnapshot =
      await db
        .collection(
          CESS_CONFIG.collections.USERS
        )
        .get();
    let registeredStudents = 0;
    usersSnapshot.forEach((doc) => {
      const role =
        doc.data().role;
      if (
        role === "member" ||
        role === "leadership"
      ) {
        registeredStudents++;
      }
    });
    const statistics = {
      activities:
        activitiesSnapshot.size,
      members:
        registeredStudents,
      updatedAt:
        firebase.firestore
          .FieldValue
          .serverTimestamp()
    };
    await db
      .collection(
        CESS_CONFIG.collections.SETTINGS
      )
      .doc("publicStatistics")
      .set(
        statistics,
        { merge: true }
      );
    const activitiesEl =
      document.getElementById(
        "stat-preview-activities"
      );
    const membersEl =
      document.getElementById(
        "stat-preview-members"
      );
    if (activitiesEl) {
      activitiesEl.textContent =
        activitiesSnapshot.size;
    }
    if (membersEl) {
      membersEl.textContent =
        registeredStudents;
    }
    const success =
      document.getElementById(
        "stats-save-success"
      );
    if (success) {
      success.classList.add("visible");
    }
    alert(
      getLang() === "ar"
        ? "تم تحديث الإحصائيات."
        : "Statistics updated."
    );
  } catch (err) {
    console.error(
      "Failed to refresh statistics:",
      err
    );
    alert(
      getLang() === "ar"
        ? `تعذر تحديث الإحصائيات.\n${err.code || ""}\n${err.message || ""}`
        : `Failed to refresh statistics.\n${err.code || ""}\n${err.message || ""}`
    );
  }
}
// ============================================================
// HTML ESCAPE HELPER
// ============================================================
function escapeAdminHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
// ============================================================
// ADMIN PAGE INITIALIZATION
// ============================================================
document.addEventListener(
  "DOMContentLoaded",
  () => {
    // ----------------------------------------------------------
    // Language
    // ----------------------------------------------------------
    initLangSwitch();
    // ----------------------------------------------------------
    // Protect Admin Page
    // ----------------------------------------------------------
    guardPage(
      [CESS_CONFIG.roles.ADMIN],
      () => {
        loadUsersTable();
        loadAdminActivitiesTable();
        loadAdminCollectionCards(
          CESS_CONFIG.collections.ANNOUNCEMENTS,
          "admin-announcements"
        );
        loadAdminCollectionCards(
          CESS_CONFIG.collections.RESOURCES,
          "admin-resources"
        );
        loadAdminCollectionCards(
          CESS_CONFIG.collections.PUBLIC_ARCHIVE,
          "admin-archive"
        );
        loadAdminCollectionCards(
          CESS_CONFIG.collections.HISTORY,
          "admin-history"
        );
        loadSocialLinksForm();
        loadStatsPreview();
      }
    );
    // ----------------------------------------------------------
    // Logout
    // ----------------------------------------------------------
    const logoutButton =
      document.getElementById(
        "logout-btn"
      );
    if (logoutButton) {
      logoutButton.addEventListener(
        "click",
        async () => {
          try {
            await logoutUser();
          } catch (err) {
            console.error(
              "Logout failed:",
              err
            );
            alert(
              getLang() === "ar"
                ? "تعذر تسجيل الخروج."
                : "Failed to log out."
            );
          }
        }
      );
    }
    // ----------------------------------------------------------
    // Social Links
    // ----------------------------------------------------------
    const socialForm =
      document.getElementById(
        "social-links-form"
      );
    if (socialForm) {
      socialForm.addEventListener(
        "submit",
        saveSocialLinks
      );
    }
    // ----------------------------------------------------------
    // Statistics
    // ----------------------------------------------------------
    const refreshStatsButton =
      document.getElementById(
        "refresh-stats-btn"
      );
    if (refreshStatsButton) {
      refreshStatsButton.addEventListener(
        "click",
        refreshStatistics
      );
    }
    // ----------------------------------------------------------
    // New Activity
    // ----------------------------------------------------------
    const newActivityButton =
      document.getElementById(
        "new-activity-btn"
      );
    if (newActivityButton) {
      newActivityButton.addEventListener(
        "click",
        () => {
          alert(
            getLang() === "ar"
              ? "لإضافة نشاط جديد، أضف مستندًا في مجموعة Firestore 'activities' باستخدام الحقول المطلوبة."
              : "To add a new activity, add a document to the Firestore 'activities' collection using the required fields."
          );
        }
      );
    }
    // ----------------------------------------------------------
    // New Announcement / Resource / Archive / History
    // ----------------------------------------------------------
    [
      "new-announcement-btn",
      "new-resource-btn",
      "new-archive-btn",
      "new-history-btn"
    ].forEach((id) => {
      const button =
        document.getElementById(id);
      if (!button) return;
      button.addEventListener(
        "click",
        () => {
          alert(
            getLang() === "ar"
              ? "أضف المستند من Firebase Firestore باستخدام الحقول المطلوبة."
              : "Add the document from Firebase Firestore using the required fields."
          );
        }
      );
    });
  }
);

/* =========================================================
   CESS — ADMIN DASHBOARD
   ========================================================= */

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

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


/* ---------------------------------------------------------
   Activity Date Helpers
--------------------------------------------------------- */

function getActivityDateValue(date) {
  if (!date) return 0;

  // Firestore Timestamp
  if (date && typeof date.toDate === "function") {
    const converted = date.toDate();

    if (converted instanceof Date && !isNaN(converted.getTime())) {
      return converted.getTime();
    }

    return 0;
  }

  // JavaScript Date
  if (date instanceof Date) {
    return isNaN(date.getTime()) ? 0 : date.getTime();
  }

  // String مثل:
  // 2026-09-12
  // 2026-09-12T10:00:00
  const parsed = new Date(date);

  if (!isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  return 0;
}


function formatActivityDate(date) {
  if (!date) {
    return "—";
  }

  let actualDate = null;

  // Firestore Timestamp
  if (date && typeof date.toDate === "function") {
    actualDate = date.toDate();

  // JavaScript Date
  } else if (date instanceof Date) {
    actualDate = date;

  // String
  } else {
    actualDate = new Date(date);
  }

  if (!actualDate || isNaN(actualDate.getTime())) {
    return String(date);
  }

  return actualDate.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


/* ---------------------------------------------------------
   USERS & ROLES
--------------------------------------------------------- */

async function loadUsersTable() {
  const tableBody = document.getElementById("users-table");

  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">Loading users...</td>
    </tr>
  `;

  try {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">You are not signed in.</td>
        </tr>
      `;
      return;
    }

    const snapshot = await db
      .collection(CESS_CONFIG.collections.USERS)
      .get();

    console.log("CESS USERS COUNT:", snapshot.size);

    if (snapshot.empty) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">No users found.</td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = "";

    snapshot.forEach((doc) => {
      const user = doc.data();
      const uid = doc.id;

      const name = user.name || "—";
      const email = user.email || "—";
      const batch = user.batch || "—";
      const role = user.role || CESS_CONFIG.roles.MEMBER;

      const isCurrentAdmin = uid === currentUser.uid;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>${escapeAdminHtml(name)}</td>

        <td>${escapeAdminHtml(email)}</td>

        <td>${escapeAdminHtml(batch)}</td>

        <td>
          <select
            class="user-role-select"
            data-user-id="${escapeAdminHtml(uid)}"
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
              ? `<span>Current Admin</span>`
              : `
                <button
                  class="admin-action-btn save-role-btn"
                  data-user-id="${escapeAdminHtml(uid)}"
                >
                  Save
                </button>
              `
          }
        </td>
      `;

      tableBody.appendChild(row);
    });

    tableBody.querySelectorAll(".save-role-btn").forEach((button) => {
      button.addEventListener("click", async () => {
        const uid = button.dataset.userId;

        const select = tableBody.querySelector(
          `.user-role-select[data-user-id="${uid}"]`
        );

        if (!select) return;

        const newRole = select.value;

        try {
          button.disabled = true;
          button.textContent = "Saving...";

          await db
            .collection(CESS_CONFIG.collections.USERS)
            .doc(uid)
            .update({
              role: newRole
            });

          button.textContent = "Saved";

          setTimeout(() => {
            button.textContent = "Save";
            button.disabled = false;
          }, 1200);

        } catch (err) {
          console.error("ROLE UPDATE ERROR:", err);

          alert(
            `${err.code || "Error"} — ${
              err.message || "Unable to update role."
            }`
          );

          button.textContent = "Save";
          button.disabled = false;
        }
      });
    });

  } catch (err) {
    console.error("LOAD USERS ERROR:", err);

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          ${escapeAdminHtml(err.code || "Error")}
          —
          ${escapeAdminHtml(
            err.message || "Unable to load users."
          )}
        </td>
      </tr>
    `;
  }
}


/* ---------------------------------------------------------
   ACTIVITIES
--------------------------------------------------------- */

async function loadAdminActivitiesTable() {
  const tableBody = document.getElementById(
    "admin-activities-table"
  );

  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr>
      <td colspan="5">Loading activities...</td>
    </tr>
  `;

  try {
    /*
      Important:
      We intentionally do NOT use:

      .orderBy("date", "desc")

      because Firestore excludes documents that do not
      contain the ordered field.

      We fetch all activities first and sort them locally.
    */

    const snapshot = await db
      .collection(CESS_CONFIG.collections.ACTIVITIES)
      .get();

    console.log(
      "CESS ACTIVITIES COUNT:",
      snapshot.size
    );

    if (snapshot.empty) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5">Activities not available yet.</td>
        </tr>
      `;
      return;
    }

    const activities = [];

    snapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Newest first
    activities.sort((a, b) => {
      return (
        getActivityDateValue(b.date) -
        getActivityDateValue(a.date)
      );
    });

    tableBody.innerHTML = "";

    activities.forEach((activity) => {
      const title =
        typeof pickLang === "function"
          ? (
              pickLang(activity, "title") ||
              activity.title ||
              activity.title_en ||
              activity.title_ar ||
              "Untitled Activity"
            )
          : (
              activity.title ||
              activity.title_en ||
              activity.title_ar ||
              "Untitled Activity"
            );

      const date = formatActivityDate(activity.date);

      const published =
        activity.published === true;

      const row = document.createElement("tr");

      row.innerHTML = `
        <td>
          ${escapeAdminHtml(title)}
        </td>

        <td>
          ${escapeAdminHtml(date)}
        </td>

        <td>
          <span
            class="status-badge ${
              published ? "published" : "draft"
            }"
          >
            ${published ? "Published" : "Draft"}
          </span>
        </td>

        <td>
          <button
            class="admin-action-btn activity-toggle-btn"
            data-id="${escapeAdminHtml(activity.id)}"
            data-published="${published}"
          >
            ${published ? "Unpublish" : "Publish"}
          </button>
        </td>

        <td>
          <button
            class="admin-delete-btn activity-delete-btn"
            data-id="${escapeAdminHtml(activity.id)}"
          >
            Delete
          </button>
        </td>
      `;

      tableBody.appendChild(row);
    });

    /* -----------------------------------------------
       Publish / Unpublish
    ------------------------------------------------ */

    tableBody
      .querySelectorAll(".activity-toggle-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const id = button.dataset.id;

          const currentPublished =
            button.dataset.published === "true";

          if (
            typeof toggleActivityPublished ===
            "function"
          ) {
            await toggleActivityPublished(
              id,
              currentPublished
            );
          } else {
            try {
              await db
                .collection(
                  CESS_CONFIG.collections.ACTIVITIES
                )
                .doc(id)
                .update({
                  published: !currentPublished
                });

              await loadAdminActivitiesTable();

            } catch (err) {
              console.error(
                "TOGGLE ACTIVITY ERROR:",
                err
              );

              alert(
                `${err.code || "Error"} — ${
                  err.message ||
                  "Unable to update activity."
                }`
              );
            }
          }
        });
      });

    /* -----------------------------------------------
       Delete
    ------------------------------------------------ */

    tableBody
      .querySelectorAll(".activity-delete-btn")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const id = button.dataset.id;

          if (
            typeof deleteActivity ===
            "function"
          ) {
            await deleteActivity(id);
          } else {
            const confirmed = confirm(
              "Are you sure you want to delete this activity?"
            );

            if (!confirmed) return;

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
                "DELETE ACTIVITY ERROR:",
                err
              );

              alert(
                `${err.code || "Error"} — ${
                  err.message ||
                  "Unable to delete activity."
                }`
              );
            }
          }
        });
      });

  } catch (err) {
    console.error(
      "LOAD ACTIVITIES ERROR:",
      err
    );

    tableBody.innerHTML = `
      <tr>
        <td colspan="5">
          ${escapeAdminHtml(
            err.code || "Error"
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


/* ---------------------------------------------------------
   GENERIC ADMIN COLLECTION CARDS
--------------------------------------------------------- */

async function loadAdminCollectionCards(
  collectionName,
  containerId
) {
  const container =
    document.getElementById(containerId);

  if (!container) return;

  container.innerHTML = `
    <p>Loading...</p>
  `;

  try {
    const snapshot = await db
      .collection(collectionName)
      .get();

    if (snapshot.empty) {
      container.innerHTML = `
        <p>No items available yet.</p>
      `;
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((doc) => {
      const data = doc.data();

      const title =
        typeof pickLang === "function"
          ? (
              pickLang(data, "title") ||
              data.title ||
              "Untitled"
            )
          : (
              data.title ||
              "Untitled"
            );

      const description =
        typeof pickLang === "function"
          ? (
              pickLang(data, "description") ||
              data.description ||
              ""
            )
          : (
              data.description ||
              ""
            );

      const published =
        data.published === true;

      const card =
        document.createElement("div");

      card.className =
        "admin-collection-card";

      card.innerHTML = `
        <div class="admin-card-content">

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

          <div class="admin-card-meta">
            ${
              published
                ? "Published"
                : "Draft"
            }
          </div>

        </div>

        <button
          class="admin-delete-btn"
          data-collection="${escapeAdminHtml(
            collectionName
          )}"
          data-id="${escapeAdminHtml(
            doc.id
          )}"
        >
          Delete
        </button>
      `;

      container.appendChild(card);
    });

    container
      .querySelectorAll(".admin-delete-btn")
      .forEach((button) => {
        button.addEventListener(
          "click",
          async () => {
            const collection =
              button.dataset.collection;

            const id =
              button.dataset.id;

            const confirmed = confirm(
              "Are you sure you want to delete this item?"
            );

            if (!confirmed) return;

            try {
              await db
                .collection(collection)
                .doc(id)
                .delete();

              await loadAdminCollectionCards(
                collection,
                containerId
              );

            } catch (err) {
              console.error(
                "DELETE ERROR:",
                err
              );

              alert(
                `${err.code || "Error"} — ${
                  err.message ||
                  "Unable to delete item."
                }`
              );
            }
          }
        );
      });

  } catch (err) {
    console.error(
      `LOAD ${collectionName} ERROR:`,
      err
    );

    container.innerHTML = `
      <p>
        ${escapeAdminHtml(
          err.code || "Error"
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


/* ---------------------------------------------------------
   SOCIAL LINKS
--------------------------------------------------------- */

async function loadSocialLinksForm() {
  try {
    const doc = await db
      .collection(
        CESS_CONFIG.collections.SETTINGS
      )
      .doc("socialLinks")
      .get();

    if (!doc.exists) {
      return;
    }

    const data = doc.data();

    const fields = {
      facebook: "social-facebook",
      instagram: "social-instagram",
      telegram: "social-telegram",
      whatsapp: "social-whatsapp",
      linkedin: "social-linkedin",
      youtube: "social-youtube"
    };

    Object.keys(fields).forEach(
      (key) => {
        const input =
          document.getElementById(
            fields[key]
          );

        if (input) {
          input.value =
            data[key] || "";
        }
      }
    );

  } catch (err) {
    console.error(
      "LOAD SOCIAL LINKS ERROR:",
      err
    );
  }
}


async function saveSocialLinks() {
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
      .collection(
        CESS_CONFIG.collections.SETTINGS
      )
      .doc("socialLinks")
      .set(
        data,
        {
          merge: true
        }
      );

    const success =
      document.getElementById(
        "social-save-success"
      );

    if (success) {
      success.classList.add("visible");

      setTimeout(() => {
        success.classList.remove(
          "visible"
        );
      }, 2500);
    }

  } catch (err) {
    console.error(
      "SAVE SOCIAL LINKS ERROR:",
      err
    );

    alert(
      `${err.code || "Error"} — ${
        err.message ||
        "Unable to save social links."
      }`
    );
  }
}


/* ---------------------------------------------------------
   PUBLIC STATISTICS
--------------------------------------------------------- */

async function loadStatsPreview() {
  try {
    const doc = await db
      .collection(
        CESS_CONFIG.collections.SETTINGS
      )
      .doc("publicStatistics")
      .get();

    if (!doc.exists) {
      return;
    }

    const stats = doc.data();

    Object.keys(stats).forEach(
      (key) => {
        const element =
          document.getElementById(
            `stat-${key}`
          );

        if (element) {
          element.textContent =
            stats[key];
        }
      }
    );

  } catch (err) {
    console.error(
      "LOAD STATS ERROR:",
      err
    );
  }
}


async function refreshStatistics() {
  try {
    const activitiesSnapshot =
      await db
        .collection(
          CESS_CONFIG.collections.ACTIVITIES
        )
        .get();

    const usersSnapshot =
      await db
        .collection(
          CESS_CONFIG.collections.USERS
        )
        .get();

    let publishedActivities = 0;
    let members = 0;

    activitiesSnapshot.forEach(
      (doc) => {
        const data = doc.data();

        if (data.published === true) {
          publishedActivities++;
        }
      }
    );

    usersSnapshot.forEach(
      (doc) => {
        const data = doc.data();

        if (
          data.role ===
            CESS_CONFIG.roles.MEMBER ||
          data.role ===
            CESS_CONFIG.roles.LEADERSHIP
        ) {
          members++;
        }
      }
    );

    const statistics = {
      activities: publishedActivities,
      members: members
    };

    await db
      .collection(
        CESS_CONFIG.collections.SETTINGS
      )
      .doc("publicStatistics")
      .set(
        statistics,
        {
          merge: true
        }
      );

    await loadStatsPreview();

    const success =
      document.getElementById(
        "stats-save-success"
      );

    if (success) {
      success.classList.add("visible");

      setTimeout(() => {
        success.classList.remove(
          "visible"
        );
      }, 2500);
    }

  } catch (err) {
    console.error(
      "REFRESH STATISTICS ERROR:",
      err
    );

    alert(
      `${err.code || "Error"} — ${
        err.message ||
        "Unable to refresh statistics."
      }`
    );
  }
}


/* ---------------------------------------------------------
   DOM INITIALIZATION
--------------------------------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    guardPage(
      [CESS_CONFIG.roles.ADMIN],
      async (profile) => {

        console.log(
          "CESS ADMIN AUTHORIZED:",
          profile
        );

        // Users
        await loadUsersTable();

        // Activities
        await loadAdminActivitiesTable();

        // Announcements
        await loadAdminCollectionCards(
          CESS_CONFIG.collections.ANNOUNCEMENTS,
          "admin-announcements"
        );

        // Resources
        await loadAdminCollectionCards(
          CESS_CONFIG.collections.RESOURCES,
          "admin-resources"
        );

        // Public Archive
        await loadAdminCollectionCards(
          CESS_CONFIG.collections.PUBLIC_ARCHIVE,
          "admin-archive"
        );

        // History
        await loadAdminCollectionCards(
          CESS_CONFIG.collections.HISTORY,
          "admin-history"
        );

        // Social Links
        await loadSocialLinksForm();

        // Statistics
        await loadStatsPreview();
      }
    );


    /* -----------------------------------------------------
       Logout
    ----------------------------------------------------- */

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
              "LOGOUT ERROR:",
              err
            );

            alert(
              err.message ||
                "Unable to logout."
            );
          }
        }
      );
    }


    /* -----------------------------------------------------
       Social Links Save
    ----------------------------------------------------- */

    const socialForm =
      document.getElementById(
        "social-links-form"
      );

    if (socialForm) {
      socialForm.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();

          await saveSocialLinks();
        }
      );
    }


    /* -----------------------------------------------------
       Statistics Refresh
    ----------------------------------------------------- */

    const refreshStatsButton =
      document.getElementById(
        "refresh-stats-btn"
      );

    if (refreshStatsButton) {
      refreshStatsButton.addEventListener(
        "click",
        async () => {

          refreshStatsButton.disabled =
            true;

          const originalText =
            refreshStatsButton.textContent;

          refreshStatsButton.textContent =
            "Refreshing...";

          try {
            await refreshStatistics();
          } finally {
            refreshStatsButton.disabled =
              false;

            refreshStatsButton.textContent =
              originalText;
          }
        }
      );
    }


    /* -----------------------------------------------------
       New Activity
    ----------------------------------------------------- */

    const newActivityButton =
      document.getElementById(
        "new-activity-btn"
      );

    if (newActivityButton) {
      newActivityButton.addEventListener(
        "click",
        () => {
          alert(
            "To add a new activity, create the activity document in Firestore under the activities collection."
          );
        }
      );
    }


    /* -----------------------------------------------------
       New Announcement
    ----------------------------------------------------- */

    const newAnnouncementButton =
      document.getElementById(
        "new-announcement-btn"
      );

    if (newAnnouncementButton) {
      newAnnouncementButton.addEventListener(
        "click",
        () => {
          alert(
            "To add a new announcement, create the announcement document in Firestore under the announcements collection."
          );
        }
      );
    }


    /* -----------------------------------------------------
       New Resource
    ----------------------------------------------------- */

    const newResourceButton =
      document.getElementById(
        "new-resource-btn"
      );

    if (newResourceButton) {
      newResourceButton.addEventListener(
        "click",
        () => {
          alert(
            "To add a new resource, create the resource document in Firestore under the resources collection."
          );
        }
      );
    }


    /* -----------------------------------------------------
       New Public Archive
    ----------------------------------------------------- */

    const newArchiveButton =
      document.getElementById(
        "new-archive-btn"
      );

    if (newArchiveButton) {
      newArchiveButton.addEventListener(
        "click",
        () => {
          alert(
            "To add a public archive item, create the document in Firestore under the publicArchive collection."
          );
        }
      );
    }


    /* -----------------------------------------------------
       New History
    ----------------------------------------------------- */

    const newHistoryButton =
      document.getElementById(
        "new-history-btn"
      );

    if (newHistoryButton) {
      newHistoryButton.addEventListener(
        "click",
        () => {
          alert(
            "To add a history item, create the document in Firestore under the history collection."
          );
        }
      );
    }

  }
);

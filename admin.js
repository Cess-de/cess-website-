/* =========================================================
CESS — ADMIN DASHBOARD
========================================================= */

/* ———————————————————
Helpers
——————————————————— */

function escapeAdminHtml(value) {
if (value === null || value === undefined) {
return “”;
}

return String(value)
.replace(/&/g, “&”)
.replace(/</g, “<”)
.replace(/>/g, “>”)
.replace(/”/g, “"”)
.replace(/’/g, “'”);
}

/* ———————————————————
Activity Date Helpers
——————————————————— */

function getActivityDateValue(date) {
if (!date) return 0;

// Firestore Timestamp
if (date && typeof date.toDate === “function”) {
const converted = date.toDate();

```
if (converted instanceof Date && !isNaN(converted.getTime())) {
  return converted.getTime();
}

return 0;
```

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
return “—”;
}

let actualDate = null;

// Firestore Timestamp
if (date && typeof date.toDate === “function”) {
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

return actualDate.toLocaleDateString(“en-GB”, {
day: “2-digit”,
month: “short”,
year: “numeric”
});
}

/* ———————————————————
USERS & ROLES
——————————————————— */

async function loadUsersTable() {
const tableBody = document.getElementById(“users-table”);

if (!tableBody) return;

tableBody.innerHTML = `<tr> <td colspan="5">Loading users...</td> </tr>`;

try {
const currentUser = auth.currentUser;

```
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
```

} catch (err) {
console.error(“LOAD USERS ERROR:”, err);

```
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
```

}
}

/* ———————————————————
ACTIVITIES
——————————————————— */

async function loadAdminActivitiesTable() {
const tableBody = document.getElementById(
“admin-activities-table”
);

if (!tableBody) return;

tableBody.innerHTML = `<tr> <td colspan="5">Loading activities...</td> </tr>`;

try {
/*
Important:
We intentionally do NOT use:

```
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
```

} catch (err) {
console.error(
“LOAD ACTIVITIES ERROR:”,
err
);

```
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
```

}
}

/* ———————————————————
GENERIC ADMIN COLLECTION CARDS
——————————————————— */

async function loadAdminCollectionCards(
collectionName,
containerId
) {
const container =
document.getElementById(containerId);

if (!container) return;

container.innerHTML = `<p>Loading...</p>`;

try {
const snapshot = await db
.collection(collectionName)
.get();

```
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

  const imageUrl = data.imageUrl || "";

  const card =
    document.createElement("div");

  card.className =
    "admin-collection-card";

  card.innerHTML = `
    ${
      imageUrl
        ? `
          <div class="admin-card-image">
            <img
              src="${escapeAdminHtml(imageUrl)}"
              alt="${escapeAdminHtml(title)}"
              loading="lazy"
            />
          </div>
        `
        : ""
    }

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
      data-image-path="${escapeAdminHtml(
        data.imagePath || ""
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

        const imagePath =
          button.dataset.imagePath;

        const confirmed = confirm(
          "Are you sure you want to delete this item?"
        );

        if (!confirmed) return;

        try {
          await db
            .collection(collection)
            .doc(id)
            .delete();

          // Best-effort cleanup of the stored image.
          // Never blocks deletion of the Firestore doc.
          if (imagePath) {
            try {
              await firebase
                .storage()
                .ref(imagePath)
                .delete();
            } catch (storageErr) {
              console.warn(
                "STORAGE CLEANUP WARNING:",
                storageErr
              );
            }
          }

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
```

} catch (err) {
console.error(
`LOAD ${collectionName} ERROR:`,
err
);

```
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
```

}
}

/* ———————————————————
SOCIAL LINKS
——————————————————— */

async function loadSocialLinksForm() {
try {
const doc = await db
.collection(
CESS_CONFIG.collections.SETTINGS
)
.doc(“socialLinks”)
.get();

```
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
```

} catch (err) {
console.error(
“LOAD SOCIAL LINKS ERROR:”,
err
);
}
}

async function saveSocialLinks() {
const data = {
facebook:
document.getElementById(
“social-facebook”
)?.value.trim() || “”,

```
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
```

};

try {
await db
.collection(
CESS_CONFIG.collections.SETTINGS
)
.doc(“socialLinks”)
.set(
data,
{
merge: true
}
);

```
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
```

} catch (err) {
console.error(
“SAVE SOCIAL LINKS ERROR:”,
err
);

```
alert(
  `${err.code || "Error"} — ${
    err.message ||
    "Unable to save social links."
  }`
);
```

}
}

/* ———————————————————
PUBLIC STATISTICS
——————————————————— */

async function loadStatsPreview() {
try {
const doc = await db
.collection(
CESS_CONFIG.collections.SETTINGS
)
.doc(“publicStatistics”)
.get();

```
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
```

} catch (err) {
console.error(
“LOAD STATS ERROR:”,
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

```
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
```

} catch (err) {
console.error(
“REFRESH STATISTICS ERROR:”,
err
);

```
alert(
  `${err.code || "Error"} — ${
    err.message ||
    "Unable to refresh statistics."
  }`
);
```

}
}

/* =========================================================
ADD-ITEM MODAL
(Activities / Announcements / Resources / History)
Generated entirely in JS — no HTML changes required.
========================================================= */

const ADD_ITEM_CONFIGS = {
activity: {
label: “Activity”,
collection: () => CESS_CONFIG.collections.ACTIVITIES,
hasDate: true,
afterSave: loadAdminActivitiesTable
},
announcement: {
label: “Announcement”,
collection: () => CESS_CONFIG.collections.ANNOUNCEMENTS,
hasDate: true,
afterSave: () =>
loadAdminCollectionCards(
CESS_CONFIG.collections.ANNOUNCEMENTS,
“admin-announcements”
)
},
resource: {
label: “Resource”,
collection: () => CESS_CONFIG.collections.RESOURCES,
hasDate: false,
afterSave: () =>
loadAdminCollectionCards(
CESS_CONFIG.collections.RESOURCES,
“admin-resources”
)
},
archive: {
label: “Public Archive Item”,
collection: () => CESS_CONFIG.collections.PUBLIC_ARCHIVE,
hasDate: true,
afterSave: () =>
loadAdminCollectionCards(
CESS_CONFIG.collections.PUBLIC_ARCHIVE,
“admin-archive”
)
},
history: {
label: “History Item”,
collection: () => CESS_CONFIG.collections.HISTORY,
hasDate: true,
afterSave: () =>
loadAdminCollectionCards(
CESS_CONFIG.collections.HISTORY,
“admin-history”
)
}
};

let addItemModalEl = null;
let addItemSelectedFile = null;

function injectAddItemModalStyles() {
if (document.getElementById(“add-item-modal-styles”)) {
return;
}

const style = document.createElement(“style”);
style.id = “add-item-modal-styles”;

style.textContent = `
.add-item-overlay {
position: fixed;
inset: 0;
background: rgba(0, 0, 0, 0.5);
display: flex;
align-items: flex-start;
justify-content: center;
overflow-y: auto;
padding: 24px 16px;
z-index: 1000;
}

```
.add-item-modal {
  background: #ffffff;
  border-radius: 10px;
  max-width: 480px;
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  font-family: inherit;
}

.add-item-modal h2 {
  margin: 0 0 16px 0;
  font-size: 1.15rem;
}

.add-item-field {
  margin-bottom: 14px;
}

.add-item-field label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.add-item-field input[type="text"],
.add-item-field input[type="date"],
.add-item-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid #ccc;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: inherit;
}

.add-item-field textarea {
  min-height: 70px;
  resize: vertical;
}

.add-item-field-row {
  display: flex;
  gap: 10px;
}

.add-item-field-row .add-item-field {
  flex: 1;
}

.add-item-image-preview {
  margin-top: 8px;
  max-width: 100%;
  max-height: 140px;
  border-radius: 6px;
  display: none;
}

.add-item-image-preview.visible {
  display: block;
}

.add-item-checkbox-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.add-item-checkbox-row label {
  font-size: 0.9rem;
  margin: 0;
}

.add-item-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.add-item-actions button {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
}

.add-item-cancel-btn {
  background: #e5e5e5;
  color: #222;
}

.add-item-save-btn {
  background: #1c6dd0;
  color: #fff;
}

.add-item-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.add-item-error {
  color: #c0392b;
  font-size: 0.85rem;
  margin-top: 10px;
  display: none;
}

.add-item-error.visible {
  display: block;
}

.add-item-progress {
  font-size: 0.85rem;
  color: #555;
  margin-top: 10px;
  display: none;
}

.add-item-progress.visible {
  display: block;
}

/* Cards with images, for loadAdminCollectionCards() output */
.admin-card-image {
  width: 100%;
  max-height: 160px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.admin-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

`;

document.head.appendChild(style);
}

function closeAddItemModal() {
if (addItemModalEl) {
addItemModalEl.remove();
addItemModalEl = null;
}
addItemSelectedFile = null;
}

function openAddItemModal(type) {
const config = ADD_ITEM_CONFIGS[type];

if (!config) {
console.error(“Unknown add-item type:”, type);
return;
}

injectAddItemModalStyles();
closeAddItemModal();

addItemSelectedFile = null;

const overlay = document.createElement(“div”);
overlay.className = “add-item-overlay”;

overlay.innerHTML = `
<div class="add-item-modal">
<h2>Add ${escapeAdminHtml(config.label)}</h2>

```
  <div class="add-item-field">
    <label for="add-item-title-en">Title (English)</label>
    <input type="text" id="add-item-title-en" />
  </div>

  <div class="add-item-field">
    <label for="add-item-title-ar">العنوان (عربي)</label>
    <input type="text" id="add-item-title-ar" dir="rtl" />
  </div>

  <div class="add-item-field">
    <label for="add-item-desc-en">Description (English)</label>
    <textarea id="add-item-desc-en"></textarea>
  </div>

  <div class="add-item-field">
    <label for="add-item-desc-ar">الوصف (عربي)</label>
    <textarea id="add-item-desc-ar" dir="rtl"></textarea>
  </div>

  ${
    config.hasDate
      ? `
        <div class="add-item-field">
          <label for="add-item-date">Date</label>
          <input type="date" id="add-item-date" />
        </div>
      `
      : ""
  }

  <div class="add-item-field">
    <label for="add-item-image">Image (optional)</label>
    <input type="file" id="add-item-image" accept="image/*" />
    <img class="add-item-image-preview" id="add-item-image-preview" />
  </div>

  <div class="add-item-checkbox-row">
    <input type="checkbox" id="add-item-published" />
    <label for="add-item-published">Publish immediately</label>
  </div>

  <div class="add-item-error" id="add-item-error"></div>
  <div class="add-item-progress" id="add-item-progress"></div>

  <div class="add-item-actions">
    <button type="button" class="add-item-cancel-btn" id="add-item-cancel-btn">
      Cancel
    </button>
    <button type="button" class="add-item-save-btn" id="add-item-save-btn">
      Save
    </button>
  </div>
</div>
```

`;

document.body.appendChild(overlay);
addItemModalEl = overlay;

// Close when clicking outside the modal card
overlay.addEventListener(“click”, (e) => {
if (e.target === overlay) {
closeAddItemModal();
}
});

overlay
.querySelector(”#add-item-cancel-btn”)
.addEventListener(“click”, closeAddItemModal);

const imageInput = overlay.querySelector(”#add-item-image”);
const imagePreview = overlay.querySelector(”#add-item-image-preview”);

imageInput.addEventListener(“change”, () => {
const file = imageInput.files && imageInput.files[0];

```
if (!file) {
  addItemSelectedFile = null;
  imagePreview.classList.remove("visible");
  return;
}

if (!file.type.startsWith("image/")) {
  showAddItemError("Please choose an image file.");
  imageInput.value = "";
  addItemSelectedFile = null;
  return;
}

// 5MB cap to stay well within Firebase free-tier bandwidth
if (file.size > 5 * 1024 * 1024) {
  showAddItemError("Image must be smaller than 5MB.");
  imageInput.value = "";
  addItemSelectedFile = null;
  return;
}

addItemSelectedFile = file;

const reader = new FileReader();
reader.onload = (e) => {
  imagePreview.src = e.target.result;
  imagePreview.classList.add("visible");
};
reader.readAsDataURL(file);
```

});

overlay
.querySelector(”#add-item-save-btn”)
.addEventListener(“click”, () => {
handleAddItemSave(type, config);
});
}

function showAddItemError(message) {
if (!addItemModalEl) return;

const errorEl = addItemModalEl.querySelector(”#add-item-error”);

if (errorEl) {
errorEl.textContent = message;
errorEl.classList.add(“visible”);
}
}

function clearAddItemError() {
if (!addItemModalEl) return;

const errorEl = addItemModalEl.querySelector(”#add-item-error”);

if (errorEl) {
errorEl.textContent = “”;
errorEl.classList.remove(“visible”);
}
}

function setAddItemProgress(message) {
if (!addItemModalEl) return;

const progressEl = addItemModalEl.querySelector(”#add-item-progress”);

if (progressEl) {
if (message) {
progressEl.textContent = message;
progressEl.classList.add(“visible”);
} else {
progressEl.textContent = “”;
progressEl.classList.remove(“visible”);
}
}
}

async function handleAddItemSave(type, config) {
if (!addItemModalEl) return;

clearAddItemError();

const titleEn = addItemModalEl
.querySelector(”#add-item-title-en”)
.value.trim();

const titleAr = addItemModalEl
.querySelector(”#add-item-title-ar”)
.value.trim();

const descEn = addItemModalEl
.querySelector(”#add-item-desc-en”)
.value.trim();

const descAr = addItemModalEl
.querySelector(”#add-item-desc-ar”)
.value.trim();

const published = addItemModalEl.querySelector(
“#add-item-published”
).checked;

if (!titleEn && !titleAr) {
showAddItemError(
“Please provide a title in at least one language.”
);
return;
}

let dateValue = null;

if (config.hasDate) {
const dateInput = addItemModalEl.querySelector(”#add-item-date”);
const rawDate = dateInput ? dateInput.value : “”;

```
if (!rawDate) {
  showAddItemError("Please choose a date.");
  return;
}

dateValue = rawDate; // stored as "YYYY-MM-DD" string
```

}

const saveBtn = addItemModalEl.querySelector(”#add-item-save-btn”);
saveBtn.disabled = true;
saveBtn.textContent = “Saving…”;

try {
const docData = {
title_en: titleEn,
title_ar: titleAr,
title: titleEn || titleAr,
description_en: descEn,
description_ar: descAr,
description: descEn || descAr,
published: published,
createdAt: firebase.firestore.FieldValue.serverTimestamp()
};

```
if (config.hasDate) {
  docData.date = dateValue;
}

// Create the Firestore document first so we have an ID
// to namespace the uploaded image under Storage.
const docRef = await db.collection(config.collection()).add(docData);

if (addItemSelectedFile) {
  setAddItemProgress("Uploading image...");

  const extension =
    addItemSelectedFile.name.split(".").pop() || "jpg";

  const imagePath = `${config.collection()}/${docRef.id}/image.${extension}`;

  const storageRef = firebase.storage().ref(imagePath);

  await storageRef.put(addItemSelectedFile);

  const imageUrl = await storageRef.getDownloadURL();

  await docRef.update({
    imageUrl: imageUrl,
    imagePath: imagePath
  });
}

setAddItemProgress("");
closeAddItemModal();

if (typeof config.afterSave === "function") {
  await config.afterSave();
}
```

} catch (err) {
console.error(“ADD ITEM ERROR:”, err);

```
setAddItemProgress("");
saveBtn.disabled = false;
saveBtn.textContent = "Save";

showAddItemError(
  `${err.code || "Error"} — ${
    err.message || "Unable to save item."
  }`
);
```

}
}

/* ———————————————————
DOM INITIALIZATION
——————————————————— */

document.addEventListener(
“DOMContentLoaded”,
() => {

```
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
   New Activity / Announcement / Resource / Archive / History
   — now opens the add-item modal instead of an alert()
----------------------------------------------------- */

const newActivityButton =
  document.getElementById("new-activity-btn");

if (newActivityButton) {
  newActivityButton.addEventListener("click", () => {
    openAddItemModal("activity");
  });
}

const newAnnouncementButton =
  document.getElementById("new-announcement-btn");

if (newAnnouncementButton) {
  newAnnouncementButton.addEventListener("click", () => {
    openAddItemModal("announcement");
  });
}

const newResourceButton =
  document.getElementById("new-resource-btn");

if (newResourceButton) {
  newResourceButton.addEventListener("click", () => {
    openAddItemModal("resource");
  });
}

const newArchiveButton =
  document.getElementById("new-archive-btn");

if (newArchiveButton) {
  newArchiveButton.addEventListener("click", () => {
    openAddItemModal("archive");
  });
}

const newHistoryButton =
  document.getElementById("new-history-btn");

if (newHistoryButton) {
  newHistoryButton.addEventListener("click", () => {
    openAddItemModal("history");
  });
}
```

}
);

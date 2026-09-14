/* =========================================================
   CESS — ADMIN DASHBOARD
   Modular Firebase architecture
   ========================================================= */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  auth,
  db
} from "./firebase-config.js";

import {
  waitForAuthReady,
  getCurrentUser,
  getCurrentProfile,
  refreshCurrentProfile
} from "./session.js";


/* =========================================================
   CONFIGURATION
   ========================================================= */

const COLLECTIONS = {
  USERS: "users",
  ACTIVITIES: "activities",
  ANNOUNCEMENTS: "announcements",
  RESOURCES: "resources",
  HISTORY: "history",
  ARCHIVE: "publicArchive",
  SETTINGS: "settings"
};

const ROLE_ADMIN = "admin";


/* =========================================================
   STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;


/* =========================================================
   INITIALIZATION
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initializeLanguage();
    initializeNavigation();
    initializeButtons();

    await waitForAuthReady();

    currentUser = getCurrentUser();
    currentProfile = getCurrentProfile();

    if (!currentUser || !currentProfile) {
      redirectToLogin();
      return;
    }

    if (currentProfile.role !== ROLE_ADMIN) {
      showAccessDenied();
      return;
    }

    await initializeDashboard();

  } catch (error) {
    console.error("CESS Admin initialization failed:", error);
    showGlobalError(
      "Unable to initialize the administration dashboard."
    );
  }
});


/* =========================================================
   DASHBOARD
   ========================================================= */

async function initializeDashboard() {
  updateAdminIdentity();

  await Promise.all([
    loadUsers(),
    loadActivities(),
    loadAnnouncements(),
    loadResources(),
    loadArchive(),
    loadHistory(),
    loadSocialLinks(),
    loadStatistics()
  ]);
}


/* =========================================================
   AUTHORIZATION
   ========================================================= */

function requireAdmin() {
  const user = getCurrentUser();
  const profile = getCurrentProfile();

  if (!user || !profile) {
    redirectToLogin();
    return false;
  }

  if (profile.role !== ROLE_ADMIN) {
    showAccessDenied();
    return false;
  }

  return true;
}


/* =========================================================
   USERS
   ========================================================= */

async function loadUsers() {
  const tbody = document.getElementById("users-table");

  if (!tbody) return;

  tbody.innerHTML = loadingRow(4);

  try {
    const snapshot = await getDocs(
      query(
        collection(db, COLLECTIONS.USERS),
        orderBy("name", "asc"),
        limit(300)
      )
    );

    if (snapshot.empty) {
      tbody.innerHTML = emptyRow(
        4,
        "No registered users yet."
      );
      return;
    }

    tbody.innerHTML = "";

    snapshot.forEach((userDoc) => {
      const user = userDoc.data();

      const row = document.createElement("tr");

      const name = safeText(
        user.name ||
        user.fullName ||
        user.displayName ||
        "—"
      );

      const email = safeText(user.email || "—");

      const cohort = safeText(
        user.cohort ||
        user.batch ||
        "—"
      );

      const role = user.role || "member";

      const isCurrentUser =
        userDoc.id === currentUser.uid;

      row.innerHTML = `
        <td>${name}</td>
        <td>${email}</td>
        <td>${cohort}</td>
        <td>
          <select
            class="admin-role-select"
            data-user-id="${escapeAttribute(userDoc.id)}"
            ${isCurrentUser ? "disabled" : ""}
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
      `;

      tbody.appendChild(row);
    });

    tbody
      .querySelectorAll(".admin-role-select")
      .forEach((select) => {
        select.addEventListener(
          "change",
          handleRoleChange
        );
      });

  } catch (error) {
    console.error("Failed to load users:", error);

    tbody.innerHTML = errorRow(
      4,
      "Unable to load users."
    );
  }
}


async function handleRoleChange(event) {
  if (!requireAdmin()) return;

  const userId =
    event.target.dataset.userId;

  const newRole =
    event.target.value;

  if (!userId) return;

  if (!["member", "leadership", "admin"].includes(newRole)) {
    return;
  }

  try {
    await updateDoc(
      doc(db, COLLECTIONS.USERS, userId),
      {
        role: newRole,
        updatedAt: serverTimestamp()
      }
    );

    showToast(
      "User role updated successfully."
    );

  } catch (error) {
    console.error("Role update failed:", error);

    showToast(
      "Unable to update user role.",
      true
    );

    await loadUsers();
  }
}


/* =========================================================
   ACTIVITIES
   ========================================================= */

async function loadActivities() {
  const tbody =
    document.getElementById(
      "admin-activities-table"
    );

  if (!tbody) return;

  tbody.innerHTML = loadingRow(5);

  try {
    const snapshot = await getDocs(
      query(
        collection(
          db,
          COLLECTIONS.ACTIVITIES
        ),
        orderBy("date", "desc"),
        limit(100)
      )
    );

    if (snapshot.empty) {
      tbody.innerHTML =
        emptyRow(
          5,
          "No activities available."
        );
      return;
    }

    tbody.innerHTML = "";

    snapshot.forEach((activityDoc) => {
      const data = activityDoc.data();

      const row =
        document.createElement("tr");

      row.innerHTML = `
        <td>
          ${safeText(
            data.title_ar ||
            data.title_en ||
            "Untitled"
          )}
        </td>

        <td>
          ${safeText(
            data.date || "—"
          )}
        </td>

        <td>
          ${
            data.published
              ? "Published"
              : "Draft"
          }
        </td>

        <td>
          ${safeText(
            data.category || "—"
          )}
        </td>

        <td>
          <button
            class="btn btn-outline admin-delete-btn"
            data-collection="activities"
            data-id="${escapeAttribute(activityDoc.id)}"
          >
            Delete
          </button>
        </td>
      `;

      tbody.appendChild(row);
    });

    attachDeleteHandlers(tbody);

  } catch (error) {
    console.error(
      "Failed to load activities:",
      error
    );

    tbody.innerHTML =
      errorRow(
        5,
        "Unable to load activities."
      );
  }
}


/* =========================================================
   ANNOUNCEMENTS
   ========================================================= */

async function loadAnnouncements() {
  const container =
    document.getElementById(
      "admin-announcements"
    );

  if (!container) return;

  container.innerHTML =
    loadingCard();

  try {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            COLLECTIONS.ANNOUNCEMENTS
          ),
          orderBy("date", "desc"),
          limit(100)
        )
      );

    if (snapshot.empty) {
      container.innerHTML =
        emptyCard(
          "No announcements available."
        );
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((itemDoc) => {
      const data = itemDoc.data();

      const card =
        createContentCard(
          itemDoc.id,
          "announcements",
          data.title_ar ||
            data.title_en ||
            "Untitled",
          data.content_ar ||
            data.content_en ||
            "",
          data.published
        );

      container.appendChild(card);
    });

  } catch (error) {
    console.error(
      "Failed to load announcements:",
      error
    );

    container.innerHTML =
      errorCard(
        "Unable to load announcements."
      );
  }
}


/* =========================================================
   RESOURCES
   ========================================================= */

async function loadResources() {
  const container =
    document.getElementById(
      "admin-resources"
    );

  if (!container) return;

  container.innerHTML =
    loadingCard();

  try {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            COLLECTIONS.RESOURCES
          ),
          orderBy("date", "desc"),
          limit(100)
        )
      );

    if (snapshot.empty) {
      container.innerHTML =
        emptyCard(
          "No resources available."
        );
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((itemDoc) => {
      const data = itemDoc.data();

      const card =
        createContentCard(
          itemDoc.id,
          "resources",
          data.title_ar ||
            data.title_en ||
            "Untitled",
          data.description_ar ||
            data.description_en ||
            "",
          data.published
        );

      container.appendChild(card);
    });

  } catch (error) {
    console.error(
      "Failed to load resources:",
      error
    );

    container.innerHTML =
      errorCard(
        "Unable to load resources."
      );
  }
}


/* =========================================================
   PUBLIC ARCHIVE
   ========================================================= */

async function loadArchive() {
  const container =
    document.getElementById(
      "admin-archive"
    );

  if (!container) return;

  container.innerHTML =
    loadingCard();

  try {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            COLLECTIONS.ARCHIVE
          ),
          orderBy("date", "desc"),
          limit(100)
        )
      );

    if (snapshot.empty) {
      container.innerHTML =
        emptyCard(
          "No archive items available."
        );
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((itemDoc) => {
      const data = itemDoc.data();

      const card =
        createContentCard(
          itemDoc.id,
          "publicArchive",
          data.title_ar ||
            data.title_en ||
            "Untitled",
          data.description_ar ||
            data.description_en ||
            "",
          data.published
        );

      container.appendChild(card);
    });

  } catch (error) {
    console.error(
      "Failed to load archive:",
      error
    );

    container.innerHTML =
      errorCard(
        "Unable to load archive."
      );
  }
}


/* =========================================================
   HISTORY
   ========================================================= */

async function loadHistory() {
  const container =
    document.getElementById(
      "admin-history"
    );

  if (!container) return;

  container.innerHTML =
    loadingCard();

  try {
    const snapshot =
      await getDocs(
        query(
          collection(
            db,
            COLLECTIONS.HISTORY
          ),
          orderBy("order", "asc"),
          limit(100)
        )
      );

    if (snapshot.empty) {
      container.innerHTML =
        emptyCard(
          "No history entries available."
        );
      return;
    }

    container.innerHTML = "";

    snapshot.forEach((itemDoc) => {
      const data = itemDoc.data();

      const card =
        createContentCard(
          itemDoc.id,
          "history",
          data.stage_ar ||
            data.stage_en ||
            "Untitled",
          data.description_ar ||
            data.description_en ||
            "",
          data.published !== false
        );

      container.appendChild(card);
    });

  } catch (error) {
    console.error(
      "Failed to load history:",
      error
    );

    container.innerHTML =
      errorCard(
        "Unable to load history."
      );
  }
}


/* =========================================================
   SOCIAL LINKS
   ========================================================= */

async function loadSocialLinks() {
  const fields = {
    facebook:
      document.getElementById(
        "social-facebook"
      ),
    instagram:
      document.getElementById(
        "social-instagram"
      ),
    telegram:
      document.getElementById(
        "social-telegram"
      ),
    whatsapp:
      document.getElementById(
        "social-whatsapp"
      ),
    linkedin:
      document.getElementById(
        "social-linkedin"
      ),
    youtube:
      document.getElementById(
        "social-youtube"
      )
  };

  if (
    !Object.values(fields).some(Boolean)
  ) {
    return;
  }

  try {
    const settingsDoc =
      await getDoc(
        doc(
          db,
          COLLECTIONS.SETTINGS,
          "socialLinks"
        )
      );

    if (!settingsDoc.exists()) {
      return;
    }

    const data =
      settingsDoc.data();

    Object.entries(fields)
      .forEach(
        ([platform, element]) => {
          if (element) {
            element.value =
              data[platform] || "";
          }
        }
      );

  } catch (error) {
    console.error(
      "Failed to load social links:",
      error
    );
  }
}


async function saveSocialLinks() {
  if (!requireAdmin()) return;

  const platforms = [
    "facebook",
    "instagram",
    "telegram",
    "whatsapp",
    "linkedin",
    "youtube"
  ];

  const data = {};

  platforms.forEach(
    (platform) => {
      const element =
        document.getElementById(
          `social-${platform}`
        );

      data[platform] =
        element
          ? element.value.trim()
          : "";
    }
  );

  try {
    await updateDoc(
      doc(
        db,
        COLLECTIONS.SETTINGS,
        "socialLinks"
      ),
      {
        ...data,
        updatedAt:
          serverTimestamp(),
        updatedBy:
          currentUser.uid
      }
    );

    showSuccess(
      "social-link-save-success",
      "Social links saved successfully."
    );

  } catch (error) {
    console.error(
      "Failed to save social links:",
      error
    );

    /*
     * If the document doesn't exist yet,
     * create it.
     */
    try {
      await importFirestoreAddSettings(
        data
      );

      showSuccess(
        "social-link-save-success",
        "Social links saved successfully."
      );

    } catch (fallbackError) {
      console.error(
        fallbackError
      );

      showToast(
        "Unable to save social links.",
        true
      );
    }
  }
}


/* =========================================================
   STATISTICS
   ========================================================= */

async function loadStatistics() {
  const activitiesElement =
    document.getElementById(
      "stat-preview-activities"
    );

  const membersElement =
    document.getElementById(
      "stat-preview-members"
    );

  if (
    !activitiesElement &&
    !membersElement
  ) {
    return;
  }

  try {
    const statisticsDoc =
      await getDoc(
        doc(
          db,
          COLLECTIONS.SETTINGS,
          "publicStatistics"
        )
      );

    if (!statisticsDoc.exists()) {
      return;
    }

    const data =
      statisticsDoc.data();

    if (activitiesElement) {
      activitiesElement.textContent =
        Number(
          data.activitiesCount || 0
        );
    }

    if (membersElement) {
      membersElement.textContent =
        Number(
          data.registeredStudentsCount || 0
        );
    }

  } catch (error) {
    console.error(
      "Failed to load statistics:",
      error
    );
  }
}


async function saveStatistics() {
  if (!requireAdmin()) return;

  const activitiesElement =
    document.getElementById(
      "stat-preview-activities"
    );

  const membersElement =
    document.getElementById(
      "stat-preview-members"
    );

  const data = {
    activitiesCount:
      Number(
        activitiesElement?.value ||
        activitiesElement?.textContent ||
        0
      ),

    registeredStudentsCount:
      Number(
        membersElement?.value ||
        membersElement?.textContent ||
        0
      ),

    updatedAt:
      serverTimestamp(),

    updatedBy:
      currentUser.uid
  };

  try {
    await saveSettingsDocument(
      "publicStatistics",
      data
    );

    showSuccess(
      "stats-save-success",
      "Statistics saved successfully."
    );

  } catch (error) {
    console.error(
      "Failed to save statistics:",
      error
    );

    showToast(
      "Unable to save statistics.",
      true
    );
  }
}


/* =========================================================
   CONTENT CARD
   ========================================================= */

function createContentCard(
  id,
  collectionName,
  title,
  description,
  published
) {
  const card =
    document.createElement("article");

  card.className =
    "card admin-content-card";

  const status =
    published
      ? "Published"
      : "Draft";

  card.innerHTML = `
    <div class="card-body">

      <div class="admin-card-status">
        ${status}
      </div>

      <h3>
        ${safeText(title)}
      </h3>

      <p>
        ${safeText(
          truncate(description, 180)
        )}
      </p>

      <button
        type="button"
        class="btn btn-outline admin-delete-btn"
        data-collection="${escapeAttribute(collectionName)}"
        data-id="${escapeAttribute(id)}"
      >
        Delete
      </button>

    </div>
  `;

  const deleteButton =
    card.querySelector(
      ".admin-delete-btn"
    );

  deleteButton.addEventListener(
    "click",
    () =>
      handleDelete(
        collectionName,
        id
      )
  );

  return card;
}


/* =========================================================
   DELETE
   ========================================================= */

function attachDeleteHandlers(
  container
) {
  container
    .querySelectorAll(
      ".admin-delete-btn"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {
          handleDelete(
            button.dataset.collection,
            button.dataset.id
          );
        }
      );

    });
}


async function handleDelete(
  collectionName,
  documentId
) {
  if (!requireAdmin()) return;

  const confirmed =
    window.confirm(
      "Are you sure you want to delete this item?"
    );

  if (!confirmed) return;

  try {
    await deleteDoc(
      doc(
        db,
        collectionName,
        documentId
      )
    );

    showToast(
      "Item deleted successfully."
    );

    await refreshSection(
      collectionName
    );

  } catch (error) {
    console.error(
      "Delete failed:",
      error
    );

    showToast(
      "Unable to delete item.",
      true
    );
  }
}


/* =========================================================
   SECTION REFRESH
   ========================================================= */

async function refreshSection(
  collectionName
) {
  switch (collectionName) {

    case "activities":
      await loadActivities();
      break;

    case "announcements":
      await loadAnnouncements();
      break;

    case "resources":
      await loadResources();
      break;

    case "publicArchive":
      await loadArchive();
      break;

    case "history":
      await loadHistory();
      break;

    default:
      break;
  }
}


/* =========================================================
   BUTTONS
   ========================================================= */

function initializeButtons() {

  const logoutButton =
    document.getElementById(
      "logout-btn"
    );

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logout
    );
  }

  const socialForm =
    document.getElementById(
      "social-links-form"
    );

  if (socialForm) {
    socialForm.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();
        await saveSocialLinks();
      }
    );
  }

  const refreshStats =
    document.getElementById(
      "refresh-stats-btn"
    );

  if (refreshStats) {
    refreshStats.addEventListener(
      "click",
      async () => {
        await loadStatistics();
        showToast(
          "Statistics refreshed."
        );
      }
    );
  }

  document
    .querySelectorAll(
      ".new-activity-btn"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            showToast(
              "The new content editor will be connected in the next module."
            );
          }
        );
      }
    );
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  try {
    await signOut(auth);
    window.location.href =
      "login.html";
  } catch (error) {
    console.error(
      "Logout failed:",
      error
    );

    showToast(
      "Unable to log out.",
      true
    );
  }
}


/* =========================================================
   LANGUAGE
   ========================================================= */

function initializeLanguage() {

  const toggle =
    document.getElementById(
      "lang-toggle"
    );

  if (!toggle) return;

  const label =
    document.getElementById(
      "lang-toggle-label"
    );

  let language =
    localStorage.getItem(
      "cess_lang"
    ) || "en";

  function applyLanguage() {

    document.documentElement.lang =
      language;

    document.documentElement.dir =
      language === "ar"
        ? "rtl"
        : "ltr";

    document
      .querySelectorAll(
        "[data-en][data-ar]"
      )
      .forEach((element) => {

        element.textContent =
          language === "ar"
            ? element.dataset.ar
            : element.dataset.en;

      });

    if (label) {
      label.textContent =
        language === "ar"
          ? "EN"
          : "AR";
    }
  }

  toggle.addEventListener(
    "click",
    () => {

      language =
        language === "ar"
          ? "en"
          : "ar";

      localStorage.setItem(
        "cess_lang",
        language
      );

      applyLanguage();
    }
  );

  applyLanguage();
}


/* =========================================================
   UI HELPERS
   ========================================================= */

function updateAdminIdentity() {

  const elements =
    document.querySelectorAll(
      "[data-admin-name]"
    );

  elements.forEach(
    (element) => {
      element.textContent =
        currentProfile?.name ||
        currentUser?.displayName ||
        "Administrator";
    }
  );
}


function redirectToLogin() {
  window.location.href =
    "login.html";
}


function showAccessDenied() {
  document.body.innerHTML = `
    <main style="
      min-height:100vh;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:2rem;
      text-align:center;
    ">
      <div>
        <h1>Access Denied</h1>
        <p>
          You do not have permission
          to access this dashboard.
        </p>
        <a href="index.html"
           class="btn btn-outline">
          Return to website
        </a>
      </div>
    </main>
  `;
}


function showGlobalError(message) {

  const existing =
    document.getElementById(
      "admin-global-error"
    );

  if (existing) {
    existing.textContent =
      message;
    return;
  }

  const element =
    document.createElement(
      "div"
    );

  element.id =
    "admin-global-error";

  element.className =
    "empty-state";

  element.textContent =
    message;

  document.body.prepend(
    element
  );
}


function showToast(
  message,
  isError = false
) {

  let toast =
    document.getElementById(
      "cess-admin-toast"
    );

  if (!toast) {

    toast =
      document.createElement(
        "div"
      );

    toast.id =
      "cess-admin-toast";

    toast.style.position =
      "fixed";

    toast.style.bottom =
      "20px";

    toast.style.left =
      "20px";

    toast.style.zIndex =
      "9999";

    toast.style.padding =
      "12px 18px";

    toast.style.borderRadius =
      "8px";

    toast.style.background =
      "#111";

    toast.style.color =
      "#fff";

    document.body.appendChild(
      toast
    );
  }

  toast.textContent =
    message;

  toast.style.opacity =
    "1";

  clearTimeout(
    toast._timeout
  );

  toast._timeout =
    setTimeout(
      () => {
        toast.style.opacity =
          "0";
      },
      3000
    );
}


function showSuccess(
  elementId,
  message
) {

  const element =
    document.getElementById(
      elementId
    );

  if (!element) {
    showToast(message);
    return;
  }

  element.textContent =
    message;

  element.style.display =
    "block";

  setTimeout(
    () => {
      element.style.display =
        "none";
    },
    4000
  );
}


/* =========================================================
   FIRESTORE HELPERS
   ========================================================= */

async function saveSettingsDocument(
  documentId,
  data
) {
  const reference =
    doc(
      db,
      COLLECTIONS.SETTINGS,
      documentId
    );

  const existing =
    await getDoc(reference);

  if (existing.exists()) {
    await updateDoc(
      reference,
      data
    );
  } else {
    const { setDoc } =
      await import(
        "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
      );

    await setDoc(
      reference,
      data
    );
  }
}


async function importFirestoreAddSettings(
  data
) {
  const { setDoc } =
    await import(
      "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js"
    );

  await setDoc(
    doc(
      db,
      COLLECTIONS.SETTINGS,
      "socialLinks"
    ),
    {
      ...data,
      updatedAt:
        serverTimestamp(),
      updatedBy:
        currentUser.uid
    }
  );
}


/* =========================================================
   HTML SAFETY
   ========================================================= */

function safeText(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}


function escapeAttribute(value) {
  return safeText(value);
}


function truncate(
  value,
  maxLength
) {

  const text =
    String(
      value || ""
    );

  if (
    text.length <= maxLength
  ) {
    return text;
  }

  return (
    text.substring(
      0,
      maxLength
    ) + "…"
  );
}


/* =========================================================
   UI PLACEHOLDERS
   ========================================================= */

function loadingRow(columns) {
  return `
    <tr>
      <td colspan="${columns}"
          class="empty-state">
        Loading…
      </td>
    </tr>
  `;
}


function emptyRow(
  columns,
  message
) {
  return `
    <tr>
      <td colspan="${columns}"
          class="empty-state">
        ${safeText(message)}
      </td>
    </tr>
  `;
}


function errorRow(
  columns,
  message
) {
  return `
    <tr>
      <td colspan="${columns}"
          class="empty-state">
        ${safeText(message)}
      </td>
    </tr>
  `;
}


function loadingCard() {
  return `
    <div class="empty-state">
      Loading…
    </div>
  `;
}


function emptyCard(message) {
  return `
    <div class="empty-state">
      ${safeText(message)}
    </div>
  `;
}


function errorCard(message) {
  return `
    <div class="empty-state">
      ${safeText(message)}
    </div>
  `;
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function initializeNavigation() {

  const links =
    document.querySelectorAll(
      ".dashboard-sidebar a"
    );

  links.forEach(
    (link) => {

      link.addEventListener(
        "click",
        () => {

          links.forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );

          link.classList.add(
            "active"
          );
        }
      );

    }
  );
}

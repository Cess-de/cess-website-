import { mountLayout, loadSocialLinks } from "../components/layout.js";
import { guardPage, ROLES } from "../auth.js";
import {
  SERVICES,
  listUsers,
  updateUserRole,
  updateUserStatus,
  deleteUser,
  settingsService
} from "../services/firestore.js";
import { STATUSES } from "../config.js";
import { t } from "../i18n.js";


/* =========================================================
   CESS — Admin Dashboard
   =========================================================

   Runtime:
   - ES Module
   - Firebase Compat through firebase-config.js
   - Firestore services through services/firestore.js

   Required HTML IDs:
   - users-table
   - user-search
   - site-form
   - social-form
   - stat-preview-activities
   - stat-preview-members
   - refresh-stats-btn

   Collection UI key:
   - archive -> publicArchive
   ========================================================= */


/* =========================================================
   LOCAL HELPERS
   ========================================================= */

const COLLECTIONS = [
  "activities",
  "announcements",
  "resources",
  "archive",
  "history",
  "meetings",
  "reports",
  "committees",
  "internalDocuments",
  "handover"
];


function esc(value) {
  return window.escapeHtml
    ? window.escapeHtml(value ?? "")
    : String(value ?? "");
}


function text(key) {
  return typeof t === "function"
    ? t(key)
    : key;
}


/* =========================================================
   USERS TABLE
   ========================================================= */

async function renderUsersTable(profile) {
  const tbody = document.getElementById("users-table");

  if (!tbody) {
    console.error("[admin] #users-table not found.");
    return;
  }

  window.renderLoading(tbody);

  let allUsers = [];

  try {
    allUsers = await listUsers();
  } catch (err) {
    console.error("[admin] users load failed:", err);

    tbody.innerHTML =
      '<tr>' +
        '<td colspan="5" class="empty-state">' +
          esc(text("state.error")) +
        '</td>' +
      '</tr>';

    return;
  }


  function paint(filter = "") {
    const q = filter.trim().toLowerCase();

    const visible = !q
      ? allUsers
      : allUsers.filter((user) => {
          const name =
            String(user.name || "").toLowerCase();

          const email =
            String(user.email || "").toLowerCase();

          const cohort =
            String(
              user.cohort ||
              user.batch ||
              ""
            ).toLowerCase();

          return (
            name.includes(q) ||
            email.includes(q) ||
            cohort.includes(q)
          );
        });


    if (!visible.length) {
      tbody.innerHTML =
        '<tr>' +
          '<td colspan="5" class="empty-state">' +
            esc(text("empty.users")) +
          '</td>' +
        '</tr>';

      return;
    }


    tbody.innerHTML = "";

    visible.forEach((user) => {
      tbody.appendChild(
        buildUserRow(
          user,
          profile,
          allUsers,
          paint,
          filter
        )
      );
    });
  }


  paint("");


  const searchInput =
    document.getElementById("user-search");

  if (
    searchInput &&
    !searchInput.dataset.bound
  ) {
    searchInput.dataset.bound = "1";

    searchInput.addEventListener(
      "input",
      (event) => {
        paint(event.target.value);
      }
    );
  }
}


/* =========================================================
   USER ROW
   ========================================================= */

function buildUserRow(
  user,
  adminProfile,
  allUsers,
  repaint,
  filter
) {
  const tr = document.createElement("tr");

  const isSelf =
    user.uid === adminProfile.uid;

  const disabled =
    isSelf ? "disabled" : "";


  const roleOptions = [
    "member",
    "leadership",
    "admin"
  ]
    .map((role) =>
      '<option value="' +
        esc(role) +
        '"' +
        (
          user.role === role
            ? " selected"
            : ""
        ) +
      ">" +
        esc(role) +
      "</option>"
    )
    .join("");


  const statusOptions = [
    STATUSES.ACTIVE,
    STATUSES.INACTIVE,
    STATUSES.SUSPENDED
  ]
    .map((status) =>
      '<option value="' +
        esc(status) +
        '"' +
        (
          user.status === status
            ? " selected"
            : ""
        ) +
      ">" +
        esc(status) +
      "</option>"
    )
    .join("");


  tr.innerHTML =
    '<td>' +
      esc(user.name || "—") +
    '</td>' +

    '<td>' +
      esc(
        user.cohort ||
        user.batch ||
        "—"
      ) +
    '</td>' +

    '<td>' +
      '<select data-role ' +
        disabled +
      '>' +
        roleOptions +
      '</select>' +
    '</td>' +

    '<td>' +
      '<select data-status ' +
        disabled +
      '>' +
        statusOptions +
      '</select>' +
    '</td>' +

    '<td>' +

      '<button ' +
        'class="btn btn-outline act-save" ' +
        disabled +
      '>' +
        esc(text("act.save")) +
      '</button> ' +

      '<button ' +
        'class="btn btn-danger act-delete" ' +
        disabled +
      '>' +
        esc(text("act.delete")) +
      '</button>' +

    '</td>';


  /* -------------------------------------------------------
     SAVE USER ROLE / STATUS
     ------------------------------------------------------- */

  const saveButton =
    tr.querySelector(".act-save");


  saveButton.addEventListener(
    "click",
    async (event) => {

      const button =
        event.currentTarget;

      const roleSelect =
        tr.querySelector("[data-role]");

      const statusSelect =
        tr.querySelector("[data-status]");


      const newRole =
        roleSelect.value;

      const newStatus =
        statusSelect.value;


      button.disabled = true;


      try {

        if (
          newRole !== user.role
        ) {
          await updateUserRole(
            user.uid,
            newRole
          );
        }


        if (
          newStatus !== user.status
        ) {
          await updateUserStatus(
            user.uid,
            newStatus
          );
        }


        user.role = newRole;
        user.status = newStatus;


        window.toastSuccess(
          text("state.saved")
        );

      } catch (err) {

        console.error(
          "[admin] user update failed:",
          err
        );

        window.toastError(
          text("state.error")
        );

      } finally {

        button.disabled = false;
      }
    }
  );


  /* -------------------------------------------------------
     DELETE USER
     ------------------------------------------------------- */

  const deleteButton =
    tr.querySelector(".act-delete");


  deleteButton.addEventListener(
    "click",
    async (event) => {

      const button =
        event.currentTarget;


      const confirmed =
        await window.confirmDialog(
          text("act.delete") +
          " " +
          (user.name || user.email) +
          "?"
        );


      if (!confirmed) {
        return;
      }


      button.disabled = true;


      try {

        await deleteUser(
          user.uid
        );


        const index =
          allUsers.findIndex(
            (item) =>
              item.uid === user.uid
          );


        if (index >= 0) {
          allUsers.splice(index, 1);
        }


        repaint(filter);


        window.toastSuccess(
          text("state.saved")
        );

      } catch (err) {

        console.error(
          "[admin] user delete failed:",
          err
        );

        window.toastError(
          text("state.error")
        );

        button.disabled = false;
      }
    }
  );


  return tr;
}


/* =========================================================
   SITE SETTINGS
   ========================================================= */

async function loadSiteForm(profile) {
  const form =
    document.getElementById("site-form");

  if (!form) {
    return;
  }


  const fields = [
    "siteName_en",
    "siteName_ar",
    "university_en",
    "university_ar",
    "contactEmail",
    "contactPhone"
  ];


  try {

    const data =
      (
        await settingsService.get("site")
      ) || {};


    fields.forEach((field) => {

      if (form.elements[field]) {
        form.elements[field].value =
          data[field] || "";
      }

    });

  } catch (err) {

    console.warn(
      "[admin] site settings load failed:",
      err
    );
  }


  if (form.dataset.bound) {
    return;
  }

  form.dataset.bound = "1";


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const patch = {};


      fields.forEach((field) => {

        patch[field] =
          (
            form.elements[field]
              ? form.elements[field].value
              : ""
          ).trim();

      });


      try {

        const current =
          await window.CESS_AUTH
            ?.getLoggedInUser?.();


        await settingsService.set(
          "site",
          patch,
          current?.uid ||
          profile.uid
        );


        window.toastSuccess(
          text("state.saved")
        );

      } catch (err) {

        console.error(
          "[admin] site save failed:",
          err
        );

        window.toastError(
          text("state.error")
        );
      }
    }
  );
}


/* =========================================================
   SOCIAL LINKS
   ========================================================= */

async function loadSocialForm(profile) {
  const form =
    document.getElementById("social-form");

  if (!form) {
    return;
  }


  const fields = [
    "facebook",
    "instagram",
    "telegram",
    "whatsapp",
    "linkedin",
    "youtube"
  ];


  try {

    const data =
      (
        await settingsService.get(
          "socialLinks"
        )
      ) || {};


    fields.forEach((field) => {

      if (form.elements[field]) {
        form.elements[field].value =
          data[field] || "";
      }

    });

  } catch (err) {

    console.warn(
      "[admin] social links load failed:",
      err
    );
  }


  if (form.dataset.bound) {
    return;
  }

  form.dataset.bound = "1";


  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      const patch = {};


      fields.forEach((field) => {

        patch[field] =
          (
            form.elements[field]
              ? form.elements[field].value
              : ""
          ).trim();

      });


      try {

        await settingsService.set(
          "socialLinks",
          patch,
          profile.uid
        );


        window.toastSuccess(
          text("state.saved")
        );

      } catch (err) {

        console.error(
          "[admin] social save failed:",
          err
        );

        window.toastError(
          text("state.error")
        );
      }
    }
  );
}


/* =========================================================
   STATISTICS
   ========================================================= */

async function loadStatsPreview() {

  const activities =
    document.getElementById(
      "stat-preview-activities"
    );

  const members =
    document.getElementById(
      "stat-preview-members"
    );


  if (!activities || !members) {
    return;
  }


  try {

    const data =
      (
        await settingsService.get(
          "publicStatistics"
        )
      ) || {};


    activities.textContent =
      data.activitiesCount != null
        ? data.activitiesCount
        : "—";


    members.textContent =
      data.membersCount != null
        ? data.membersCount
        : (
            data.registeredStudentsCount != null
              ? data.registeredStudentsCount
              : "—"
          );

  } catch (err) {

    console.warn(
      "[admin] stats preview failed:",
      err
    );
  }
}


/* ---------------------------------------------------------
   REFRESH PUBLIC STATISTICS
   --------------------------------------------------------- */

async function refreshStatistics() {

  const button =
    document.getElementById(
      "refresh-stats-btn"
    );


  if (button) {
    button.disabled = true;
  }


  try {

    const [
      activities,
      users
    ] = await Promise.all([
      SERVICES.activities.listPublic({
        max: 500
      }),

      listUsers()
    ]);


    const membersCount =
      users.filter(
        (user) =>
          user.role === "member" ||
          user.role === "leadership"
      ).length;


    await settingsService.set(
      "publicStatistics",
      {
        activitiesCount:
          activities.length,

        membersCount
      }
    );


    await loadStatsPreview();


    window.toastSuccess(
      text("state.saved")
    );

  } catch (err) {

    console.error(
      "[admin] stats refresh failed:",
      err
    );

    window.toastError(
      text("state.error")
    );

  } finally {

    if (button) {
      button.disabled = false;
    }
  }
}


/* =========================================================
   COLLECTIONS
   ========================================================= */

function defaultOrderField(key) {

  return {
    activities:
      "date",

    announcements:
      "date",

    resources:
      "createdAt",

    archive:
      "createdAt",

    history:
      "order",

    meetings:
      "date",

    reports:
      "createdAt",

    committees:
      "createdAt",

    internalDocuments:
      "createdAt",

    handover:
      "createdAt"

  }[key] || "createdAt";
}


function defaultOrderDir(key) {

  return key === "history"
    ? "asc"
    : "desc";
}


/* =========================================================
   RENDER COLLECTION
   ========================================================= */

async function renderCollection(
  key,
  profile
) {

  const element =
    document.getElementById(
      key + "-grid"
    );


  if (!element) {
    console.warn(
      "[admin] collection grid not found:",
      key
    );

    return;
  }


  const service =
    SERVICES[key];


  if (!service) {

    console.error(
      "[admin] no service for:",
      key
    );

    window.renderError(
      element,
      "state.error"
    );

    return;
  }


  window.renderLoading(
    element
  );


  let items;


  try {

    items =
      await service.listAll({
        orderField:
          defaultOrderField(key),

        orderDir:
          defaultOrderDir(key)
      });

  } catch (err) {

    console.error(
      "[admin] collection load failed:",
      key,
      err
    );


    window.renderError(
      element,
      "state.error",
      () =>
        renderCollection(
          key,
          profile
        )
    );


    return;
  }


  if (!items || !items.length) {

    window.renderEmpty(
      element,
      "state.empty"
    );

    return;
  }


  element.innerHTML = "";


  items.forEach((item) => {

    element.appendChild(
      buildRow(
        key,
        item,
        profile
      )
    );

  });
}


/* =========================================================
   COLLECTION ROW
   ========================================================= */

function buildRow(
  key,
  item,
  profile
) {

  const service =
    SERVICES[key];


  const card =
    document.createElement("div");


  card.className =
    "card";


  const title =
    window.pickLang(item, "title") ||
    window.pickLang(item, "name") ||
    window.pickLang(item, "stage") ||
    "—";


  const publishedPill =
    item.published === true
      ? '<span class="pill published">published</span>'
      : item.published === false
        ? '<span class="pill draft">draft</span>'
        : "";


  const featuredPill =
    item.featured
      ? '<span class="pill featured">★</span>'
      : "";


  const dateValue =
    item.date ||
    item.createdAt;


  const dateLine =
    dateValue
      ? (
          '<p class="card-date">' +
            esc(
              window.formatDate(
                dateValue
              )
            ) +
          '</p>'
        )
      : "";


  card.innerHTML =
    '<div class="card-body">' +

      '<h3>' +
        esc(title) +
      '</h3>' +

      '<div>' +
        publishedPill +
        featuredPill +
      '</div>' +

      dateLine +

      '<div class="media-list">' +

        '<button ' +
          'class="btn btn-outline act-edit">' +
          esc(text("act.edit")) +
        '</button>' +

        (
          item.published !== undefined
            ? (
                '<button ' +
                  'class="btn btn-outline act-publish">' +
                  esc(
                    item.published
                      ? text("act.unpublish")
                      : text("act.publish")
                  ) +
                '</button>'
              )
            : ""
        ) +

        (
          item.featured !== undefined
            ? (
                '<button ' +
                  'class="btn btn-outline act-feature">' +
                  (
                    item.featured
                      ? "★"
                      : "☆"
                  ) +
                '</button>'
              )
            : ""
        ) +

        '<button ' +
          'class="btn btn-danger act-delete">' +
          esc(text("act.delete")) +
        '</button>' +

      '</div>' +

    '</div>';


  /* -------------------------------------------------------
     EDIT
     ------------------------------------------------------- */

  card
    .querySelector(".act-edit")
    .addEventListener(
      "click",
      () => {

        if (
          window.CESS_CMS &&
          typeof window.CESS_CMS.openEditor ===
            "function"
        ) {

          window.CESS_CMS.openEditor(
            key,
            item,
            profile.uid,
            () =>
              renderCollection(
                key,
                profile
              )
          );
        }

      }
    );


  /* -------------------------------------------------------
     PUBLISH
     ------------------------------------------------------- */

  const publishButton =
    card.querySelector(
      ".act-publish"
    );


  if (publishButton) {

    publishButton.addEventListener(
      "click",
      async () => {

        publishButton.disabled = true;

        try {

          await service.update(
            item.id,
            {
              published:
                !item.published
            },
            profile.uid
          );


          await renderCollection(
            key,
            profile
          );

        } catch (err) {

          console.error(
            "[admin] publish failed:",
            err
          );

          window.toastError(
            text("state.error")
          );

          publishButton.disabled = false;
        }
      }
    );
  }


  /* -------------------------------------------------------
     FEATURE
     ------------------------------------------------------- */

  const featureButton =
    card.querySelector(
      ".act-feature"
    );


  if (featureButton) {

    featureButton.addEventListener(
      "click",
      async () => {

        featureButton.disabled = true;

        try {

          await service.update(
            item.id,
            {
              featured:
                !item.featured
            },
            profile.uid
          );


          await renderCollection(
            key,
            profile
          );

        } catch (err) {

          console.error(
            "[admin] feature update failed:",
            err
          );

          window.toastError(
            text("state.error")
          );

          featureButton.disabled = false;
        }
      }
    );
  }


  /* -------------------------------------------------------
     DELETE
     ------------------------------------------------------- */

  card
    .querySelector(".act-delete")
    .addEventListener(
      "click",
      async (event) => {

        const confirmed =
          await window.confirmDialog(
            text("act.delete") +
            "?"
          );


        if (!confirmed) {
          return;
        }


        const button =
          event.currentTarget;


        button.disabled = true;


        try {

          await service.remove(
            item.id
          );


          await renderCollection(
            key,
            profile
          );

        } catch (err) {

          console.error(
            "[admin] delete failed:",
            err
          );

          window.toastError(
            text("state.error")
          );

          button.disabled = false;
        }
      }
    );


  return card;
}


/* =========================================================
   NEW / EDIT BUTTONS
   ========================================================= */

function wireEditorButtons(
  profile
) {

  document
    .querySelectorAll(
      "[data-editor]"
    )
    .forEach((button) => {

      if (button.dataset.bound) {
        return;
      }

      button.dataset.bound = "1";


      button.addEventListener(
        "click",
        () => {

          const key =
            button.getAttribute(
              "data-editor"
            );


          if (
            window.CESS_CMS &&
            typeof window.CESS_CMS.openEditor ===
              "function"
          ) {

            window.CESS_CMS.openEditor(
              key,
              null,
              profile.uid,
              () =>
                renderCollection(
                  key,
                  profile
                )
            );
          }

        }
      );
    });


  document
    .querySelectorAll(
      "[data-collection-new]"
    )
    .forEach((button) => {

      if (button.dataset.bound) {
        return;
      }

      button.dataset.bound = "1";


      button.addEventListener(
        "click",
        () => {

          const key =
            button.getAttribute(
              "data-collection-new"
            );


          if (
            window.CESS_CMS &&
            typeof window.CESS_CMS.openEditor ===
              "function"
          ) {

            window.CESS_CMS.openEditor(
              key,
              null,
              profile.uid,
              () =>
                renderCollection(
                  key,
                  profile
                )
            );
          }

        }
      );
    });
}


/* =========================================================
   BOOT
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    mountLayout({
      variant: "dashboard"
    });


    loadSocialLinks(
      "footer-social-links"
    );


    guardPage(
      [ROLES.ADMIN],
      async (profile) => {

        wireEditorButtons(
          profile
        );


        const refreshButton =
          document.getElementById(
            "refresh-stats-btn"
          );


        if (
          refreshButton &&
          !refreshButton.dataset.bound
        ) {

          refreshButton.dataset.bound = "1";


          refreshButton.addEventListener(
            "click",
            refreshStatistics
          );
        }


        await Promise.allSettled([

          renderUsersTable(
            profile
          ),

          loadSiteForm(
            profile
          ),

          loadSocialForm(
            profile
          ),

          loadStatsPreview(),

          ...COLLECTIONS.map(
            (key) =>
              renderCollection(
                key,
                profile
              )
          )

        ]);

      }
    );
  }
);

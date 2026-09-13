/* =========================================================
   CESS — Public Site Logic
   =========================================================
   Handles:
   - Bilingual EN/AR switching (persisted via localStorage)
   - Mobile hamburger navigation
   - Dynamic public content (activities, announcements, resources,
     archive, history, statistics) with graceful fallback states
   - Firebase failure must NEVER blank the page (see initPublicPage)
   ========================================================= */

/* ---------- Language System ---------- */

const LANG_KEY = "cess_lang";

function getLang() {
  return localStorage.getItem(LANG_KEY) || "en";
}

function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyLang(lang);
}

function applyLang(lang) {
  document.documentElement.setAttribute("lang", lang);
  document.documentElement.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");

  document.querySelectorAll("[data-en][data-ar]").forEach((el) => {
    el.textContent = lang === "ar" ? el.getAttribute("data-ar") : el.getAttribute("data-en");
  });

  document.querySelectorAll("[data-placeholder-en][data-placeholder-ar]").forEach((el) => {
    el.setAttribute(
      "placeholder",
      lang === "ar" ? el.getAttribute("data-placeholder-ar") : el.getAttribute("data-placeholder-en")
    );
  });

  const toggleLabel = document.getElementById("lang-toggle-label");
  if (toggleLabel) toggleLabel.textContent = lang === "ar" ? "EN" : "AR";
}

function initLangSwitch() {
  applyLang(getLang());
  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      setLang(getLang() === "ar" ? "en" : "ar");
    });
  }
}

/* Helper: pick the right bilingual field from a Firestore doc */
function pickLang(doc, fieldBase) {
  const lang = getLang();
  const value = lang === "ar" ? doc[`${fieldBase}_ar`] : doc[`${fieldBase}_en`];
  // fall back to whichever language actually has content
  return value || doc[`${fieldBase}_en`] || doc[`${fieldBase}_ar`] || "";
}

/* ---------- Mobile Navigation ---------- */

function initMobileNav() {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("open");
      hamburger.classList.toggle("active");
    });
  }
}

/* ---------- Safe Firestore Fetch Wrapper ---------- */

/**
 * Fetches a Firestore query and calls onSuccess with the docs.
 * On ANY failure (Firebase not configured, offline, permission error,
 * etc.) it calls onEmpty so the page shows a graceful empty state
 * instead of breaking. This is the mechanism behind the "No Blank
 * Page Rule."
 */
async function safeFetch(queryFn, onSuccess, onEmpty) {
  try {
    const snapshot = await queryFn();
    if (snapshot.empty) {
      onEmpty();
      return;
    }
    onSuccess(snapshot);
  } catch (err) {
    console.error("Firestore fetch failed, showing empty state:", err);
    onEmpty();
  }
}

function renderEmptyState(container, messageEn, messageAr) {
  const lang = getLang();
  container.innerHTML = `<p class="empty-state">${lang === "ar" ? messageAr : messageEn}</p>`;
}

/* ---------- Public Statistics ---------- */

async function loadPublicStatistics() {
  const activitiesEl = document.getElementById("stat-activities");
  const membersEl = document.getElementById("stat-members");
  if (!activitiesEl || !membersEl) return;

  try {
    const doc = await db.collection(CESS_CONFIG.collections.SETTINGS).doc("publicStatistics").get();
    if (doc.exists) {
      const data = doc.data();
      activitiesEl.textContent = `+${data.activitiesCount ?? 0}`;
      membersEl.textContent = `+${data.registeredStudentsCount ?? 0}`;
    } else {
      activitiesEl.textContent = "+0";
      membersEl.textContent = "+0";
    }
  } catch (err) {
    console.error("Statistics unavailable:", err);
    activitiesEl.textContent = "+0";
    membersEl.textContent = "+0";
  }
}

/* ---------- Upcoming Activities (Home preview + Activities page) ---------- */

async function loadActivities(containerId, { limit = 50, upcomingOnly = false } = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () => {
      // A .limit() is always applied — Firestore Security Rules require
      // public queries to specify limit <= 50 (see firestore.rules).
      let query = db
        .collection(CESS_CONFIG.collections.ACTIVITIES)
        .where("published", "==", true)
        .orderBy("date", upcomingOnly ? "asc" : "desc")
        .limit(limit);
      return query.get();
    },
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        container.appendChild(buildActivityCard(doc.id, data));
      });
    },
    () => renderEmptyState(container, "No activities available yet.", "لا توجد أنشطة متاحة حتى الآن.")
  );
}

function buildActivityCard(id, data) {
  const card = document.createElement("a");
  card.href = `activity-details.html?id=${id}`;
  card.className = "card activity-card";

  const img = data.image
    ? `<img src="${data.image}" alt="${pickLang(data, "title")}" loading="lazy" class="card-image">`
    : `<div class="card-image card-image-placeholder"></div>`;

  card.innerHTML = `
    ${img}
    <div class="card-body">
      <span class="badge">${data.category || ""}</span>
      <h3>${pickLang(data, "title")}</h3>
      <p class="card-date">${formatDate(data.date)}</p>
      <p>${pickLang(data, "shortDescription")}</p>
    </div>
  `;
  return card;
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date)) return "";
  return date.toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

/* ---------- Activity Details Page ---------- */

async function loadActivityDetails() {
  const container = document.getElementById("activity-detail-container");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    renderEmptyState(container, "Activity not found.", "لم يتم العثور على النشاط.");
    return;
  }

  try {
    const doc = await db.collection(CESS_CONFIG.collections.ACTIVITIES).doc(id).get();

    if (!doc.exists || doc.data().published !== true) {
      // Do not expose unpublished activities publicly
      renderEmptyState(container, "Activity not found.", "لم يتم العثور على النشاط.");
      return;
    }

    const data = doc.data();
    const imagesHtml = (data.gallery || [])
      .map((url) => `<img src="${url}" alt="" loading="lazy" style="border-radius:8px;margin-bottom:0.5rem;">`)
      .join("");

    const docsHtml = (data.documents || [])
      .map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${d.label || d.url}</a></li>`)
      .join("");

    const driveLinksHtml = (data.driveLinks || [])
      .map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${d.label || d.url}</a></li>`)
      .join("");

    container.innerHTML = `
      <span class="badge">${data.category || ""}</span>
      <h1>${pickLang(data, "title")}</h1>
      <p class="card-date">${formatDate(data.date)} ${data.location ? "· " + data.location : ""}</p>
      ${data.organizer ? `<p><strong>${getLang() === "ar" ? "الجهة المنظمة" : "Organizer"}:</strong> ${data.organizer}</p>` : ""}
      ${data.image ? `<img src="${data.image}" alt="${pickLang(data, "title")}" style="border-radius:10px;margin-bottom:1rem;">` : ""}
      <p>${pickLang(data, "description")}</p>
      ${imagesHtml}
      ${docsHtml ? `<h3>${getLang() === "ar" ? "المستندات" : "Documents"}</h3><ul>${docsHtml}</ul>` : ""}
      ${driveLinksHtml ? `<h3>${getLang() === "ar" ? "روابط جوجل درايف" : "Drive Links"}</h3><ul>${driveLinksHtml}</ul>` : ""}
      ${data.report ? `<h3>${getLang() === "ar" ? "التقرير" : "Report"}</h3><p>${pickLang(data, "report")}</p>` : ""}
    `;
  } catch (err) {
    console.error("Failed to load activity details:", err);
    renderEmptyState(container, "This activity could not be loaded right now.", "تعذر تحميل هذا النشاط حاليًا.");
  }
}

/* ---------- Announcements ---------- */

async function loadAnnouncements(containerId, limit = 50) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () => {
      // .limit() always applied — required by firestore.rules for public queries.
      let query = db
        .collection(CESS_CONFIG.collections.ANNOUNCEMENTS)
        .where("published", "==", true)
        .orderBy("date", "desc")
        .limit(limit);
      return query.get();
    },
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "card announcement-card";
        item.innerHTML = `
          <p class="card-date">${formatDate(data.date)}</p>
          <h3>${pickLang(data, "title")}</h3>
          <p>${pickLang(data, "content")}</p>
        `;
        container.appendChild(item);
      });
    },
    () => renderEmptyState(container, "No announcements available yet.", "لا توجد إعلانات متاحة حتى الآن.")
  );
}

/* ---------- Resources ---------- */

async function loadResources(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () =>
      // .limit() required by firestore.rules for public queries.
      db.collection(CESS_CONFIG.collections.RESOURCES).where("published", "==", true).orderBy("date", "desc").limit(50).get(),
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "card resource-card";
        const link = data.driveLink || data.link || "#";
        item.innerHTML = `
          <span class="badge">${data.category || ""}</span>
          <h3>${pickLang(data, "title")}</h3>
          <p>${pickLang(data, "description")}</p>
          <a href="${link}" target="_blank" rel="noopener" class="btn btn-outline">
            ${getLang() === "ar" ? "فتح المصدر" : "Open Resource"}
          </a>
        `;
        container.appendChild(item);
      });
    },
    () => renderEmptyState(container, "No resources available yet.", "لا توجد مصادر متاحة حتى الآن.")
  );
}

/* ---------- Public Archive ---------- */

async function loadArchive(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () =>
      db.collection(CESS_CONFIG.collections.PUBLIC_ARCHIVE).orderBy("category", "asc").get(),
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "card archive-card";
        item.innerHTML = `
          <span class="badge">${data.category || ""}</span>
          <h3>${pickLang(data, "title")}</h3>
          <p>${pickLang(data, "description")}</p>
          <a href="${data.driveLink || "#"}" target="_blank" rel="noopener" class="btn btn-outline">
            ${getLang() === "ar" ? "عرض المستند" : "View Document"}
          </a>
        `;
        container.appendChild(item);
      });
    },
    () => renderEmptyState(container, "No archive items available yet.", "لا توجد عناصر أرشيف متاحة حتى الآن.")
  );
}

/* ---------- History ---------- */

async function loadHistory(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  await safeFetch(
    async () => db.collection(CESS_CONFIG.collections.HISTORY).orderBy("order", "asc").get(),
    (snapshot) => {
      container.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "timeline-item";
        item.innerHTML = `
          <h3>${pickLang(data, "stage")}</h3>
          <p class="card-date">${data.period || ""}</p>
          <p>${pickLang(data, "description")}</p>
        `;
        container.appendChild(item);
      });
    },
    () => renderEmptyState(container, "No history entries available yet.", "لا توجد سجلات تاريخية متاحة حتى الآن.")
  );
}

/* ---------- Social Links (Footer / Contact) ---------- */

async function loadSocialLinks(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const doc = await db.collection(CESS_CONFIG.collections.SETTINGS).doc("socialLinks").get();
    if (!doc.exists) return; // no links configured yet — show nothing, not an error
    const data = doc.data();
    container.innerHTML = "";
    Object.entries(data).forEach(([platform, url]) => {
      if (url && url.trim() !== "") {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "social-link";
        link.textContent = platform;
        container.appendChild(link);
      }
    });
  } catch (err) {
    console.error("Social links unavailable:", err);
    // Fail silently — footer still renders without social icons
  }
}

/* ---------- Page Init ---------- */

/**
 * Call this once on every public page. Wires up language + nav
 * immediately (no Firebase dependency), so the static shell of
 * the page always works even if Firebase never loads.
 */
function initPublicPage() {
  initLangSwitch();
  initMobileNav();
}

document.addEventListener("DOMContentLoaded", initPublicPage);

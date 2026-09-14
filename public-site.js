/* =========================================================
   CESS — Public Site Controller
   =========================================================
   Handles dynamic public content for index/activities/resources/
   history/archive/activity-details pages. Every fetch degrades to
   a graceful empty state rather than a blank page — Firebase being
   unconfigured or briefly unreachable must never break the site
   for an anonymous visitor.
   ========================================================= */

import { initLangSwitch, t, pickLang, formatDate, renderEmptyState } from "../core/ui.js";
import { activitiesService, announcementsService, resourcesService, historyService, publicArchiveService, settingsService } from "../services/collections.js";

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();
  initMobileNav();

  const page = document.body.dataset.page;
  if (page === "home") initHomePage();
  if (page === "activities") initActivitiesPage();
  if (page === "activity-details") initActivityDetailsPage();
  if (page === "resources") initResourcesPage();
  if (page === "history") initHistoryPage();
  if (page === "archive") initArchivePage();

  // Footer social links load on every public page, regardless of data-page.
  if (page !== "home") loadFooterSocialLinks();

  const contactSocial = document.getElementById("contact-social-links");
  if (contactSocial) {
    settingsService.getSocialLinks().then((links) => {
      const icons = { facebook: "Facebook", instagram: "Instagram", telegram: "Telegram", whatsapp: "WhatsApp", linkedin: "LinkedIn", youtube: "YouTube" };
      const active = Object.entries(links).filter(([, url]) => url);
      if (!active.length) return;
      contactSocial.innerHTML = active.map(([platform, url]) => `<a href="${url}" target="_blank" rel="noopener">${icons[platform] || platform}</a>`).join("");
    }).catch(() => {});
  }
});

function initMobileNav() {
  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("open");
      hamburger.classList.toggle("active");
      hamburger.setAttribute("aria-expanded", navMenu.classList.contains("open"));
    });
  }
}

async function safePublicFetch(container, fetchFn, onSuccess) {
  try {
    const items = await fetchFn();
    if (!items.length) {
      renderEmptyState(container, "Nothing here yet — check back soon.", "لا يوجد شيء هنا حتى الآن — تحقق مرة أخرى قريبًا.");
      return;
    }
    onSuccess(items);
  } catch (err) {
    // Never blank the page: any failure (unconfigured Firebase, offline,
    // permission edge case) degrades to the same friendly empty state.
    console.error("Public fetch failed, showing empty state:", err);
    renderEmptyState(container, "Nothing here yet — check back soon.", "لا يوجد شيء هنا حتى الآن — تحقق مرة أخرى قريبًا.");
  }
}

/* ---------- Home Page ---------- */

function initHomePage() {
  const upcomingActivities = document.getElementById("upcoming-activities");
  if (upcomingActivities) {
    safePublicFetch(upcomingActivities, async () => {
      const items = await activitiesService.listPublished(20);
      const today = new Date(new Date().toDateString());
      return items.filter((a) => !a.date || new Date(a.date) >= today).slice(0, 3);
    }, (items) => {
      upcomingActivities.innerHTML = items.map(activityCard).join("");
    });
  }

  const announcements = document.getElementById("home-announcements");
  if (announcements) {
    safePublicFetch(announcements, () => announcementsService.listPublished(3), (items) => {
      announcements.innerHTML = items.map((a) => `
        <article class="card">
          <div class="card-body">
            <h4>${pickLang(a, "title")}</h4>
            <p>${(pickLang(a, "content") || "").slice(0, 140)}${(pickLang(a, "content") || "").length > 140 ? "…" : ""}</p>
          </div>
        </article>`).join("");
    });
  }

  const statActivities = document.getElementById("stat-activities");
  const statMembers = document.getElementById("stat-members");
  if (statActivities || statMembers) {
    settingsService.getPublicStatistics().then((stats) => {
      if (statActivities) statActivities.textContent = `+${stats.activitiesCount ?? 0}`;
      if (statMembers) statMembers.textContent = `+${stats.membersCount ?? 0}`;
    }).catch(() => {});
  }

  loadFooterSocialLinks();
}

function loadFooterSocialLinks() {
  const container = document.getElementById("footer-social-links");
  if (!container) return;
  settingsService.getSocialLinks().then((links) => {
    const icons = { facebook: "Facebook", instagram: "Instagram", telegram: "Telegram", whatsapp: "WhatsApp", linkedin: "LinkedIn", youtube: "YouTube" };
    const active = Object.entries(links).filter(([, url]) => url);
    if (!active.length) return;
    container.innerHTML = active.map(([platform, url]) => `<a href="${url}" target="_blank" rel="noopener">${icons[platform] || platform}</a>`).join("");
  }).catch(() => {});
}

function activityCard(a) {
  return `
    <article class="card">
      ${a.coverImage?.url ? `<img src="${a.coverImage.url}" alt="${pickLang(a, "title")}" class="card-img" loading="lazy" />` : ""}
      <div class="card-body">
        <h4>${pickLang(a, "title")}</h4>
        <p class="card-meta">${formatDate(a.date)} · ${pickLang(a, "location") || ""}</p>
        <a href="activity-details.html?id=${a.id}" class="btn btn-outline btn-sm">${t("Details", "التفاصيل")}</a>
      </div>
    </article>`;
}

/* ---------- Activities List ---------- */

function initActivitiesPage() {
  const container = document.getElementById("all-activities");
  if (!container) return;
  safePublicFetch(container, () => activitiesService.listPublished(50), (items) => {
    container.innerHTML = items.map(activityCard).join("");
  });
}

/* ---------- Activity Details ---------- */

function initActivityDetailsPage() {
  const container = document.getElementById("activity-detail-container");
  if (!container) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    renderEmptyState(container, "Activity not found.", "لم يتم العثور على النشاط.");
    return;
  }
  activitiesService.getById(id).then((a) => {
    if (!a || !a.published) {
      renderEmptyState(container, "Activity not found.", "لم يتم العثور على النشاط.");
      return;
    }
    container.innerHTML = `
      ${a.coverImage?.url ? `<img src="${a.coverImage.url}" alt="${pickLang(a, "title")}" class="details-cover" />` : ""}
      <h1>${pickLang(a, "title")}</h1>
      <p class="card-meta">${formatDate(a.date)} ${a.startTime ? `· ${a.startTime}` : ""}${a.endTime ? `–${a.endTime}` : ""} · ${pickLang(a, "location") || ""}</p>
      <p>${pickLang(a, "description")}</p>
      ${a.registrationUrl ? `<a href="${a.registrationUrl}" target="_blank" rel="noopener" class="btn btn-primary">${t("Register", "التسجيل")}</a>` : ""}
      ${a.externalUrl ? `<a href="${a.externalUrl}" target="_blank" rel="noopener" class="btn btn-outline">${t("More info", "مزيد من المعلومات")}</a>` : ""}
      ${(a.gallery || []).length ? `<div class="gallery-grid">${a.gallery.map((m) => `<img src="${m.url}" alt="${m.name}" loading="lazy" />`).join("")}</div>` : ""}
      ${(a.documents || []).length ? `<ul class="doc-list">${a.documents.map((d) => `<li><a href="${d.url}" target="_blank" rel="noopener">${d.name}</a></li>`).join("")}</ul>` : ""}
    `;
  }).catch(() => renderEmptyState(container, "Activity not found.", "لم يتم العثور على النشاط."));
}

/* ---------- Resources ---------- */

function initResourcesPage() {
  const container = document.getElementById("all-resources");
  if (!container) return;
  safePublicFetch(container, () => resourcesService.listPublished(50), (items) => {
    container.innerHTML = items.map((r) => `
      <article class="card">
        ${r.coverImage?.url ? `<img src="${r.coverImage.url}" alt="${pickLang(r, "title")}" class="card-img" loading="lazy" />` : ""}
        <div class="card-body">
          <h4>${pickLang(r, "title")}</h4>
          <p class="card-meta">${r.category || ""}</p>
          <p>${pickLang(r, "description")}</p>
          ${(r.files || []).map((f) => `<a href="${f.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">${f.name}</a>`).join(" ")}
          ${r.externalUrl ? `<a href="${r.externalUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">${t("Open link", "فتح الرابط")}</a>` : ""}
        </div>
      </article>`).join("");
  });
}

/* ---------- History Timeline ---------- */

function initHistoryPage() {
  const container = document.getElementById("history-timeline");
  if (!container) return;
  // Uses listPublished(), not listAll() + client-side filter: an anonymous
  // visitor's query must itself carry the published==true constraint, or
  // firestore.rules rejects the list request outright (see rules comment
  // on list-rule evaluation). safePublicFetch() catches that rejection and
  // shows the friendly empty state rather than surfacing a raw error.
  safePublicFetch(container, () => historyService.listPublished(200), (items) => {
    container.innerHTML = items.map((h) => `
      <div class="timeline-entry">
        <div class="timeline-year">${h.year || ""}</div>
        <div class="timeline-body">
          ${h.image?.url ? `<img src="${h.image.url}" alt="${pickLang(h, "title")}" loading="lazy" />` : ""}
          <h4>${pickLang(h, "stage") || pickLang(h, "title")}</h4>
          <p>${pickLang(h, "description")}</p>
        </div>
      </div>`).join("");
  });
}

/* ---------- Public Archive ---------- */

function initArchivePage() {
  const container = document.getElementById("archive-items");
  if (!container) return;
  safePublicFetch(container, () => publicArchiveService.listPublished(50), (items) => {
    container.innerHTML = items.map((a) => `
      <article class="card">
        ${a.coverImage?.url ? `<img src="${a.coverImage.url}" alt="${pickLang(a, "title")}" class="card-img" loading="lazy" />` : ""}
        <div class="card-body">
          <h4>${pickLang(a, "title")}</h4>
          <p class="card-meta">${a.date ? formatDate(a.date) : ""} ${a.category ? `· ${a.category}` : ""}</p>
          <p>${pickLang(a, "description")}</p>
          ${(a.documents || []).map((d) => `<a href="${d.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">${d.name}</a>`).join(" ")}
        </div>
      </article>`).join("");
  });
}

/* =========================================================
   CESS — Member Dashboard Controller
   =========================================================
   A genuinely useful home for a signed-in student: their profile,
   recent announcements, upcoming activities, and resources — not
   an empty profile page (per spec section 30).
   ========================================================= */

import { CESS_CONFIG } from "../core/firebase.js";
import { guardPage, logoutUser } from "../core/session.js";
import { initLangSwitch, t, pickLang, formatDate, safeFetch, renderEmptyState, showToast, withBusyButton } from "../core/ui.js";
import { activitiesService, announcementsService, resourcesService, usersService } from "../services/collections.js";

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.MEMBER, CESS_CONFIG.roles.LEADERSHIP, CESS_CONFIG.roles.ADMIN], (profile) => {
    renderWelcome(profile);
    initProfileForm(profile);
    loadAnnouncements();
    loadUpcomingActivities();
    loadResources();
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

function renderWelcome(profile) {
  const el = document.getElementById("member-welcome-name");
  if (el) el.textContent = profile.name || profile.email;
  const cohortEl = document.getElementById("member-cohort");
  if (cohortEl) cohortEl.textContent = profile.cohort || t("Not set", "غير محدد");
  const roleEl = document.getElementById("member-role-badge");
  if (roleEl) roleEl.textContent = profile.role;
}

function initProfileForm(profile) {
  const form = document.getElementById("profile-form");
  if (!form) return;

  ["name", "cohort", "department", "phone", "bio"].forEach((field) => {
    const input = form.querySelector(`[name="${field}"]`);
    if (input) input.value = profile[field] || "";
  });
  const emailDisplay = form.querySelector("[name=email-display]");
  if (emailDisplay) emailDisplay.value = profile.email;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    delete data["email-display"];
    const btn = form.querySelector("button[type=submit]");
    await withBusyButton(btn, "Saving...", "جارٍ الحفظ...", async () => {
      try {
        await usersService.updateOwnProfile(profile.uid, data);
        showToast(t("Profile updated.", "تم تحديث الملف الشخصي."));
      } catch (err) {
        console.error(err);
        showToast(t("Could not update profile.", "تعذر تحديث الملف الشخصي."), "error");
      }
    });
  });
}

async function loadAnnouncements() {
  const container = document.getElementById("member-announcements");
  if (!container) return;
  await safeFetch(container, () => announcementsService.listPublished(5), (items) => {
    if (!items.length) return renderEmptyState(container, "No announcements yet.", "لا توجد إعلانات حتى الآن.");
    container.innerHTML = items.map((a) => `
      <article class="card">
        <div class="card-body">
          <h4>${pickLang(a, "title")}</h4>
          <p>${(pickLang(a, "content") || "").slice(0, 160)}${(pickLang(a, "content") || "").length > 160 ? "…" : ""}</p>
        </div>
      </article>
    `).join("");
  });
}

async function loadUpcomingActivities() {
  const container = document.getElementById("member-activities");
  if (!container) return;
  await safeFetch(container, () => activitiesService.listPublished(6), (items) => {
    const upcoming = items.filter((a) => !a.date || new Date(a.date) >= new Date(new Date().toDateString()));
    if (!upcoming.length) return renderEmptyState(container, "No upcoming activities.", "لا توجد أنشطة قادمة.");
    container.innerHTML = upcoming.map((a) => `
      <article class="card">
        ${a.coverImage?.url ? `<img src="${a.coverImage.url}" alt="${pickLang(a, "title")}" class="card-img" />` : ""}
        <div class="card-body">
          <h4>${pickLang(a, "title")}</h4>
          <p class="card-meta">${formatDate(a.date)} · ${pickLang(a, "location")}</p>
        </div>
      </article>
    `).join("");
  });
}

async function loadResources() {
  const container = document.getElementById("member-resources");
  if (!container) return;
  await safeFetch(container, () => resourcesService.listPublished(6), (items) => {
    if (!items.length) return renderEmptyState(container, "No resources available yet.", "لا توجد موارد متاحة حاليًا.");
    container.innerHTML = items.map((r) => `
      <article class="card">
        <div class="card-body">
          <h4>${pickLang(r, "title")}</h4>
          <p class="card-meta">${r.category || ""}</p>
          ${r.externalUrl ? `<a href="${r.externalUrl}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">${t("Open", "فتح")}</a>` : ""}
        </div>
      </article>
    `).join("");
  });
}

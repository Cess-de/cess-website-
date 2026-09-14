/* =========================================================
   CESS — Admin Dashboard Controller
   =========================================================
   Wires the Admin Dashboard: users/roles, full CMS for every
   content collection, settings, social links, statistics.
   All actual CRUD logic lives in services/ and cms/ — this file
   only wires DOM elements to those modules for the admin page.
   ========================================================= */

import { CESS_CONFIG } from "../core/firebase.js";
import { guardPage, logoutUser } from "../core/session.js";
import { initLangSwitch, t, formatDate, showToast, confirmDialog, safeFetch, renderEmptyState, withBusyButton } from "../core/ui.js";
import { mountContentManager } from "../cms/content-manager.js";
import {
  activitySchema, announcementSchema, resourceSchema, historySchema,
  publicArchiveSchema, meetingSchema, reportSchema, committeeSchema,
  internalDocumentSchema, handoverSchema
} from "../cms/schemas.js";
import {
  activitiesService, announcementsService, resourcesService, historyService,
  publicArchiveService, meetingsService, reportsService, committeesService,
  internalDocumentsService, handoverService, usersService, settingsService
} from "../services/collections.js";

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.ADMIN], (profile) => {
    document.getElementById("admin-name").textContent = profile.name || profile.email;
    initAllPanels(profile);
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

function initAllPanels(profile) {
  // Content collections — each is one line thanks to the shared content manager.
  mountContentManager({ container: byId("cms-activities"), newButton: byId("new-activity-btn"), service: activitiesService, schema: activitySchema });
  mountContentManager({ container: byId("cms-announcements"), newButton: byId("new-announcement-btn"), service: announcementsService, schema: announcementSchema });
  mountContentManager({ container: byId("cms-resources"), newButton: byId("new-resource-btn"), service: resourcesService, schema: resourceSchema });
  mountContentManager({
    container: byId("cms-history"), newButton: byId("new-history-btn"), service: historyService, schema: historySchema,
    titleField: (d) => `${d.year || ""} — ${d.title_en || d.title_ar || d.stage_en || ""}`
  });
  mountContentManager({ container: byId("cms-archive"), newButton: byId("new-archive-btn"), service: publicArchiveService, schema: publicArchiveSchema });
  mountContentManager({ container: byId("cms-meetings"), newButton: byId("new-meeting-btn"), service: meetingsService, schema: meetingSchema });
  mountContentManager({
    container: byId("cms-reports"), newButton: byId("new-report-btn"), service: reportsService, schema: reportSchema,
    extraBadge: (d) => d.internal ? `<span class="badge badge-warning">${t("Internal", "داخلي")}</span>` : ""
  });
  mountContentManager({ container: byId("cms-committees"), newButton: byId("new-committee-btn"), service: committeesService, schema: committeeSchema, titleField: (d) => d.name_en || d.name_ar });
  mountContentManager({
    container: byId("cms-internal-documents"), newButton: byId("new-internal-document-btn"), service: internalDocumentsService, schema: internalDocumentSchema,
    extraBadge: (d) => d.confidential ? `<span class="badge badge-warning">${t("Confidential", "سري")}</span>` : ""
  });
  mountContentManager({ container: byId("cms-handover"), newButton: byId("new-handover-btn"), service: handoverService, schema: handoverSchema });

  initUsersPanel(profile);
  initSiteSettingsPanel(profile);
  initSocialLinksPanel(profile);
  initStatisticsPanel(profile);
}

function byId(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`admin.js: expected element #${id} not found in admin.html`);
  return el;
}

/* ---------- Users & Roles ---------- */

function initUsersPanel(currentProfile) {
  const container = byId("users-table-body");
  const searchInput = byId("user-search-input");
  if (!container) return;

  let allUsers = [];

  async function load() {
    await safeFetch(container, () => usersService.list(), (users) => {
      allUsers = users;
      renderUsers(users, searchInput ? searchInput.value : "");
    });
  }

  function renderUsers(users, filterText) {
    const filtered = filterText
      ? users.filter((u) =>
          (u.name || "").toLowerCase().includes(filterText.toLowerCase()) ||
          (u.email || "").toLowerCase().includes(filterText.toLowerCase()) ||
          (u.cohort || "").toLowerCase().includes(filterText.toLowerCase()))
      : users;

    if (!filtered.length) {
      renderEmptyState(container, "No matching users.", "لا يوجد مستخدمون مطابقون.");
      return;
    }

    container.innerHTML = filtered.map((u) => `
      <div class="cms-item-card" data-uid="${u.id}">
        <div class="cms-item-main">
          <h4>${u.name || "—"}</h4>
          <div class="cms-item-meta">
            <span>${u.email || ""}</span>
            <span>${t("Cohort", "الدفعة")}: ${u.cohort || "—"}</span>
            <span class="badge ${u.status === "suspended" ? "badge-warning" : "badge-success"}">${u.status || "active"}</span>
          </div>
        </div>
        <div class="cms-item-actions">
          <select class="role-select" data-uid="${u.id}" ${u.id === currentProfile.uid ? "disabled title='You cannot change your own role.'" : ""}>
            <option value="member" ${u.role === "member" ? "selected" : ""}>${t("Member", "عضو")}</option>
            <option value="leadership" ${u.role === "leadership" ? "selected" : ""}>${t("Leadership", "قيادة")}</option>
            <option value="admin" ${u.role === "admin" ? "selected" : ""}>${t("Admin", "مسؤول")}</option>
          </select>
          <select class="status-select" data-uid="${u.id}" ${u.id === currentProfile.uid ? "disabled" : ""}>
            <option value="active" ${u.status === "active" ? "selected" : ""}>${t("Active", "نشط")}</option>
            <option value="inactive" ${u.status === "inactive" ? "selected" : ""}>${t("Inactive", "غير نشط")}</option>
            <option value="suspended" ${u.status === "suspended" ? "selected" : ""}>${t("Suspended", "معلق")}</option>
          </select>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".role-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const uid = sel.dataset.uid;
        if (uid === currentProfile.uid) return; // extra guard: never self-demote/self-elevate from this UI
        const confirmMsg = t(`Change this user's role to "${sel.value}"?`, `تغيير دور هذا المستخدم إلى "${sel.value}"؟`);
        if (!window.confirm(confirmMsg)) { load(); return; }
        try {
          await usersService.setRole(uid, sel.value);
          showToast(t("Role updated.", "تم تحديث الدور."));
        } catch (err) {
          console.error(err);
          showToast(t("Could not update role.", "تعذر تحديث الدور."), "error");
          load();
        }
      });
    });

    container.querySelectorAll(".status-select").forEach((sel) => {
      sel.addEventListener("change", async () => {
        const uid = sel.dataset.uid;
        if (uid === currentProfile.uid) return;
        try {
          await usersService.setStatus(uid, sel.value);
          showToast(t("Status updated.", "تم تحديث الحالة."));
        } catch (err) {
          console.error(err);
          showToast(t("Could not update status.", "تعذر تحديث الحالة."), "error");
          load();
        }
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => renderUsers(allUsers, searchInput.value));
  }

  load();
}

/* ---------- Site Settings ---------- */

function initSiteSettingsPanel(profile) {
  const form = byId("site-settings-form");
  if (!form) return;

  settingsService.getSite().then((site) => {
    if (!site) return;
    Object.entries(site).forEach(([key, value]) => {
      const input = form.querySelector(`[name="${key}"]`);
      if (input && typeof value === "string") input.value = value;
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector("button[type=submit]");
    await withBusyButton(btn, "Saving...", "جارٍ الحفظ...", async () => {
      try {
        await settingsService.saveSite(data, profile.uid);
        showToast(t("Site settings saved.", "تم حفظ إعدادات الموقع."));
      } catch (err) {
        console.error(err);
        showToast(t("Could not save site settings.", "تعذر حفظ إعدادات الموقع."), "error");
      }
    });
  });
}

/* ---------- Social Links ---------- */

function initSocialLinksPanel(profile) {
  const form = byId("social-links-form");
  if (!form) return;

  settingsService.getSocialLinks().then((links) => {
    ["facebook", "instagram", "telegram", "whatsapp", "linkedin", "youtube"].forEach((platform) => {
      const input = form.querySelector(`[name="${platform}"]`);
      if (input && links[platform]) input.value = links[platform];
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const links = Object.fromEntries(new FormData(form).entries());
    const btn = form.querySelector("button[type=submit]");
    await withBusyButton(btn, "Saving...", "جارٍ الحفظ...", async () => {
      try {
        await settingsService.saveSocialLinks(links, profile.uid);
        showToast(t("Social links saved.", "تم حفظ روابط التواصل."));
      } catch (err) {
        console.error(err);
        showToast(t("Could not save social links.", "تعذر حفظ روابط التواصل."), "error");
      }
    });
  });
}

/* ---------- Public Statistics ---------- */

function initStatisticsPanel(profile) {
  const previewActivities = byId("stat-preview-activities");
  const previewMembers = byId("stat-preview-members");
  const previewResources = byId("stat-preview-resources");
  const previewYears = byId("stat-preview-years");
  const refreshBtn = byId("refresh-stats-btn");
  const manualForm = byId("manual-stats-form");

  async function loadPreview() {
    const stats = await settingsService.getPublicStatistics();
    if (previewActivities) previewActivities.textContent = stats.activitiesCount ?? "—";
    if (previewMembers) previewMembers.textContent = stats.membersCount ?? "—";
    if (previewResources) previewResources.textContent = stats.resourcesCount ?? "—";
    if (previewYears) previewYears.textContent = stats.yearsCount ?? "—";
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      await withBusyButton(refreshBtn, "Refreshing...", "جارٍ التحديث...", async () => {
        try {
          await settingsService.refreshPublicStatistics(profile.uid);
          await loadPreview();
          showToast(t("Statistics refreshed from live data.", "تم تحديث الإحصائيات من البيانات الحية."));
        } catch (err) {
          console.error(err);
          showToast(t("Could not refresh statistics.", "تعذر تحديث الإحصائيات."), "error");
        }
      });
    });
  }

  if (manualForm) {
    manualForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(manualForm).entries());
      Object.keys(data).forEach((k) => (data[k] = Number(data[k]) || 0));
      const btn = manualForm.querySelector("button[type=submit]");
      await withBusyButton(btn, "Saving...", "جارٍ الحفظ...", async () => {
        try {
          await settingsService.saveManualStatistics(data, profile.uid);
          await loadPreview();
          showToast(t("Manual statistics saved.", "تم حفظ الإحصائيات اليدوية."));
        } catch (err) {
          console.error(err);
          showToast(t("Could not save manual statistics.", "تعذر حفظ الإحصائيات اليدوية."), "error");
        }
      });
    });
  }

  loadPreview();
}

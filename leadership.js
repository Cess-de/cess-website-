/* =========================================================
   CESS — Leadership Dashboard Controller
   =========================================================
   Leadership can manage society content (activities, announcements,
   resources, public archive, meetings, reports, committees, internal
   documents, handover) but NOT user roles or site/security settings —
   that boundary is enforced server-side by firestore.rules, and
   this page simply does not expose UI for what leadership can't do.
   ========================================================= */

import { CESS_CONFIG } from "../core/firebase.js";
import { guardPage, logoutUser } from "../core/session.js";
import { initLangSwitch, t } from "../core/ui.js";
import { mountContentManager } from "../cms/content-manager.js";
import {
  activitySchema, announcementSchema, resourceSchema,
  publicArchiveSchema, meetingSchema, reportSchema, committeeSchema,
  internalDocumentSchema, handoverSchema
} from "../cms/schemas.js";
import {
  activitiesService, announcementsService, resourcesService,
  publicArchiveService, meetingsService, reportsService, committeesService,
  internalDocumentsService, handoverService, settingsService
} from "../services/collections.js";

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.LEADERSHIP, CESS_CONFIG.roles.ADMIN], (profile) => {
    document.getElementById("leadership-name").textContent = profile.name || profile.email;
    initPanels();
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

function byId(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`leadership.js: expected element #${id} not found in leadership.html`);
  return el;
}

function initPanels() {
  mountContentManager({ container: byId("cms-activities"), newButton: byId("new-activity-btn"), service: activitiesService, schema: activitySchema });
  mountContentManager({ container: byId("cms-announcements"), newButton: byId("new-announcement-btn"), service: announcementsService, schema: announcementSchema });
  mountContentManager({ container: byId("cms-resources"), newButton: byId("new-resource-btn"), service: resourcesService, schema: resourceSchema });
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

  loadOverviewStats();
}

async function loadOverviewStats() {
  const el = byId("leadership-stats-preview");
  if (!el) return;
  try {
    const stats = await settingsService.getPublicStatistics();
    el.innerHTML = `
      <div class="stat-chip"><strong>${stats.activitiesCount ?? "—"}</strong><span>${t("Activities", "الأنشطة")}</span></div>
      <div class="stat-chip"><strong>${stats.membersCount ?? "—"}</strong><span>${t("Members", "الأعضاء")}</span></div>
      <div class="stat-chip"><strong>${stats.resourcesCount ?? "—"}</strong><span>${t("Resources", "الموارد")}</span></div>
    `;
  } catch (err) {
    console.error(err);
  }
}

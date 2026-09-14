/* =========================================================
   CESS — Reusable Content Manager Panel
   =========================================================
   Renders a list of documents for one collection with working
   New / Edit / Delete / Publish / Feature controls, using the
   generic editor + a field schema. This is what admin.js and
   leadership.js call for every content type instead of each
   hand-building its own table/card markup and click handlers.
   ========================================================= */

import { t, pickLang, formatDate, safeFetch, renderEmptyState, showToast } from "../core/ui.js";
import { openEditor, confirmAndDelete } from "./editor.js";
import { deleteFile } from "../services/media.js";

/**
 * @param {object} opts
 *   opts.container   - element to render into
 *   opts.newButton    - element that opens the "create" editor
 *   opts.service      - collection service (from services/collections.js)
 *   opts.schema       - field schema (from cms/schemas.js)
 *   opts.titleField   - function(doc) -> display title for cards/confirm dialogs
 *   opts.showPublishToggle / showFeatureToggle - booleans, default true if schema has those fields
 *   opts.extraBadge   - function(doc) -> extra HTML badge (e.g. "Confidential")
 */
export function mountContentManager(opts) {
  const {
    container, newButton, service, schema,
    titleField = (doc) => pickLang(doc, "title") || doc.name_en || doc.title || "Untitled",
    extraBadge = () => ""
  } = opts;

  const hasPublish = schema.fields.some((f) => f.name === "published");
  const hasFeature = schema.fields.some((f) => f.name === "featured");

  async function load() {
    await safeFetch(
      container,
      () => service.listAll(),
      (docs) => renderList(docs),
      {}
    );
  }

  function renderList(docs) {
    if (!docs.length) {
      renderEmptyState(container, "No items yet. Use the button above to add one.", "لا توجد عناصر بعد. استخدم الزر أعلاه لإضافة عنصر.");
      return;
    }
    container.innerHTML = docs.map((doc) => `
      <div class="cms-item-card" data-id="${doc.id}">
        <div class="cms-item-main">
          <h4>${titleField(doc)}</h4>
          <div class="cms-item-meta">
            ${doc.date ? `<span>${formatDate(doc.date)}</span>` : ""}
            ${hasPublish ? `<span class="badge ${doc.published ? "badge-success" : "badge-muted"}">${doc.published ? t("Published", "منشور") : t("Draft", "مسودة")}</span>` : ""}
            ${hasFeature && doc.featured ? `<span class="badge badge-accent">${t("Featured", "مميز")}</span>` : ""}
            ${extraBadge(doc)}
          </div>
        </div>
        <div class="cms-item-actions">
          ${hasPublish ? `<button class="btn btn-outline btn-sm toggle-publish-btn" data-id="${doc.id}" data-published="${!!doc.published}">${doc.published ? t("Unpublish", "إلغاء النشر") : t("Publish", "نشر")}</button>` : ""}
          ${hasFeature ? `<button class="btn btn-outline btn-sm toggle-feature-btn" data-id="${doc.id}" data-featured="${!!doc.featured}">${doc.featured ? t("Unfeature", "إلغاء التمييز") : t("Feature", "تمييز")}</button>` : ""}
          <button class="btn btn-outline btn-sm edit-btn" data-id="${doc.id}">${t("Edit", "تعديل")}</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${doc.id}">${t("Delete", "حذف")}</button>
        </div>
      </div>
    `).join("");

    container.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const doc = docs.find((d) => d.id === btn.dataset.id);
        openEditor({
          titleEn: `Edit ${schema.titleEn}`, titleAr: `تعديل ${schema.titleAr}`,
          fields: schema.fields,
          initialData: doc,
          driveFolder: schema.driveFolder,
          onSave: async (data) => {
            await service.update(doc.id, data);
            load();
          }
        });
      });
    });

    if (hasPublish) {
      container.querySelectorAll(".toggle-publish-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const nowPublished = btn.dataset.published === "true";
          try {
            await service.setPublished(btn.dataset.id, !nowPublished);
            showToast(t("Updated.", "تم التحديث."));
            load();
          } catch (err) {
            console.error(err);
            showToast(t("Could not update publish state.", "تعذر تحديث حالة النشر."), "error");
          }
        });
      });
    }

    if (hasFeature) {
      container.querySelectorAll(".toggle-feature-btn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const nowFeatured = btn.dataset.featured === "true";
          try {
            await service.setFeatured(btn.dataset.id, !nowFeatured);
            showToast(t("Updated.", "تم التحديث."));
            load();
          } catch (err) {
            console.error(err);
            showToast(t("Could not update featured state.", "تعذر تحديث حالة التمييز."), "error");
          }
        });
      });
    }

    container.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const doc = docs.find((d) => d.id === btn.dataset.id);
        const ok = await confirmAndDelete(titleField(doc), async () => {
          await service.remove(doc.id);
          // Best-effort Drive cleanup — a failed delete here does not block the Firestore delete,
          // since an orphaned Drive file is recoverable manually but a stuck CMS is not.
          const mediaFields = schema.fields.filter((f) => f.type === "media" || f.type === "mediaList");
          for (const f of mediaFields) {
            const val = doc[f.name];
            if (Array.isArray(val)) {
              await Promise.all(val.map((m) => m.driveFileId ? deleteFile(m.driveFileId).catch(() => {}) : null));
            } else if (val && val.driveFileId) {
              await deleteFile(val.driveFileId).catch(() => {});
            }
          }
        });
        if (ok) load();
      });
    });
  }

  if (newButton) {
    newButton.addEventListener("click", () => {
      openEditor({
        titleEn: `New ${schema.titleEn}`, titleAr: `${schema.titleAr} جديد`,
        fields: schema.fields,
        initialData: {},
        driveFolder: schema.driveFolder,
        onSave: async (data) => {
          await service.create(data);
          load();
        }
      });
    });
  }

  load();
  return { reload: load };
}

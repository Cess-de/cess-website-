/* =========================================================
   CESS — Generic CMS Editor Modal
   =========================================================
   A single, reusable editor engine driven by a field schema, so
   ActivityEditor / AnnouncementEditor / ResourceEditor / etc. are
   thin schema definitions (see cms/schemas.js) rather than
   duplicated modal/form logic (per spec section 56).

   Supported field types: text, textarea, date, time, url, select,
   checkbox, number, media (single mediaObject), mediaList (array
   of mediaObject via multi-upload).
   ========================================================= */

import { t, validators, showToast, withBusyButton, confirmDialog } from "../core/ui.js";
import { uploadFile, deleteFile, mediaErrorMessage, emptyMedia } from "../services/media.js";

let modalRoot = null;

function ensureModalRoot() {
  if (modalRoot) return modalRoot;
  modalRoot = document.createElement("div");
  modalRoot.id = "cess-editor-root";
  document.body.appendChild(modalRoot);
  return modalRoot;
}

function fieldId(name) {
  return `field-${name}`;
}

function renderField(field, value) {
  const label = `<label for="${fieldId(field.name)}">${t(field.labelEn, field.labelAr)}${field.required ? " *" : ""}</label>`;
  const val = value ?? field.default ?? "";

  switch (field.type) {
    case "textarea":
      return `<div class="form-group">${label}<textarea id="${fieldId(field.name)}" rows="${field.rows || 4}">${val}</textarea></div>`;
    case "select": {
      const opts = field.options.map((o) => `<option value="${o}" ${o === val ? "selected" : ""}>${t(field.optionLabels?.[o]?.en || o, field.optionLabels?.[o]?.ar || o)}</option>`).join("");
      return `<div class="form-group">${label}<select id="${fieldId(field.name)}">${opts}</select></div>`;
    }
    case "checkbox":
      return `<div class="form-group form-group-checkbox"><label><input type="checkbox" id="${fieldId(field.name)}" ${val ? "checked" : ""}/> ${t(field.labelEn, field.labelAr)}</label></div>`;
    case "number":
      return `<div class="form-group">${label}<input type="number" id="${fieldId(field.name)}" value="${val}" /></div>`;
    case "date":
      return `<div class="form-group">${label}<input type="date" id="${fieldId(field.name)}" value="${val}" /></div>`;
    case "time":
      return `<div class="form-group">${label}<input type="time" id="${fieldId(field.name)}" value="${val}" /></div>`;
    case "url":
      return `<div class="form-group">${label}<input type="url" id="${fieldId(field.name)}" value="${val}" placeholder="https://" /></div>`;
    case "media":
      return `
        <div class="form-group media-field" data-field="${field.name}">
          ${label}
          <div class="media-preview">${renderMediaPreview(val)}</div>
          <input type="file" id="${fieldId(field.name)}" accept="${field.accept || "image/*,application/pdf"}" />
          <p class="field-hint">${t("Max 15MB. Uploaded to CESS Drive automatically.", "الحد الأقصى 15 ميجابايت. يتم الرفع إلى Drive الخاص بـCESS تلقائيًا.")}</p>
        </div>`;
    case "mediaList":
      return `
        <div class="form-group media-list-field" data-field="${field.name}">
          ${label}
          <div class="media-list-preview">${(val || []).map((m, i) => renderMediaListItem(m, i)).join("")}</div>
          <input type="file" id="${fieldId(field.name)}" accept="${field.accept || "image/*,application/pdf"}" multiple />
          <p class="field-hint">${t("You can select multiple files.", "يمكنك اختيار عدة ملفات.")}</p>
        </div>`;
    default:
      return `<div class="form-group">${label}<input type="text" id="${fieldId(field.name)}" value="${val}" /></div>`;
  }
}

function renderMediaPreview(media) {
  if (!media || !media.url) return `<span class="media-empty">${t("No file selected", "لم يتم اختيار ملف")}</span>`;
  return media.type === "image"
    ? `<img src="${media.url}" alt="${media.name}" class="media-thumb" />`
    : `<a href="${media.url}" target="_blank" rel="noopener">${media.name}</a>`;
}

function renderMediaListItem(media, index) {
  return `<span class="media-list-item" data-index="${index}">
    ${media.type === "image" ? `<img src="${media.url}" class="media-thumb-sm" />` : `<a href="${media.url}" target="_blank" rel="noopener">${media.name}</a>`}
    <button type="button" class="media-remove-btn" data-index="${index}" aria-label="${t("Remove", "إزالة")}">&times;</button>
  </span>`;
}

/**
 * Opens the editor modal.
 * @param {object} config
 *   config.titleEn/titleAr, config.fields (schema array), config.initialData,
 *   config.driveFolder (for media uploads), config.onSave(data) -> Promise
 */
export function openEditor(config) {
  const root = ensureModalRoot();
  const data = { ...config.initialData };
  const mediaState = {}; // per-field pending media, keyed by field name

  config.fields.forEach((f) => {
    if (f.type === "media") mediaState[f.name] = data[f.name] || emptyMedia();
    if (f.type === "mediaList") mediaState[f.name] = data[f.name] || [];
  });

  root.innerHTML = `
    <div class="modal-overlay" role="dialog" aria-modal="true">
      <div class="modal-panel">
        <div class="modal-header">
          <h2>${t(config.titleEn, config.titleAr)}</h2>
          <button type="button" class="modal-close-btn" aria-label="${t("Close", "إغلاق")}">&times;</button>
        </div>
        <form class="modal-body cms-form">
          ${config.fields.map((f) => renderField(f, data[f.name])).join("")}
          <p class="form-error" hidden></p>
        </form>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline modal-cancel-btn">${t("Cancel", "إلغاء")}</button>
          <button type="button" class="btn btn-primary modal-save-btn">${t("Save", "حفظ")}</button>
        </div>
      </div>
    </div>`;

  const overlay = root.querySelector(".modal-overlay");
  const form = root.querySelector("form");
  const errorEl = root.querySelector(".form-error");

  function close() {
    root.innerHTML = "";
  }

  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  root.querySelector(".modal-close-btn").addEventListener("click", close);
  root.querySelector(".modal-cancel-btn").addEventListener("click", close);

  // Wire up media / mediaList uploads
  config.fields.filter((f) => f.type === "media").forEach((f) => {
    const input = form.querySelector(`#${fieldId(f.name)}`);
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        showToast(t("Uploading...", "جارٍ الرفع..."), "info");
        const uploaded = await uploadFile(file, config.driveFolder);
        mediaState[f.name] = uploaded;
        form.querySelector(`[data-field="${f.name}"] .media-preview`).innerHTML = renderMediaPreview(uploaded);
        showToast(t("File uploaded.", "تم رفع الملف."));
      } catch (err) {
        const msg = mediaErrorMessage(err);
        showToast(t(msg.en, msg.ar), "error");
      }
    });
  });

  config.fields.filter((f) => f.type === "mediaList").forEach((f) => {
    const input = form.querySelector(`#${fieldId(f.name)}`);
    const previewEl = form.querySelector(`[data-field="${f.name}"] .media-list-preview`);

    function rerenderList() {
      previewEl.innerHTML = mediaState[f.name].map((m, i) => renderMediaListItem(m, i)).join("");
      previewEl.querySelectorAll(".media-remove-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          mediaState[f.name].splice(Number(btn.dataset.index), 1);
          rerenderList();
        });
      });
    }
    rerenderList();

    input.addEventListener("change", async () => {
      const files = Array.from(input.files);
      for (const file of files) {
        try {
          showToast(t("Uploading...", "جارٍ الرفع..."), "info");
          const uploaded = await uploadFile(file, config.driveFolder);
          mediaState[f.name].push(uploaded);
        } catch (err) {
          const msg = mediaErrorMessage(err);
          showToast(t(msg.en, msg.ar), "error");
        }
      }
      rerenderList();
      showToast(t("Files uploaded.", "تم رفع الملفات."));
    });
  });

  root.querySelector(".modal-save-btn").addEventListener("click", async (e) => {
    const saveBtn = e.currentTarget;
    errorEl.hidden = true;

    const collected = {};
    for (const f of config.fields) {
      if (f.type === "media" || f.type === "mediaList") {
        collected[f.name] = mediaState[f.name];
        continue;
      }
      const el = form.querySelector(`#${fieldId(f.name)}`);
      if (f.type === "checkbox") collected[f.name] = el.checked;
      else if (f.type === "number") collected[f.name] = el.value === "" ? null : Number(el.value);
      else collected[f.name] = el.value.trim();
    }

    // Validation
    for (const f of config.fields) {
      if (f.required && !validators.required(collected[f.name])) {
        errorEl.textContent = t(`"${f.labelEn}" is required.`, `"${f.labelAr}" مطلوب.`);
        errorEl.hidden = false;
        return;
      }
      if (f.type === "url" && !validators.isUrl(collected[f.name])) {
        errorEl.textContent = t(`"${f.labelEn}" must be a valid URL.`, `"${f.labelAr}" يجب أن يكون رابطًا صحيحًا.`);
        errorEl.hidden = false;
        return;
      }
      if (f.type === "date" && f.required && !validators.isDate(collected[f.name])) {
        errorEl.textContent = t(`"${f.labelEn}" must be a valid date.`, `"${f.labelAr}" يجب أن يكون تاريخًا صحيحًا.`);
        errorEl.hidden = false;
        return;
      }
    }

    await withBusyButton(saveBtn, "Saving...", "جارٍ الحفظ...", async () => {
      try {
        await config.onSave(collected);
        showToast(t("Saved.", "تم الحفظ."));
        close();
      } catch (err) {
        console.error("Editor save failed:", err);
        errorEl.textContent = t("Could not save. Please try again.", "تعذر الحفظ. يرجى المحاولة مرة أخرى.");
        errorEl.hidden = false;
      }
    });
  });
}

export async function confirmAndDelete(itemLabel, deleteFn) {
  const ok = confirmDialog(
    `Delete "${itemLabel}"? This cannot be undone.`,
    `هل تريد حذف "${itemLabel}"؟ لا يمكن التراجع عن هذا الإجراء.`
  );
  if (!ok) return false;
  try {
    await deleteFn();
    showToast(t("Deleted.", "تم الحذف."));
    return true;
  } catch (err) {
    console.error("Delete failed:", err);
    showToast(t("Could not delete. Please try again.", "تعذر الحذف. يرجى المحاولة مرة أخرى."), "error");
    return false;
  }
}

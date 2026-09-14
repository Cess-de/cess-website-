/* =========================================================
   CESS — Shared UI Utilities
   =========================================================
   Language switching, RTL/LTR, date formatting, and a safe
   async-fetch wrapper that gives every data section consistent
   loading / success / error / empty states.
   ========================================================= */

const LANG_KEY = "cess_lang";

export function getLang() {
  return localStorage.getItem(LANG_KEY) === "ar" ? "ar" : "en";
}

export function setLang(lang) {
  localStorage.setItem(LANG_KEY, lang);
  applyLang(lang);
}

export function applyLang(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.querySelectorAll("[data-en][data-ar]").forEach((el) => {
    el.textContent = lang === "ar" ? el.dataset.ar : el.dataset.en;
  });
  document.querySelectorAll("[data-placeholder-en][data-placeholder-ar]").forEach((el) => {
    el.placeholder = lang === "ar" ? el.dataset.placeholderAr : el.dataset.placeholderEn;
  });
  // Two supported lang-switch markups:
  // (1) a single toggle button showing the OTHER language's code (public pages: #lang-toggle / #lang-toggle-label)
  // (2) a pair of buttons with data-lang, one per language (dashboards)
  const toggleLabel = document.getElementById("lang-toggle-label");
  if (toggleLabel) toggleLabel.textContent = lang === "ar" ? "EN" : "AR";
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

export function initLangSwitch() {
  applyLang(getLang());
  const toggleBtn = document.getElementById("lang-toggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => setLang(getLang() === "ar" ? "en" : "ar"));
  }
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
}

/** Picks the language-appropriate field, e.g. pickLang(data, "title") -> title_ar or title_en. */
export function pickLang(data, field) {
  const lang = getLang();
  const primary = data[`${field}_${lang}`];
  const fallback = data[`${field}_${lang === "ar" ? "en" : "ar"}`];
  return primary || fallback || "";
}

export function t(en, ar) {
  return getLang() === "ar" ? ar : en;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric", month: "short", day: "numeric"
  });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString(getLang() === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  });
}

export function renderLoading(container, textEn = "Loading...", textAr = "جاري التحميل...") {
  container.innerHTML = `<div class="state-message state-loading"><span class="spinner"></span>${t(textEn, textAr)}</div>`;
}

export function renderEmptyState(container, textEn = "Nothing here yet.", textAr = "لا يوجد شيء هنا حتى الآن.") {
  container.innerHTML = `<div class="state-message state-empty">${t(textEn, textAr)}</div>`;
}

export function renderErrorState(container, textEn = "Unable to load this right now.", textAr = "تعذر تحميل هذا حاليًا.", onRetry) {
  container.innerHTML = `
    <div class="state-message state-error">
      <p>${t(textEn, textAr)}</p>
      ${onRetry ? `<button class="btn btn-outline retry-btn">${t("Retry", "إعادة المحاولة")}</button>` : ""}
    </div>`;
  if (onRetry) container.querySelector(".retry-btn").addEventListener("click", onRetry);
}

/**
 * Runs an async Firestore call with consistent loading/success/error/empty
 * handling. `fetchFn` returns a QuerySnapshot or DocumentSnapshot-like result;
 * `onSuccess(result)` renders it; if the caller determines the result is
 * empty, it should call the provided `onEmpty` itself (snapshot.empty varies
 * by call shape) — this wrapper's job is loading + error + retry only.
 */
export async function safeFetch(container, fetchFn, onSuccess, options = {}) {
  renderLoading(container, options.loadingEn, options.loadingAr);
  try {
    const result = await fetchFn();
    onSuccess(result);
  } catch (err) {
    console.error("safeFetch error:", err);
    renderErrorState(container, options.errorEn, options.errorAr, () =>
      safeFetch(container, fetchFn, onSuccess, options)
    );
  }
}

/** Disables a submit button and shows a busy label while an async action runs, restoring it after. */
export async function withBusyButton(button, busyTextEn, busyTextAr, action) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = t(busyTextEn, busyTextAr);
  try {
    return await action();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

export function showToast(message, kind = "success") {
  let toast = document.getElementById("cess-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "cess-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `cess-toast cess-toast-${kind} visible`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("visible"), 2500);
}

export function confirmDialog(messageEn, messageAr) {
  return window.confirm(t(messageEn, messageAr));
}

/** Simple, dependency-free validators used across every CMS editor form. */
export const validators = {
  required(value) {
    return value !== undefined && value !== null && String(value).trim() !== "";
  },
  isUrl(value) {
    if (!value) return true; // optional fields
    try { new URL(value); return true; } catch { return false; }
  },
  isDate(value) {
    return !!value && !isNaN(new Date(value).getTime());
  },
  maxFileSizeMB(bytes, maxMB) {
    return bytes <= maxMB * 1024 * 1024;
  }
};

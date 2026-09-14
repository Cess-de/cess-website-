/* =========================================================
   CESS — Login / Register Page Controller
   =========================================================
   Thin DOM wiring over core/session.js. All actual auth logic
   (including the "role is always member at signup" enforcement)
   lives in session.js, not here.
   ========================================================= */

import { registerUser, loginUser, requestPasswordReset, friendlyAuthError } from "../core/session.js";
import { initLangSwitch, t, withBusyButton } from "../core/ui.js";

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();
  handleUrlNotices();

  const loginForm = document.getElementById("login-form");
  if (loginForm) initLoginForm(loginForm);

  const registerForm = document.getElementById("register-form");
  if (registerForm) initRegisterForm(registerForm);

  const resetLink = document.getElementById("password-reset-link");
  if (resetLink) initPasswordReset(resetLink);
});

function handleUrlNotices() {
  const params = new URLSearchParams(window.location.search);
  const noticeEl = document.getElementById("auth-notice");
  if (!noticeEl) return;
  if (params.get("suspended")) {
    noticeEl.textContent = t("Your account has been suspended. Contact CESS leadership for help.", "تم تعليق حسابك. يرجى التواصل مع قيادة الجمعية.");
    noticeEl.hidden = false;
  } else if (params.get("missingProfile")) {
    noticeEl.textContent = t("We couldn't find your profile. Please try logging in again or contact support.", "تعذر العثور على ملفك الشخصي. حاول تسجيل الدخول مرة أخرى أو تواصل مع الدعم.");
    noticeEl.hidden = false;
  }
}

function initLoginForm(form) {
  const errorEl = document.getElementById("login-error");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const email = form.email.value.trim();
    const password = form.password.value;
    const btn = form.querySelector("button[type=submit]");

    await withBusyButton(btn, "Signing in...", "جارٍ تسجيل الدخول...", async () => {
      try {
        await loginUser(email, password);
      } catch (err) {
        const msg = friendlyAuthError(err);
        errorEl.textContent = t(msg.en, msg.ar);
        errorEl.hidden = false;
      }
    });
  });
}

function initRegisterForm(form) {
  const errorEl = document.getElementById("register-error");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form["confirm-password"] ? form["confirm-password"].value : password;
    const cohort = form.cohort ? form.cohort.value.trim() : "";
    const department = form.department ? form.department.value.trim() : "";

    if (password !== confirmPassword) {
      errorEl.textContent = t("Passwords do not match.", "كلمتا المرور غير متطابقتين.");
      errorEl.hidden = false;
      return;
    }

    const btn = form.querySelector("button[type=submit]");
    await withBusyButton(btn, "Creating account...", "جارٍ إنشاء الحساب...", async () => {
      try {
        await registerUser({ name, email, password, cohort, department });
        window.location.href = "member.html";
      } catch (err) {
        const msg = friendlyAuthError(err);
        errorEl.textContent = t(msg.en, msg.ar);
        errorEl.hidden = false;
      }
    });
  });
}

function initPasswordReset(link) {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    const email = window.prompt(t("Enter your account email to receive a reset link:", "أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين:"));
    if (!email) return;
    try {
      await requestPasswordReset(email.trim());
      window.alert(t("If that email is registered, a reset link has been sent.", "إذا كان هذا البريد مسجلاً، فقد تم إرسال رابط إعادة التعيين."));
    } catch (err) {
      const msg = friendlyAuthError(err);
      window.alert(t(msg.en, msg.ar));
    }
  });
}

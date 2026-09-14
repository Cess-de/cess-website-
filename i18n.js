/* =========================================================
   CESS — Internationalization / Bilingual EN + AR
   =========================================================
   Runtime:
   - ES Module
   - English / Arabic
   - LTR / RTL
   - localStorage language preference

   This file is the single source of truth for UI translations.
   ========================================================= */

const LANG_KEY = "cess_lang";

const DEFAULT_LANG = "en";
const SUPPORTED_LANGS = Object.freeze(["en", "ar"]);


/* =========================================================
   TRANSLATION DICTIONARY
   ========================================================= */

const DICT = Object.freeze({

  /* -------------------------------------------------------
     Navigation
     ------------------------------------------------------- */

  "nav.home": {
    en: "Home",
    ar: "الرئيسية"
  },

  "nav.about": {
    en: "About",
    ar: "عن الجمعية"
  },

  "nav.activities": {
    en: "Activities",
    ar: "الأنشطة"
  },

  "nav.resources": {
    en: "Resources",
    ar: "المصادر"
  },

  "nav.archive": {
    en: "Archive",
    ar: "الأرشيف"
  },

  "nav.history": {
    en: "History",
    ar: "التاريخ"
  },

  "nav.contact": {
    en: "Contact",
    ar: "تواصل معنا"
  },

  "nav.login": {
    en: "Login",
    ar: "تسجيل الدخول"
  },

  "nav.register": {
    en: "Create Account",
    ar: "إنشاء حساب"
  },

  "nav.logout": {
    en: "Logout",
    ar: "تسجيل الخروج"
  },

  "nav.dashboard": {
    en: "Dashboard",
    ar: "لوحة التحكم"
  },

  "nav.menu": {
    en: "Toggle navigation",
    ar: "تبديل التنقل"
  },


  /* -------------------------------------------------------
     Actions
     ------------------------------------------------------- */

  "act.save": {
    en: "Save",
    ar: "حفظ"
  },

  "act.cancel": {
    en: "Cancel",
    ar: "إلغاء"
  },

  "act.delete": {
    en: "Delete",
    ar: "حذف"
  },

  "act.edit": {
    en: "Edit",
    ar: "تعديل"
  },

  "act.publish": {
    en: "Publish",
    ar: "نشر"
  },

  "act.unpublish": {
    en: "Unpublish",
    ar: "إلغاء النشر"
  },

  "act.new": {
    en: "New",
    ar: "جديد"
  },

  "act.retry": {
    en: "Retry",
    ar: "إعادة المحاولة"
  },

  "act.confirm": {
    en: "Confirm",
    ar: "تأكيد"
  },

  "act.close": {
    en: "Close",
    ar: "إغلاق"
  },

  "act.open": {
    en: "Open",
    ar: "فتح"
  },


  /* -------------------------------------------------------
     States
     ------------------------------------------------------- */

  "state.loading": {
    en: "Loading…",
    ar: "جاري التحميل…"
  },

  "state.error": {
    en: "Something went wrong.",
    ar: "حدث خطأ ما."
  },

  "state.empty": {
    en: "Nothing here yet.",
    ar: "لا يوجد شيء حتى الآن."
  },

  "state.required": {
    en: "This field is required.",
    ar: "هذا الحقل مطلوب."
  },

  "state.saved": {
    en: "Saved.",
    ar: "تم الحفظ."
  },


  /* -------------------------------------------------------
     Empty states
     ------------------------------------------------------- */

  "empty.activities": {
    en: "No activities available yet.",
    ar: "لا توجد أنشطة متاحة حتى الآن."
  },

  "empty.announcements": {
    en: "No announcements available yet.",
    ar: "لا توجد إعلانات متاحة حتى الآن."
  },

  "empty.resources": {
    en: "No resources available yet.",
    ar: "لا توجد مصادر متاحة حتى الآن."
  },

  "empty.archive": {
    en: "No archive items available yet.",
    ar: "لا توجد عناصر أرشيف حتى الآن."
  },

  "empty.history": {
    en: "No history entries available yet.",
    ar: "لا توجد سجلات تاريخية حتى الآن."
  },

  "empty.users": {
    en: "No users yet.",
    ar: "لا يوجد مستخدمون حتى الآن."
  },


  /* -------------------------------------------------------
     Authentication
     ------------------------------------------------------- */

  "auth.email": {
    en: "Email",
    ar: "البريد الإلكتروني"
  },

  "auth.password": {
    en: "Password",
    ar: "كلمة المرور"
  },

  "auth.fullName": {
    en: "Full Name",
    ar: "الاسم الكامل"
  },

  "auth.cohort": {
    en: "Batch / Cohort",
    ar: "الدفعة"
  },

  "auth.forgot": {
    en: "Forgot password?",
    ar: "نسيت كلمة المرور؟"
  },

  "auth.noAccount": {
    en: "Don't have an account?",
    ar: "ليس لديك حساب؟"
  },

  "auth.haveAccount": {
    en: "Already have an account?",
    ar: "لديك حساب بالفعل؟"
  },

  "auth.resetSent": {
    en: "Password reset email sent.",
    ar: "تم إرسال رابط إعادة التعيين."
  },

  "auth.suspended": {
    en: "Your account is suspended. Contact leadership.",
    ar: "حسابك موقوف. تواصل مع القيادة."
  },

  "auth.err.emailInUse": {
    en: "Email already registered.",
    ar: "البريد مسجل مسبقًا."
  },

  "auth.err.invalidEmail": {
    en: "Invalid email address.",
    ar: "بريد إلكتروني غير صحيح."
  },

  "auth.err.weakPassword": {
    en: "Password must be at least 6 characters.",
    ar: "كلمة المرور 6 أحرف على الأقل."
  },

  "auth.err.userNotFound": {
    en: "No account with this email.",
    ar: "لا يوجد حساب بهذا البريد."
  },

  "auth.err.wrongPassword": {
    en: "Incorrect password.",
    ar: "كلمة المرور غير صحيحة."
  },

  "auth.err.tooMany": {
    en: "Too many attempts.",
    ar: "محاولات كثيرة."
  },

  "auth.err.generic": {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ. حاول مجددًا."
  },


  /* -------------------------------------------------------
     Dashboard
     ------------------------------------------------------- */

  "dash.welcome": {
    en: "Welcome",
    ar: "مرحبًا"
  },

  "dash.membership": {
    en: "Membership",
    ar: "العضوية"
  },

  "dash.profile": {
    en: "Profile",
    ar: "الملف الشخصي"
  },

  "dash.role": {
    en: "Role",
    ar: "الدور"
  },

  "dash.status": {
    en: "Status",
    ar: "الحالة"
  },

  "dash.users": {
    en: "Users & Roles",
    ar: "المستخدمون والأدوار"
  },

  "dash.activities": {
    en: "Activities",
    ar: "الأنشطة"
  },

  "dash.announcements": {
    en: "Announcements",
    ar: "الإعلانات"
  },

  "dash.resources": {
    en: "Resources",
    ar: "المصادر"
  },

  "dash.archive": {
    en: "Public Archive",
    ar: "الأرشيف العام"
  },

  "dash.history": {
    en: "History",
    ar: "التاريخ"
  },

  "dash.meetings": {
    en: "Meetings",
    ar: "الاجتماعات"
  },

  "dash.reports": {
    en: "Reports",
    ar: "التقارير"
  },

  "dash.committees": {
    en: "Committees",
    ar: "اللجان"
  },

  "dash.documents": {
    en: "Internal Documents",
    ar: "المستندات الداخلية"
  },

  "dash.handover": {
    en: "Handover",
    ar: "التسليم"
  },

  "dash.social": {
    en: "Social Links",
    ar: "روابط التواصل"
  },

  "dash.settings": {
    en: "Site Settings",
    ar: "إعدادات الموقع"
  },

  "dash.statistics": {
    en: "Public Statistics",
    ar: "الإحصائيات العامة"
  },


  /* -------------------------------------------------------
     Home
     ------------------------------------------------------- */

  "home.eyebrow": {
    en: "The Technological University — Sudan",
    ar: "الجامعة التكنولوجية — السودان"
  },

  "home.title": {
    en: "Civil Engineering Student Society",
    ar: "جمعية طلاب الهندسة المدنية"
  },

  "home.intro": {
    en: "CESS supports academic development, professional growth, and student collaboration.",
    ar: "تدعم CESS التطور الأكاديمي والنمو المهني والتعاون الطلابي."
  },

  "home.explore": {
    en: "Explore CESS",
    ar: "تعرف على CESS"
  },

  "home.join": {
    en: "Join CESS",
    ar: "انضم إلى CESS"
  },

  "home.stat.activities": {
    en: "Activities",
    ar: "الأنشطة"
  },

  "home.stat.members": {
    en: "Registered Students",
    ar: "الطلاب المسجلون"
  },

  "home.featured": {
    en: "Featured Activities",
    ar: "الأنشطة المميزة"
  },

  "home.joinTitle": {
    en: "Join CESS",
    ar: "انضم إلى CESS"
  },

  "home.joinText": {
    en: "Become part of a growing community of civil engineering students.",
    ar: "كن جزءًا من مجتمع متنامٍ من طلاب الهندسة المدنية."
  },


  /* -------------------------------------------------------
     Page Headers
     ------------------------------------------------------- */

  "page.activities.title": {
    en: "Activities",
    ar: "الأنشطة"
  },

  "page.activities.intro": {
    en: "Workshops, events, and engineering activities from CESS.",
    ar: "ورش عمل وفعاليات وأنشطة هندسية."
  },

  "page.resources.title": {
    en: "Resources",
    ar: "المصادر"
  },

  "page.resources.intro": {
    en: "Books, notes, references, and academic opportunities.",
    ar: "كتب ومراجع وفرص أكاديمية."
  },

  "page.archive.title": {
    en: "CESS Digital Archive",
    ar: "الأرشيف الرقمي لـ CESS"
  },

  "page.archive.intro": {
    en: "Records, media, and institutional documents.",
    ar: "سجلات ووسائط ومستندات مؤسسية."
  },

  "page.history.title": {
    en: "Our History",
    ar: "تاريخنا"
  },

  "page.history.intro": {
    en: "The story of CESS across time.",
    ar: "قصة CESS عبر الزمن."
  },

  "page.contact.title": {
    en: "Contact Us",
    ar: "تواصل معنا"
  },

  "page.contact.email": {
    en: "Official Email",
    ar: "البريد الإلكتروني الرسمي"
  },

  "page.contact.follow": {
    en: "Follow Us",
    ar: "تابعنا"
  },

  "page.details.notFound": {
    en: "Activity not found.",
    ar: "لم يتم العثور على النشاط."
  },


  /* -------------------------------------------------------
     About
     ------------------------------------------------------- */

  "about.title": {
    en: "About CESS",
    ar: "عن CESS"
  },

  "about.whoTitle": {
    en: "Who We Are",
    ar: "من نحن"
  },

  "about.whoBody": {
    en: "CESS is a student-led society within the Civil Engineering Department at The Technological University, Sudan.",
    ar: "CESS هي جمعية طلابية ضمن قسم الهندسة المدنية بالجامعة التكنولوجية، السودان."
  },

  "about.visionTitle": {
    en: "Vision",
    ar: "الرؤية"
  },

  "about.visionBody": {
    en: "A civil engineering student community defined by collaboration, practical skill, and academic excellence.",
    ar: "مجتمع طلابي يتميز بالتعاون والمهارة العملية والتفوق الأكاديمي."
  },

  "about.missionTitle": {
    en: "Mission",
    ar: "الرسالة"
  },

  "about.missionBody": {
    en: "Connecting students with academic resources, practical experiences, and professional networks.",
    ar: "ربط الطلاب بالمصادر الأكاديمية والخبرات العملية والشبكات المهنية."
  },

  "about.objectivesTitle": {
    en: "Objectives",
    ar: "الأهداف"
  },

  "about.obj.academic": {
    en: "Academic development",
    ar: "التطور الأكاديمي"
  },

  "about.obj.professional": {
    en: "Professional development",
    ar: "التطور المهني"
  },

  "about.obj.skills": {
    en: "Practical engineering skills",
    ar: "المهارات الهندسية العملية"
  },

  "about.obj.collab": {
    en: "Student collaboration",
    ar: "التعاون الطلابي"
  },

  "about.obj.workshops": {
    en: "Workshops and activities",
    ar: "ورش العمل والأنشطة"
  },

  "about.obj.community": {
    en: "Community service",
    ar: "خدمة المجتمع"
  },

  "about.obj.memory": {
    en: "Institutional memory",
    ar: "الذاكرة المؤسسية"
  },


  /* -------------------------------------------------------
     Footer
     ------------------------------------------------------- */

  "footer.tagline": {
    en: "Civil Engineering Student Society",
    ar: "جمعية طلاب الهندسة المدنية"
  },

  "footer.quick": {
    en: "Quick Links",
    ar: "روابط سريعة"
  },

  "footer.follow": {
    en: "Follow Us",
    ar: "تابعنا"
  },

  "footer.copy": {
    en: "© CESS — Civil Engineering Student Society.",
    ar: "© CESS — جمعية طلاب الهندسة المدنية."
  },


  /* -------------------------------------------------------
     Language
     ------------------------------------------------------- */

  "lang.toggle": {
    en: "Switch language",
    ar: "تغيير اللغة"
  },

  "nav.subtitle": {
    en: "Civil Engineering Student Society",
    ar: "جمعية طلاب الهندسة المدنية"
  }

});


/* =========================================================
   LANGUAGE
   ========================================================= */

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang)
    ? lang
    : DEFAULT_LANG;
}


export function getLang() {
  return normalizeLang(
    localStorage.getItem(LANG_KEY)
  );
}


export function setLang(lang) {
  const normalized = normalizeLang(lang);

  localStorage.setItem(
    LANG_KEY,
    normalized
  );

  applyLang();

  document.dispatchEvent(
    new CustomEvent("cess:lang-changed", {
      detail: {
        lang: normalized
      }
    })
  );

  return normalized;
}


/* =========================================================
   TRANSLATION
   ========================================================= */

export function t(key) {

  const lang = getLang();
  const entry = DICT[key];

  if (!entry) {
    return key;
  }

  return (
    entry[lang]
    || entry.en
    || key
  );
}


/* =========================================================
   DOCUMENT LANGUAGE / DIRECTION
   ========================================================= */

export function applyLang() {

  const lang = getLang();

  const html = document.documentElement;

  html.setAttribute(
    "lang",
    lang
  );

  html.setAttribute(
    "dir",
    lang === "ar"
      ? "rtl"
      : "ltr"
  );


  /* Text content */

  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => {

      const key = el.getAttribute(
        "data-i18n"
      );

      el.textContent = t(key);
    });


  /* Placeholder */

  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach((el) => {

      const key = el.getAttribute(
        "data-i18n-placeholder"
      );

      el.setAttribute(
        "placeholder",
        t(key)
      );
    });


  /* ARIA */

  document
    .querySelectorAll("[data-i18n-aria]")
    .forEach((el) => {

      const key = el.getAttribute(
        "data-i18n-aria"
      );

      el.setAttribute(
        "aria-label",
        t(key)
      );
    });


  /* Language toggle */

  const toggleLabel =
    document.getElementById(
      "lang-toggle-label"
    );

  if (toggleLabel) {

    toggleLabel.textContent =
      lang === "ar"
        ? "EN"
        : "AR";
  }


  /* Optional document title */

  const titleKey =
    document.documentElement
      .getAttribute("data-i18n-title");

  if (titleKey) {

    document.title = t(titleKey);
  }
}


/* =========================================================
   LANGUAGE TOGGLE
   ========================================================= */

export function initLangToggle() {

  applyLang();

  const button =
    document.getElementById(
      "lang-toggle"
    );

  if (
    button
    && !button.dataset.bound
  ) {

    button.dataset.bound = "1";

    button.addEventListener(
      "click",
      () => {

        setLang(
          getLang() === "ar"
            ? "en"
            : "ar"
        );
      }
    );
  }
}


/* =========================================================
   LANGUAGE PICKERS
   ========================================================= */

/*
  Example:
  pickLang(activity, "title")

  Looks for:
  title_en
  title_ar
*/
export function pickLang(doc, base) {

  if (!doc) {
    return "";
  }

  const lang = getLang();

  const primary =
    lang === "ar"
      ? doc[`${base}_ar`]
      : doc[`${base}_en`];

  const fallback =
    lang === "ar"
      ? doc[`${base}_en`]
      : doc[`${base}_ar`];

  return (
    primary
    || fallback
    || ""
  );
}


/*
  Pick from explicit English/Arabic values.

  Example:
  pickPair(
    activity.title_en,
    activity.title_ar
  )
*/
export function pickPair(en, ar) {

  const lang = getLang();

  if (lang === "ar") {
    return ar || en || "";
  }

  return en || ar || "";
}


/* =========================================================
   PUBLIC API
   ========================================================= */

export {
  DICT,
  LANG_KEY,
  DEFAULT_LANG,
  SUPPORTED_LANGS
};


/* =========================================================
   BACKWARD COMPATIBILITY
   =========================================================

   Some older CESS files may still expect these globals.
   Keep them available while the project is being migrated
   to ES modules.
   ========================================================= */

window.CESS_I18N = {
  getLang,
  setLang,
  t,
  applyLang,
  initLangToggle,
  pickLang,
  pickPair,
  dict: DICT
};


/* Legacy globals */

window.getLang = getLang;
window.setLang = setLang;
window.t = t;
window.applyLang = applyLang;
window.initLangToggle = initLangToggle;
window.pickLang = pickLang;
window.pickPair = pickPair;

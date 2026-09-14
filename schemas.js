/* =========================================================
   CESS — CMS Field Schemas
   =========================================================
   Each export describes the fields for one collection's editor.
   The generic editor (cms/editor.js) renders forms from these —
   no per-collection modal markup is duplicated.
   ========================================================= */

import { CESS_CONFIG } from "../core/firebase.js";

const bilingualTitle = [
  { name: "title_ar", type: "text", labelEn: "Title (Arabic)", labelAr: "العنوان (عربي)", required: true },
  { name: "title_en", type: "text", labelEn: "Title (English)", labelAr: "العنوان (إنجليزي)", required: true }
];
const bilingualDescription = [
  { name: "description_ar", type: "textarea", labelEn: "Description (Arabic)", labelAr: "الوصف (عربي)" },
  { name: "description_en", type: "textarea", labelEn: "Description (English)", labelAr: "الوصف (إنجليزي)" }
];
const publishFeature = [
  { name: "published", type: "checkbox", labelEn: "Published (visible to the public)", labelAr: "منشور (مرئي للعامة)" },
  { name: "featured", type: "checkbox", labelEn: "Featured on homepage", labelAr: "مميز في الصفحة الرئيسية" }
];

function categorySelect(name, options) {
  return { name, type: "select", labelEn: "Category", labelAr: "الفئة", options, required: true };
}

export const activitySchema = {
  titleEn: "Activity", titleAr: "نشاط",
  driveFolder: "Activities",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    categorySelect("category", CESS_CONFIG.activityCategories),
    { name: "date", type: "date", labelEn: "Date", labelAr: "التاريخ", required: true },
    { name: "startTime", type: "time", labelEn: "Start Time", labelAr: "وقت البدء" },
    { name: "endTime", type: "time", labelEn: "End Time", labelAr: "وقت الانتهاء" },
    { name: "location_ar", type: "text", labelEn: "Location (Arabic)", labelAr: "الموقع (عربي)" },
    { name: "location_en", type: "text", labelEn: "Location (English)", labelAr: "الموقع (إنجليزي)" },
    { name: "coverImage", type: "media", labelEn: "Cover Image", labelAr: "صورة الغلاف", accept: "image/*" },
    { name: "gallery", type: "mediaList", labelEn: "Gallery", labelAr: "معرض الصور", accept: "image/*" },
    { name: "documents", type: "mediaList", labelEn: "Documents", labelAr: "المستندات" },
    { name: "registrationUrl", type: "url", labelEn: "Registration URL", labelAr: "رابط التسجيل" },
    { name: "externalUrl", type: "url", labelEn: "External URL", labelAr: "رابط خارجي" },
    ...publishFeature
  ]
};

export const announcementSchema = {
  titleEn: "Announcement", titleAr: "إعلان",
  driveFolder: "Announcements",
  fields: [
    ...bilingualTitle,
    { name: "content_ar", type: "textarea", labelEn: "Content (Arabic)", labelAr: "المحتوى (عربي)", rows: 6, required: true },
    { name: "content_en", type: "textarea", labelEn: "Content (English)", labelAr: "المحتوى (إنجليزي)", rows: 6, required: true },
    { name: "coverImage", type: "media", labelEn: "Cover Image", labelAr: "صورة الغلاف", accept: "image/*" },
    ...publishFeature
  ]
};

export const resourceSchema = {
  titleEn: "Resource", titleAr: "مورد",
  driveFolder: "Resources",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    categorySelect("category", CESS_CONFIG.resourceCategories),
    { name: "coverImage", type: "media", labelEn: "Cover Image", labelAr: "صورة الغلاف", accept: "image/*" },
    { name: "files", type: "mediaList", labelEn: "Files", labelAr: "الملفات" },
    { name: "externalUrl", type: "url", labelEn: "External URL", labelAr: "رابط خارجي" },
    ...publishFeature
  ]
};

export const historySchema = {
  titleEn: "History Entry", titleAr: "عنصر تاريخي",
  driveFolder: "History",
  fields: [
    { name: "year", type: "number", labelEn: "Year", labelAr: "السنة", required: true },
    { name: "stage_ar", type: "text", labelEn: "Stage (Arabic)", labelAr: "المرحلة (عربي)" },
    { name: "stage_en", type: "text", labelEn: "Stage (English)", labelAr: "المرحلة (إنجليزي)" },
    ...bilingualTitle,
    ...bilingualDescription,
    { name: "image", type: "media", labelEn: "Image", labelAr: "الصورة", accept: "image/*" },
    { name: "gallery", type: "mediaList", labelEn: "Gallery", labelAr: "معرض الصور", accept: "image/*" },
    { name: "order", type: "number", labelEn: "Order (lower shows first)", labelAr: "الترتيب (الأصغر يظهر أولاً)", required: true },
    { name: "published", type: "checkbox", labelEn: "Published", labelAr: "منشور" }
  ]
};

export const publicArchiveSchema = {
  titleEn: "Archive Item", titleAr: "عنصر أرشيف",
  driveFolder: "Public Archive",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    { name: "category", type: "text", labelEn: "Category", labelAr: "الفئة" },
    { name: "coverImage", type: "media", labelEn: "Cover Image", labelAr: "صورة الغلاف", accept: "image/*" },
    { name: "gallery", type: "mediaList", labelEn: "Gallery", labelAr: "معرض الصور", accept: "image/*" },
    { name: "documents", type: "mediaList", labelEn: "Documents", labelAr: "المستندات" },
    { name: "date", type: "date", labelEn: "Date", labelAr: "التاريخ" },
    { name: "externalUrl", type: "url", labelEn: "External URL", labelAr: "رابط خارجي" },
    ...publishFeature
  ]
};

export const meetingSchema = {
  titleEn: "Meeting", titleAr: "اجتماع",
  driveFolder: "General Media",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    { name: "date", type: "date", labelEn: "Date", labelAr: "التاريخ", required: true },
    { name: "startTime", type: "time", labelEn: "Start Time", labelAr: "وقت البدء" },
    { name: "endTime", type: "time", labelEn: "End Time", labelAr: "وقت الانتهاء" },
    { name: "location_ar", type: "text", labelEn: "Location (Arabic)", labelAr: "الموقع (عربي)" },
    { name: "location_en", type: "text", labelEn: "Location (English)", labelAr: "الموقع (إنجليزي)" },
    { name: "agenda", type: "textarea", labelEn: "Agenda", labelAr: "جدول الأعمال", rows: 5 },
    { name: "minutes", type: "textarea", labelEn: "Minutes", labelAr: "محضر الاجتماع", rows: 6 },
    { name: "documents", type: "mediaList", labelEn: "Documents", labelAr: "المستندات" }
  ]
};

export const reportSchema = {
  titleEn: "Report", titleAr: "تقرير",
  driveFolder: "Reports",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    { name: "reportType", type: "text", labelEn: "Report Type", labelAr: "نوع التقرير" },
    { name: "periodStart", type: "date", labelEn: "Period Start", labelAr: "بداية الفترة" },
    { name: "periodEnd", type: "date", labelEn: "Period End", labelAr: "نهاية الفترة" },
    { name: "document", type: "media", labelEn: "Report File", labelAr: "ملف التقرير" },
    { name: "coverImage", type: "media", labelEn: "Cover Image", labelAr: "صورة الغلاف", accept: "image/*" },
    { name: "published", type: "checkbox", labelEn: "Published (visible to public)", labelAr: "منشور (مرئي للعامة)" },
    { name: "internal", type: "checkbox", labelEn: "Internal only (leadership/admin)", labelAr: "داخلي فقط (القيادة/الإدارة)" }
  ]
};

export const committeeSchema = {
  titleEn: "Committee", titleAr: "لجنة",
  driveFolder: "General Media",
  fields: [
    { name: "name_ar", type: "text", labelEn: "Name (Arabic)", labelAr: "الاسم (عربي)", required: true },
    { name: "name_en", type: "text", labelEn: "Name (English)", labelAr: "الاسم (إنجليزي)", required: true },
    ...bilingualDescription,
    { name: "chairperson", type: "text", labelEn: "Chairperson (name)", labelAr: "رئيس اللجنة (الاسم)" },
    { name: "status", type: "select", labelEn: "Status", labelAr: "الحالة", options: ["active", "inactive"], required: true }
    // `members` (array of {uid, name, role_ar, role_en}) is managed via a dedicated
    // members sub-editor in the Committees panel rather than this generic form.
  ]
};

export const internalDocumentSchema = {
  titleEn: "Internal Document", titleAr: "مستند داخلي",
  driveFolder: "General Media",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    { name: "category", type: "text", labelEn: "Category", labelAr: "الفئة" },
    { name: "file", type: "media", labelEn: "File", labelAr: "الملف", required: true },
    { name: "version", type: "text", labelEn: "Version", labelAr: "الإصدار" },
    { name: "confidential", type: "checkbox", labelEn: "Confidential", labelAr: "سري" }
  ]
};

export const handoverSchema = {
  titleEn: "Handover Item", titleAr: "عنصر تسليم",
  driveFolder: "General Media",
  fields: [
    ...bilingualTitle,
    ...bilingualDescription,
    categorySelect("category", CESS_CONFIG.handoverCategories),
    { name: "documents", type: "mediaList", labelEn: "Documents", labelAr: "المستندات" },
    { name: "responsiblePerson", type: "text", labelEn: "Responsible Person", labelAr: "الشخص المسؤول" },
    { name: "status", type: "select", labelEn: "Status", labelAr: "الحالة", options: ["pending", "in-progress", "complete"], required: true }
  ]
};

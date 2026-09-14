/* =========================================================
   CESS — Media Service (Google Drive via Apps Script Gateway)
   =========================================================
   FIREBASE STORAGE IS NEVER USED. All files live in a CESS-owned
   Google Drive; Firestore stores only metadata (see mediaObject
   shape below). This file is the ONLY place that talks to the
   Apps Script gateway — CMS editors call these functions, never
   fetch() the gateway URL directly.

   ---------------------------------------------------------
   APPS SCRIPT GATEWAY CONTRACT (deploy separately as a Web App)
   ---------------------------------------------------------
   Endpoint: a single Apps Script Web App URL, deployed with
   "Execute as: Me" and "Who has access: Anyone" (the script itself
   must check a shared secret header/param — never trust obscurity).

   Request (POST, JSON body):
     { action: "upload",   filename, mimeType, base64Data, folder }
     { action: "delete",   driveFileId }
     { action: "list",     folder }
     { action: "metadata", driveFileId }

   Response (JSON, always):
     { ok: true, data: { ... } }             on success
     { ok: false, error: "message" }         on failure

   "upload" data shape:
     { url, name, type, driveFileId, mimeType }
   This is the canonical mediaObject — the SAME shape is stored in
   Firestore for coverImage, gallery items, documents, resource
   files, archive documents, history images, and reports.

   Configure GAS_ENDPOINT and GAS_SHARED_SECRET below once the
   Apps Script project is deployed. Until then, uploads fail
   gracefully with a clear message rather than throwing raw errors.
   ========================================================= */

const GAS_ENDPOINT = "YOUR_APPS_SCRIPT_WEB_APP_URL";
const GAS_SHARED_SECRET = "YOUR_SHARED_SECRET"; // must match the check inside the Apps Script project

const MAX_FILE_SIZE_MB = 15;
const ALLOWED_MIME_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation"
];

function isGatewayConfigured() {
  return GAS_ENDPOINT && !GAS_ENDPOINT.startsWith("YOUR_");
}

async function callGateway(payload) {
  if (!isGatewayConfigured()) {
    throw new Error("MEDIA_GATEWAY_NOT_CONFIGURED");
  }
  let response;
  try {
    response = await fetch(GAS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: GAS_SHARED_SECRET })
    });
  } catch (err) {
    throw new Error("MEDIA_NETWORK_ERROR");
  }
  if (!response.ok) {
    throw new Error("MEDIA_GATEWAY_HTTP_ERROR");
  }
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.error || "MEDIA_GATEWAY_ERROR");
  }
  return json.data;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("FILE_READ_ERROR"));
    reader.readAsDataURL(file);
  });
}

/** Validates a File before it is ever sent to the gateway. Throws a user-facing error code, not a raw exception. */
export function validateFile(file) {
  if (!file) throw new Error("NO_FILE");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error("UNSUPPORTED_FILE_TYPE");
  if (!(file.size <= MAX_FILE_SIZE_MB * 1024 * 1024)) throw new Error("FILE_TOO_LARGE");
  return true;
}

/**
 * Uploads a file to the CESS Drive via the Apps Script gateway.
 * `folder` should be one of the Drive root subfolders (see docs):
 * Activities | Announcements | Resources | History | Public Archive | Reports | General Media
 * Returns a mediaObject: { url, name, type, driveFileId, mimeType }
 */
export async function uploadFile(file, folder = "General Media") {
  validateFile(file);
  const base64Data = await readFileAsBase64(file);
  const data = await callGateway({
    action: "upload",
    filename: file.name,
    mimeType: file.type,
    base64Data,
    folder
  });
  return {
    url: data.url,
    name: data.name || file.name,
    type: file.type.startsWith("image/") ? "image" : "document",
    driveFileId: data.driveFileId,
    mimeType: data.mimeType || file.type
  };
}

export async function deleteFile(driveFileId) {
  if (!driveFileId) return;
  await callGateway({ action: "delete", driveFileId });
}

export async function listFiles(folder) {
  const data = await callGateway({ action: "list", folder });
  return data.files || [];
}

/** User-facing (bilingual) message for any error this module throws. */
export function mediaErrorMessage(err) {
  const map = {
    MEDIA_GATEWAY_NOT_CONFIGURED: { en: "File uploads are not configured yet. Contact the site administrator.", ar: "لم يتم إعداد رفع الملفات بعد. يرجى التواصل مع مسؤول الموقع." },
    MEDIA_NETWORK_ERROR: { en: "Network error while uploading. Please check your connection and try again.", ar: "خطأ في الشبكة أثناء الرفع. يرجى التحقق من الاتصال والمحاولة مرة أخرى." },
    MEDIA_GATEWAY_HTTP_ERROR: { en: "The file server did not respond correctly. Please try again shortly.", ar: "لم يستجب خادم الملفات بشكل صحيح. يرجى المحاولة لاحقًا." },
    MEDIA_GATEWAY_ERROR: { en: "Upload failed. Please try again.", ar: "فشل الرفع. يرجى المحاولة مرة أخرى." },
    NO_FILE: { en: "Please choose a file first.", ar: "يرجى اختيار ملف أولاً." },
    UNSUPPORTED_FILE_TYPE: { en: "This file type is not supported.", ar: "نوع هذا الملف غير مدعوم." },
    FILE_TOO_LARGE: { en: `File is too large (max ${MAX_FILE_SIZE_MB} MB).`, ar: `الملف كبير جدًا (الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت).` },
    FILE_READ_ERROR: { en: "Could not read the selected file.", ar: "تعذرت قراءة الملف المحدد." }
  };
  return map[err.message] || { en: "Something went wrong with the file operation.", ar: "حدث خطأ ما أثناء عملية الملف." };
}

/** Empty mediaObject, used to initialize editor forms before an upload happens. */
export function emptyMedia() {
  return { url: "", name: "", type: "", driveFileId: "", mimeType: "" };
}

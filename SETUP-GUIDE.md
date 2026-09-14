# CESS Website — Setup & Deployment Guide

Written for managing the project mostly from a phone. A laptop makes the Apps Script deployment step easier if one is available for that step only.

---

## 1. What changed in this rebuild

- **Firebase SDK**: switched from the legacy compat SDK (`firebase.initializeApp()`, `db.collection()`) to the modular SDK (`getAuth`, `getFirestore`, `collection()`, `getDocs()`...). No page loads both — only the modular SDK exists now.
- **Media**: Firebase Storage is not used anywhere. All files (images, PDFs, documents) live in a CESS-owned Google Drive, uploaded through a Google Apps Script gateway. Firestore stores only the resulting metadata.
- **Canonical field renamed**: `batch` → `cohort` on user documents. See the migration section below if you have existing users with `batch`.
- **Real CMS**: Admin and Leadership dashboards now have actual create/edit forms (with image/file upload) for every content type — not links to "edit in Firebase Console."
- **New collections wired into the UI**: `meetings`, `reports`, `committees`, `internalDocuments`, `handover` now have working panels in Leadership/Admin dashboards, matching the rules that already existed for them.

---

## 2. Firestore Collection Structure

| Collection | Who manages it | Key fields |
|---|---|---|
| `users` | Self (limited) / Admin (roles) | `uid, name, email, cohort, department, role, status, photoUrl, phone, bio, joinedAt, updatedAt` |
| `activities` | Leadership, Admin | `title_ar/en, description_ar/en, category, date, startTime, endTime, location_ar/en, coverImage, gallery, documents, registrationUrl, externalUrl, published, featured, createdAt, updatedAt, createdBy, updatedBy` |
| `announcements` | Leadership, Admin | `title_ar/en, content_ar/en, coverImage, published, featured, publishedAt, createdAt, updatedAt, createdBy, updatedBy` |
| `resources` | Leadership, Admin | `title_ar/en, description_ar/en, category, coverImage, files, externalUrl, published, featured, createdAt, updatedAt, createdBy, updatedBy` |
| `history` | Admin (Leadership can propose) | `year, stage_ar/en, title_ar/en, description_ar/en, image, gallery, order, published, createdAt, updatedAt, createdBy, updatedBy` |
| `publicArchive` | Leadership, Admin | `title_ar/en, description_ar/en, category, coverImage, gallery, documents, date, externalUrl, published, featured, createdAt, updatedAt, createdBy, updatedBy` |
| `meetings` | Leadership, Admin (internal only) | `title_ar/en, description_ar/en, date, startTime, endTime, location_ar/en, agenda, minutes, documents, createdAt, updatedAt, createdBy, updatedBy` |
| `reports` | Leadership creates/edits, Admin deletes | `title_ar/en, description_ar/en, reportType, periodStart, periodEnd, document, coverImage, published, internal, createdAt, updatedAt, createdBy, updatedBy` |
| `committees` | Leadership, Admin (internal only) | `name_ar/en, description_ar/en, chairperson, members[], status, createdAt, updatedAt, createdBy, updatedBy` |
| `internalDocuments` | Leadership, Admin (internal only) | `title_ar/en, description_ar/en, category, file, version, confidential, createdAt, updatedAt, createdBy, updatedBy` |
| `handover` | Leadership creates/edits, Admin deletes | `title_ar/en, description_ar/en, category, documents, links, responsiblePerson, status, createdAt, updatedAt, createdBy, updatedBy` |
| `settings/site` | Admin only | `siteName_ar/en, department_ar/en, university_ar/en, description_ar/en, logoUrl, faviconUrl, contactEmail, contactPhone, updatedAt, updatedBy` |
| `settings/socialLinks` | Admin only | `facebook, instagram, telegram, whatsapp, linkedin, youtube, updatedAt, updatedBy` |
| `settings/publicStatistics` | Admin only (refresh button or manual override) | `activitiesCount, membersCount, yearsCount, resourcesCount, manualOverride, updatedAt, updatedBy` |

**Media object shape** (used consistently for `coverImage`, `gallery`, `documents`, `files`, `image`, `document`, `file`):
```
{ url, name, type, driveFileId, mimeType }
```

Roles are exactly one of: `member`, `leadership`, `admin`.
Statuses are exactly one of: `active`, `inactive`, `suspended`.

---

## 3. Firebase Project Setup

1. Go to the [Firebase Console](https://console.firebase.google.com) and create a project (the free Spark plan is enough — this project never uses Firebase Storage, which is the usual reason people need a paid plan).
2. Inside the project, click **Add app → Web**. Register the app (any nickname).
3. Copy the `firebaseConfig` object Firebase shows you.
4. Open `js/core/firebase.js` in this project and paste your values into the `firebaseConfig` object near the top. These values identify your project — they are not secret, but never put a *service account key* or Apps Script secret in this file.
5. In the console, go to **Authentication → Sign-in method** and enable **Email/Password**.
6. Go to **Firestore Database → Create database** (production mode, any region close to Sudan/Africa or the default is fine).
7. Go to **Firestore Database → Rules** tab, delete the placeholder, paste the entire contents of `firestore.rules` from this project, and click **Publish**.

At this point login, registration, and all CMS text fields will work. Image/file uploads will show a friendly "not configured yet" message until you complete the Drive setup below.

---

## 4. Google Drive + Apps Script Media Gateway

This project **never uses Firebase Storage**. Files are uploaded to a Google Drive that belongs to a dedicated CESS Google account (not a personal one), via a small Apps Script "gateway" that the website calls.

### 4.1 Prepare the Drive

1. Sign in to the dedicated CESS Google account.
2. In Google Drive, create a root folder: **CESS — Digital Archive**.
3. Inside it, create these subfolders: `Activities`, `Announcements`, `Resources`, `History`, `Public Archive`, `Reports`, `General Media`.

### 4.2 Create the Apps Script project

1. From the same Google account, go to [script.google.com](https://script.google.com) → **New project**.
2. Replace the default code with a script that handles four actions — `upload`, `delete`, `list`, `metadata` — matching the contract documented at the top of `js/services/media.js` in this project. The script should:
   - Parse the JSON POST body.
   - Check `payload.secret` against a secret value you choose (store it as an Apps Script "Script Property", not hard-coded, if possible).
   - For `upload`: decode the base64 file, save it into the named subfolder (creating it if missing), set sharing to "anyone with the link can view", and return `{ ok: true, data: { url, name, driveFileId, mimeType } }`.
   - For `delete`: trash the file by ID.
   - For `list`: return files in a folder.
   - Always return JSON with `ok: true/false` — never let the script throw an uncaught error back as raw HTML (Apps Script does this by default on exceptions; wrap the whole `doPost` in try/catch).
3. Deploy: **Deploy → New deployment → Web app**. Set "Execute as: Me" and "Who has access: Anyone". Copy the deployment URL.

### 4.3 Connect the gateway to the website

Open `js/services/media.js` and set:
```js
const GAS_ENDPOINT = "<your deployment URL>";
const GAS_SHARED_SECRET = "<the same secret your Apps Script checks>";
```

No other file needs to change — every CMS editor already calls `uploadFile()`/`deleteFile()` from this one module.

### 4.4 Quotas and limits to expect

Google Drive and Apps Script on a personal/free Google Workspace-less account have daily quotas (script runtime, number of requests). For a student society's activity/document volume this is normally generous, but if uploads start failing during high-traffic periods (e.g. right after an event), that is the likely cause — check the Apps Script execution log (**script.google.com → your project → Executions**).

---

## 5. Migration Notes (if you have existing Firestore data)

If your Firestore already has documents from a previous version of this site:

| Old field | New field | Action needed |
|---|---|---|
| `users.batch` | `users.cohort` | Add a `cohort` field with the same value as `batch` to each user document. Do this via a one-time script or manually for a small user base — do not delete `batch` until you've confirmed `cohort` is populated everywhere, in case something still reads the old field. |
| Any document missing `published`/`featured` | — | Add `published: false, featured: false` explicitly. `listAll()` (admin/leadership view) will still show these documents, but `listPublished()` (public site) requires the field to exist and be `true` — a missing field is not treated as `true`. |
| Any document missing the field used for sorting (e.g. `date` on activities, `order` on history) | — | These documents will still appear in Admin/Leadership's full list, but may sort unpredictably (see the note in `js/services/firestore-service.js` on `listAll()`). Fill in the missing field when you next edit the document. |

Do not bulk-delete old documents. Migrate fields additively, verify the new fields are populated, and only remove old fields once you're confident nothing depends on them.

---

## 6. Roles & Access Summary

| Action | Member | Leadership | Admin |
|---|---|---|---|
| View published content | ✅ | ✅ | ✅ |
| Edit own profile (not role/status) | ✅ | ✅ | ✅ |
| Create/edit/publish activities, announcements, resources, public archive | ❌ | ✅ | ✅ |
| Manage meetings, committees, internal documents (internal-only) | ❌ | ✅ | ✅ |
| Create/edit handover records | ❌ | ✅ | ✅ |
| Create/edit reports | ❌ | ✅ | ✅ |
| Delete reports / handover / meetings / committees / internal documents | ❌ | ❌ | ✅ |
| Manage user roles & status | ❌ | ❌ | ✅ |
| Edit site settings, social links, statistics | ❌ | ❌ | ✅ |

All of the above is enforced in `firestore.rules`, not just hidden in the UI — a user cannot bypass these by calling Firestore directly from a browser console.

---

## 7. Testing Checklist

**Roles**
- [ ] Anonymous visitor can see published content only; cannot see drafts, meetings, committees, internal documents, or handover records.
- [ ] Member can log in, edit their own profile, cannot see any CMS "+ New" buttons (they don't have a dashboard with them).
- [ ] Leadership can create/edit/delete/publish activities, announcements, resources, archive, meetings, reports, committees, internal documents, handover — but has no Users & Roles panel and no Site Settings panel.
- [ ] Admin can do everything Leadership can, plus manage users/roles/status and site/social/statistics settings.
- [ ] A user cannot change their own role or status (test by trying as both Member and Admin on their own account).
- [ ] A suspended user is signed out and redirected to login with a suspension notice.

**CRUD, per collection**
- [ ] Create → appears in the list immediately.
- [ ] Edit → changes persist after a page reload.
- [ ] Publish/Unpublish → toggles visibility on the public site.
- [ ] Feature/Unfeature → affects homepage "featured" sections.
- [ ] Delete → item disappears, associated Drive files are cleaned up (check Drive folder).

**Media**
- [ ] Uploading an unsupported file type shows a clear error, not a crash.
- [ ] Uploading an oversized file (>15MB) is rejected with a clear message.
- [ ] With the Apps Script gateway not yet configured, uploads fail with "File uploads are not configured yet" rather than a raw JavaScript error.

**Bilingual / RTL**
- [ ] Switching to Arabic flips the whole layout to RTL, including dashboards and forms.
- [ ] Every button, label, and error message has both an Arabic and English version (no hard-coded English-only string appears while in Arabic mode).

**Mobile**
- [ ] Test at a phone width (~375px): dashboard sidebar becomes a horizontal scroll strip, CMS item cards stack vertically with full-width buttons, the CMS editor modal opens near-full-screen.
- [ ] No action in any dashboard depends on hover or right-click.

**Network/error handling**
- [ ] Public pages never show a blank screen — even with Firebase unreachable, sections fall back to a friendly "nothing here yet" message.
- [ ] Submitting a form twice quickly doesn't create duplicate records (buttons disable while saving).

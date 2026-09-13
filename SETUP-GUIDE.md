# CESS Website — Setup & Deployment Guide

Everything here is written for someone managing the project mostly from a phone. No laptop is assumed, though a laptop makes GitHub upload easier if you have one available.

---

## 1. Firestore Collection Structure

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | One doc per registered account | `name, email, batch, role, createdAt` |
| `activities` | Events/workshops | `title_en/ar, description_en/ar, shortDescription_en/ar, date, location, category, organizer, image, gallery, documents, driveLinks, report, published, createdAt, updatedAt` |
| `announcements` | Public/member notices | `title_en/ar, content_en/ar, date, published, createdAt` |
| `resources` | Study materials | `title_en/ar, description_en/ar, category, link, driveLink, language, date, published` |
| `publicArchive` | Public digital archive | `title_en/ar, description_en/ar, category, driveLink` |
| `history` | Institutional timeline | `stage_en/ar, description_en/ar, period, order` |
| `committees` | Leadership-only | free-form, `title/description/driveLink` |
| `meetings` | Leadership-only | free-form, same shape as above |
| `reports` | Leadership-only | free-form, same shape as above |
| `internalDocuments` | Leadership-only | free-form, same shape as above |
| `handover` | Admin-only | free-form, same shape as above |
| `settings` | Fixed document IDs: `publicStatistics`, `socialLinks` | see below |

`settings/publicStatistics`: `{ activitiesCount, registeredStudentsCount, updatedAt }`
`settings/socialLinks`: `{ facebook, instagram, telegram, whatsapp, linkedin, youtube }` (any field can be blank/omitted)

Roles are exactly one of: `member`, `leadership`, `admin`.

---

## 2. Firestore Security Rules

The complete rules file is `firestore.rules` in the project root.

**To apply it:**
1. Open the [Firebase Console](https://console.firebase.google.com) → your project → Firestore Database → **Rules** tab.
2. Select all existing text and delete it.
3. Copy the entire contents of `firestore.rules` and paste it in.
4. Tap **Publish**.

Key guarantees enforced server-side (not just hidden in the UI):
- The public can only ever read **published** activities/announcements/resources.
- The public archive and history are fully public (read-only).
- Only `leadership` and `admin` can read committees, meetings, reports, and internal documents.
- Only `admin` can read the `handover` collection.
- A user can **never** change their own `role` field, even by editing their own document — only `admin` can.
- The full `users` collection can never be listed by the public or by members — only `admin`/`leadership`.
- Anything not explicitly covered by a rule is denied by default (`allow read, write: if false`).

---

## 3. Firebase Setup Instructions (from a phone)

1. Go to `console.firebase.google.com` in your phone's browser and sign in with a Google account.
2. Tap **Add project**, name it (e.g. "cess-website"), and finish the wizard (Google Analytics is optional — skip it if unsure).
3. Once created, tap the **Web** icon (`</>`) to register a new web app. Name it "CESS Website."
4. Firebase will show a config object. Copy the six values (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).
5. Open `firebase-config.js` in this project (any text editor, including GitHub's mobile web editor) and paste those six values in place of the `"YOUR_..."` placeholders.
6. In the Firebase Console sidebar: **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save.**
7. In the sidebar: **Build → Firestore Database → Create database → Start in production mode** (pick the region closest to Sudan, e.g. `europe-west` or `me-central1` if offered).
8. Apply the security rules from Section 2 above.
9. Confirm you are on the **Spark (free)** plan under **Usage and billing** — do not upgrade to Blaze; this project is designed to never need it.

---

## 4. Admin Setup Instructions

There is no "first admin" auto-promotion by design (a public site must never let the first visitor grant themselves admin). To create your first admin account:

1. Register a normal account through `register.html` on the live site (or locally). It will be created with role `member`.
2. Open **Firebase Console → Firestore Database → Data**.
3. Find the `users` collection, open the document matching your account (match by the `email` field).
4. Edit the `role` field from `member` to `admin`. Save.
5. Log out and log back in on the site — you'll now land on `admin.html`.

From then on, use the **Users & Roles** section of the Admin Dashboard to promote/demote other accounts (leadership, additional admins) without touching Firestore directly.

To add activities, announcements, resources, archive items, or history entries: the current version manages **publishing, editing status, and deletion** from the Admin Dashboard UI. Creating brand-new items is done by adding a document directly in **Firestore Database → Data → [collection] → Add document**, using the field names in Section 1. This keeps the project simple enough to audit and avoids building a large custom form UI that would need ongoing maintenance. A future committee can extend `admin.js` with creation forms if desired.

---

## 5. Google Drive Archive Setup Instructions

Create this exact folder structure in a Google Drive folder owned by an official CESS account (not a personal one, if possible, for continuity):

```
CESS – Digital Archive
├── 01 – Constitution & Regulations
├── 02 – Previous Committees
├── 03 – Current Committee
│   ├── Leadership Archive
│   ├── Administration
│   ├── Meetings
│   ├── Plans
│   ├── Reports
│   ├── Media
│   └── Handover
├── 04 – Meetings
├── 05 – Reports
├── 06 – Activities & Events
├── 07 – Media
├── 08 – Academic Resources
├── 09 – Official Correspondence
└── 10 – Handover
```

For each file you want linked from the website:
1. Right-click the file in Drive → **Share** → set to "Anyone with the link" **only** if it belongs in the PUBLIC archive.
2. Copy the link.
3. Paste it into the relevant Firestore document's `driveLink` field (via the Firebase Console, or a future admin form).

**Never** set private/leadership-only folders (Administration, Meetings, Plans, internal Reports, Handover) to "Anyone with the link." Keep those restricted to specific CESS leadership Google accounts.

---

## 6. GitHub Deployment Instructions

**Option A — GitHub Pages (simplest, works from a phone via github.com's web interface):**
1. Create a new GitHub repository, e.g. `cess-website`.
2. Upload every file in this project's root folder (not the `docs/` folder) using GitHub's "Add file → Upload files" web UI.
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment," set Source to **Deploy from a branch**, branch `main`, folder `/ (root)`. Save.
5. GitHub will give you a URL like `https://yourusername.github.io/cess-website/` within a few minutes.

**Option B — Firebase Hosting (also free on Spark):**
1. On a computer with Node.js, run `npm install -g firebase-tools`, then `firebase login`.
2. In the project folder: `firebase init hosting` → select your existing Firebase project → set the public directory to `.` (the project root) → configure as a single-page app: **No**.
3. Run `firebase deploy`.

Either option is free and satisfies the "no paid hosting" requirement. GitHub Pages is easier to manage from a phone; Firebase Hosting integrates more tightly with the same project as your database.

---

## 7. Final Testing Checklist

**Public pages**
- [ ] Home, About, Activities, Activity Details, Resources, Archive, History, Contact all load with no console errors
- [ ] Every nav link and footer link works
- [ ] Language switch (EN/AR) changes text and page direction everywhere, and persists across page loads
- [ ] Mobile hamburger menu opens/closes correctly on a real phone
- [ ] With Firebase not yet configured (placeholders still in `firebase-config.js`), the static shell (header, hero, about, secretariats, footer) still renders — dynamic sections show their empty-state messages, not a blank page

**Authentication**
- [ ] Register creates an account with role `member` (verify in Firestore — the role field cannot be set from the form)
- [ ] Login redirects to the correct dashboard for each role
- [ ] Logout returns to the homepage
- [ ] Forgot password sends a reset email
- [ ] Visiting `member.html`, `leadership.html`, or `admin.html` while logged out redirects to `login.html`

**Member**
- [ ] Member dashboard shows announcements, upcoming activities, resources, and their own profile info only

**Leadership**
- [ ] Leadership dashboard shows the private archive sections (meetings, reports, committees, internal documents, handover)
- [ ] A member account cannot reach `leadership.html` (gets redirected)

**Admin**
- [ ] Admin can view and change any user's role
- [ ] Admin can publish/unpublish/delete activities
- [ ] Admin can save social links and see them appear in the public footer
- [ ] Admin can refresh public statistics and see the homepage numbers update
- [ ] A leadership account cannot reach the Users & Roles or Public Statistics controls (not present on their dashboard, and Firestore rules reject an attempted direct write)

**Security (verify directly in the Firestore Rules Playground, not just the UI)**
- [ ] A `member`-role request to read `meetings`, `reports`, `committees`, `internalDocuments`, or `handover` is denied
- [ ] A signed-out (public) request to read any of the above, or to list the full `users` collection, is denied
- [ ] A signed-in user attempting to write their own `role` field to `admin` is denied
- [ ] A public query against `activities` without `.where("published","==",true)` is denied (confirms the app can't accidentally leak drafts)

---

*This guide covers the free-tier Firebase Spark + GitHub Pages / Firebase Hosting stack described in the project specification. No paid services are required at any point.*

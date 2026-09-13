# CESS Website — Setup Guide (iPhone-friendly)

This guide assumes you have **no computer, no VS Code, no Node.js** — just an iPhone with Safari and the ability to upload files somewhere. Every step below can be done from a phone browser.

---

## Part 1 — Get the files online (choose ONE option)

You need somewhere to store and edit these files that Firebase Hosting can later deploy from. The easiest phone-friendly option is **GitHub** (free, has a mobile-friendly web editor).

### Option A: GitHub (recommended)
1. Go to github.com in Safari, create a free account.
2. Create a new repository called `cess-website`.
3. Use "Add file → Upload files" to upload every file in this project, keeping the folder structure (`css/`, `js/`, and the `.html` files at the root).
4. You can edit any file later by tapping it → pencil icon → edit in the browser → commit.

### Option B: Firebase Console's built-in editor
Firebase Hosting itself doesn't include a file editor, so GitHub (or Google Drive + a later transfer) is the practical phone workflow. If you get access to a computer later, you can also use Firebase Hosting's CLI, but it is not required for this guide.

---

## Part 2 — Create your Firebase project (free Spark plan)

1. Go to **console.firebase.google.com** in Safari.
2. Tap **Add project**. Name it `cess-technological-university` (or similar).
3. You can disable Google Analytics for this project — not needed.
4. Once created, stay on the **Spark (free) plan**. Do not upgrade to Blaze.

### Enable Authentication
1. In the left menu: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password** only. Leave Google, Phone, and Email-link disabled.

### Enable Firestore
1. **Build → Firestore Database → Create database**.
2. Choose **Start in production mode** (we will paste our own rules next).
3. Pick the region closest to your users.

### Add your Security Rules
1. In Firestore, go to the **Rules** tab.
2. Delete the default content and paste in the entire contents of `firestore.rules` from this project.
3. Tap **Publish**.

### Register your Web App & get config
1. In Project Settings (gear icon) → scroll to **Your apps** → tap the **</>** (web) icon.
2. Give it a nickname (e.g. "CESS Website"). You do **not** need Firebase Hosting set up yet to do this step.
3. Firebase will show you a `firebaseConfig` object with real values for `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
4. Copy these into `js/firebase-config.js`, replacing every `"YOUR_..."` placeholder. Save/commit the file.

---

## Part 3 — Create your very first admin account

No one is an admin by default — this is intentional, for security.

1. Open your live site's `login.html` (or open the file locally first to test) and use **Create account** to sign up with your own real email — this creates you as a `member`.
2. Go back to the Firebase Console → **Firestore Database → Data** tab.
3. Open the `users` collection, find the document with your `uid` (matches your email).
4. Tap the `role` field, change its value from `member` to `admin`.
5. Log out and log back in on the site — you'll now land on the Leadership Dashboard, and can promote other officers from the **Users & Roles** panel from now on.

---

## Part 4 — Deploy to Firebase Hosting (free)

Firebase Hosting's free tier needs the Firebase CLI, which normally requires a computer with Node.js. Two phone-friendly paths:

**Path 1 (simplest for now):** keep developing and testing using GitHub Pages (also free, and works from the GitHub mobile web UI: Settings → Pages → deploy from your main branch). This gives you a working public URL immediately with zero command-line steps.

**Path 2 (true Firebase Hosting):** once you have occasional access to any computer (a library, friend's laptop, internet café), run these one-time commands:
```
npm install -g firebase-tools
firebase login
cd cess-website
firebase init hosting
firebase deploy
```
You only need to do this once per deploy; you could ask any trusted person with a laptop to run these two or three times as you reach milestones. Everything else — writing and editing code, managing Firestore data, approving members — can continue to happen entirely from your iPhone through the Firebase Console and GitHub's web editor.

---

## Part 5 — Set up the Google Drive archive structure

Create this folder structure in Google Drive (any Google account works, no cost):

```
CESS – Digital Archive
├── 01 – Constitution & Regulations
├── 02 – Previous Committees
├── 03 – Current Committee
│   └── Leadership Archive
│       ├── Administration
│       ├── Meetings
│       ├── Plans
│       ├── Reports
│       ├── Media
│       └── Handover
├── 04 – Meetings
├── 05 – Reports
├── 06 – Activities & Events
├── 07 – Media
├── 08 – Academic Resources
├── 09 – Official Correspondence
└── 10 – Handover
```

For each file you want linked from the website (a resource, a report, a public archive document):
1. Upload it to the correct folder.
2. Tap the file → **Share** → **Get link** → set to "Anyone with the link can view" (for public resources) or keep restricted (for internal documents only leadership needs, and share only with committee members' Google accounts).
3. Copy that link and paste it into the matching field (`fileUrl`, `driveLink`, etc.) when adding the item through the Leadership Dashboard.

---

## Part 6 — Day-to-day content management

Once set up, all day-to-day work happens through the **Leadership Dashboard** in the browser:
- Add activities, announcements, resources — no coding needed.
- Add committee rosters, meeting minutes, reports, and internal documents.
- Build the **Handover** archive continuously, not just at the end of a term — future committees will thank you.
- Review contact form submissions under **Contact Messages**.

To change wording on static pages (About, History, Contact info), edit the relevant `.html` file directly through GitHub's mobile web editor.

---

## Notes on what's placeholder vs real

- The CESS logo is currently a text placeholder (`CESS` in a bordered box in the header and hero). Replace `assets/images/logo.png` and swap the `<span class="brand-logo">` markup for an `<img>` tag once you have the real logo file.
- Contact info, social media links, and the official email in `contact.html` are placeholders — update with real details.
- `firebase-config.js` must be filled in with your real project config before anything will work.

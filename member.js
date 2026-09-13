/* =========================================================
   CESS — Member Dashboard Logic
   =========================================================
   Client-side guard for UX only. Real protection is Firestore
   rules: even if this guard were bypassed, a non-member role
   attempting these reads would be rejected server-side for
   any leadership/admin-only collection.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initLangSwitch();

  guardPage([CESS_CONFIG.roles.MEMBER, CESS_CONFIG.roles.LEADERSHIP, CESS_CONFIG.roles.ADMIN], (profile) => {
    // Members and higher roles can all view the member dashboard content.
    renderProfile(profile);
    loadAnnouncements("member-announcements");
    loadActivities("member-activities", { upcomingOnly: true, limit: 6 });
    loadResources("member-resources");
  });

  document.getElementById("logout-btn").addEventListener("click", logoutUser);
});

function renderProfile(profile) {
  const nameEl = document.getElementById("member-name");
  if (nameEl) nameEl.textContent = profile.name || "";

  const cells = {
    "profile-name-cell": profile.name,
    "profile-email-cell": profile.email,
    "profile-batch-cell": profile.batch,
    "profile-role-cell": profile.role
  };

  Object.entries(cells).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "—";
  });
}

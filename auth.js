/* =========================================================
   CESS — AUTHENTICATION
   ========================================================= */
console.log("CESS AUTH: auth.js loaded");
/* =========================================================
   GET CURRENT USER PROFILE
   ========================================================= */
async function getCurrentUserProfile() {
  console.log(
    "CESS AUTH: getCurrentUserProfile()"
  );
  const user =
    auth.currentUser;
  if (!user) {
    console.log(
      "CESS AUTH: No Firebase user currently signed in"
    );
    return null;
  }
  console.log(
    "CESS AUTH: Firebase UID:",
    user.uid
  );
  try {
    const doc =
      await db
        .collection(
          CESS_CONFIG.collections.USERS
        )
        .doc(user.uid)
        .get();
    console.log(
      "CESS AUTH: Firestore user document exists:",
      doc.exists
    );
    if (!doc.exists) {
      console.error(
        "CESS AUTH ERROR: User authenticated but Firestore user document does not exist."
      );
      return null;
    }
    const data =
      doc.data();
    console.log(
      "CESS AUTH: User profile:",
      data
    );
    return {
      uid: user.uid,
      ...data
    };
  } catch (error) {
    console.error(
      "CESS AUTH ERROR: Failed to read user profile:",
      error
    );
    throw error;
  }
}
/* =========================================================
   REDIRECT BY ROLE
   ========================================================= */
function redirectToRoleHome(role) {
  console.log(
    "CESS AUTH: redirectToRoleHome() role =",
    role
  );
  switch (role) {
    case CESS_CONFIG.roles.ADMIN:
      console.log(
        "CESS AUTH: Redirecting to admin.html"
      );
      window.location.href =
        "admin.html";
      break;
    case CESS_CONFIG.roles.LEADERSHIP:
      console.log(
        "CESS AUTH: Redirecting to leadership.html"
      );
      window.location.href =
        "leadership.html";
      break;
    case CESS_CONFIG.roles.MEMBER:
      console.log(
        "CESS AUTH: Redirecting to member.html"
      );
      window.location.href =
        "member.html";
      break;
    default:
      console.error(
        "CESS AUTH ERROR: Unknown role:",
        role
      );
      window.location.href =
        "index.html";
  }
}
/* =========================================================
   LOGIN
   ========================================================= */
async function loginUser(
  email,
  password
) {
  console.log(
    "===================================="
  );
  console.log(
    "CESS AUTH: LOGIN START"
  );
  console.log(
    "CESS AUTH: email =",
    email
  );
  /* -------------------------------------------------------
     Check Firebase
     ------------------------------------------------------- */
  if (
    typeof firebase === "undefined"
  ) {
    throw new Error(
      "Firebase SDK is not loaded."
    );
  }
  if (
    typeof auth === "undefined"
  ) {
    throw new Error(
      "Firebase Auth is not initialized."
    );
  }
  if (
    typeof db === "undefined"
  ) {
    throw new Error(
      "Firestore is not initialized."
    );
  }
  /* -------------------------------------------------------
     Firebase Authentication
     ------------------------------------------------------- */
  console.log(
    "CESS AUTH: Calling signInWithEmailAndPassword..."
  );
  try {
    const credential =
      await auth
        .signInWithEmailAndPassword(
          email,
          password
        );
    console.log(
      "CESS AUTH: Firebase authentication SUCCESS"
    );
    console.log(
      "CESS AUTH: UID =",
      credential.user.uid
    );
    console.log(
      "CESS AUTH: Email =",
      credential.user.email
    );
    /* -----------------------------------------------------
       Get Firestore profile
       ----------------------------------------------------- */
    console.log(
      "CESS AUTH: Reading Firestore users document..."
    );
    const profile =
      await getCurrentUserProfile();
    if (!profile) {
      console.error(
        "CESS AUTH ERROR: Authentication succeeded but no profile was found."
      );
      throw new Error(
        "Your Firebase account is valid, but your CESS user profile was not found in Firestore."
      );
    }
    console.log(
      "CESS AUTH: Profile loaded successfully"
    );
    console.log(
      "CESS AUTH: ROLE =",
      profile.role
    );
    /* -----------------------------------------------------
       Check role
       ----------------------------------------------------- */
    if (!profile.role) {
      throw new Error(
        "Your account exists, but no role is assigned to your CESS profile."
      );
    }
    /* -----------------------------------------------------
       Redirect
       ----------------------------------------------------- */
    console.log(
      "CESS AUTH: Redirecting..."
    );
    redirectToRoleHome(
      profile.role
    );
  } catch (error) {
    console.error(
      "===================================="
    );
    console.error(
      "CESS AUTH LOGIN ERROR"
    );
    console.error(
      "CODE:",
      error.code
    );
    console.error(
      "MESSAGE:",
      error.message
    );
    console.error(
      "FULL ERROR:",
      error
    );
    console.error(
      "===================================="
    );
    throw error;
  }
}
/* =========================================================
   LOGOUT
   ========================================================= */
async function logoutUser() {
  console.log(
    "CESS AUTH: Logging out..."
  );
  await auth.signOut();
  window.location.href =
    "index.html";
}
/* =========================================================
   PASSWORD RESET
   ========================================================= */
async function sendPasswordReset(
  email
) {
  console.log(
    "CESS AUTH: Sending password reset..."
  );
  return await auth
    .sendPasswordResetEmail(
      email
    );
}
/* =========================================================
   GUARD PAGE
   ========================================================= */
function guardPage(
  allowedRoles,
  onAuthorized
) {
  console.log(
    "CESS AUTH: guardPage()"
  );
  auth.onAuthStateChanged(
    async function(user) {
      console.log(
        "CESS AUTH: Auth state changed:",
        user
      );
      if (!user) {
        console.log(
          "CESS AUTH: User not signed in"
        );
        window.location.href =
          "login.html";
        return;
      }
      try {
        const profile =
          await getCurrentUserProfile();
        if (
          !profile ||
          !allowedRoles.includes(
            profile.role
          )
        ) {
          console.error(
            "CESS AUTH: Unauthorized role:",
            profile
              ? profile.role
              : null
          );
          redirectToRoleHome(
            profile
              ? profile.role
              : null
          );
          return;
        }
        onAuthorized(
          profile
        );
      } catch (error) {
        console.error(
          "CESS AUTH: guardPage error:",
          error
        );
        window.location.href =
          "login.html";
      }
    }
  );
}

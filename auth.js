(function () {
  "use strict";

  /* =========================================================
     CESS — AUTHENTICATION SYSTEM
     ========================================================= */

  function getUserProfile(uid) {
    return db
      .collection(CESS_CONFIG.collections.USERS)
      .doc(uid)
      .get();
  }

  async function getCurrentUserProfile() {
    const user = auth.currentUser;

    if (!user) {
      return null;
    }

    const doc = await getUserProfile(user.uid);

    if (!doc.exists) {
      return null;
    }

    return {
      uid: user.uid,
      ...doc.data()
    };
  }


  /* =========================================================
     ROLE REDIRECTION
     ========================================================= */

  function redirectToRoleHome(role) {

    if (role === CESS_CONFIG.roles.ADMIN) {
      window.location.replace("admin.html");
      return;
    }

    if (role === CESS_CONFIG.roles.LEADERSHIP) {
      window.location.replace("leadership.html");
      return;
    }

    if (role === CESS_CONFIG.roles.MEMBER) {
      window.location.replace("member.html");
      return;
    }

    window.location.replace("index.html");
  }


  /* =========================================================
     LOGIN
     ========================================================= */

  async function loginUser(email, password) {

    email = String(email || "").trim();

    if (!email) {
      throw new Error("Please enter your email address.");
    }

    if (!password) {
      throw new Error("Please enter your password.");
    }

    console.log("CESS AUTH: Signing in...");

    const credential =
      await auth.signInWithEmailAndPassword(
        email,
        password
      );

    const user = credential.user;

    console.log(
      "CESS AUTH: Firebase login successful:",
      user.uid
    );

    const doc = await getUserProfile(user.uid);

    if (!doc.exists) {

      /*
       * Firebase account exists,
       * but there is no CESS profile.
       */

      await auth.signOut();

      throw new Error(
        "Your account exists, but your CESS profile was not found."
      );
    }

    const profile = {
      uid: user.uid,
      ...doc.data()
    };

    if (!profile.role) {

      await auth.signOut();

      throw new Error(
        "Your CESS account does not have a role assigned."
      );
    }

    console.log(
      "CESS AUTH: Role:",
      profile.role
    );

    redirectToRoleHome(profile.role);

    return profile;
  }


  /* =========================================================
     REGISTER
     ========================================================= */

  async function registerUser({
    fullName,
    email,
    password,
    batch
  }) {

    fullName = String(fullName || "").trim();
    email = String(email || "").trim();
    batch = String(batch || "").trim();

    if (!fullName) {
      throw new Error("Please enter your full name.");
    }

    if (!email) {
      throw new Error("Please enter your email address.");
    }

    if (!password) {
      throw new Error("Please enter a password.");
    }

    if (password.length < 6) {
      throw new Error(
        "Password must contain at least 6 characters."
      );
    }

    console.log("CESS AUTH: Creating account...");

    const credential =
      await auth.createUserWithEmailAndPassword(
        email,
        password
      );

    const user = credential.user;

    console.log(
      "CESS AUTH: Firebase account created:",
      user.uid
    );

    try {

      await db
        .collection(CESS_CONFIG.collections.USERS)
        .doc(user.uid)
        .set({

          name: fullName,

          email: user.email,

          batch: batch,

          role: CESS_CONFIG.roles.MEMBER,

          createdAt:
            firebase.firestore.FieldValue
              .serverTimestamp()

        });

    } catch (firestoreError) {

      /*
       * If the Firebase account was created but
       * the CESS profile failed, remove the Auth account
       * so registration does not leave a broken account.
       */

      console.error(
        "CESS AUTH: Failed to create profile:",
        firestoreError
      );

      try {
        await user.delete();
      } catch (deleteError) {
        console.error(
          "CESS AUTH: Failed to rollback account:",
          deleteError
        );
      }

      throw firestoreError;
    }

    console.log(
      "CESS AUTH: CESS profile created."
    );

    /*
     * New registrations are members by default.
     */

    redirectToRoleHome(
      CESS_CONFIG.roles.MEMBER
    );

    return {
      uid: user.uid,
      name: fullName,
      email: user.email,
      batch: batch,
      role: CESS_CONFIG.roles.MEMBER
    };
  }


  /* =========================================================
     LOGOUT
     ========================================================= */

  async function logoutUser() {

    console.log("CESS AUTH: Signing out...");

    await auth.signOut();

    window.location.replace("index.html");
  }


  /* =========================================================
     PASSWORD RESET
     ========================================================= */

  async function sendPasswordReset(email) {

    email = String(email || "").trim();

    if (!email) {
      throw new Error(
        "Please enter your email address first."
      );
    }

    await auth.sendPasswordResetEmail(email);

    return true;
  }


  /* =========================================================
     PAGE GUARD
     ========================================================= */

  function guardPage(allowedRoles, onAuthorized) {

    let handled = false;

    auth.onAuthStateChanged(async function (user) {

      if (handled) {
        return;
      }

      if (!user) {

        window.location.replace("login.html");

        return;
      }

      try {

        const profile =
          await getCurrentUserProfile();

        if (!profile) {

          await auth.signOut();

          window.location.replace("login.html");

          return;
        }

        if (
          !Array.isArray(allowedRoles) ||
          !allowedRoles.includes(profile.role)
        ) {

          redirectToRoleHome(profile.role);

          return;
        }

        handled = true;

        if (typeof onAuthorized === "function") {
          onAuthorized(profile);
        }

      } catch (error) {

        console.error(
          "CESS AUTH: Guard error:",
          error
        );

        await auth.signOut();

        window.location.replace("login.html");
      }

    });
  }


  /* =========================================================
     FRIENDLY AUTH ERRORS
     ========================================================= */

  function friendlyAuthError(error) {

    if (!error) {
      return "Something went wrong. Please try again.";
    }

    const code = error.code || "";

    const messages = {

      "auth/email-already-in-use":
        "This email is already registered. Please log in instead.",

      "auth/invalid-email":
        "Please enter a valid email address.",

      "auth/weak-password":
        "Password must contain at least 6 characters.",

      "auth/user-not-found":
        "No account was found with this email.",

      "auth/wrong-password":
        "Incorrect password. Please try again.",

      "auth/invalid-credential":
        "Incorrect email or password.",

      "auth/user-disabled":
        "This account has been disabled.",

      "auth/too-many-requests":
        "Too many attempts. Please wait and try again.",

      "auth/network-request-failed":
        "Network error. Please check your internet connection.",

      "auth/operation-not-allowed":
        "Email/password authentication is not enabled.",

      "auth/missing-password":
        "Please enter your password.",

      "auth/invalid-password":
        "The password is incorrect.",

      "auth/requires-recent-login":
        "Please log in again and retry this action."
    };

    return (
      messages[code] ||
      error.message ||
      "Something went wrong. Please try again."
    );
  }


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.CESS_AUTH = {
    getCurrentUserProfile,
    loginUser,
    registerUser,
    logoutUser,
    sendPasswordReset,
    guardPage,
    friendlyAuthError,
    redirectToRoleHome
  };


  /*
   * Backward compatibility.
   * Existing CESS pages can continue calling these names.
   */

  window.getCurrentUserProfile =
    getCurrentUserProfile;

  window.loginUser =
    loginUser;

  window.registerUser =
    registerUser;

  window.logoutUser =
    logoutUser;

  window.sendPasswordReset =
    sendPasswordReset;

  window.guardPage =
    guardPage;

  window.friendlyAuthError =
    friendlyAuthError;

  window.redirectToRoleHome =
    redirectToRoleHome;

})();

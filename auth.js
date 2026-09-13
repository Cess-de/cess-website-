/* =========================================================
   CESS — Authentication System
   =========================================================
   Handles:
   - Register
   - Login
   - Logout
   - Password reset
   - User profile
   - Role-based redirect
   ========================================================= */


/* =========================================================
   GET CURRENT USER PROFILE
   ========================================================= */

async function getCurrentUserProfile() {

    const user = auth.currentUser;

    if (!user) {
        return null;
    }

    try {

        const doc = await db
            .collection(CESS_CONFIG.collections.USERS)
            .doc(user.uid)
            .get();

        if (!doc.exists) {
            return null;
        }

        return {
            uid: user.uid,
            ...doc.data()
        };

    } catch (error) {

        console.error(
            "CESS: Failed to load user profile",
            error
        );

        throw error;
    }
}


/* =========================================================
   REDIRECT USER ACCORDING TO ROLE
   ========================================================= */

function redirectToRoleHome(role) {

    console.log(
        "CESS: Redirecting according to role:",
        role
    );


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


    console.error(
        "CESS: Unknown or missing role:",
        role
    );

    window.location.replace("index.html");
}


/* =========================================================
   LOGIN
   ========================================================= */

async function loginUser(email, password) {

    email = email.trim();

    if (!email) {
        throw new Error("Please enter your email.");
    }

    if (!password) {
        throw new Error("Please enter your password.");
    }


    console.log(
        "CESS: Starting login..."
    );


    /* -----------------------------------------------------
       Firebase Authentication
       ----------------------------------------------------- */

    const credential =
        await auth.signInWithEmailAndPassword(
            email,
            password
        );


    const user = credential.user;


    console.log(
        "CESS: Firebase login successful.",
        user.uid
    );


    /* -----------------------------------------------------
       Wait until Firebase confirms the current user
       ----------------------------------------------------- */

    await auth.currentUser.reload();


    /* -----------------------------------------------------
       Get CESS profile
       ----------------------------------------------------- */

    const profile =
        await getCurrentUserProfile();


    if (!profile) {

        /*
         * The Firebase account exists,
         * but there is no CESS profile.
         */

        console.error(
            "CESS: Authentication succeeded but user profile does not exist."
        );

        throw new Error(
            "Your Firebase account exists, but your CESS profile was not found."
        );
    }


    if (!profile.role) {

        console.error(
            "CESS: User has no role.",
            profile
        );

        throw new Error(
            "Your CESS account has no assigned role."
        );
    }


    console.log(
        "CESS: User profile loaded:",
        profile
    );


    /* -----------------------------------------------------
       Redirect
       ----------------------------------------------------- */

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

    fullName = fullName.trim();
    email = email.trim();
    batch = batch.trim();


    if (!fullName) {
        throw new Error("Please enter your full name.");
    }


    if (!email) {
        throw new Error("Please enter your email.");
    }


    if (!password) {
        throw new Error("Please enter a password.");
    }


    if (password.length < 6) {

        throw new Error(
            "Password must contain at least 6 characters."
        );
    }


    console.log(
        "CESS: Creating Firebase account..."
    );


    /* -----------------------------------------------------
       Create Firebase Authentication account
       ----------------------------------------------------- */

    const credential =
        await auth.createUserWithEmailAndPassword(
            email,
            password
        );


    const user = credential.user;


    console.log(
        "CESS: Firebase account created:",
        user.uid
    );


    /* -----------------------------------------------------
       Create CESS user profile
       ----------------------------------------------------- */

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


    console.log(
        "CESS: User profile created."
    );


    /* -----------------------------------------------------
       Get the profile we just created
       ----------------------------------------------------- */

    const profile =
        await getCurrentUserProfile();


    if (!profile) {

        throw new Error(
            "Account was created, but the CESS profile could not be loaded."
        );
    }


    /* -----------------------------------------------------
       New users are members by default
       ----------------------------------------------------- */

    redirectToRoleHome(
        CESS_CONFIG.roles.MEMBER
    );


    return profile;
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logoutUser() {

    console.log(
        "CESS: Logging out..."
    );


    await auth.signOut();


    console.log(
        "CESS: Logout successful."
    );


    window.location.replace(
        "index.html"
    );
}


/* =========================================================
   PASSWORD RESET
   ========================================================= */

async function sendPasswordReset(email) {

    email = email.trim();


    if (!email) {

        throw new Error(
            "Please enter your email address first."
        );
    }


    await auth.sendPasswordResetEmail(
        email
    );


    console.log(
        "CESS: Password reset email sent."
    );
}


/* =========================================================
   PAGE GUARD
   ========================================================= */

function guardPage(
    allowedRoles,
    onAuthorized
) {

    auth.onAuthStateChanged(
        async function(user) {

            /* ---------------------------------------------
               No authenticated user
               --------------------------------------------- */

            if (!user) {

                console.log(
                    "CESS: No authenticated user."
                );

                window.location.replace(
                    "login.html"
                );

                return;
            }


            try {

                /* -----------------------------------------
                   Get CESS profile
                   ----------------------------------------- */

                const profile =
                    await getCurrentUserProfile();


                if (!profile) {

                    console.error(
                        "CESS: Authenticated user has no profile."
                    );

                    await auth.signOut();

                    window.location.replace(
                        "login.html"
                    );

                    return;
                }


                /* -----------------------------------------
                   Check role
                   ----------------------------------------- */

                if (
                    !allowedRoles.includes(
                        profile.role
                    )
                ) {

                    console.warn(
                        "CESS: Unauthorized role:",
                        profile.role
                    );


                    redirectToRoleHome(
                        profile.role
                    );

                    return;
                }


                /* -----------------------------------------
                   Authorized
                   ----------------------------------------- */

                console.log(
                    "CESS: Page authorization successful:",
                    profile.role
                );


                if (
                    typeof onAuthorized === "function"
                ) {

                    onAuthorized(profile);
                }

            } catch (error) {

                console.error(
                    "CESS: Page guard error:",
                    error
                );

                window.location.replace(
                    "login.html"
                );
            }

        }
    );
}


/* =========================================================
   AUTH ERROR TRANSLATION
   ========================================================= */

function friendlyAuthError(error) {

    const code =
        error && error.code
            ? error.code
            : "";


    const map = {

        "auth/email-already-in-use":
            "This email is already registered. Please log in instead.",

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/weak-password":
            "Password is too weak. Use at least 6 characters.",

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
            "Email/password authentication is not enabled in Firebase.",

        "auth/requires-recent-login":
            "Please log in again and retry this operation."

    };


    return (
        map[code] ||
        error.message ||
        "Something went wrong. Please try again."
    );
}


/* =========================================================
   AUTH STATE HELPER
   ========================================================= */

function getLoggedInUser() {

    return auth.currentUser || null;
}

/* =========================================================
   CESS ADMIN — USERS & ROLES
   ========================================================= */

async function loadAdminUsersTable() {

  "use strict";

  console.log("CESS ADMIN: Loading users...");


  /* =======================================================
     FIND USERS TABLE
  ======================================================= */

  const tableBody =
    document.getElementById("admin-users-table-body");

  const usersContainer =
    document.getElementById("admin-users-container");

  const usersMessage =
    document.getElementById("admin-users-message");


  /*
   * We support more than one possible ID so the function
   * remains compatible with the existing admin page.
   */

  const body =
    tableBody ||
    document.querySelector(
      "#users-table tbody"
    ) ||
    document.querySelector(
      "#admin-users-table tbody"
    );


  if (!body) {

    console.error(
      "CESS ADMIN: Users table body was not found."
    );

    if (usersMessage) {

      usersMessage.textContent =
        "Users table was not found.";

    }

    return;

  }


  /* =======================================================
     LOADING
  ======================================================= */

  body.innerHTML = `
    <tr>
      <td
        colspan="5"
        style="text-align:center;padding:25px;"
      >
        Loading users...
      </td>
    </tr>
  `;


  /* =======================================================
     FIREBASE CHECK
  ======================================================= */

  if (
    typeof db === "undefined" ||
    typeof auth === "undefined"
  ) {

    console.error(
      "CESS ADMIN: Firebase is not initialized."
    );

    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="text-align:center;padding:25px;"
        >
          Firebase is not initialized.
        </td>
      </tr>
    `;

    return;

  }


  /* =======================================================
     AUTH CHECK
  ======================================================= */

  const currentUser =
    auth.currentUser;


  if (!currentUser) {

    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="text-align:center;padding:25px;"
        >
          Please log in again.
        </td>
      </tr>
    `;

    return;

  }


  /* =======================================================
     LOAD USERS
  ======================================================= */

  try {

    const snapshot =
      await db
        .collection(
          CESS_CONFIG.collections.USERS
        )
        .get();


    console.log(
      "CESS ADMIN: Users loaded:",
      snapshot.size
    );


    /* =====================================================
       NO USERS
    ===================================================== */

    if (snapshot.empty) {

      body.innerHTML = `
        <tr>
          <td
            colspan="5"
            style="text-align:center;padding:25px;"
          >
            No registered users yet.
          </td>
        </tr>
      `;

      return;

    }


    /* =====================================================
       BUILD USERS
    ===================================================== */

    const users = [];


    snapshot.forEach(
      function (doc) {

        const data =
          doc.data() || {};


        users.push({

          uid:
            doc.id,

          name:
            data.name ||
            data.fullName ||
            "Unnamed User",

          email:
            data.email ||
            "—",

          batch:
            data.batch ||
            "—",

          role:
            data.role ||
            "member",

          createdAt:
            data.createdAt ||
            null

        });

      }
    );


    /* =====================================================
       SORT USERS
    ===================================================== */

    users.sort(
      function (a, b) {

        const nameA =
          String(a.name)
            .toLowerCase();

        const nameB =
          String(b.name)
            .toLowerCase();

        return nameA.localeCompare(
          nameB
        );

      }
    );


    /* =====================================================
       CLEAR TABLE
    ===================================================== */

    body.innerHTML = "";


    /* =====================================================
       RENDER USERS
    ===================================================== */

    users.forEach(
      function (user) {

        const row =
          document.createElement("tr");


        /* -------------------------------------------------
           NAME
        ------------------------------------------------- */

        const nameCell =
          document.createElement("td");

        nameCell.textContent =
          user.name;


        /* -------------------------------------------------
           EMAIL
        ------------------------------------------------- */

        const emailCell =
          document.createElement("td");

        emailCell.textContent =
          user.email;


        /* -------------------------------------------------
           BATCH
        ------------------------------------------------- */

        const batchCell =
          document.createElement("td");

        batchCell.textContent =
          user.batch;


        /* -------------------------------------------------
           ROLE
        ------------------------------------------------- */

        const roleCell =
          document.createElement("td");


        const roleSelect =
          document.createElement("select");

        roleSelect.className =
          "cess-role-select";


        roleSelect.innerHTML = `

          <option
            value="member"
            ${
              user.role === "member"
                ? "selected"
                : ""
            }
          >
            Member
          </option>

          <option
            value="leadership"
            ${
              user.role === "leadership"
                ? "selected"
                : ""
            }
          >
            Leadership
          </option>

          <option
            value="admin"
            ${
              user.role === "admin"
                ? "selected"
                : ""
            }
          >
            Admin
          </option>

        `;


        /*
         * Prevent changing the currently logged-in
         * admin's own role.
         */

        if (
          user.uid ===
          currentUser.uid
        ) {

          roleSelect.disabled =
            true;

          roleSelect.title =
            "You cannot change your own admin role.";

        }


        roleCell.appendChild(
          roleSelect
        );


        /* -------------------------------------------------
           ACTION
        ------------------------------------------------- */

        const actionCell =
          document.createElement("td");


        const saveButton =
          document.createElement("button");


        saveButton.type =
          "button";

        saveButton.textContent =
          "Save";

        saveButton.className =
          "cess-save-role-btn";


        /*
         * Current user cannot modify own role.
         */

        if (
          user.uid ===
          currentUser.uid
        ) {

          saveButton.disabled =
            true;

        }


        /* =================================================
           ROLE CHANGE
        ================================================= */

        roleSelect.addEventListener(
          "change",
          function () {

            saveButton.disabled =
              false;

          }
        );


        /* =================================================
           SAVE ROLE
        ================================================= */

        saveButton.addEventListener(
          "click",
          async function () {

            const newRole =
              roleSelect.value;


            /* ---------------------------------------------
               VALID ROLE
            --------------------------------------------- */

            const validRoles = [
              "member",
              "leadership",
              "admin"
            ];


            if (
              !validRoles.includes(
                newRole
              )
            ) {

              alert(
                "Invalid role selected."
              );

              return;

            }


            /* ---------------------------------------------
               PREVENT SELF CHANGE
            --------------------------------------------- */

            if (
              user.uid ===
              currentUser.uid
            ) {

              alert(
                "You cannot change your own role."
              );

              return;

            }


            /* ---------------------------------------------
               CONFIRM
            --------------------------------------------- */

            const confirmed =
              window.confirm(
                `Change ${user.name}'s role to ${newRole}?`
              );


            if (!confirmed) {

              return;

            }


            /* ---------------------------------------------
               DISABLE
            --------------------------------------------- */

            saveButton.disabled =
              true;

            roleSelect.disabled =
              true;

            saveButton.textContent =
              "Saving...";


            /* ---------------------------------------------
               UPDATE FIRESTORE
            --------------------------------------------- */

            try {

              await db
                .collection(
                  CESS_CONFIG.collections.USERS
                )
                .doc(
                  user.uid
                )
                .update({

                  role:
                    newRole

                });


              /* -------------------------------------------
                 SUCCESS
              ------------------------------------------- */

              user.role =
                newRole;


              saveButton.textContent =
                "Saved ✓";


              console.log(
                "CESS ADMIN: Role updated:",
                user.uid,
                newRole
              );


              setTimeout(
                function () {

                  saveButton.textContent =
                    "Save";

                  roleSelect.disabled =
                    false;

                  saveButton.disabled =
                    true;

                },
                1200
              );


            } catch (error) {

              console.error(
                "CESS ADMIN: Role update error:",
                error
              );


              /* -----------------------------------------
                 ERROR
              ----------------------------------------- */

              roleSelect.disabled =
                false;

              saveButton.disabled =
                false;

              saveButton.textContent =
                "Save";


              if (
                error &&
                error.code ===
                  "permission-denied"
              ) {

                alert(
                  "Permission denied. Only an admin can change roles."
                );

              } else {

                alert(
                  error.message ||
                  "Unable to update user role."
                );

              }

            }

          }
        );


        actionCell.appendChild(
          saveButton
        );


        /* -------------------------------------------------
           ADD CELLS
        ------------------------------------------------- */

        row.appendChild(
          nameCell
        );

        row.appendChild(
          emailCell
        );

        row.appendChild(
          batchCell
        );

        row.appendChild(
          roleCell
        );

        row.appendChild(
          actionCell
        );


        body.appendChild(
          row
        );

      }
    );


    /* =====================================================
       UPDATE MESSAGE
    ===================================================== */

    if (usersMessage) {

      usersMessage.textContent =
        `${users.length} registered user${
          users.length === 1
            ? ""
            : "s"
        }.`;

    }


    console.log(
      "CESS ADMIN: Users table rendered successfully."
    );


  } catch (error) {

    console.error(
      "CESS ADMIN: Failed to load users:",
      error
    );


    let message =
      "Unable to load registered users.";


    if (
      error &&
      error.code ===
        "permission-denied"
    ) {

      message =
        "Permission denied. Your account cannot read users.";

    }


    body.innerHTML = `
      <tr>
        <td
          colspan="5"
          style="text-align:center;padding:25px;"
        >
          ${message}
        </td>
      </tr>
    `;

  }

}

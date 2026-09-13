/* =========================================================
   ADD NEW ACTIVITY — ADMIN
   ========================================================= */

function openNewActivityForm() {

  "use strict";


  /* =======================================================
     1. PREVENT DUPLICATE MODALS
  ======================================================= */

  const existingModal =
    document.getElementById("cess-activity-modal");

  if (existingModal) {
    existingModal.remove();
  }


  /* =======================================================
     2. CREATE MODAL
  ======================================================= */

  const modal =
    document.createElement("div");

  modal.id =
    "cess-activity-modal";


  modal.innerHTML = `

    <div
      class="cess-modal-overlay"
      id="cess-activity-overlay"
    >

      <div
        class="cess-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cess-activity-title-heading"
      >

        <!-- HEADER -->

        <div class="cess-modal-header">

          <h2 id="cess-activity-title-heading">
            Add New Activity
          </h2>

          <button
            type="button"
            id="close-activity-modal"
            class="cess-modal-close"
            aria-label="Close"
          >
            ×
          </button>

        </div>


        <!-- FORM -->

        <form
          id="cess-activity-form"
          novalidate
        >


          <!-- TITLE -->

          <div class="cess-form-group">

            <label for="activity-title">
              Activity Title
            </label>

            <input
              type="text"
              id="activity-title"
              name="title"
              placeholder="Enter activity title"
              maxlength="200"
              autocomplete="off"
              required
            >

          </div>


          <!-- DESCRIPTION -->

          <div class="cess-form-group">

            <label for="activity-description">
              Description
            </label>

            <textarea
              id="activity-description"
              name="description"
              rows="5"
              maxlength="5000"
              placeholder="Enter activity description"
              required
            ></textarea>

          </div>


          <!-- DATE -->

          <div class="cess-form-group">

            <label for="activity-date">
              Activity Date
            </label>

            <input
              type="date"
              id="activity-date"
              name="date"
              required
            >

          </div>


          <!-- IMAGE -->

          <div class="cess-form-group">

            <label for="activity-image">
              Image URL
              <span>(Optional)</span>
            </label>

            <input
              type="url"
              id="activity-image"
              name="image"
              placeholder="https://..."
              autocomplete="off"
            >

          </div>


          <!-- PUBLISHED -->

          <div
            class="cess-form-group cess-checkbox-group"
          >

            <label>

              <input
                type="checkbox"
                id="activity-published"
                checked
              >

              <span>
                Publish this activity immediately
              </span>

            </label>

          </div>


          <!-- ERROR -->

          <div
            id="activity-form-error"
            class="cess-form-error"
            role="alert"
            aria-live="polite"
          ></div>


          <!-- SUCCESS -->

          <div
            id="activity-form-success"
            class="cess-form-success"
            role="status"
            aria-live="polite"
          ></div>


          <!-- ACTIONS -->

          <div class="cess-modal-actions">

            <button
              type="button"
              id="cancel-activity-btn"
              class="cess-cancel-btn"
            >
              Cancel
            </button>

            <button
              type="submit"
              id="save-activity-btn"
              class="cess-save-btn"
            >
              Add Activity
            </button>

          </div>


        </form>

      </div>

    </div>

  `;


  document.body.appendChild(modal);


  /* =======================================================
     3. GET ELEMENTS
  ======================================================= */

  const overlay =
    document.getElementById(
      "cess-activity-overlay"
    );

  const form =
    document.getElementById(
      "cess-activity-form"
    );

  const closeButton =
    document.getElementById(
      "close-activity-modal"
    );

  const cancelButton =
    document.getElementById(
      "cancel-activity-btn"
    );

  const saveButton =
    document.getElementById(
      "save-activity-btn"
    );

  const errorElement =
    document.getElementById(
      "activity-form-error"
    );

  const successElement =
    document.getElementById(
      "activity-form-success"
    );

  const titleInput =
    document.getElementById(
      "activity-title"
    );

  const descriptionInput =
    document.getElementById(
      "activity-description"
    );

  const dateInput =
    document.getElementById(
      "activity-date"
    );

  const imageInput =
    document.getElementById(
      "activity-image"
    );

  const publishedInput =
    document.getElementById(
      "activity-published"
    );


  /* =======================================================
     4. SAFETY CHECK
  ======================================================= */

  if (
    !overlay ||
    !form ||
    !closeButton ||
    !cancelButton ||
    !saveButton ||
    !errorElement ||
    !successElement ||
    !titleInput ||
    !descriptionInput ||
    !dateInput ||
    !imageInput ||
    !publishedInput
  ) {

    console.error(
      "CESS: Activity modal elements are missing."
    );

    if (modal) {
      modal.remove();
    }

    return;

  }


  /* =======================================================
     5. HELPER — SHOW ERROR
  ======================================================= */

  function showError(message) {

    successElement.textContent = "";
    successElement.classList.remove("visible");

    errorElement.textContent =
      message || "Something went wrong.";

    errorElement.classList.add("visible");

  }


  /* =======================================================
     6. HELPER — SHOW SUCCESS
  ======================================================= */

  function showSuccess(message) {

    errorElement.textContent = "";
    errorElement.classList.remove("visible");

    successElement.textContent =
      message || "Activity added successfully.";

    successElement.classList.add("visible");

  }


  /* =======================================================
     7. HELPER — CLEAR MESSAGES
  ======================================================= */

  function clearMessages() {

    errorElement.textContent = "";
    errorElement.classList.remove("visible");

    successElement.textContent = "";
    successElement.classList.remove("visible");

  }


  /* =======================================================
     8. CLOSE MODAL
  ======================================================= */

  let modalClosed = false;

  function closeModal() {

    if (modalClosed) {
      return;
    }

    modalClosed = true;

    const currentModal =
      document.getElementById(
        "cess-activity-modal"
      );

    if (currentModal) {
      currentModal.remove();
    }

  }


  /* =======================================================
     9. CLOSE EVENTS
  ======================================================= */

  closeButton.addEventListener(
    "click",
    function () {

      if (!saveButton.disabled) {
        closeModal();
      }

    }
  );


  cancelButton.addEventListener(
    "click",
    function () {

      if (!saveButton.disabled) {
        closeModal();
      }

    }
  );


  overlay.addEventListener(
    "click",
    function (event) {

      if (
        event.target === overlay &&
        !saveButton.disabled
      ) {

        closeModal();

      }

    }
  );


  /* =======================================================
     10. ESC KEY
  ======================================================= */

  function handleEscape(event) {

    if (
      event.key === "Escape" &&
      !saveButton.disabled
    ) {

      closeModal();

      document.removeEventListener(
        "keydown",
        handleEscape
      );

    }

  }


  document.addEventListener(
    "keydown",
    handleEscape
  );


  /* =======================================================
     11. SUBMIT
  ======================================================= */

  form.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      /* -----------------------------------------------
         CLEAR OLD MESSAGES
      ----------------------------------------------- */

      clearMessages();


      /* -----------------------------------------------
         PREVENT DOUBLE SUBMISSION
      ----------------------------------------------- */

      if (saveButton.disabled) {
        return;
      }


      /* -----------------------------------------------
         CHECK FIREBASE
      ----------------------------------------------- */

      if (
        typeof firebase === "undefined" ||
        typeof auth === "undefined" ||
        typeof db === "undefined"
      ) {

        showError(
          "Firebase is not initialized correctly."
        );

        return;

      }


      /* -----------------------------------------------
         READ VALUES
      ----------------------------------------------- */

      const title =
        titleInput.value.trim();

      const description =
        descriptionInput.value.trim();

      const date =
        dateInput.value;

      const image =
        imageInput.value.trim();

      const published =
        publishedInput.checked;


      /* -----------------------------------------------
         VALIDATE TITLE
      ----------------------------------------------- */

      if (!title) {

        showError(
          "Please enter the activity title."
        );

        titleInput.focus();

        return;

      }


      /* -----------------------------------------------
         VALIDATE DESCRIPTION
      ----------------------------------------------- */

      if (!description) {

        showError(
          "Please enter the activity description."
        );

        descriptionInput.focus();

        return;

      }


      /* -----------------------------------------------
         VALIDATE DATE
      ----------------------------------------------- */

      if (!date) {

        showError(
          "Please select the activity date."
        );

        dateInput.focus();

        return;

      }


      /* -----------------------------------------------
         VALIDATE IMAGE URL
      ----------------------------------------------- */

      if (image) {

        try {

          const imageURL =
            new URL(image);

          if (
            imageURL.protocol !== "http:" &&
            imageURL.protocol !== "https:"
          ) {

            showError(
              "Please enter a valid image URL."
            );

            imageInput.focus();

            return;

          }

        } catch (urlError) {

          showError(
            "Please enter a valid image URL."
          );

          imageInput.focus();

          return;

        }

      }


      /* -----------------------------------------------
         CHECK CURRENT USER
      ----------------------------------------------- */

      const currentUser =
        auth.currentUser;


      if (!currentUser) {

        showError(
          "Your session has expired. Please log in again."
        );

        return;

      }


      /* -----------------------------------------------
         CHECK CESS CONFIG
      ----------------------------------------------- */

      if (
        typeof CESS_CONFIG === "undefined" ||
        !CESS_CONFIG.collections ||
        !CESS_CONFIG.collections.ACTIVITIES
      ) {

        showError(
          "CESS configuration is missing."
        );

        console.error(
          "CESS_CONFIG.collections.ACTIVITIES is missing."
        );

        return;

      }


      /* -----------------------------------------------
         LOCK FORM
      ----------------------------------------------- */

      saveButton.disabled = true;

      cancelButton.disabled = true;

      closeButton.disabled = true;

      saveButton.textContent =
        "Adding...";


      /* =================================================
         CREATE ACTIVITY DATA
      ================================================= */

      const activityData = {

        title: title,

        description: description,

        date: date,

        published: published,

        createdAt:
          firebase.firestore.FieldValue
            .serverTimestamp(),

        updatedAt:
          firebase.firestore.FieldValue
            .serverTimestamp(),

        createdBy:
          currentUser.uid

      };


      /* -----------------------------------------------
         OPTIONAL IMAGE
      ----------------------------------------------- */

      if (image) {

        activityData.image =
          image;

      }


      /* =================================================
         SAVE TO FIRESTORE
      ================================================= */

      try {

        const docRef =
          await db
            .collection(
              CESS_CONFIG.collections.ACTIVITIES
            )
            .add(
              activityData
            );


        console.log(
          "CESS — ACTIVITY CREATED:",
          docRef.id
        );


        /* ---------------------------------------------
           SHOW SUCCESS
        --------------------------------------------- */

        showSuccess(
          "Activity added successfully."
        );


        saveButton.textContent =
          "Added";


        /* ---------------------------------------------
           REFRESH ACTIVITIES TABLE
        --------------------------------------------- */

        if (
          typeof loadAdminActivitiesTable ===
          "function"
        ) {

          try {

            await loadAdminActivitiesTable();

          } catch (tableError) {

            /*
             * IMPORTANT:
             *
             * The activity was already successfully
             * saved. A table-refresh error must NOT
             * make the user think the activity failed.
             */

            console.error(
              "CESS — ACTIVITIES TABLE REFRESH ERROR:",
              tableError
            );

          }

        }


        /* ---------------------------------------------
           CLOSE AFTER SUCCESS
        --------------------------------------------- */

        setTimeout(
          function () {

            document.removeEventListener(
              "keydown",
              handleEscape
            );

            closeModal();

          },
          900
        );


      } catch (error) {

        console.error(
          "CESS — ADD ACTIVITY ERROR:",
          error
        );


        /* ---------------------------------------------
           FIREBASE ERROR MESSAGES
        --------------------------------------------- */

        let message =
          "Unable to add activity.";


        if (
          error &&
          error.code ===
            "permission-denied"
        ) {

          message =
            "You do not have permission to add activities.";

        } else if (
          error &&
          error.code ===
            "unauthenticated"
        ) {

          message =
            "Your session has expired. Please log in again.";

        } else if (
          error &&
          error.code ===
            "failed-precondition"
        ) {

          message =
            "Firestore is not ready. Please try again.";

        } else if (
          error &&
          error.code ===
            "unavailable"
        ) {

          message =
            "Firebase is temporarily unavailable. Check your internet connection.";

        } else if (
          error &&
          error.message
        ) {

          message =
            error.message;

        }


        showError(
          message
        );


        /* ---------------------------------------------
           UNLOCK FORM
        --------------------------------------------- */

        saveButton.disabled = false;

        cancelButton.disabled = false;

        closeButton.disabled = false;

        saveButton.textContent =
          "Add Activity";

      }

    }
  );


  /* =======================================================
     12. FOCUS TITLE
  ======================================================= */

  setTimeout(
    function () {

      if (
        document.body.contains(
          titleInput
        )
      ) {

        titleInput.focus();

      }

    },
    50
  );

}

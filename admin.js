/* =========================================================
   ADD NEW ACTIVITY — ADMIN
   ========================================================= */

function openNewActivityForm() {

  // منع فتح أكثر من نافذة في نفس الوقت
  const existingModal =
    document.getElementById("cess-activity-modal");

  if (existingModal) {
    existingModal.remove();
  }

  /* -------------------------------------------------------
     Create Modal
  ------------------------------------------------------- */

  const modal =
    document.createElement("div");

  modal.id =
    "cess-activity-modal";

  modal.innerHTML = `
    <div
      class="cess-modal-overlay"
      id="cess-activity-overlay"
    >

      <div class="cess-modal">

        <div class="cess-modal-header">

          <h2>
            Add New Activity
          </h2>

          <button
            type="button"
            id="close-activity-modal"
            class="cess-modal-close"
          >
            ×
          </button>

        </div>


        <form id="cess-activity-form">

          <!-- Title -->

          <div class="cess-form-group">

            <label for="activity-title">
              Activity Title
            </label>

            <input
              type="text"
              id="activity-title"
              name="title"
              placeholder="Enter activity title"
              required
            >

          </div>


          <!-- Description -->

          <div class="cess-form-group">

            <label for="activity-description">
              Description
            </label>

            <textarea
              id="activity-description"
              name="description"
              rows="5"
              placeholder="Enter activity description"
              required
            ></textarea>

          </div>


          <!-- Date -->

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


          <!-- Image URL -->

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
            >

          </div>


          <!-- Published -->

          <div class="cess-form-group cess-checkbox-group">

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


          <!-- Error -->

          <div
            id="activity-form-error"
            class="cess-form-error"
          ></div>


          <!-- Success -->

          <div
            id="activity-form-success"
            class="cess-form-success"
          ></div>


          <!-- Buttons -->

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


  /* -------------------------------------------------------
     Elements
  ------------------------------------------------------- */

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


  /* -------------------------------------------------------
     Close Modal
  ------------------------------------------------------- */

  function closeModal() {
    modal.remove();
  }


  closeButton.addEventListener(
    "click",
    closeModal
  );

  cancelButton.addEventListener(
    "click",
    closeModal
  );


  overlay.addEventListener(
    "click",
    (event) => {

      if (
        event.target === overlay
      ) {
        closeModal();
      }

    }
  );


  /* -------------------------------------------------------
     Submit Activity
  ------------------------------------------------------- */

  form.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();


      errorElement.textContent = "";
      errorElement.classList.remove(
        "visible"
      );

      successElement.textContent = "";
      successElement.classList.remove(
        "visible"
      );


      /* -----------------------------------------------
         Read Values
      ------------------------------------------------ */

      const title =
        document
          .getElementById(
            "activity-title"
          )
          .value
          .trim();


      const description =
        document
          .getElementById(
            "activity-description"
          )
          .value
          .trim();


      const date =
        document
          .getElementById(
            "activity-date"
          )
          .value;


      const image =
        document
          .getElementById(
            "activity-image"
          )
          .value
          .trim();


      const published =
        document
          .getElementById(
            "activity-published"
          )
          .checked;


      /* -----------------------------------------------
         Validation
      ------------------------------------------------ */

      if (!title) {

        errorElement.textContent =
          "Please enter the activity title.";

        errorElement.classList.add(
          "visible"
        );

        return;
      }


      if (!description) {

        errorElement.textContent =
          "Please enter the activity description.";

        errorElement.classList.add(
          "visible"
        );

        return;
      }


      if (!date) {

        errorElement.textContent =
          "Please select the activity date.";

        errorElement.classList.add(
          "visible"
        );

        return;
      }


      /* -----------------------------------------------
         Check Authentication
      ------------------------------------------------ */

      const currentUser =
        auth.currentUser;

      if (!currentUser) {

        errorElement.textContent =
          "Your session has expired. Please log in again.";

        errorElement.classList.add(
          "visible"
        );

        return;
      }


      /* -----------------------------------------------
         Save
      ------------------------------------------------ */

      try {

        saveButton.disabled = true;

        saveButton.textContent =
          "Adding...";


        /*
         * Create activity document.
         *
         * Firestore automatically generates
         * the document ID.
         */

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


        /*
         * Image is optional.
         * We only save it when the admin
         * actually entered a URL.
         */

        if (image) {
          activityData.image = image;
        }


        const docRef =
          await db
            .collection(
              CESS_CONFIG.collections.ACTIVITIES
            )
            .add(activityData);


        console.log(
          "ACTIVITY CREATED:",
          docRef.id
        );


        /* -------------------------------------------
           Success
        ------------------------------------------- */

        successElement.textContent =
          "Activity added successfully.";

        successElement.classList.add(
          "visible"
        );


        saveButton.textContent =
          "Added";


        /*
         * Refresh Activities table
         * immediately.
         */

        await loadAdminActivitiesTable();


        /*
         * Close modal after short delay
         */

        setTimeout(() => {

          closeModal();

        }, 700);


      } catch (err) {

        console.error(
          "ADD ACTIVITY ERROR:",
          err
        );


        errorElement.textContent =
          `${err.code || "Error"} — ${
            err.message ||
            "Unable to add activity."
          }`;

        errorElement.classList.add(
          "visible"
        );


        saveButton.disabled = false;

        saveButton.textContent =
          "Add Activity";

      }

    }
  );


  /* -------------------------------------------------------
     Focus title
  ------------------------------------------------------- */

  setTimeout(() => {

    const titleInput =
      document.getElementById(
        "activity-title"
      );

    if (titleInput) {
      titleInput.focus();
    }

  }, 50);

}

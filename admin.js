async function openNewActivityForm() {
  // Prevent duplicate modal
  const oldModal = document.getElementById("cess-activity-modal");

  if (oldModal) {
    oldModal.remove();
  }

  // Make sure Firebase authentication is ready
  const currentUser = auth.currentUser;

  if (!currentUser) {
    alert("Your session has expired. Please log in again.");
    window.location.href = "login.html";
    return;
  }

  // --------------------------------------------------
  // 1. Load and verify the current user's profile
  // --------------------------------------------------

  let profile;

  try {
    const userDoc = await db
      .collection(CESS_CONFIG.collections.USERS)
      .doc(currentUser.uid)
      .get();

    if (!userDoc.exists) {
      alert("Your user profile was not found.");
      return;
    }

    profile = {
      uid: currentUser.uid,
      ...userDoc.data()
    };

  } catch (error) {
    console.error("Error loading admin profile:", error);

    alert(
      "Unable to verify your account.\n\n" +
      error.message
    );

    return;
  }

  // Only leadership/admin can create activities
  if (
    profile.role !== CESS_CONFIG.roles.ADMIN &&
    profile.role !== CESS_CONFIG.roles.LEADERSHIP
  ) {
    alert("You do not have permission to add activities.");
    return;
  }

  // --------------------------------------------------
  // 2. Add modal CSS once
  // --------------------------------------------------

  if (!document.getElementById("cess-activity-modal-style")) {

    const style = document.createElement("style");

    style.id = "cess-activity-modal-style";

    style.textContent = `
      #cess-activity-modal {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(4px);
      }

      #cess-activity-modal .cess-activity-box {
        width: min(600px, 100%);
        max-height: 90vh;
        overflow-y: auto;
        background: #ffffff;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        font-family: inherit;
      }

      #cess-activity-modal h2 {
        margin: 0 0 6px;
        font-size: 24px;
        color: #111827;
      }

      #cess-activity-modal .cess-activity-subtitle {
        margin: 0 0 22px;
        color: #6b7280;
        font-size: 14px;
      }

      #cess-activity-modal .cess-field {
        margin-bottom: 17px;
      }

      #cess-activity-modal label {
        display: block;
        margin-bottom: 7px;
        font-weight: 600;
        font-size: 14px;
        color: #374151;
      }

      #cess-activity-modal input,
      #cess-activity-modal textarea {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #d1d5db;
        border-radius: 9px;
        padding: 11px 12px;
        font: inherit;
        background: #fff;
        color: #111827;
        outline: none;
      }

      #cess-activity-modal input:focus,
      #cess-activity-modal textarea:focus {
        border-color: #0B2D5B;
        box-shadow: 0 0 0 3px rgba(11,45,91,0.10);
      }

      #cess-activity-modal textarea {
        min-height: 120px;
        resize: vertical;
      }

      #cess-activity-modal .cess-checkbox-row {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 5px;
      }

      #cess-activity-modal .cess-checkbox-row input {
        width: auto;
      }

      #cess-activity-modal .cess-checkbox-row label {
        margin: 0;
        cursor: pointer;
      }

      #cess-activity-modal .cess-error {
        display: none;
        margin-bottom: 16px;
        padding: 11px 13px;
        border-radius: 8px;
        background: #fee2e2;
        color: #991b1b;
        font-size: 14px;
      }

      #cess-activity-modal .cess-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 24px;
      }

      #cess-activity-modal button {
        border: none;
        border-radius: 9px;
        padding: 11px 18px;
        font: inherit;
        font-weight: 600;
        cursor: pointer;
      }

      #cess-activity-modal .cess-cancel-btn {
        background: #e5e7eb;
        color: #374151;
      }

      #cess-activity-modal .cess-submit-btn {
        background: #0B2D5B;
        color: #ffffff;
      }

      #cess-activity-modal .cess-submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      @media (max-width: 600px) {
        #cess-activity-modal {
          padding: 12px;
        }

        #cess-activity-modal .cess-activity-box {
          padding: 20px;
          border-radius: 13px;
        }

        #cess-activity-modal .cess-actions {
          flex-direction: column-reverse;
        }

        #cess-activity-modal button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // --------------------------------------------------
  // 3. Create modal
  // --------------------------------------------------

  const modal = document.createElement("div");

  modal.id = "cess-activity-modal";

  modal.innerHTML = `
    <div
      class="cess-activity-box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cess-activity-title"
    >

      <h2 id="cess-activity-title">
        Add Activity
      </h2>

      <p class="cess-activity-subtitle">
        Create a new activity for the Civil Engineering Student Society.
      </p>

      <div
        id="cess-activity-error"
        class="cess-error"
      ></div>

      <form id="cess-activity-form">

        <div class="cess-field">
          <label for="cess-activity-title-input">
            Activity Title
          </label>

          <input
            id="cess-activity-title-input"
            type="text"
            placeholder="Enter activity title"
            required
            maxlength="200"
          >
        </div>

        <div class="cess-field">
          <label for="cess-activity-description">
            Description
          </label>

          <textarea
            id="cess-activity-description"
            placeholder="Describe the activity..."
            required
            maxlength="5000"
          ></textarea>
        </div>

        <div class="cess-field">
          <label for="cess-activity-date">
            Date
          </label>

          <input
            id="cess-activity-date"
            type="date"
            required
          >
        </div>

        <div class="cess-field">
          <label for="cess-activity-image">
            Image URL
            <span style="font-weight:400;color:#6b7280;">
              (optional)
            </span>
          </label>

          <input
            id="cess-activity-image"
            type="url"
            placeholder="https://example.com/image.jpg"
          >
        </div>

        <div class="cess-field">

          <div class="cess-checkbox-row">

            <input
              id="cess-activity-published"
              type="checkbox"
              checked
            >

            <label for="cess-activity-published">
              Publish this activity immediately
            </label>

          </div>

        </div>

        <div class="cess-actions">

          <button
            type="button"
            class="cess-cancel-btn"
            id="cess-activity-cancel"
          >
            Cancel
          </button>

          <button
            type="submit"
            class="cess-submit-btn"
            id="cess-activity-submit"
          >
            Add Activity
          </button>

        </div>

      </form>

    </div>
  `;

  document.body.appendChild(modal);

  // --------------------------------------------------
  // 4. Set today's date automatically
  // --------------------------------------------------

  const dateInput = document.getElementById(
    "cess-activity-date"
  );

  const today = new Date();

  const yyyy = today.getFullYear();

  const mm = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const dd = String(
    today.getDate()
  ).padStart(2, "0");

  dateInput.value = `${yyyy}-${mm}-${dd}`;

  // Focus title
  document
    .getElementById("cess-activity-title-input")
    .focus();

  // --------------------------------------------------
  // 5. Close modal helper
  // --------------------------------------------------

  function closeModal() {
    const activeModal = document.getElementById(
      "cess-activity-modal"
    );

    if (activeModal) {
      activeModal.remove();
    }
  }

  // Cancel button
  document
    .getElementById("cess-activity-cancel")
    .addEventListener("click", closeModal);

  // Click outside modal
  modal.addEventListener("click", (event) => {

    if (event.target === modal) {
      closeModal();
    }

  });

  // Escape key
  function handleEscape(event) {

    if (event.key === "Escape") {
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

  // --------------------------------------------------
  // 6. Submit activity
  // --------------------------------------------------

  document
    .getElementById("cess-activity-form")
    .addEventListener("submit", async (event) => {

      event.preventDefault();

      const submitButton =
        document.getElementById(
          "cess-activity-submit"
        );

      const errorBox =
        document.getElementById(
          "cess-activity-error"
        );

      const title =
        document
          .getElementById(
            "cess-activity-title-input"
          )
          .value
          .trim();

      const description =
        document
          .getElementById(
            "cess-activity-description"
          )
          .value
          .trim();

      const date =
        document
          .getElementById(
            "cess-activity-date"
          )
          .value;

      const image =
        document
          .getElementById(
            "cess-activity-image"
          )
          .value
          .trim();

      const published =
        document
          .getElementById(
            "cess-activity-published"
          )
          .checked;

      // ----------------------------------------------
      // Validation
      // ----------------------------------------------

      errorBox.style.display = "none";
      errorBox.textContent = "";

      if (!title) {
        errorBox.textContent =
          "Please enter the activity title.";

        errorBox.style.display = "block";
        return;
      }

      if (!description) {
        errorBox.textContent =
          "Please enter the activity description.";

        errorBox.style.display = "block";
        return;
      }

      if (!date) {
        errorBox.textContent =
          "Please select the activity date.";

        errorBox.style.display = "block";
        return;
      }

      if (image) {

        try {
          new URL(image);
        } catch (error) {

          errorBox.textContent =
            "Please enter a valid image URL.";

          errorBox.style.display = "block";

          return;
        }

      }

      // ----------------------------------------------
      // Prevent double submission
      // ----------------------------------------------

      submitButton.disabled = true;
      submitButton.textContent = "Adding...";

      try {

        // Make sure the session still exists
        const activeUser = auth.currentUser;

        if (!activeUser) {
          throw new Error(
            "Your login session has expired."
          );
        }

        // --------------------------------------------
        // Data saved to Firestore
        // --------------------------------------------

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

          createdBy: activeUser.uid
        };

        // Only save image when provided
        if (image) {
          activityData.image = image;
        }

        // --------------------------------------------
        // Add document
        // --------------------------------------------

        const activityRef =
          await db
            .collection(
              CESS_CONFIG.collections.ACTIVITIES
            )
            .add(activityData);

        console.log(
          "CESS activity created:",
          activityRef.id
        );

        // --------------------------------------------
        // Close modal
        // --------------------------------------------

        closeModal();

        // --------------------------------------------
        // Refresh admin activities table
        // --------------------------------------------

        if (
          typeof loadAdminActivitiesTable ===
          "function"
        ) {
          await loadAdminActivitiesTable();
        }

        // --------------------------------------------
        // Success message
        // --------------------------------------------

        alert(
          "Activity added successfully."
        );

      } catch (error) {

        console.error(
          "Error adding CESS activity:",
          error
        );

        submitButton.disabled = false;
        submitButton.textContent = "Add Activity";

        let message =
          "Unable to add the activity.";

        if (
          error &&
          error.code ===
          "permission-denied"
        ) {

          message =
            "Permission denied. Make sure your account has the admin or leadership role.";

        } else if (
          error &&
          error.code ===
          "unavailable"
        ) {

          message =
            "Firebase is currently unavailable. Check your internet connection and try again.";

        } else if (
          error &&
          error.message
        ) {

          message =
            error.message;
        }

        errorBox.textContent = message;

        errorBox.style.display = "block";
      }

    });
}

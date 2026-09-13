/* =========================================================
   CESS — ADMIN DASHBOARD
   =========================================================
   This file controls the Admin Dashboard only.

   It does NOT modify:
   - auth.js
   - firebase-config.js
   - Firestore Rules
   - login system
   - registration system
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       GLOBAL STATE
       ===================================================== */

    let currentAdmin = null;


    /* =====================================================
       SMALL HELPERS
       ===================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function escapeHTML(value) {
        const div = document.createElement("div");
        div.textContent = value == null ? "" : String(value);
        return div.innerHTML;
    }


    function setStatus(id, message, type) {

        const element = $(id);

        if (!element) return;

        element.textContent = message;

        element.dataset.status = type || "";
    }


    function showLoading(tbodyId, columns) {

        const tbody = $(tbodyId);

        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="${columns}"
                    style="text-align:center;padding:25px;">
                    جاري التحميل...
                </td>
            </tr>
        `;
    }


    function showEmpty(tbodyId, columns, message) {

        const tbody = $(tbodyId);

        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="${columns}"
                    style="text-align:center;padding:25px;">
                    ${escapeHTML(message)}
                </td>
            </tr>
        `;
    }


    function showError(tbodyId, columns, error) {

        const tbody = $(tbodyId);

        if (!tbody) return;

        const message =
            error && error.message
                ? error.message
                : "حدث خطأ غير معروف.";

        tbody.innerHTML = `
            <tr>
                <td colspan="${columns}"
                    style="
                        text-align:center;
                        padding:25px;
                        color:#b00020;
                    ">
                    تعذر تحميل البيانات.
                    <br>
                    <small>
                        ${escapeHTML(message)}
                    </small>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       CHECK FIREBASE
       ===================================================== */

    function checkFirebase() {

        if (typeof firebase === "undefined") {
            throw new Error("Firebase غير محمل.");
        }

        if (typeof auth === "undefined") {
            throw new Error("Firebase Authentication غير مهيأ.");
        }

        if (typeof db === "undefined") {
            throw new Error("Firestore غير مهيأ.");
        }
    }


    /* =====================================================
       GET CURRENT ADMIN PROFILE
       ===================================================== */

    async function getAdminProfile() {

        checkFirebase();

        const user = auth.currentUser;

        if (!user) {
            throw new Error("لا يوجد مستخدم مسجل الدخول.");
        }

        const profileSnapshot = await db
            .collection("users")
            .doc(user.uid)
            .get();

        if (!profileSnapshot.exists) {
            throw new Error(
                "لم يتم العثور على ملف المستخدم في Firestore."
            );
        }

        const profile = profileSnapshot.data() || {};

        if (profile.role !== "admin") {
            throw new Error(
                "هذا الحساب لا يملك صلاحيات Admin."
            );
        }

        currentAdmin = {
            uid: user.uid,
            email: user.email || "",
            ...profile
        };

        return currentAdmin;
    }


    /* =====================================================
       USERS
       ===================================================== */

    async function loadAdminUsersTable() {

        const tbody = $("admin-users-table-body");

        if (!tbody) {
            console.warn(
                "CESS: admin-users-table-body غير موجود."
            );
            return;
        }

        showLoading(
            "admin-users-table-body",
            5
        );

        setStatus(
            "users-status",
            "جاري تحميل المستخدمين...",
            "loading"
        );

        try {

            await getAdminProfile();

            /*
             * Read the complete users collection.
             * This intentionally does not use orderBy(),
             * so documents without a particular field
             * will not disappear from the result.
             */

            const snapshot = await db
                .collection("users")
                .get();

            if (snapshot.empty) {

                showEmpty(
                    "admin-users-table-body",
                    5,
                    "لا يوجد مستخدمون مسجلون حتى الآن."
                );

                setStatus(
                    "users-status",
                    "لا يوجد مستخدمون.",
                    "empty"
                );

                return;
            }


            const users = [];

            snapshot.forEach(function (doc) {

                const data = doc.data() || {};

                users.push({

                    uid: doc.id,

                    name:
                        data.name ||
                        data.fullName ||
                        data.displayName ||
                        "بدون اسم",

                    email:
                        data.email ||
                        "بدون بريد",

                    batch:
                        data.batch ||
                        "غير محدد",

                    role:
                        data.role ||
                        "member"
                });
            });


            users.sort(function (a, b) {

                return String(a.name).localeCompare(
                    String(b.name),
                    "ar",
                    {
                        sensitivity: "base"
                    }
                );
            });


            tbody.innerHTML = "";


            users.forEach(function (user) {

                const row = document.createElement("tr");


                /* NAME */

                const nameCell =
                    document.createElement("td");

                nameCell.textContent = user.name;


                /* EMAIL */

                const emailCell =
                    document.createElement("td");

                emailCell.textContent = user.email;


                /* BATCH */

                const batchCell =
                    document.createElement("td");

                batchCell.textContent = user.batch;


                /* ROLE */

                const roleCell =
                    document.createElement("td");

                const roleSelect =
                    document.createElement("select");

                roleSelect.className =
                    "cess-role-select";


                const roleOptions = [

                    {
                        value: "member",
                        label: "Member"
                    },

                    {
                        value: "leadership",
                        label: "Leadership"
                    },

                    {
                        value: "admin",
                        label: "Admin"
                    }

                ];


                roleOptions.forEach(function (role) {

                    const option =
                        document.createElement("option");

                    option.value = role.value;

                    option.textContent = role.label;

                    if (user.role === role.value) {
                        option.selected = true;
                    }

                    roleSelect.appendChild(option);
                });


                /*
                 * Protect currently logged-in Admin
                 */

                const isCurrentAdmin =
                    user.uid === currentAdmin.uid;


                if (isCurrentAdmin) {

                    roleSelect.disabled = true;

                    roleSelect.title =
                        "لا يمكن تغيير دور حسابك الحالي.";
                }


                roleCell.appendChild(roleSelect);


                /* ACTION */

                const actionCell =
                    document.createElement("td");


                const saveButton =
                    document.createElement("button");


                saveButton.type = "button";

                saveButton.className =
                    "cess-save-role-btn";

                saveButton.textContent =
                    "حفظ";


                if (isCurrentAdmin) {

                    saveButton.disabled = true;

                    saveButton.title =
                        "لا يمكن تعديل حساب Admin الحالي.";

                }


                saveButton.addEventListener(
                    "click",
                    async function () {

                        if (isCurrentAdmin) {

                            alert(
                                "لا يمكن تغيير دور حساب Admin الحالي."
                            );

                            return;
                        }


                        const newRole =
                            roleSelect.value;


                        if (
                            newRole !== "member" &&
                            newRole !== "leadership" &&
                            newRole !== "admin"
                        ) {

                            alert(
                                "الدور المحدد غير صحيح."
                            );

                            return;
                        }


                        const originalText =
                            saveButton.textContent;


                        try {

                            saveButton.disabled =
                                true;

                            saveButton.textContent =
                                "جاري الحفظ...";


                            await db
                                .collection("users")
                                .doc(user.uid)
                                .update({
                                    role: newRole
                                });


                            user.role = newRole;


                            saveButton.textContent =
                                "تم الحفظ";


                            setTimeout(function () {

                                saveButton.textContent =
                                    originalText;

                                saveButton.disabled =
                                    false;

                            }, 1200);


                        } catch (error) {

                            console.error(
                                "CESS: Role update error:",
                                error
                            );


                            alert(
                                "تعذر تحديث الدور.\n\n" +
                                (
                                    error.message ||
                                    "حدث خطأ غير معروف."
                                )
                            );


                            saveButton.textContent =
                                originalText;

                            saveButton.disabled =
                                false;
                        }

                    }
                );


                actionCell.appendChild(
                    saveButton
                );


                row.appendChild(nameCell);
                row.appendChild(emailCell);
                row.appendChild(batchCell);
                row.appendChild(roleCell);
                row.appendChild(actionCell);


                tbody.appendChild(row);

            });


            setStatus(
                "users-status",
                `تم تحميل ${users.length} مستخدم.`,
                "success"
            );


            console.log(
                "CESS: Users loaded:",
                users.length
            );


        } catch (error) {

            console.error(
                "CESS: loadAdminUsersTable error:",
                error
            );


            showError(
                "admin-users-table-body",
                5,
                error
            );


            setStatus(
                "users-status",
                "حدث خطأ أثناء تحميل المستخدمين.",
                "error"
            );
        }
    }


    /* =====================================================
       ACTIVITIES
       ===================================================== */

    async function loadAdminActivitiesTable() {

        const tbody =
            $("admin-activities-table-body");

        if (!tbody) return;

        showLoading(
            "admin-activities-table-body",
            5
        );


        try {

            await getAdminProfile();


            const snapshot = await db
                .collection("activities")
                .get();


            if (snapshot.empty) {

                showEmpty(
                    "admin-activities-table-body",
                    5,
                    "لا توجد أنشطة حتى الآن."
                );

                return;
            }


            const activities = [];


            snapshot.forEach(function (doc) {

                const data = doc.data() || {};

                activities.push({

                    id: doc.id,

                    title:
                        data.title ||
                        data.name ||
                        "بدون عنوان",

                    date:
                        data.date ||
                        "",

                    description:
                        data.description ||
                        "",

                    published:
                        data.published === true
                });

            });


            activities.sort(function (a, b) {

                return String(b.date)
                    .localeCompare(
                        String(a.date)
                    );
            });


            tbody.innerHTML = "";


            activities.forEach(function (activity) {

                const row =
                    document.createElement("tr");


                const title =
                    document.createElement("td");

                title.textContent =
                    activity.title;


                const date =
                    document.createElement("td");

                date.textContent =
                    activity.date ||
                    "غير محدد";


                const description =
                    document.createElement("td");

                description.textContent =
                    activity.description;


                const published =
                    document.createElement("td");

                published.textContent =
                    activity.published
                        ? "Published"
                        : "Draft";


                const action =
                    document.createElement("td");


                const deleteButton =
                    document.createElement("button");


                deleteButton.type =
                    "button";

                deleteButton.textContent =
                    "حذف";


                deleteButton.addEventListener(
                    "click",
                    async function () {

                        const confirmed =
                            confirm(
                                "هل أنت متأكد من حذف هذا النشاط؟"
                            );


                        if (!confirmed) return;


                        try {

                            deleteButton.disabled =
                                true;

                            deleteButton.textContent =
                                "جاري الحذف...";


                            await db
                                .collection("activities")
                                .doc(activity.id)
                                .delete();


                            row.remove();


                        } catch (error) {

                            console.error(
                                error
                            );

                            alert(
                                "تعذر حذف النشاط."
                            );

                            deleteButton.disabled =
                                false;

                            deleteButton.textContent =
                                "حذف";
                        }

                    }
                );


                action.appendChild(
                    deleteButton
                );


                row.appendChild(title);
                row.appendChild(date);
                row.appendChild(description);
                row.appendChild(published);
                row.appendChild(action);


                tbody.appendChild(row);

            });


        } catch (error) {

            console.error(
                "CESS: Activities error:",
                error
            );


            showError(
                "admin-activities-table-body",
                5,
                error
            );
        }
    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function logoutAdmin() {

        try {

            if (
                typeof auth === "undefined"
            ) {
                window.location.replace(
                    "index.html"
                );

                return;
            }


            await auth.signOut();


            window.location.replace(
                "index.html"
            );


        } catch (error) {

            console.error(
                "CESS: Logout error:",
                error
            );


            alert(
                "تعذر تسجيل الخروج. حاول مرة أخرى."
            );
        }
    }


    /* =====================================================
       NEW ACTIVITY FORM
       ===================================================== */

    function openNewActivityForm() {

        const form =
            $("new-activity-form");

        if (!form) {

            console.warn(
                "CESS: new-activity-form غير موجود."
            );

            return;
        }


        form.style.display =
            "block";


        form.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }


    function closeNewActivityForm() {

        const form =
            $("new-activity-form");

        if (!form) return;

        form.style.display =
            "none";
    }


    async function createActivity() {

        const title =
            $("activity-title");

        const date =
            $("activity-date");

        const description =
            $("activity-description");

        const published =
            $("activity-published");


        if (!title) return;


        const titleValue =
            title.value.trim();


        if (!titleValue) {

            alert(
                "يرجى كتابة عنوان النشاط."
            );

            return;
        }


        try {

            await getAdminProfile();


            const activity = {

                title:
                    titleValue,

                date:
                    date
                        ? date.value
                        : "",

                description:
                    description
                        ? description.value.trim()
                        : "",

                published:
                    published
                        ? published.checked
                        : true,

                createdAt:
                    firebase.firestore.FieldValue.serverTimestamp(),

                createdBy:
                    currentAdmin.uid
            };


            await db
                .collection("activities")
                .add(activity);


            alert(
                "تم إنشاء النشاط بنجاح."
            );


            if (title) {
                title.value = "";
            }

            if (date) {
                date.value = "";
            }

            if (description) {
                description.value = "";
            }


            if (published) {
                published.checked = true;
            }


            closeNewActivityForm();


            await loadAdminActivitiesTable();


        } catch (error) {

            console.error(
                "CESS: Create activity error:",
                error
            );


            alert(
                "تعذر إنشاء النشاط.\n\n" +
                (
                    error.message ||
                    "حدث خطأ غير معروف."
                )
            );
        }
    }


    /* =====================================================
       ADMIN PAGE INITIALIZATION
       ===================================================== */

    async function initializeAdminDashboard() {

        try {

            checkFirebase();


            /*
             * Wait for Firebase Auth state.
             * This prevents the dashboard from trying to
             * read Firestore before authentication is ready.
             */

            auth.onAuthStateChanged(
                async function (user) {

                    if (!user) {

                        window.location.replace(
                            "login.html"
                        );

                        return;
                    }


                    try {

                        await getAdminProfile();


                        console.log(
                            "CESS Admin authenticated:",
                            currentAdmin
                        );


                        /*
                         * Load dashboard data.
                         */

                        await Promise.allSettled([

                            loadAdminUsersTable(),

                            loadAdminActivitiesTable()

                        ]);


                    } catch (error) {

                        console.error(
                            "CESS Admin authorization error:",
                            error
                        );


                        /*
                         * Do NOT redirect endlessly.
                         * Simply return to login.
                         */

                        await auth.signOut();


                        window.location.replace(
                            "login.html"
                        );
                    }

                }
            );


        } catch (error) {

            console.error(
                "CESS Admin initialization error:",
                error
            );

            alert(
                "تعذر تشغيل لوحة الإدارة.\n\n" +
                (
                    error.message ||
                    "حدث خطأ غير معروف."
                )
            );
        }
    }


    /* =====================================================
       BUTTON EVENTS
       ===================================================== */

    function setupAdminButtons() {

        const logoutButton =
            $("logout-btn");

        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    logoutAdmin();

                }
            );
        }


        const newActivityButton =
            $("new-activity-btn");

        if (newActivityButton) {

            newActivityButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openNewActivityForm();

                }
            );
        }


        const closeActivityButton =
            $("close-activity-btn");

        if (closeActivityButton) {

            closeActivityButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeNewActivityForm();

                }
            );
        }


        const createActivityButton =
            $("create-activity-btn");

        if (createActivityButton) {

            createActivityButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    createActivity();

                }
            );
        }

    }


    /* =====================================================
       PUBLIC API
       ===================================================== */

    window.CESS_ADMIN = {

        loadUsers:
            loadAdminUsersTable,

        loadActivities:
            loadAdminActivitiesTable,

        logout:
            logoutAdmin,

        openNewActivityForm:
            openNewActivityForm,

        closeNewActivityForm:
            closeNewActivityForm,

        createActivity:
            createActivity

    };


    /*
     * Backward compatibility.
     * If old admin.html code calls these functions directly,
     * they continue to work.
     */

    window.loadAdminUsersTable =
        loadAdminUsersTable;

    window.loadAdminActivitiesTable =
        loadAdminActivitiesTable;

    window.logoutAdmin =
        logoutAdmin;

    window.openNewActivityForm =
        openNewActivityForm;

    window.closeNewActivityForm =
        closeNewActivityForm;

    window.createActivity =
        createActivity;


    /* =====================================================
       START
       ===================================================== */

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            setupAdminButtons();

            initializeAdminDashboard();

        }
    );


})();

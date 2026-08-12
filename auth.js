// auth.js — shared session gate for every admin.chiaweiedu.com page.
// login.html does NOT include this (it is the sign-in surface).
//
// Adapted from backstage's auth.js (dottyhomes.com); the role RPC is chiawei's
// `current_app_role()`, not `current_user_role()`.
//
// PER-PAGE ROLES (2026-08-12). The site now admits three staff tiers — owner
// (負責人), admin (主任) and teacher (老師) — and each page declares who may
// enter, in an inline <script> BEFORE this file:
//
//   window.PAGE_ROLES = ["owner", "admin", "teacher"];
//
// Undeclared → ["owner", "admin"]: a new page is manager-and-up until it says
// otherwise (fail-closed). The declaration is intersected with the STAFF set,
// so no page can admit a parent/student no matter what it declares. kiosk.html
// is the one page NOT gated by this file — it runs a dedicated non-staff
// account and carries its own minimal is_kiosk() gate.
//
// Contract:
//   - The including page must load sb.js (which defines window.sb) BEFORE this.
//   - The including page must call `window.authGate()` and wait for it before
//     rendering anything. The gate:
//       1. Hides <body> until a verdict is reached.
//       2. Redirects to login.html if there is no session.
//       3. Calls current_app_role().
//       4. If the role is NULL (authenticated but no profile), not in the
//          page's PAGE_ROLES, or the profile is 停用 (active = false) — signs
//          out, flags the reason, redirects to login.html.
//       5. On success — stashes the role on window.CURRENT_USER_ROLE and
//          unhides <body>.
//   - `window.signOut()` is exposed for the 登出 button. It lands on a bare
//     login.html (no ?next=) — signing out is a deliberate exit, not a bounce.
//
// HONEST LIMIT: this is a client-side gate on a static file. It stops casual
// and accidental access, and it is the same protection backstage has. It does
// NOT make the page's markup secret — the file is served publicly by GitHub
// Pages and its source is in a public repo, and it does NOT protect DATA:
// anyone can open devtools and call Supabase with the anon key directly.
//
// So: never put a SECRET in the markup behind this gate (no keys beyond the
// anon key, no bank content baked into the page). Data is a different question
// — it is protected, but by RLS in the database, never by this gate. That cuts
// both ways: a teacher blocked from a page here may still be able to READ some
// of its data via PostgREST where 0009's read tiers allow it (their own
// classes' roster, for instance) — by design. What the DB actually denies them
// (tuition tables, leads, other teachers' journals, everyone else's punches)
// is denied by RLS, not by this file.
//
// ⚠️ roster.html (added 2026-07-28) DOES show minors' PII — 姓名, 學號, 家長電話.
// That was an explicit owner decision, and it rests entirely on the database
// enforcing the boundary: owner/admin-only write RLS on classes/students/
// enrollments/class_teachers, teacher reads scoped by teaches_class(), column
// grants that exclude students.profile_id and profiles.role, no DELETE grant on
// the PII tables, and a security-definer audit trigger on every write
// (migrations 20260728000002 + 20260611000009, pgTAP 10 + 03). If you add
// another page here that touches student data, verify the same holds for it —
// do not lean on this gate.

(function () {
  // Hide <body> as early as possible; visibility (not display) preserves layout
  // so there is no reflow when we unhide.
  var style = document.createElement("style");
  style.textContent = "body { visibility: hidden; }";
  style.setAttribute("data-auth-gate", "1");
  document.head.appendChild(style);

  var STAFF = ["owner", "admin", "teacher"];

  function allowedRoles() {
    var declared = Array.isArray(window.PAGE_ROLES) ? window.PAGE_ROLES : ["owner", "admin"];
    var allowed = declared.filter(function (r) { return STAFF.indexOf(r) !== -1; });
    return allowed.length ? allowed : ["owner", "admin"];
  }

  function unhideBody() {
    var s = document.querySelector('style[data-auth-gate="1"]');
    if (s) s.remove();
  }

  // Come back to whichever tool was asked for once they have signed in.
  function loginUrl() {
    var here = location.pathname.split("/").pop();
    return here && here !== "login.html" && here !== "index.html"
      ? "login.html?next=" + encodeURIComponent(here)
      : "login.html";
  }

  function reject(sb, reason) {
    sessionStorage.setItem("auth_rejection", reason);
    return Promise.resolve(sb && sb.auth.signOut())
      .catch(function () {})
      .then(function () {
        location.replace(loginUrl());
      });
  }

  async function authGate() {
    var sb = window.sb;
    if (!sb) {
      console.error("[auth] window.sb not defined before authGate() — load sb.js first");
      unhideBody();
      return;
    }

    var session;
    try {
      var resp = await sb.auth.getSession();
      session = resp && resp.data && resp.data.session;
    } catch (e) {
      console.error("[auth] getSession threw", e);
      location.replace(loginUrl());
      return;
    }
    if (!session) {
      location.replace(loginUrl());
      return;
    }

    // current_app_role() is `returns app_role` (an enum) — supabase-js v2 gives
    // it back as a plain string in .data, or null when there is no profile row.
    var rpc;
    try {
      rpc = await sb.rpc("current_app_role");
    } catch (e) {
      console.error("[auth] current_app_role rpc threw", e);
      await reject(sb, "not_invited");
      return;
    }
    if (rpc.error) {
      console.error("[auth] current_app_role rpc error", rpc.error);
      await reject(sb, "not_invited");
      return;
    }

    var role = typeof rpc.data === "string" ? rpc.data : null;
    if (!role) {
      await reject(sb, "not_invited"); // signed in, but no profile row
      return;
    }
    if (allowedRoles().indexOf(role) === -1) {
      await reject(sb, "forbidden"); // wrong tier for THIS page (or parent/student)
      return;
    }

    // 停用 check. Matters now that teachers sign in here: deactivating a
    // departed teacher must bounce them at the door, not at next sign-in.
    // (The DATA boundary for a 停用'd account with a still-live JWT is
    // is_active_staff() inside the write policies — this check is UX.)
    var prof = await sb.from("profiles").select("active")
      .eq("id", session.user.id).single();
    if (prof.error) {
      console.error("[auth] active check failed", prof.error);
      await reject(sb, "not_invited");
      return;
    }
    if (prof.data && prof.data.active === false) {
      await reject(sb, "deactivated");
      return;
    }

    window.CURRENT_USER_ROLE = role;
    window.CURRENT_USER = session.user;
    unhideBody();
  }

  async function signOut() {
    var sb = window.sb;
    if (sb) {
      try {
        await sb.auth.signOut();
      } catch (e) {
        /* ignore — bounce regardless */
      }
    }
    location.replace("login.html");
  }

  window.authGate = authGate;
  window.signOut = signOut;
})();

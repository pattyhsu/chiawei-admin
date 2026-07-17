// auth.js — shared session gate for every admin.chiaweiedu.com page that
// requires a signed-in owner/admin. login.html does NOT include this (it is the
// sign-in surface).
//
// Adapted from backstage's auth.js (dottyhomes.com), with two differences:
//   - the role RPC is chiawei's `current_app_role()`, not `current_user_role()`
//   - it requires owner/admin, mirroring requireOwnerAdmin() in the Next.js app.
//     A receipt is a financial record, so teachers are bounced here too.
//
// Contract:
//   - The including page must load sb.js (which defines window.sb) BEFORE this.
//   - The including page must call `window.authGate()` and wait for it before
//     rendering anything. The gate:
//       1. Hides <body> until a verdict is reached.
//       2. Redirects to login.html if there is no session.
//       3. Calls current_app_role().
//       4. If the role is NULL (authenticated but no profile) or is not
//          owner/admin — signs out, flags the reason, redirects to login.html.
//       5. On success — stashes the role on window.CURRENT_USER_ROLE and
//          unhides <body>.
//   - `window.signOut()` is exposed for the 登出 button. It lands on a bare
//     login.html (no ?next=) — signing out is a deliberate exit, not a bounce.
//
// HONEST LIMIT: this is a client-side gate on a static file. It stops casual
// and accidental access, and it is the same protection backstage has. It does
// NOT make the page's markup secret — the file is served publicly by GitHub
// Pages and its source is in a public repo. That is acceptable here precisely
// because the page is a blank form: no student PII, no bank content, no keys
// beyond the anon key. Never put anything secret behind this gate.

(function () {
  // Hide <body> as early as possible; visibility (not display) preserves layout
  // so there is no reflow when we unhide.
  var style = document.createElement("style");
  style.textContent = "body { visibility: hidden; }";
  style.setAttribute("data-auth-gate", "1");
  document.head.appendChild(style);

  var ALLOWED = ["owner", "admin"];

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
    if (ALLOWED.indexOf(role) === -1) {
      await reject(sb, "forbidden"); // a teacher — receipts are owner/admin only
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

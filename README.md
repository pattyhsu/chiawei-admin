# chiawei-admin

Static admin surface for 家偉補習班 — **https://admin.chiaweiedu.com**

Deployed by **GitHub Pages** from `main` / root. Mirrors how `pattyhsu/backstage`
serves backstage.dottyhomes.com.

Today it hosts one tool: the **收據產生器** (receipt generator).

## Contents

| File | What it is |
|---|---|
| `receipt.html` | **GENERATED — do not edit by hand.** The 收據產生器, auth-gated. |
| `login.html` | Sign-in surface. Deliberately does not load `auth.js`. |
| `auth.js` | Session gate: requires a Supabase session **and** an owner/admin role. |
| `sb.js` | Supabase browser client (anon key — public by design, RLS behind it). |
| `index.html` | Redirect to `receipt.html`. |
| `CNAME` | `admin.chiaweiedu.com` — tells Pages the custom domain. |
| `.nojekyll` | Skip Jekyll processing; serve files as-is. |

## Updating the receipt

`receipt.html` is **generated from the `chiawei` repo**, which holds the single
source of truth for the receipt's content and styling:

- content → `web/src/shared/receipt_template.json` (school details, 退費說明, 常用項目)
- styling → `web/src/app/globals.css` (the 收據產生器 section)

To change anything on the receipt, edit it **there**, then regenerate here:

```bash
cd ~/chiawei
python3 scripts/build_receipt.py --gated --out ~/chiawei-admin/receipt.html
cd ~/chiawei-admin && git commit -am "rebuild receipt" && git push   # Pages redeploys
```

> ⚠️ **Drift warning.** The same template also generates the *offline* build
> (`chiawei/receipt.html`, no login, double-click to use). `chiawei` has a test
> guarding that one, but it cannot see this repo — so after editing the template
> you must rebuild **both**, or the two receipts disagree. The 退費說明 is
> regulatory text on a financial document; disagreement matters.

## What the gate does and does not do

`auth.js` hides the page, checks for a Supabase session, calls `current_app_role()`,
and bounces anyone who is not `owner`/`admin` — mirroring `requireOwnerAdmin()` in
chiawei's Next.js app, because a receipt is a financial record.

**It is a client-side gate on a static file.** It stops casual and accidental
access, which is the same protection backstage has. It does **not** make the
markup secret: the file is served publicly and this repo is public. That is fine
here precisely because the page is a **blank form** — no student PII, no question
bank content, and no key beyond the anon key.

**Never put anything secret in this repo.** `service_role` is server-only and
lives in `chiawei/.env`.

## DNS

`admin.chiaweiedu.com` is a **CNAME → `pattyhsu.github.io`**, set in **GoDaddy**
DNS (chiaweiedu.com's nameservers are GoDaddy's `ns55/ns56.domaincontrol.com`).

Unlike dottyhomes.com, this domain is **not** on Cloudflare. Dotty is on
Cloudflare only because `photos.dottyhomes.com` runs through a Cloudflare Tunnel,
which requires Cloudflare to host the DNS; the other Dotty subdomains just ride
along. Nothing here needs that, and chiaweiedu.com carries the school's Google
Workspace MX records — so moving nameservers is a real outage risk for zero gain.

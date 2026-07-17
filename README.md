# chiawei-admin

Static admin surface for 家偉補習班 — **https://admin.chiaweiedu.com**

Deployed by **GitHub Pages** from `main` / root. Mirrors how `pattyhsu/backstage`
serves backstage.dottyhomes.com.

Two tools: the **收據產生器** and the **內容行銷台**.

> **Why these live here and the 出題台 does not.** This site is the surface Patty
> can reach from anywhere — a phone, another computer. The teacher web app
> (出題台/批改台) deliberately stays on `localhost` at her Mac, because that is
> what stops a teacher taking the 30-year question bank home. Receipts and
> marketing are not the bank; the bank never leaves.

## Contents

| File | What it is |
|---|---|
| `index.html` | **Launcher** — the menu of tools. Gated. |
| `receipt.html` | **GENERATED — do not edit by hand.** The 收據產生器, auth-gated. |
| `content.html` | The 內容行銷台 — **hand-written**, edit it here. Gated. |
| `login.html` | Sign-in surface. Deliberately does not load `auth.js`. Honours `?next=`. |
| `auth.js` | Session gate: requires a Supabase session **and** an owner/admin role. |
| `sb.js` | Supabase browser client (anon key — public by design, RLS behind it). |
| `CNAME` | `admin.chiaweiedu.com` — tells Pages the custom domain. |
| `.nojekyll` | Skip Jekyll processing; serve files as-is. |

Note the two provenances: `receipt.html` is **generated** from the `chiawei` repo
and copied in — never hand-edit it. `content.html` is **hand-written and lives
here** — never regenerate over it.

## 內容行銷台 (`content.html`)

Three tabs: **佇列** (review/approve/download the day's drafts, mark them posted),
**文案庫** (approve pre-authored 學習技巧／會考情報 copy — only 已審核 rows ever
ship), **新貼文** (compose 榜單／活動／見證／躍升卡 by hand, or upload a 圖片貼文).

### Where illustrations come from

There is **no image generation in this page, on purpose.** A key can't live in a
public repo, and a subscription (ChatGPT / Claude) is not API access — automating
those UIs headlessly breaks their terms. So images are made in a real design tool
and uploaded:

**Claude → Canva → export PNG → 上傳** is the recommended route. Canva's AI
Connector is an official Claude integration (click-to-connect on claude.ai, no API
key): it applies the Brand Kit, renders 中文 correctly — which raw image models do
not — and exports a PNG. ChatGPT's image generation works too, and a plain photo is
just a file.

An `image_post` is created with `image_keys` already set, so it never enters the
render path: no card template, no Chromium, no 2–3 min wait.

**It has no server.** Reads and writes go straight to Supabase under the anon key,
governed by RLS. Card PNGs live in the private `content-cards` Storage bucket and
are fetched with the signed-in user's own session.

**Rendering happens elsewhere.** A 1080×1080 card needs headless Chromium, which a
static page cannot run. When a card is created with no image, a Postgres trigger
asks GitHub Actions (`chiawei-platform` → `content-daily.yml`) to render it —
about 2–3 minutes, then it appears in the queue. 「重新產圖」just clears the image
and re-fires that path. The daily 06:30 run sweeps anything that was missed, so a
failed trigger self-heals rather than losing the post.

### One-time setup: the render token

Until this is done, composed cards still render — just on the next morning's sweep
instead of in 3 minutes.

1. GitHub → Settings → Developer settings → **Fine-grained tokens**.
   Repository access: **only** `pattyhsu/chiawei-platform`.
   Permissions: **Actions = Read and write** (Metadata: read is implied).
   Nothing else — this token must not be able to push code.
2. Store it in the database's Vault (from `~/chiawei`):
   ```bash
   .venv/bin/python scripts/psql.py -c "select vault.create_secret('<TOKEN>', 'gh_render_pat')"
   ```
   Rotate with `vault.update_secret(...)` — see
   `chiawei/supabase/migrations/20260719000002_content_render_trigger.sql`.

The token lives only in Vault. **It must never be committed here** — this repo is
public.

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
chiawei's Next.js app.

**It is a client-side gate on a public static file.** It stops casual and accidental
access and gives a clean redirect; it is **not** a security boundary, and it never
was. Anyone can read the markup of these pages.

**The boundary is RLS**, enforced by Postgres on every request:

- `sb.js` ships the **anon key**, which is designed to be public. It grants nothing
  by itself — `content_items`, `content_bank` and `storage.objects` are all
  owner/admin-only via RLS policies, and `anon` is hard-revoked at the privilege
  level. A signed-out visitor, or a signed-in **teacher**, gets nothing back but an
  empty list or a permission error, whatever they do to the JavaScript.
- Those policies are security-critical code and are covered by pgTAP:
  `chiawei/supabase/tests/06_content_pipeline_rls_test.sql`.
- 個資法: a 榜單/見證/躍升卡 carrying **real** student data is rejected by a DB
  **check constraint** unless it has a 家長書面同意編號 — even `service_role`
  cannot insert one. Sample material must be flagged 示意資料 and renders a badge.

⚠️ **`content.html` renders real data, including students' names.** That is a change
from when this repo held only the receipt — a blank form. It is safe because of RLS,
not because of `auth.js`. So: **never put anything secret in this repo** (the
`service_role` key is server-only and lives in `chiawei/.env`), and never add a page
that ships data in its markup rather than fetching it under the user's own session.

## DNS

`admin.chiaweiedu.com` is a **CNAME → `pattyhsu.github.io`**, set in **GoDaddy**
DNS (chiaweiedu.com's nameservers are GoDaddy's `ns55/ns56.domaincontrol.com`).

Unlike dottyhomes.com, this domain is **not** on Cloudflare. Dotty is on
Cloudflare only because `photos.dottyhomes.com` runs through a Cloudflare Tunnel,
which requires Cloudflare to host the DNS; the other Dotty subdomains just ride
along. Nothing here needs that, and chiaweiedu.com carries the school's Google
Workspace MX records — so moving nameservers is a real outage risk for zero gain.

> Pages checks DNS **when the custom domain is set** and does not retry. If the
> cert ever goes null: remove `CNAME`, push, re-add, push.

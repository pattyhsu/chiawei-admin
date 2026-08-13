# chiawei-admin

Static admin surface for 家偉補習班 — **https://admin.chiaweiedu.com**

Deployed by **GitHub Pages** from `main` / root. Mirrors how `pattyhsu/backstage`
serves backstage.dottyhomes.com.

Thirteen tools, across three staff tiers — **負責人 / 主任 / 老師** (see [Roles](#roles-who-sees-what)).

> **Why these live here and the 出題台 does not.** This site is the surface Patty
> can reach from anywhere — a phone, another computer. The teacher web app
> (出題台/批改台) deliberately stays on `localhost` at her Mac, because that is
> what stops a teacher taking the 30-year question bank home. Receipts and
> marketing are not the bank; the bank never leaves.

## Contents

| File | What it is | Who |
|---|---|---|
| `index.html` | **Launcher** — four groups, each its own column; cards filter by role (`data-roles`) and empty groups hide themselves. | all staff |
| `receipt.html` | **GENERATED — do not edit by hand.** 收據產生器 + 記帳並列印. | 負責人 · 主任 |
| `tuition.html` | 收費台 — 未繳 / 收費紀錄 / 期別與費用. **hand-written**. | 負責人 · 主任 |
| `reports.html` | 收費總覽 — the financial roll-up. **hand-written**. | **負責人 only** |
| `leads.html` | 諮詢名單 (官網 form submissions). **hand-written**. Personal data. | 負責人 · 主任 |
| `content.html` | The 內容行銷台 — **hand-written**, edit it here. | 負責人 · 主任 |
| `offerings.html` | 開課資訊台 — rows with `status='open'` are PUBLIC. **hand-written**. | 負責人 · 主任 |
| `teachers.html` | 老師帳號 — mints credentials via the `teacher-create` fn. **hand-written**. | 負責人 · 主任 |
| `roster.html` | 名冊 (班級 × 學生 × 任教老師). **hand-written**. **Minors' PII.** | 負責人 · 主任 · 老師 (唯讀, own classes) |
| `schedule.html` | 課表 (頭份 weekly timetable, hardcoded per semester). **hand-written**. | all staff |
| `journal.html` | 老師日誌 — one entry per class per day. **hand-written**. | all staff |
| `rollcall.html` | 點名單 — printable roll-call sheet, writes nothing. **hand-written**. | all staff |
| `attendance.html` | 出勤紀錄 — punches + monthly hours. **hand-written**. | all staff (self only; 負責人 sees all + 補登/作廢) |
| `kiosk.html` | 打卡機 — the front-desk tablet. **Does NOT use `auth.js`.** | the kiosk account only |
| `login.html` | Sign-in surface. Deliberately does not load `auth.js`. Honours `?next=`. | — |
| `auth.js` | Session gate: session + role ∈ the page's `window.PAGE_ROLES` + `active`. | — |
| `sb.js` | Supabase browser client (anon key — public by design, RLS behind it). | — |
| `CNAME` | `admin.chiaweiedu.com` — tells Pages the custom domain. | — |
| `.nojekyll` | Skip Jekyll processing; serve files as-is. | — |

Note the two provenances: `receipt.html` is **generated** from the `chiawei` repo
and copied in — never hand-edit it. Everything else is **hand-written and lives
here** — never regenerate over it.

## Roles (who sees what)

Three staff tiers, since 2026-08-12. **A page declares who may enter** in an inline
script *before* `auth.js`:

```html
<script>window.PAGE_ROLES = ["owner", "admin", "teacher"];</script>
<script src="auth.js"></script>
```

Undeclared → `["owner","admin"]` (fail-closed), and the list is intersected with the
staff set, so no page can admit a parent/student however it is declared.

- **負責人 (`owner`)** — everything, including 收費總覽 and everyone's 出勤.
- **主任 (`admin`)** — daily ops incl. recording tuition. **Cannot** open 收費總覽,
  see others' 出勤, or touch the owner's account. Minted from the `chiawei` repo:
  `python scripts/create_manager.py <username> --name 王主任` (or `--promote <username>`).
- **老師 (`teacher`)** — 課表, 名冊 (read-only, own classes), 老師日誌, 點名單, own 出勤.

**The gate is not the boundary — RLS is.** A teacher blocked from a page here may still
read some of its data via PostgREST where the read tiers allow it (their own classes'
roster, by design). What the DB actually denies them — tuition, leads, other teachers'
journals and punches — it denies in policies, proven by pgTAP 19–22 in the `chiawei` repo.

## 打卡機 (`kiosk.html`)

The front-desk tablet, one per 分校. A teacher taps their name, the camera snaps a
photo, and the punch lands with a **server-set** timestamp — the photo is the identity
proof, so there is no PIN. Wrong person? 10-second 撤銷 on the confirmation, or the
owner voids it later and 補登s the right one; punches are never edited or deleted.

Setup, once per tablet: `python scripts/create_kiosk.py toufen` (in the `chiawei`
repo) → sign in at `login.html` with the printed credentials → open `kiosk.html` →
allow the camera. The session persists on the device.

The kiosk account is deliberately **unprivileged** (`role='student'` + a `kiosk_devices`
row): a tablet left in a lobby, or stolen, reads *nothing* — not the roster, not the
bank. Its whole surface is punch-shaped, and it cannot back-date, punch without a
photo, or browse the photo bucket.

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
and bounces anyone whose role is not in that page's `window.PAGE_ROLES` (see
[Roles](#roles-who-sees-what)) — or whose profile has been 停用 (`active = false`,
checked on every page load now that teachers sign in here, so revoking an account
takes effect immediately rather than at next sign-in).

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

⚠️⚠️ **`roster.html` goes further: it is the school's student PII** — 姓名, 學號,
就讀學校, 家長姓名, 家長電話 — on a public URL, with RLS as the entire boundary. That
was an explicit owner decision (2026-07-28), taken with the trade-off stated: a
stolen owner password exposes minors' data from anywhere, rather than requiring
physical access to the school machine. What holds it up, all in
`chiawei/supabase/migrations/20260728000002_roster_admin_surface.sql` and proven by
pgTAP `10_roster_admin_rls_test.sql` (22 asserts):

- owner/admin-only **per-command** policies on `classes` / `students` /
  `enrollments` / `class_teachers`. Per-command, not `for all`, so the teacher /
  parent / student **read** tiers from `20260611000009` are provably untouched —
  `03_roster_assessment_rls_test.sql` staying at 19/19 is that proof.
- **column grants** exclude `students.profile_id` (an auth link — setting it would
  make another user *be* that student) and `profiles.role` (an admin must not mint
  themselves an owner). Neither is writable from a browser *by anyone*, owner included.
- **no DELETE grant** on `classes`/`students`: 停用 is a soft-delete. 個資法, and
  every FK into them is NO ACTION so a hard delete could not work regardless.
- every write lands an audit row via a **security-definer trigger**, not page code.

Verified from a real signed-in **teacher** session in devtools, bypassing `auth.js`
entirely: reads returned 0 rows, `INSERT` raised `42501`, `UPDATE`/`DELETE` affected
0 rows. If you add another page here that touches student data, re-prove the same —
do not lean on the gate.

Since 2026-08-12 teachers are admitted to `roster.html` **read-only** — RLS
(`20260611000009`) already scoped their reads to their own classes and denied their
writes; the page's RO branch just stops offering saves that would silently no-op.

## Money pages (`receipt.html` · `tuition.html` · `reports.html`)

The ledger is **immutable**: one printed receipt = one row, `unique(branch, receipt_no)`,
and the only write anyone can make against an existing payment is a **作廢**. There is
no edit and no delete, for anybody — a mistake is voided (with a reason) and re-issued
under a fresh 收據號碼, exactly like a paper receipt pad. `total` is computed by a DB
trigger from the 項目 lines, and who recorded it comes from the session, so neither can
be forged from a browser.

未繳 = `coalesce(個人優惠, 班費) − allocated un-voided lines`. A 項目 line only counts
against a fee if it came from a **帶入費用** chip (which tags it with the class + 期);
hand-typed lines like 教材費 are free-form and affect nothing. That is deliberate — it
keeps the receipt as flexible as the paper one.

`reports.html` is **negative space for a 主任**: its numbers come from SECURITY DEFINER
functions that check `is_owner()` and raise, so a 主任 calling them from devtools gets
an error, not data. (A 主任 *can* read raw payment rows — they must, to run the 收費台 —
so what is fenced is the roll-up, not the underlying ledger. Stated plainly because it
is the kind of thing that gets misremembered as stronger than it is.)

Migrations `20260812000005/6` in the `chiawei` repo; pgTAP `20_tuition_rls_test.sql`
(24 asserts) and `21_tuition_reports_test.sql` (8).

## 老師帳號 (`teachers.html`) — the one page with a server hop

Moved here from the 出題台 app on 2026-08-05; `/app/teachers` and its
`/api/staff/teachers` route were deleted in the same change, so there is one
surface and nothing to drift.

Most of it needs no server at all — 指派班級, 停用/啟用 and renaming are plain
PostgREST writes under grants that already existed
(`grant insert, delete on class_teachers`, `grant update (active, full_name) on
profiles`), audited by a trigger added in `20260805000002_profiles_audit.sql`
(pgTAP `14`). Those writes are actually attributed *better* here than on the
server, which wrote as `service_role` and left a null actor in the audit row.

**Creating an account is the one thing a browser genuinely cannot do**: it needs
GoTrue's `/admin/users` (service_role), and it needs to write `profiles.role`,
which is granted to nobody. So exactly that operation goes through a Supabase
**Edge Function**, `teacher-create` (source in
`chiawei/supabase/functions/teacher-create/`) — the only `service_role` holder
reachable from the internet in this whole system. It is deliberately tiny:

- verifies the caller's JWT, then **re-reads `profiles.role` + `active`** (a JWT
  stays valid after 停用; the profile read is what makes revocation bite)
- `role` is **hard-coded to `'teacher'`** — it cannot mint an owner whatever the
  caller sends
- rate-limited to 10 creations/hour per owner, counted off `audit_log`
- the generated password is returned once and never stored, logged or audited

Do not add verbs to that function. Every one widens the blast radius of a bug in
its authorization check; anything that RLS can do should stay in the page.

## DNS

`admin.chiaweiedu.com` is a **CNAME → `pattyhsu.github.io`**, and this page is
served **straight from GitHub Pages on GitHub's own cert** — the record is
deliberately **DNS-only (grey cloud)**, so nothing about the admin tools depends
on the proxy.

**DNS moved to Cloudflare on 2026-08-13** (registrar is Namecheap; nameservers
`chuck`/`jade.ns.cloudflare.com`). This reverses what this file used to say —
the old reasoning was "moving nameservers is a real outage risk for zero gain",
and the gain stopped being zero: **GitHub Pages could not issue a TLS cert for
the apex `chiaweiedu.com` at all** (16h stuck, Certificate Transparency shows
Let's Encrypt issued nothing; known GitHub backend failure), so a parent typing
the bare domain hit a browser security warning. Cloudflare's Universal SSL now
covers apex + www. Full write-up + standing rules: **`chiawei-www/README.md`**.

> Two rules that bit us and are easy to repeat:
> **Never remove/re-add a GitHub custom domain to "nudge" cert provisioning** —
> it resets GitHub's internal timer (the old advice in this file, now retired).
> **Never proxy the MX records** — that is the school's Google Workspace email.

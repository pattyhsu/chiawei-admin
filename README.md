# chiawei-admin

Static admin surface for 家偉補習班 — **https://admin.chiaweiedu.com**

Deployed by **GitHub Pages** from `main` / root. Mirrors how `pattyhsu/backstage`
serves backstage.dottyhomes.com.

Fourteen tools, across three staff tiers — **負責人 / 主任 / 老師** (see [Roles](#roles-who-sees-what)).

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
| `meals.html` | 餐費 — the daily 便當 tally + 預繳 drawdown. Immutable ledger. **hand-written**. | 負責人 · 主任 |
| `reports.html` | 收費總覽 — the financial roll-up. **hand-written**. | **負責人 only** |
| `leads.html` | 諮詢名單 (官網 form submissions). **hand-written**. Personal data. | 負責人 · 主任 |
| `content.html` | The 內容行銷台 — **hand-written**, edit it here. | 負責人 · 主任 |
| `offerings.html` | 開課資訊台 — rows with `status='open'` are PUBLIC. **hand-written**. | 負責人 · 主任 |
| `teachers.html` | 老師帳號 — mints and rotates credentials via the `teacher-create` / `teacher-credentials` fns. **hand-written**. | 負責人 · 主任 |
| `classes.html` | 班級 (班級設定 × 在班學生 × 任教老師). **hand-written**. **Minors' PII.** | 負責人 · 主任 · 老師 (唯讀, own classes) |
| `student.html` | 學生總覽 — one page per student: 學習進度 / 學費 / 餐費 / 聯絡方式, and the only 學生資料 edit form. **hand-written**. **Minors' PII.** | 負責人 · 主任 · 老師 (own students; no 學費/餐費/聯絡方式, no 編輯) |
| `roster.html` | Redirect stub only — 名冊 became 班級 on 2026-08-18. Keeps old bookmarks off a 404; deletable once nobody uses the URL. | — |
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

A **left menu, one entry per category**, because the categories *are* the work —
each owns its own stock and its own rotation day. Three groups:

- **佇列** — review/approve/download the day's drafts, mark them posted. Leads with
  the 一週輪值 strip; each day links to that pillar's stock.
- **文案庫 · 自動輪值** — one entry per pillar, badged with how many 已審核 rows are
  left (red at zero). Clicking one opens just that pillar's stock.
- **新貼文 · 手動** — one entry per composed type; clicking one opens its form
  directly, so there is no 類型 dropdown to get wrong.

Views are addressed by hash (`#queue`, `#bank/<kind>`, `#new/<type>`), so a reload,
a bookmark or the back button all land where you were; an unknown hash falls back
to the queue.

The old three-tab layout hid the thing that matters most: a pillar can sit on a
pile of 待審核 copy and still post **nothing**, because only 已審核 rows ship. Each
pillar's page now says so outright when that's the case.

### The categories, and where each one is made

Two kinds of category, split by *who makes it*:

**文案庫 (evergreen, written ahead, posted automatically).** Five pillars, each
owning one weekday. The morning cron pops the oldest 已審核 row of that day's kind
and turns it into a card. **No stock for that kind = nothing posts that day** — not
an error, just silence, which is why the 佇列 tab leads with a 一週輪值 strip
showing each day's remaining stock.

| 週 | 類別 | `kind` | 對象 |
|---|---|---|---|
| 一 | 學習技巧 | `tip` | 學生 |
| 二 | 會考情報 | `exam_info` | 家長 |
| 三 | 本週一題 | `quiz` | 學生（答案在留言區 — the one pillar that earns replies） |
| 四 | 家長小提醒 | `parent_tip` | 家長 |
| 五 | 這週@家偉 | — | 手動，要照片 |
| 六 | — | — | 休息 |
| 日 | 雞湯 | `pep` | 學生 |

Restock with `/author-content` in Claude Code (the `chiawei` repo), which drafts a
batch into `content_bank` as 待審核.

**新貼文 (dated, event-driven, composed by hand).** 開課資訊 · 公告 · 活動 ·
老師介紹 · 榜單 · 家長見證 · 學生見證 · 躍升卡 · 這週@家偉 · 圖片貼文.

- **開課資訊** pre-fills from `class_offerings` — the same rows `offerings.html`
  edits, so 招生 copy can't drift from what the 官網 and 家長專區 advertise. 報名截止
  gets the heaviest position on the card; it's the line a family can actually miss.
- **公告** (停課／補課／放假／繳費) is the cheapest post to make and the one parents
  go looking for. No student data ever reaches it.
- **老師介紹** is text-only — staff are adults, so no 個資法 gate, but write the
  學經歷 the teacher agreed to publish. Want a face? Use 圖片貼文.
- **這週@家偉** and **圖片貼文** are photo uploads: the image *is* the post, so they
  skip the renderer entirely. Both are behind the 個資法 gate — a photo of the week
  at the school can have identifiable students in it.

The rotation lives in exactly two places and they must agree: `ROTATION` in
`content.html` (what Patty sees) and `PILLARS` in
`chiawei/web/scripts/content/generate-daily.ts` (what actually runs).

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

An `image_post` (and a `weekly`) is created with `image_keys` already set, so it
never enters the render path: no card template, no Chromium, no 2–3 min wait.

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

⚠️⚠️ **`classes.html` / `student.html` go further: they are the school's student PII** — 姓名, 學號,
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

Since 2026-08-12 teachers are admitted to 班級/學生總覽 **read-only** — RLS
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

**Credentials are the one thing a browser genuinely cannot touch**: a password
lives in GoTrue, reachable only through `/admin/users` (service_role), and
`profiles.role` / `profiles.username` are granted to nobody. So exactly those
operations go through two Supabase **Edge Functions** (source in
`chiawei/supabase/functions/`) — the only `service_role` holders reachable from
the internet in this whole system. Both are deliberately tiny, and both:

- verify the caller's JWT, then **re-read `profiles.role` + `active`** (a JWT
  stays valid after 停用; the profile read is what makes revocation bite)
- never read or write `profiles.role` from input — nothing here can promote
  anyone, which is the ceiling the role system rests on
- return the password exactly once and never store, log or audit it — including
  a password the 主任 typed rather than generated
- are rate-limited off `audit_log`, and audit who did what to whom

`teacher-create` — mints an account. `role` is **hard-coded to `'teacher'`**
whatever the caller sends; 10 creations/hour per caller. Since 2026-08-22 the
caller may supply the password (≥6 chars — GoTrue's own floor) instead of one it
generates, so a teacher can be handed something typeable.

`teacher-credentials` — rotates one: `action:"password"` or `action:"username"`
(which renames the GoTrue email too, since the login *is*
`<username>@chiawei.local`). 20 rotations/hour per caller. **An owner row is
never a legal target**, not even the caller's own: a 主任 may rotate a 老師,
only the 負責人 may rotate a 主任, and the 負責人's own password is changed in
the Supabase dashboard. A rename writes `profiles` first (its unique index on
`lower(username)` is the only atomic guard against a race) and rolls that back
if GoTrue then refuses — half-renamed is the one state nothing would report.

Do not add verbs to these functions. Every one widens the blast radius of a bug
in its authorization check; anything that RLS can do should stay in the page.

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

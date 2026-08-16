/* schedule.data.js — 家偉 週課表, THE SINGLE SOURCE OF TRUTH.
 *
 * Read by TWO consumers, which is the entire reason this file exists apart
 * from schedule.html:
 *   1. schedule.html  — the staff 課表 page (分校 view + 老師 view)
 *   2. chiawei-platform/scripts/sync_schedule.py — pushes 頭份 rows into
 *      `class_meetings` so the 家長專區 can show each child their own 課表
 *
 * ⚠️ EDIT THE TIMETABLE HERE, THEN RUN THE SYNC. A parent reading a stale
 * 課表 turns up at the wrong time, so the two must never disagree:
 *     cd ~/chiawei && python3 scripts/sync_schedule.py --apply
 * The sync FAILS LOUDLY on any 頭份 class name it cannot match, rather than
 * skipping it quietly — an unmatched name means a class nobody can see.
 *
 * FORMAT. One block per row; d = weekday 1(一)…6(六). subj drives the chip
 * colour and must be one of 數學/英文/自然/國文 (same vocabulary as the roster).
 * A band's `time` reads "20:05–21:30 · 一/四 19:30–21:00": a base window, then
 * day-scoped overrides — slotTime() below resolves it for a given weekday and
 * is shared by both consumers so there is only ever ONE parser.
 */
// The 總表 is one sheet with a row band per branch (新竹 / 竹南 / 頭份); here each
// branch is its own tab so a 頭份 teacher never reads a 新竹 slot as theirs.
// One block per row; d = weekday 1(一)…6(六). subj drives the chip colour and
// must be one of 數學/英文/自然/國文 (same vocabulary as the classes roster).
// A day whose times differ from the band is spelled out in the band's `time`
// string (e.g. 頭份 六, 新竹 一/四) — that is how the 總表 writes it too, as a
// parenthesised note at the bottom of that day's column.
const BRANCHES = [
{ name: "頭份", notes: [
  "國一二國文為國一、國二合班上課；國三國文為隔週上課。",
], schedule: [
  { label: "週六下午", time: "六 13:00–15:00", cls: [
    { d: 6, name: "國一二國文", t: "唐", subj: "國文" },
  ]},
  { label: "週六傍晚", time: "六 15:30–18:30", cls: [
    { d: 6, name: "國一生物", t: "", subj: "自然" },
  ]},
  { label: "第一節", time: "18:30–19:55 · 六 18:00–19:30", cls: [
    { d: 1, name: "國一數A", t: "旻", subj: "數學" },
    { d: 1, name: "國一數B", t: "國傑", subj: "數學" },
    { d: 1, name: "國二理", t: "盈", subj: "自然" },
    { d: 1, name: "國三理B", t: "子", subj: "自然" },
    { d: 2, name: "國一英A", t: "E", subj: "英文" },
    { d: 2, name: "國二英", t: "A", subj: "英文" },
    { d: 2, name: "國三英文輔導", t: "G", subj: "英文" },
    { d: 3, name: "國三數A", t: "旻", subj: "數學" },
    { d: 3, name: "國三數B", t: "盈", subj: "數學" },
    { d: 4, name: "國一數A", t: "旻", subj: "數學" },
    { d: 4, name: "國一數B", t: "國傑", subj: "數學" },
    { d: 4, name: "國二理", t: "盈", subj: "自然" },
    { d: 4, name: "國三理B", t: "子", subj: "自然" },
    { d: 5, name: "國一英A", t: "E", subj: "英文" },
    { d: 5, name: "國二英", t: "A", subj: "英文" },
    { d: 6, name: "國二數B", t: "國傑", subj: "數學" },
    { d: 6, name: "國三數A", t: "旻", subj: "數學" },
    { d: 6, name: "國三數B", t: "盈", subj: "數學" },
  ]},
  { label: "第二節", time: "20:05–21:30 · 六 19:30–21:00", cls: [
    { d: 1, name: "國三理A", t: "昇", subj: "自然" },
    { d: 2, name: "國一英B", t: "E", subj: "英文" },
    { d: 2, name: "國二英加強", t: "A", subj: "英文" },
    { d: 3, name: "國二數A", t: "旻", subj: "數學" },
    { d: 3, name: "國二數B", t: "國傑", subj: "數學" },
    { d: 3, name: "國三英A", t: "E", subj: "英文" },
    { d: 3, name: "國三英B", t: "G", subj: "英文" },
    { d: 4, name: "國三理A", t: "昇", subj: "自然" },
    { d: 5, name: "國一英B", t: "E", subj: "英文" },
    { d: 5, name: "國二英加強", t: "A", subj: "英文" },
    { d: 5, name: "國三國文（隔週）", t: "唐", subj: "國文" },
    { d: 6, name: "國二數A", t: "旻", subj: "數學" },
    { d: 6, name: "國三英A", t: "E", subj: "英文" },
    { d: 6, name: "國三英B", t: "G", subj: "英文" },
  ]},
  { label: "資優班", time: "19:30–21:30", cls: [
    { d: 1, name: "國一資優數A", t: "旻", subj: "數學" },
    { d: 2, name: "國一資優英", t: "G", subj: "英文" },
    { d: 3, name: "國一資優理", t: "盈", subj: "自然" },
    { d: 4, name: "國一資優數A", t: "旻", subj: "數學" },
    { d: 5, name: "國一資優英", t: "G", subj: "英文" },
  ]},
]},

{ name: "新竹", notes: [
  "暑期 7/8 月上課時間：第一節 下午14:00–15:30、第二節 16:00–17:30。",
], schedule: [
  { label: "第一節", time: "18:30–19:55", cls: [
    { d: 1, name: "國一英", t: "邱", subj: "英文" },
    { d: 1, name: "國三數", t: "昇", subj: "數學" },
    { d: 2, name: "國一數", t: "浩翰", subj: "數學" },
    { d: 3, name: "國二理", t: "鄭", subj: "自然" },
    { d: 4, name: "國一英", t: "邱", subj: "英文" },
    { d: 4, name: "國三數", t: "昇", subj: "數學" },
    { d: 5, name: "國一數", t: "浩翰", subj: "數學" },
    { d: 5, name: "國三理", t: "冠庭", subj: "自然" },
  ]},
  { label: "第二節", time: "20:05–21:30 · 一/四 19:30–21:00", cls: [
    { d: 1, name: "國二英", t: "邱", subj: "英文" },
    { d: 1, name: "國三英", t: "G", subj: "英文" },
    { d: 2, name: "國二數", t: "浩翰", subj: "數學" },
    { d: 3, name: "國二理", t: "鄭", subj: "自然" },
    { d: 4, name: "國二英", t: "邱", subj: "英文" },
    { d: 4, name: "國三英", t: "G", subj: "英文" },
    { d: 5, name: "國二數", t: "浩翰", subj: "數學" },
    { d: 5, name: "國三理", t: "冠庭", subj: "自然" },
  ]},
]},

{ name: "竹南", notes: [
  "竹南校晚間為國中部兩節課。",
], schedule: [
  { label: "週六下午", time: "六 16:10–17:40", cls: [
    { d: 6, name: "國二理", t: "昇", subj: "自然" },
  ]},
  { label: "第一節", time: "18:30–19:55", cls: [
    { d: 1, name: "國一英", t: "E", subj: "英文" },
    { d: 2, name: "國一數", t: "盈", subj: "數學" },
    { d: 2, name: "國二數", t: "國傑", subj: "數學" },
    { d: 2, name: "國三數", t: "金", subj: "數學" },
    { d: 3, name: "國二理", t: "昇", subj: "自然" },
    { d: 3, name: "國三英", t: "E", subj: "英文" },
    { d: 4, name: "國一英", t: "E", subj: "英文" },
    { d: 5, name: "國一數", t: "盈", subj: "數學" },
    { d: 5, name: "國二數", t: "國傑", subj: "數學" },
    { d: 6, name: "國三英", t: "E", subj: "英文" },
  ]},
  { label: "第二節", time: "20:05–21:30", cls: [
    { d: 1, name: "國二英", t: "E", subj: "英文" },
    { d: 2, name: "國三數", t: "金", subj: "數學" },
    { d: 3, name: "國三理", t: "昇", subj: "自然" },
    { d: 4, name: "國二英", t: "E", subj: "英文" },
    { d: 6, name: "國三理", t: "昇", subj: "自然" },
  ]},
]},
];

const DAYS = ["一", "二", "三", "四", "五", "六"];

// A band's `time` reads "20:05–21:30 · 一/四 19:30–21:00": a base window, then
// day-scoped overrides. The branch view prints that string whole; the teacher
// view mixes branches in one row, so it has to resolve it down to ONE window
// for the actual weekday.
function slotTime(time, d) {
  let base = "";
  for (const seg of String(time).split("·")) {
    const m = seg.match(/(\d{1,2}:\d{2})[–-](\d{1,2}:\d{2})/);
    if (!m) continue;
    const days = seg.slice(0, m.index).match(/[一二三四五六]/g);
    if (days) { if (days.includes(DAYS[d - 1])) return m[0]; }
    else base = m[0];
  }
  return base;
}

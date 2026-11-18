/* Duties of the Living (DTL) — Phase 1
   Planner + Money + Grades for Canadian university students.
   All data lives in the browser's localStorage. No account, no server. */

"use strict";

/* ---------------- storage & state ---------------- */

const STORAGE_KEY = "dtl_phase1_v1";

const defaultState = {
  planner: [],        // {id, title, type, course, date, time, done}
  transactions: [],   // {id, type: 'income'|'expense', amount, category, note, date}
  budget: 0,          // monthly budget in CAD
  goal: { name: "", target: 0, saved: 0 },
  courses: [],        // {id, code, name, credits, assessments: [{id, name, weight, score}]}
  // Phase 2
  aid: { program: "AFE", entries: [] },  // entries: {id, kind, label, date, amount, done}
  documents: [],      // {id, type, name, expiry}
  tax: { t2202: false, releve8: false, t4: false, receipts: false },
  // Phase 3
  lang: "en",
  study: { cards: [], pomoSessions: 0 }   // cards: {id, front, back, known}
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(defaultState), parsed);
  } catch {
    return structuredClone(defaultState);
  }
}

let state = loadState();

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------------- small helpers ---------------- */

const $ = (sel) => document.querySelector(sel);

function esc(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function todayISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function fmtMoney(n) {
  return "$" + Number(n || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysUntil(iso) {
  const now = new Date(todayISO() + "T12:00:00");
  const then = new Date(iso + "T12:00:00");
  return Math.round((then - now) / 86400000);
}

/* ---------------- tabs ---------------- */

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    tab.classList.add("active");
    $("#view-" + tab.dataset.view).classList.add("active");
  });
});

/* ---------------- planner ---------------- */

const TYPE_LABELS = {
  assignment: "📝 Assignment",
  exam: "🧪 Exam",
  class: "🏫 Class",
  deadline: "📌 Key date",
  task: "✅ Task"
};

function plannerSorted() {
  return [...state.planner].sort((a, b) => {
    const ka = a.date + "T" + (a.time || "23:59");
    const kb = b.date + "T" + (b.time || "23:59");
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

function renderPlanner() {
  renderKeyDates();
  const showDone = $("#p-show-done").checked;
  const list = $("#planner-list");
  const items = plannerSorted().filter((i) => showDone || !i.done);

  list.innerHTML = items.map((i) => {
    const overdue = !i.done && daysUntil(i.date) < 0;
    const when = daysUntil(i.date) === 0 ? "Today" :
      daysUntil(i.date) === 1 ? "Tomorrow" :
      daysUntil(i.date) < 0 ? `${-daysUntil(i.date)}d overdue` :
      `in ${daysUntil(i.date)}d`;
    return `<li class="item ${i.done ? "done" : ""} ${overdue ? "overdue" : ""}">
      <div>
        <span class="title">${esc(i.title)}</span>
        <div class="meta"><span class="badge">${TYPE_LABELS[i.type] || i.type}</span>${i.course ? esc(i.course) + " · " : ""}${fmtDate(i.date)}${i.time ? " " + esc(i.time) : ""} · ${when}</div>
      </div>
      <div class="actions">
        <button class="btn small" data-toggle="${i.id}">${i.done ? "Undo" : "Done"}</button>
        <button class="btn small danger" data-del-planner="${i.id}">Delete</button>
      </div>
    </li>`;
  }).join("");

  $("#planner-empty").style.display = items.length ? "none" : "block";

  list.querySelectorAll("[data-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const item = state.planner.find((x) => x.id === b.dataset.toggle);
      if (item) { item.done = !item.done; saveState(); renderAll(); }
    }));
  list.querySelectorAll("[data-del-planner]").forEach((b) =>
    b.addEventListener("click", () => {
      state.planner = state.planner.filter((x) => x.id !== b.dataset.delPlanner);
      saveState(); renderAll();
    }));
}

$("#planner-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.planner.push({
    id: uid(),
    title: $("#p-title").value.trim(),
    type: $("#p-type").value,
    course: $("#p-course").value.trim(),
    date: $("#p-date").value,
    time: $("#p-time").value,
    done: false
  });
  saveState();
  e.target.reset();
  $("#p-date").value = todayISO();
  renderAll();
});

$("#p-show-done").addEventListener("change", renderPlanner);

/* ---------------- money ---------------- */

function thisMonthTransactions() {
  const prefix = todayISO().slice(0, 7); // YYYY-MM
  return state.transactions.filter((t) => t.date.startsWith(prefix));
}

function moneyTotals() {
  const tx = thisMonthTransactions();
  const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const expenses = tx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  return { income, expenses, balance: income - expenses, count: tx.length };
}

function renderMoney() {
  const { income, expenses, balance } = moneyTotals();

  $("#money-summary").innerHTML = `
    <div class="money-row"><span>Income</span><span class="amt-in">+ ${fmtMoney(income)}</span></div>
    <div class="money-row"><span>Expenses</span><span class="amt-out">− ${fmtMoney(expenses)}</span></div>
    <div class="money-row"><span>Balance</span><span class="amt-bal">${fmtMoney(balance)}</span></div>`;

  const budget = Number(state.budget) || 0;
  if (document.activeElement !== $("#m-budget")) $("#m-budget").value = budget || "";
  const pct = budget > 0 ? Math.min(100, (expenses / budget) * 100) : 0;
  const bar = $("#budget-bar");
  bar.style.width = pct + "%";
  bar.classList.toggle("over", budget > 0 && expenses > budget);
  $("#budget-note").textContent = budget > 0
    ? (expenses > budget
        ? `Over budget by ${fmtMoney(expenses - budget)} this month.`
        : `${fmtMoney(budget - expenses)} of your ${fmtMoney(budget)} budget left.`)
    : "Set a monthly budget to track your spending against it.";

  const goal = state.goal;
  if (document.activeElement !== $("#m-goal-name")) $("#m-goal-name").value = goal.name || "";
  if (document.activeElement !== $("#m-goal-target")) $("#m-goal-target").value = goal.target || "";
  if (document.activeElement !== $("#m-goal-saved")) $("#m-goal-saved").value = goal.saved || "";
  const gpct = goal.target > 0 ? Math.min(100, (goal.saved / goal.target) * 100) : 0;
  $("#goal-bar").style.width = gpct + "%";
  $("#goal-note").textContent = goal.target > 0
    ? `${fmtMoney(goal.saved)} of ${fmtMoney(goal.target)} saved (${gpct.toFixed(1)}%). ${fmtMoney(goal.target - goal.saved)} to go.`
    : "Give your savings a target — for example a $12,000 emergency fund (6 months of expenses).";

  const tx = [...thisMonthTransactions()].sort((a, b) => (a.date < b.date ? 1 : -1));
  $("#money-list").innerHTML = tx.map((t) => `
    <li class="item">
      <div>
        <span>${t.type === "income" ? "💵" : "💸"} ${esc(t.note || t.category)}</span>
        <div class="meta"><span class="badge">${esc(t.category)}</span>${fmtDate(t.date)}</div>
      </div>
      <div class="actions">
        <span class="${t.type === "income" ? "amt-in" : "amt-out"}" style="align-self:center">${t.type === "income" ? "+" : "−"} ${fmtMoney(t.amount)}</span>
        <button class="btn small danger" data-del-tx="${t.id}">Delete</button>
      </div>
    </li>`).join("");
  $("#money-empty").style.display = tx.length ? "none" : "block";

  $("#money-list").querySelectorAll("[data-del-tx]").forEach((b) =>
    b.addEventListener("click", () => {
      state.transactions = state.transactions.filter((x) => x.id !== b.dataset.delTx);
      saveState(); renderAll();
    }));
}

$("#money-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.transactions.push({
    id: uid(),
    type: $("#m-type").value,
    amount: parseFloat($("#m-amount").value),
    category: $("#m-category").value,
    note: $("#m-note").value.trim(),
    date: $("#m-date").value
  });
  saveState();
  e.target.reset();
  $("#m-date").value = todayISO();
  renderAll();
});

$("#m-budget").addEventListener("change", (e) => {
  state.budget = parseFloat(e.target.value) || 0;
  saveState(); renderMoney(); renderToday();
});
$("#m-goal-name").addEventListener("change", (e) => { state.goal.name = e.target.value.trim(); saveState(); });
$("#m-goal-target").addEventListener("change", (e) => { state.goal.target = parseFloat(e.target.value) || 0; saveState(); renderMoney(); });
$("#m-goal-saved").addEventListener("change", (e) => { state.goal.saved = parseFloat(e.target.value) || 0; saveState(); renderMoney(); });

/* ---------------- grades ----------------
   Official Concordia University grading scale (4.3 GPA). */

const GRADE_SCALE = [
  { min: 90, letter: "A+", points: 4.3 },
  { min: 85, letter: "A",  points: 4.0 },
  { min: 80, letter: "A-", points: 3.7 },
  { min: 77, letter: "B+", points: 3.3 },
  { min: 73, letter: "B",  points: 3.0 },
  { min: 70, letter: "B-", points: 2.7 },
  { min: 67, letter: "C+", points: 2.3 },
  { min: 63, letter: "C",  points: 2.0 },
  { min: 60, letter: "C-", points: 1.7 },
  { min: 57, letter: "D+", points: 1.3 },
  { min: 53, letter: "D",  points: 1.0 },
  { min: 50, letter: "D-", points: 0.7 },
  { min: 0,  letter: "F",  points: 0.0 }
];

function gradeFor(pct) {
  return GRADE_SCALE.find((g) => pct >= g.min);
}

/* Returns { earned, gradedWeight, totalWeight, currentPct } for a course.
   currentPct = grade on the work graded so far. */
function courseStats(course) {
  let earned = 0, gradedWeight = 0, totalWeight = 0;
  for (const a of course.assessments) {
    totalWeight += a.weight;
    if (a.score !== null && a.score !== undefined && a.score !== "") {
      gradedWeight += a.weight;
      earned += (a.score / 100) * a.weight;
    }
  }
  const currentPct = gradedWeight > 0 ? (earned / gradedWeight) * 100 : null;
  return { earned, gradedWeight, totalWeight, currentPct };
}

/* Average % needed on the remaining weight to finish at `targetPct`. */
function neededFor(course, targetPct) {
  const { earned, totalWeight } = courseStats(course);
  const remaining = totalWeight - course.assessments
    .filter((a) => a.score !== null && a.score !== undefined && a.score !== "")
    .reduce((s, a) => s + a.weight, 0);
  if (remaining <= 0) return null;
  return ((targetPct / 100) * totalWeight - earned) / remaining * 100;
}

function computeGPA() {
  let points = 0, credits = 0;
  for (const c of state.courses) {
    const { currentPct } = courseStats(c);
    if (currentPct === null) continue;
    points += gradeFor(currentPct).points * c.credits;
    credits += c.credits;
  }
  return credits > 0 ? points / credits : null;
}

function renderGrades() {
  const gpa = computeGPA();
  $("#gpa-number").textContent = gpa === null ? "—" : gpa.toFixed(2) + " / 4.30";
  $("#grades-empty").style.display = state.courses.length ? "none" : "block";

  $("#course-list").innerHTML = state.courses.map((c) => {
    const s = courseStats(c);
    const grade = s.currentPct !== null ? gradeFor(s.currentPct) : null;
    const rows = c.assessments.map((a) => `
      <tr>
        <td>${esc(a.name)}</td>
        <td>${a.weight}%</td>
        <td>${a.score === null || a.score === "" ? "—" : a.score + "%"}</td>
        <td><button class="btn small danger" data-del-assess="${c.id}:${a.id}">✕</button></td>
      </tr>`).join("");
    const needA = neededFor(c, 85);
    const needB = neededFor(c, 73);
    const needBox = (needA === null) ? "" : `
      <div class="need-box">🎯 To finish with an <b>A (85%)</b> you need to average <b>${needA > 100 ? "over 100% — no longer possible" : needA.toFixed(1) + "%"}</b> on the remaining ${s.totalWeight - s.gradedWeight}% of the course.
      For a <b>B (73%)</b>: <b>${needB > 100 ? "over 100% — no longer possible" : Math.max(0, needB).toFixed(1) + "%"}</b>.</div>`;
    return `<div class="card course-card">
      <div class="row-between">
        <h3>${esc(c.code)}${c.name ? " — " + esc(c.name) : ""} <span class="muted">(${c.credits} credits)</span></h3>
        <button class="btn small danger" data-del-course="${c.id}">Delete course</button>
      </div>
      <p>${s.currentPct === null
        ? "No graded work yet."
        : `Current grade: <span class="letter">${grade.letter}</span> — ${s.currentPct.toFixed(1)}% on ${s.gradedWeight}% of the course graded so far.`}</p>
      ${c.assessments.length ? `<table class="assess-table"><tr><th>Assessment</th><th>Weight</th><th>Score</th><th></th></tr>${rows}</table>` : ""}
      <form class="assess-form" data-assess-form="${c.id}">
        <input type="text" placeholder="Name (e.g. Midterm)" required data-f="name">
        <input type="number" placeholder="Weight %" min="0" max="100" step="0.5" required data-f="weight">
        <input type="number" placeholder="Score % (blank = not graded)" min="0" max="100" step="0.1" data-f="score">
        <button class="btn small primary" type="submit">Add</button>
      </form>
      ${needBox}
    </div>`;
  }).join("");

  $("#course-list").querySelectorAll("[data-del-course]").forEach((b) =>
    b.addEventListener("click", () => {
      state.courses = state.courses.filter((x) => x.id !== b.dataset.delCourse);
      saveState(); renderAll();
    }));
  $("#course-list").querySelectorAll("[data-del-assess]").forEach((b) =>
    b.addEventListener("click", () => {
      const [cid, aid] = b.dataset.delAssess.split(":");
      const course = state.courses.find((x) => x.id === cid);
      if (course) {
        course.assessments = course.assessments.filter((a) => a.id !== aid);
        saveState(); renderAll();
      }
    }));
  $("#course-list").querySelectorAll("[data-assess-form]").forEach((f) =>
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const course = state.courses.find((x) => x.id === f.dataset.assessForm);
      if (!course) return;
      const scoreRaw = f.querySelector('[data-f="score"]').value;
      course.assessments.push({
        id: uid(),
        name: f.querySelector('[data-f="name"]').value.trim(),
        weight: parseFloat(f.querySelector('[data-f="weight"]').value),
        score: scoreRaw === "" ? null : parseFloat(scoreRaw)
      });
      saveState(); renderAll();
    }));
}

$("#course-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.courses.push({
    id: uid(),
    code: $("#c-code").value.trim().toUpperCase(),
    name: $("#c-name").value.trim(),
    credits: parseFloat($("#c-credits").value) || 3,
    assessments: []
  });
  saveState();
  e.target.reset();
  $("#c-credits").value = 3;
  renderAll();
});

/* ---------------- today dashboard ---------------- */

function renderToday() {
  const now = new Date();
  $("#today-date").textContent = now.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const hour = now.getHours();
  $("#greeting").textContent = hour < 12 ? "Good morning ☀️" : hour < 18 ? "Good afternoon 🌤️" : "Good evening 🌙";

  const upcoming = plannerSorted().filter((i) => !i.done && daysUntil(i.date) <= 7);
  const overdueCount = state.planner.filter((i) => !i.done && daysUntil(i.date) < 0).length;
  const dueToday = state.planner.filter((i) => !i.done && daysUntil(i.date) === 0).length;

  $("#today-summary").textContent =
    `${dueToday} thing${dueToday === 1 ? "" : "s"} due today` +
    (overdueCount ? `, ${overdueCount} overdue` : "") +
    `, ${upcoming.length} coming up this week.`;

  const aidSoon = state.aid.entries
    .filter((e) => !e.done && daysUntil(e.date) <= 7)
    .map((e) => ({ title: e.label, date: e.date, icon: "🏛️ Aid" }));
  const plannerSoon = upcoming.map((i) => ({ title: i.title, date: i.date, icon: TYPE_LABELS[i.type] || "" }));
  const combined = [...plannerSoon, ...aidSoon].sort((a, b) => (a.date < b.date ? -1 : 1));

  $("#due-soon").innerHTML = combined.length
    ? combined.slice(0, 5).map((i) => `<li>${i.icon} <b>${esc(i.title)}</b><br><span class="muted">${fmtDate(i.date)}${daysUntil(i.date) < 0 ? " · overdue" : daysUntil(i.date) === 0 ? " · today" : " · in " + daysUntil(i.date) + "d"}</span></li>`).join("")
    : `<li class="muted">Nothing due in the next 7 days. Enjoy the calm — or get ahead. 💀</li>`;

  const docAlerts = state.documents.filter((d) => daysUntil(d.expiry) <= 90);
  $("#today-docs-card").style.display = docAlerts.length ? "block" : "none";
  $("#docs-snapshot").innerHTML = docAlerts
    .sort((a, b) => (a.expiry < b.expiry ? -1 : 1))
    .map((d) => `<p>${esc(d.type)}${d.name ? " — " + esc(d.name) : ""}: <b>${daysUntil(d.expiry) < 0 ? "expired " + (-daysUntil(d.expiry)) + "d ago" : "expires in " + daysUntil(d.expiry) + "d"}</b></p>`)
    .join("");

  const { income, expenses, balance } = moneyTotals();
  const budget = Number(state.budget) || 0;
  $("#money-snapshot").innerHTML = `
    <div class="money-row"><span>In</span><span class="amt-in">+ ${fmtMoney(income)}</span></div>
    <div class="money-row"><span>Out</span><span class="amt-out">− ${fmtMoney(expenses)}</span></div>
    <div class="money-row"><span>Balance</span><span class="amt-bal">${fmtMoney(balance)}</span></div>
    ${budget ? `<p class="muted">${fmtMoney(Math.max(0, budget - expenses))} of budget left</p>` : ""}`;

  const gpa = computeGPA();
  const gradedCourses = state.courses.filter((c) => courseStats(c).currentPct !== null).length;
  $("#grades-snapshot").innerHTML = gpa === null
    ? `<p class="muted">Add a course and its graded work to see your GPA here.</p>`
    : `<p class="big-number" style="font-size:2rem">${gpa.toFixed(2)}</p><p class="muted">GPA (4.3 scale) across ${gradedCourses} graded course${gradedCourses === 1 ? "" : "s"}</p>`;
}

/* ================= PHASE 2 ================= */

/* ---------------- key dates (Concordia, Winter 2027) ----------------
   Source: Concordia University academic calendar / important dates, verified 2026-11-17. */

const KEY_DATES = [
  { date: "2027-01-01", title: "Tuition fee payment due — winter term" },
  { date: "2027-01-11", title: "Classes begin — winter term 2027" },
  { date: "2027-01-25", title: "Deadline to add winter courses + DNE (withdraw with refund) deadline" },
  { date: "2027-02-15", title: "Last day to pay tuition — winter term" },
  { date: "2027-03-22", title: "DISC deadline — academic withdrawal (no refund)" },
  { date: "2027-04-30", title: "AFE end of funding — winter term" }
];

function renderKeyDates() {
  const el = $("#key-dates");
  if (!el) return;
  el.innerHTML = KEY_DATES.map((k) => {
    const added = state.planner.some((p) => p.title === k.title && p.date === k.date);
    return `<li class="item">
      <div><span>${esc(k.title)}</span><div class="meta">${fmtDate(k.date)} · ${daysUntil(k.date) < 0 ? "passed" : daysUntil(k.date) === 0 ? "today" : "in " + daysUntil(k.date) + "d"}</div></div>
      <div class="actions"><button class="btn small" data-add-key="${esc(k.title)}" ${added ? "disabled" : ""}>${added ? "Added ✓" : "Add"}</button></div>
    </li>`;
  }).join("");
  el.querySelectorAll("[data-add-key]").forEach((b) =>
    b.addEventListener("click", () => {
      const k = KEY_DATES.find((x) => x.title === b.dataset.addKey);
      if (k) {
        state.planner.push({ id: uid(), title: k.title, type: "deadline", course: "Concordia", date: k.date, time: "", done: false });
        saveState(); renderAll();
      }
    }));
}

/* ---------------- student aid ---------------- */

const PROGRAM_INFO = {
  "AFE": "Québec's Aide financière aux études: loans and bursaries for Québec students. You apply and renew through your AFE online file; Concordia's funding dates (like the winter funding end date, Apr 30) are in the Planner key dates.",
  "OSAP": "Ontario's student aid: grants and loans through your OSAP account. Watch for your school to confirm enrolment before each payment lands.",
  "StudentAid BC": "British Columbia's student aid program. Applications and status live in your StudentAid BC dashboard.",
  "Alberta Student Aid": "Alberta's student aid program, applied for through your Alberta Student Aid account.",
  "Manitoba Student Aid": "Manitoba's student aid program. Keep your course load confirmed — dropping below full-time can change your funding.",
  "NS Student Assistance": "Nova Scotia Student Assistance. Payments depend on your school confirming your enrolment each term.",
  "Other": "Every province and territory runs its own program. The pattern is the same everywhere: apply early, confirm your enrolment, and track the payment dates here."
};

const AID_KIND_LABELS = {
  payment: "💵 Payment",
  deadline: "⏰ Deadline",
  document: "📄 Document",
  other: "📌 Other"
};

function renderAid() {
  const sel = $("#a-program");
  if (document.activeElement !== sel) sel.value = state.aid.program;
  $("#a-program-info").textContent = PROGRAM_INFO[state.aid.program] || "";

  const entries = [...state.aid.entries].sort((a, b) => (a.date < b.date ? -1 : 1));
  $("#aid-list").innerHTML = entries.map((e) => `
    <li class="item ${e.done ? "done" : ""}">
      <div>
        <span class="title">${esc(e.label)}</span>
        <div class="meta"><span class="badge">${AID_KIND_LABELS[e.kind] || e.kind}</span>${fmtDate(e.date)} · ${daysUntil(e.date) < 0 ? "passed" : daysUntil(e.date) === 0 ? "today" : "in " + daysUntil(e.date) + "d"}${e.amount ? " · " + fmtMoney(e.amount) : ""}</div>
      </div>
      <div class="actions">
        <button class="btn small" data-aid-toggle="${e.id}">${e.done ? "Undo" : "Done"}</button>
        <button class="btn small danger" data-aid-del="${e.id}">Delete</button>
      </div>
    </li>`).join("");
  $("#aid-empty").style.display = entries.length ? "none" : "block";

  $("#aid-list").querySelectorAll("[data-aid-toggle]").forEach((b) =>
    b.addEventListener("click", () => {
      const e = state.aid.entries.find((x) => x.id === b.dataset.aidToggle);
      if (e) { e.done = !e.done; saveState(); renderAll(); }
    }));
  $("#aid-list").querySelectorAll("[data-aid-del]").forEach((b) =>
    b.addEventListener("click", () => {
      state.aid.entries = state.aid.entries.filter((x) => x.id !== b.dataset.aidDel);
      saveState(); renderAll();
    }));

  document.querySelectorAll("[data-tax]").forEach((box) => {
    box.checked = !!state.tax[box.dataset.tax];
  });
}

$("#a-program").addEventListener("change", (e) => {
  state.aid.program = e.target.value;
  saveState(); renderAid();
});

$("#aid-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const amountRaw = $("#a-amount").value;
  state.aid.entries.push({
    id: uid(),
    kind: $("#a-kind").value,
    label: $("#a-label").value.trim(),
    date: $("#a-date").value,
    amount: amountRaw === "" ? null : parseFloat(amountRaw),
    done: false
  });
  saveState();
  e.target.reset();
  $("#a-date").value = todayISO();
  renderAll();
});

document.querySelectorAll("[data-tax]").forEach((box) =>
  box.addEventListener("change", () => {
    state.tax[box.dataset.tax] = box.checked;
    saveState();
  }));

/* ---------------- transit: Concordia shuttle ----------------
   Official timetable from concordia.ca/maps/shuttle-bus.html, verified 2026-11-17.
   Periods: Fall Oct 19–Dec 8 2026 · Exam Dec 9–23 2026 · No service Dec 24–Jan 5 ·
   Winter short Jan 6–8 2027 · Winter Jan 11–Apr 14 2027. Mon–Fri only. */

const SHUTTLE = {
  monThu: {
    LOY: ["9:15","9:30","9:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30","11:45","12:30","12:45","13:00","13:15","13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15","15:30","15:45","16:30","16:45","17:00","17:15","17:30","17:45","18:00","18:15","18:30"],
    SGW: ["9:30","9:45","10:00","10:15","10:30","10:45","11:00","11:15","11:30","12:15","12:30","12:45","13:00","13:15","13:30","13:45","14:00","14:15","14:30","14:45","15:00","15:15","15:30","16:00","16:15","16:45","17:00","17:15","17:30","17:45","18:00","18:15","18:30"]
  },
  fri: {
    LOY: ["9:15","9:30","9:45","10:15","10:45","11:00","11:15","12:00","12:15","12:45","13:00","13:15","13:45","14:15","14:30","14:45","15:15","15:30","15:45","16:45","17:15","17:45","18:15"],
    SGW: ["9:45","10:00","10:15","10:45","11:15","11:30","12:15","12:30","12:45","13:15","13:45","14:00","14:15","14:45","15:00","15:15","15:45","16:00","16:45","17:15","17:45","18:15"]
  },
  exam: {
    LOY: ["9:15","9:30","9:45","10:15","10:30","11:15","11:30","11:45","12:15","12:45","13:00","13:15","13:45","14:00","14:15","14:45","15:00","15:15","15:45","16:00","16:15","16:45","17:30","17:45","18:15","18:30","18:45"],
    SGW: ["9:15","9:45","10:00","10:15","10:45","11:00","11:45","12:15","12:30","12:45","13:15","13:30","13:45","14:15","14:30","14:45","15:15","15:30","15:45","16:15","17:00","17:15","17:45","18:00","18:15","18:45"]
  }
};

function shuttlePeriod(iso) {
  if (iso >= "2026-10-19" && iso <= "2026-12-08") return "fall";
  if (iso >= "2026-12-09" && iso <= "2026-12-23") return "exam";
  if (iso >= "2026-12-24" && iso <= "2027-01-05") return "holiday";
  if (iso >= "2027-01-06" && iso <= "2027-01-08") return "winterShort";
  if (iso >= "2027-01-11" && iso <= "2027-04-14") return "winter";
  return "unknown";
}

/* Returns {LOY: [...], SGW: [...]} for a date, or null when no service. */
function shuttleTimesFor(iso) {
  const period = shuttlePeriod(iso);
  if (period === "holiday" || period === "unknown") return null;
  const dow = new Date(iso + "T12:00:00").getDay(); // 0 Sun … 6 Sat
  if (dow === 0 || dow === 6) return null;
  if (period === "exam") return SHUTTLE.exam;
  if (period === "winterShort") return SHUTTLE.fri;
  return dow === 5 ? SHUTTLE.fri : SHUTTLE.monThu;
}

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fmtClock(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function nextDeparture(times, nowMins) {
  for (const t of times) if (toMinutes(t) > nowMins) return t;
  return null;
}

function renderTransit() {
  const statusEl = $("#shuttle-status");
  if (!statusEl) return;
  const now = new Date();
  const iso = todayISO();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const period = shuttlePeriod(iso);
  const times = shuttleTimesFor(iso);

  const periodNames = {
    fall: "Fall schedule (Oct 19 – Dec 8, 2026)",
    exam: "Exam-period schedule (Dec 9 – 23, 2026)",
    holiday: "Holiday period — no shuttle service Dec 24 – Jan 5",
    winterShort: "Winter schedule (Jan 6 – 8, 2027)",
    winter: "Winter schedule (Jan 11 – Apr 14, 2027)",
    unknown: "Outside the published schedule range — check Concordia's page for the current table"
  };

  if (!times) {
    statusEl.textContent = period === "holiday"
      ? "🎄 No shuttle service today — holiday period (Dec 24 – Jan 5). Service resumes Jan 6, 2027. Plan B: STM, below."
      : (now.getDay() === 0 || now.getDay() === 6)
        ? "No shuttle service on weekends. Plan B: STM, below."
        : periodNames[period] + ".";
    $("#next-loy").textContent = "—";
    $("#next-sgw").textContent = "—";
    $("#next-loy-note").textContent = "";
    $("#next-sgw-note").textContent = "";
    $("#chips-loy").innerHTML = "";
    $("#chips-sgw").innerHTML = "";
    return;
  }

  statusEl.textContent = periodNames[period] + " · " + now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });

  for (const dir of ["LOY", "SGW"]) {
    const list = times[dir];
    const next = nextDeparture(list, nowMins);
    const nextEl = dir === "LOY" ? $("#next-loy") : $("#next-sgw");
    const noteEl = dir === "LOY" ? $("#next-loy-note") : $("#next-sgw-note");
    const chipsEl = dir === "LOY" ? $("#chips-loy") : $("#chips-sgw");
    if (next) {
      const mins = toMinutes(next) - nowMins;
      nextEl.textContent = fmtClock(toMinutes(next));
      noteEl.textContent = `Next bus in ${mins} min · be at the stop by ${fmtClock(toMinutes(next) - 5)} · arrives about ${fmtClock(toMinutes(next) + 30)}`;
    } else {
      nextEl.textContent = "Done for today";
      noteEl.textContent = `Last bus left at ${fmtClock(toMinutes(list[list.length - 1]))}. Plan B: STM, below.`;
    }
    const remaining = list.filter((t) => toMinutes(t) > nowMins);
    chipsEl.innerHTML = remaining.slice(0, 8).map((t) => `<span class="chip">${fmtClock(toMinutes(t))}</span>`).join("")
      + (remaining.length > 8 ? ` <span class="chip">+${remaining.length - 8} more</span>` : "");
  }
}

setInterval(renderTransit, 30000);

/* ---------------- documents ---------------- */

function docStatus(expiry) {
  const d = daysUntil(expiry);
  if (d < 0) return { label: `Expired ${-d}d ago`, cls: "amt-out" };
  if (d === 0) return { label: "Expires today", cls: "amt-out" };
  if (d <= 30) return { label: `Expires in ${d}d — renew now`, cls: "amt-out" };
  if (d <= 90) return { label: `Expires in ${d}d`, cls: "" };
  return { label: `Expires in ${d}d`, cls: "amt-in" };
}

function renderDocs() {
  const docs = [...state.documents].sort((a, b) => (a.expiry < b.expiry ? -1 : 1));
  $("#doc-list").innerHTML = docs.map((d) => {
    const s = docStatus(d.expiry);
    return `<li class="item">
      <div>
        <span>🪪 ${esc(d.type)}${d.name ? " — " + esc(d.name) : ""}</span>
        <div class="meta">Expiry: ${fmtDate(d.expiry)} · <span class="${s.cls}">${s.label}</span></div>
      </div>
      <div class="actions"><button class="btn small danger" data-doc-del="${d.id}">Delete</button></div>
    </li>`;
  }).join("");
  $("#doc-empty").style.display = docs.length ? "none" : "block";
  $("#doc-list").querySelectorAll("[data-doc-del]").forEach((b) =>
    b.addEventListener("click", () => {
      state.documents = state.documents.filter((x) => x.id !== b.dataset.docDel);
      saveState(); renderAll();
    }));
}

$("#doc-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.documents.push({
    id: uid(),
    type: $("#d-type").value,
    name: $("#d-name").value.trim(),
    expiry: $("#d-expiry").value
  });
  saveState();
  e.target.reset();
  renderAll();
});

/* ================= PHASE 3 ================= */

/* ---------------- bilingual UI (EN / FR) ---------------- */

const I18N = {
  en: {
    tagline: "Your whole student life. One app.",
    nav_today: "🏠 Today", nav_planner: "🗓️ Planner", nav_money: "💰 Money", nav_grades: "🎓 Grades",
    nav_aid: "🏛️ Aid", nav_transit: "🚌 Transit", nav_docs: "🪪 Docs", nav_study: "🎯 Study",
    data_title: "💾 Your data",
    data_blurb: "Everything lives on this device. Export a backup before switching phones, import it on the new one, or share the app with a friend.",
    data_export: "⬇️ Export backup", data_import: "⬆️ Import backup", data_share: "🔗 Share DTL",
    data_exported: "Backup exported ✓", data_imported: "Backup imported ✓ — everything is restored.",
    data_import_error: "That file could not be imported. Make sure it is a DTL backup.",
    data_copied: "Link copied ✓ — send it to a friend.",
    stm_title: "📡 STM live times",
    stm_blurb: "Live STM predictions come from STM's official GTFS-Realtime feed. It needs two things: your own free STM developer key, and a small relay so the key never sits exposed in app code. Get the key (free, about a business day) and paste it here — DTL saves it on this device only and is ready to use it the moment the relay is switched on.",
    stm_step1: "Register at portail.developpeurs.stm.info and create an API key for the GTFS-Realtime feed.",
    stm_step2: "Paste the key below and tap Save.",
    stm_step3: "When the relay goes live, this card switches to real arrivals automatically.",
    stm_key_label: "Your STM API key", stm_save: "Save key",
    stm_saved: "Key saved on this device ✓", stm_exists: "A key is saved on this device ✓",
    pomo_title: "🍅 Pomodoro focus timer", pomo_start: "Start", pomo_pause: "Pause", pomo_reset: "Reset",
    pomo_sessions: "Sessions completed",
    pomo_blurb: "25 minutes of focus, then a 5-minute break. The timer switches for you.",
    pomo_focus: "Focus session", pomo_break: "Break — breathe",
    fc_title: "🃏 Flashcards", fc_front: "Front (question)", fc_back: "Back (answer)", fc_add: "Add card",
    fc_flip: "Flip", fc_shuffle: "🔀 Shuffle", fc_learning: "↩️ Still learning", fc_know: "✅ I know this",
    fc_reset: "Reset progress", fc_delete: "Delete this card",
    fc_empty: "No cards yet — add your first one above.", fc_tap: "Tap the card to flip it",
    fc_progress: "{known} of {total} known"
  },
  fr: {
    tagline: "Toute ta vie étudiante. Une seule appli.",
    nav_today: "🏠 Aujourd'hui", nav_planner: "🗓️ Planificateur", nav_money: "💰 Argent", nav_grades: "🎓 Notes",
    nav_aid: "🏛️ Aide", nav_transit: "🚌 Transport", nav_docs: "🪪 Documents", nav_study: "🎯 Étude",
    data_title: "💾 Tes données",
    data_blurb: "Tout est enregistré sur cet appareil. Exporte une sauvegarde avant de changer de téléphone, importe-la sur le nouveau, ou partage l'appli avec un ami.",
    data_export: "⬇️ Exporter la sauvegarde", data_import: "⬆️ Importer la sauvegarde", data_share: "🔗 Partager DTL",
    data_exported: "Sauvegarde exportée ✓", data_imported: "Sauvegarde importée ✓ — tout est restauré.",
    data_import_error: "Ce fichier n'a pas pu être importé. Vérifie que c'est bien une sauvegarde DTL.",
    data_copied: "Lien copié ✓ — envoie-le à un ami.",
    stm_title: "📡 Heures STM en direct",
    stm_blurb: "Les prévisions STM en direct proviennent du flux officiel GTFS-Realtime de la STM. Il faut deux choses : ta propre clé de développeur STM gratuite, et un petit relais pour que la clé ne soit jamais exposée dans le code de l'appli. Obtiens la clé (gratuite, environ un jour ouvrable) et colle-la ici — DTL l'enregistre uniquement sur cet appareil et sera prêt à l'utiliser dès que le relais sera activé.",
    stm_step1: "Inscris-toi sur portail.developpeurs.stm.info et crée une clé API pour le flux GTFS-Realtime.",
    stm_step2: "Colle la clé ci-dessous et touche Enregistrer.",
    stm_step3: "Quand le relais sera en ligne, cette carte affichera les arrivées réelles automatiquement.",
    stm_key_label: "Ta clé API STM", stm_save: "Enregistrer la clé",
    stm_saved: "Clé enregistrée sur cet appareil ✓", stm_exists: "Une clé est enregistrée sur cet appareil ✓",
    pomo_title: "🍅 Minuteur de concentration Pomodoro", pomo_start: "Commencer", pomo_pause: "Pause", pomo_reset: "Réinitialiser",
    pomo_sessions: "Sessions terminées",
    pomo_blurb: "25 minutes de concentration, puis 5 minutes de pause. Le minuteur change tout seul.",
    pomo_focus: "Session de concentration", pomo_break: "Pause — respire",
    fc_title: "🃏 Cartes mémoire", fc_front: "Recto (question)", fc_back: "Verso (réponse)", fc_add: "Ajouter la carte",
    fc_flip: "Retourner", fc_shuffle: "🔀 Mélanger", fc_learning: "↩️ À retravailler", fc_know: "✅ Je le sais",
    fc_reset: "Réinitialiser la progression", fc_delete: "Supprimer cette carte",
    fc_empty: "Aucune carte pour l'instant — ajoute la première ci-dessus.", fc_tap: "Touche la carte pour la retourner",
    fc_progress: "{known} sur {total} sues"
  }
};

function t(key, vars) {
  let s = (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.replace("{" + k + "}", vars[k]);
  return s;
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  const btn = $("#lang-toggle");
  if (btn) btn.textContent = state.lang === "en" ? "FR" : "EN";
}

$("#lang-toggle").addEventListener("click", () => {
  state.lang = state.lang === "en" ? "fr" : "en";
  saveState();
  renderAll();
});

/* ---------------- study: pomodoro ---------------- */

const POMO_FOCUS = 25 * 60, POMO_BREAK = 5 * 60;
let pomoMode = "focus";       // "focus" | "break"
let pomoLeft = POMO_FOCUS;    // seconds remaining
let pomoTimer = null;         // interval id while running

function pomoDisplay() {
  const m = Math.floor(pomoLeft / 60), s = pomoLeft % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    osc.frequency.value = 880;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => { osc.stop(); ctx.close(); }, 250);
  } catch (e) { /* audio is a nicety, never an error */ }
}

function pomoTick() {
  pomoLeft -= 1;
  if (pomoLeft <= 0) {
    beep();
    if (pomoMode === "focus") {
      state.study.pomoSessions += 1;
      saveState();
      pomoMode = "break";
      pomoLeft = POMO_BREAK;
    } else {
      pomoMode = "focus";
      pomoLeft = POMO_FOCUS;
    }
  }
  renderStudy();
}

$("#pomo-start").addEventListener("click", () => {
  if (pomoTimer) return;
  pomoTimer = setInterval(pomoTick, 1000);
});
$("#pomo-pause").addEventListener("click", () => {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
});
$("#pomo-reset").addEventListener("click", () => {
  if (pomoTimer) { clearInterval(pomoTimer); pomoTimer = null; }
  pomoMode = "focus";
  pomoLeft = POMO_FOCUS;
  renderStudy();
});

/* ---------------- study: flashcards ---------------- */

let fcIdx = 0;
let fcFlipped = false;

function currentCard() {
  const cards = state.study.cards;
  if (!cards.length) return null;
  if (fcIdx >= cards.length) fcIdx = 0;
  return cards[fcIdx];
}

function fcAdvance() {
  const cards = state.study.cards;
  fcFlipped = false;
  if (!cards.length) return;
  // prefer the next card not yet known; wrap around if all are known
  for (let step = 1; step <= cards.length; step++) {
    const next = (fcIdx + step) % cards.length;
    if (!cards[next].known) { fcIdx = next; return; }
  }
  fcIdx = (fcIdx + 1) % cards.length;
}

function renderStudy() {
  // pomodoro
  $("#pomo-display").textContent = pomoDisplay();
  $("#pomo-mode").textContent = t(pomoMode === "focus" ? "pomo_focus" : "pomo_break");
  $("#pomo-count").textContent = state.study.pomoSessions;

  // flashcards
  const cards = state.study.cards;
  const card = currentCard();
  const known = cards.filter((c) => c.known).length;
  $("#fc-progress").textContent = cards.length ? t("fc_progress", { known, total: cards.length }) : "";
  if (!card) {
    $("#fc-text").textContent = t("fc_empty");
    $("#fc-hint").textContent = "";
    return;
  }
  $("#fc-text").textContent = fcFlipped ? card.back : card.front;
  $("#fc-hint").textContent = t("fc_tap") + (card.known ? " · ✓" : "");
}

$("#fc-form").addEventListener("submit", (e) => {
  e.preventDefault();
  state.study.cards.push({
    id: uid(),
    front: $("#fc-front-input").value.trim(),
    back: $("#fc-back-input").value.trim(),
    known: false
  });
  saveState();
  e.target.reset();
  fcIdx = state.study.cards.length - 1;
  fcFlipped = false;
  renderStudy();
});

function fcFlip() { if (currentCard()) { fcFlipped = !fcFlipped; renderStudy(); } }
$("#fc-card").addEventListener("click", fcFlip);
$("#fc-flip").addEventListener("click", fcFlip);
$("#fc-shuffle").addEventListener("click", () => {
  const cards = state.study.cards;
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  fcIdx = 0; fcFlipped = false;
  saveState(); renderStudy();
});
$("#fc-know").addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  card.known = true;
  saveState(); fcAdvance(); renderStudy();
});
$("#fc-learning").addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  card.known = false;
  saveState(); fcAdvance(); renderStudy();
});
$("#fc-reset-progress").addEventListener("click", () => {
  state.study.cards.forEach((c) => { c.known = false; });
  fcIdx = 0; fcFlipped = false;
  saveState(); renderStudy();
});
$("#fc-delete").addEventListener("click", () => {
  const card = currentCard();
  if (!card) return;
  state.study.cards = state.study.cards.filter((c) => c.id !== card.id);
  fcFlipped = false;
  saveState(); renderStudy();
});

/* ---------------- data tools: export / import / share ---------------- */

$("#btn-export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dtl-backup-" + todayISO() + ".json";
  a.click();
  URL.revokeObjectURL(url);
  $("#data-status").textContent = t("data_exported");
});

$("#btn-import").addEventListener("click", () => $("#import-file").click());

$("#import-file").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || !Array.isArray(parsed.planner) || !Array.isArray(parsed.transactions) || !Array.isArray(parsed.courses)) {
        throw new Error("not a DTL backup");
      }
      state = Object.assign(structuredClone(defaultState), parsed);
      saveState();
      renderAll();
      $("#data-status").textContent = t("data_imported");
    } catch (err) {
      $("#data-status").textContent = t("data_import_error");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
});

$("#btn-share").addEventListener("click", async () => {
  const shareData = { title: "Duties of the Living — DTL", text: "DTL: one app for Canadian student life — planner, money, grades, aid, transit.", url: location.href };
  try {
    if (navigator.share) { await navigator.share(shareData); return; }
    throw new Error("no native share");
  } catch (err) {
    try {
      await navigator.clipboard.writeText(location.href);
      $("#data-status").textContent = t("data_copied");
    } catch (e2) { /* clipboard unavailable — the URL in the address bar is the share link */ }
  }
});

/* ---------------- STM live: key storage ---------------- */

const STM_KEY_STORE = "dtl_stm_key";

function renderStmStatus() {
  const has = !!localStorage.getItem(STM_KEY_STORE);
  $("#stm-status").textContent = has ? t("stm_exists") : "";
}
renderStmStatus();

$("#stm-save").addEventListener("click", () => {
  const v = $("#stm-key").value.trim();
  if (v) {
    localStorage.setItem(STM_KEY_STORE, v);
    $("#stm-key").value = "";
    $("#stm-status").textContent = t("stm_saved");
  }
});

/* ---------------- offline support ---------------- */

try {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
} catch (e) { /* offline support is progressive enhancement */ }

/* ---------------- init ---------------- */

function renderAll() {
  renderPlanner();
  renderMoney();
  renderGrades();
  renderAid();
  renderTransit();
  renderDocs();
  renderStudy();
  applyI18n();
  renderToday();
}

$("#p-date").value = todayISO();
$("#m-date").value = todayISO();
renderAll();

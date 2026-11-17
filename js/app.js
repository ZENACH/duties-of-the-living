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
  courses: []         // {id, code, name, credits, assessments: [{id, name, weight, score}]}
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

  $("#due-soon").innerHTML = upcoming.length
    ? upcoming.slice(0, 5).map((i) => `<li>${TYPE_LABELS[i.type] || ""} <b>${esc(i.title)}</b><br><span class="muted">${fmtDate(i.date)}${daysUntil(i.date) < 0 ? " · overdue" : daysUntil(i.date) === 0 ? " · today" : " · in " + daysUntil(i.date) + "d"}</span></li>`).join("")
    : `<li class="muted">Nothing due in the next 7 days. Enjoy the calm — or get ahead. 💀</li>`;

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

/* ---------------- init ---------------- */

function renderAll() {
  renderPlanner();
  renderMoney();
  renderGrades();
  renderToday();
}

$("#p-date").value = todayISO();
$("#m-date").value = todayISO();
renderAll();

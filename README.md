# 💀 Duties of the Living (DTL)

**Your whole student life. One app.**

Canadian university students already live on their phones — but their student life is scattered across a dozen apps: a calendar here, a notes app there, a banking app, a GPA calculator website, a transit app. **Duties of the Living** puts it all in one place, built specifically for Canadian university students.

## Phase 1

- **🏠 Today dashboard** — your day at a glance: what's due, what's overdue, money in/out this month, and your current GPA.
- **🗓️ Planner** — classes, assignments, exams, and tasks with due dates, countdowns, and overdue flags.
- **💰 Money** — income & expense tracking by category, a monthly budget with a live progress bar, and a savings goal tracker (e.g. a 6-month emergency fund).
- **🎓 Grades & GPA** — courses with weighted assessments (assignments, midterms, final), current grade and letter on the **official Concordia 4.3 scale**, credit-weighted GPA, and a *"what do I need on the rest to finish with an A?"* calculator.

## Phase 2 (current)

- **📌 Term key dates** — Concordia Winter 2027 dates (tuition due, classes begin, add/DNE deadline, last day to pay, DISC deadline, AFE funding end) built into the Planner, addable in one tap. Source: Concordia's official academic calendar.
- **🏛️ Student aid tracker** — pick your program (AFE Québec, OSAP, StudentAid BC, Alberta, Manitoba, Nova Scotia, other) and track payments, deadlines, and document requests. DTL never connects to your government aid account; you log the dates, the app watches them.
- **🧾 Tax season checklist** — T2202, Relevé 8 (Québec), T4, and receipts, with the April 30 filing deadline in view.
- **🚌 Transit** — the full official Concordia shuttle timetable (fall, exam-period, and winter tables, verified against concordia.ca) with next-bus countdowns for both directions, "be at the stop by" times, and arrival estimates — plus an STM plan-B card for when the shuttle isn't running.
- **🪪 Documents** — expiry tracking for student ID, health card, study permit, passport, and more, with warnings at 90/30 days and on the Today dashboard. Expiry dates only — never card numbers.

## Phase 3 (current)

- **🎯 Study tools** — a Pomodoro focus timer (25-minute focus / 5-minute break, auto-switching, with a session counter) and flashcards you create yourself, with flip, shuffle, and know / still-learning tracking.
- **🌐 Bilingual EN / FR** — one tap on the FR/EN button in the header switches the interface between English and French (Montréal-ready).
- **💾 Your data** — export a full backup as a JSON file, import it on another device, and share DTL with a friend from the Today dashboard.
- **📱 App polish** — installable on a phone home screen (web app manifest + icon), and a service worker keeps DTL opening even offline (network-first, so updates always land).
- **📡 STM live times (ready, awaiting key)** — the Transit tab holds the STM key card: add your own free STM developer key and it's stored on-device, ready for the live GTFS-Realtime relay. The key never ships inside the app code.

All data is stored locally in the browser (localStorage). No account, no server, no tracking.

## Roadmap

- **Live STM relay** — the one remaining piece: a tiny server relay that holds the STM key server-side and translates the GTFS-Realtime feed for the app. Everything on the app side is built and waiting for it.

## Run it

It's a static web app — no build step.

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` in a browser.

## Tech

Plain HTML, CSS, and JavaScript — deliberately dependency-free for Phase 1 so it loads instantly and works anywhere, including a phone home screen.

## License

MIT

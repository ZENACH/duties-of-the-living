# 💀 Duties of the Living (DTL)

**Your whole student life. One app.**

Canadian university students already live on their phones — but their student life is scattered across a dozen apps: a calendar here, a notes app there, a banking app, a GPA calculator website, a transit app. **Duties of the Living** puts it all in one place, built specifically for Canadian university students.

## Phase 1 (current)

- **🏠 Today dashboard** — your day at a glance: what's due, what's overdue, money in/out this month, and your current GPA.
- **🗓️ Planner** — classes, assignments, exams, and tasks with due dates, countdowns, and overdue flags.
- **💰 Money** — income & expense tracking by category, a monthly budget with a live progress bar, and a savings goal tracker (e.g. a 6-month emergency fund).
- **🎓 Grades & GPA** — courses with weighted assessments (assignments, midterms, final), current grade and letter on the **official Concordia 4.3 scale**, credit-weighted GPA, and a *"what do I need on the rest to finish with an A?"* calculator.

All data is stored locally in the browser (localStorage). No account, no server, no tracking.

## Roadmap

- **Phase 2** — Canadian student aid tracker (AFE in Québec, OSAP in Ontario, other provinces), important term dates (add/drop, reading week), transit (Concordia shuttle timetable + live STM GTFS-Realtime predictions), document expiry reminders (student ID, health card, study permit), T2202 / Relevé 8 tax-season reminders.
- **Phase 3** — English/French bilingual UI, study tools (Pomodoro timer, flashcards), sharing and polish.

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

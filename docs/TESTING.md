# Testing Guide

Dev environment. Follow the scenarios below to verify features. See [AI.md](AI.md), [REFERENCE.md](REFERENCE.md).

---

## Quick Start

```bash
# Backend
cd backend/SmartTaskTracker.API && dotnet run   # → http://localhost:5000

# Frontend
cd frontend && npm install && npm run dev       # → http://localhost:5173
```

---

## Test Scenarios

### Test 1: Auth

- **Register:** `/register` → username, email, password → redirect to `/tasks`. Validate: empty, username <3, password <6, invalid email. After register, one **sample task** is created automatically (title "Sample title", description "Sample description", tag "Sample", notes "Sample notes", etc.; no dependencies so dependency suggestions stay empty).
- **Login:** `/login` → credentials → `/tasks`. Validate: wrong user/pass → "Invalid credentials".
- **Protected routes:** Logout → open `/tasks` → redirect to `/login`. Delete `token` in Local Storage → refresh `/tasks` → redirect.
- **Refresh token:** Delete `token` only → next API call → new tokens. Delete both tokens → redirect to `/login`.

---

### Test 2: Task CRUD (all fields)

**Create** one task with every field: title, description, due date, priority, status, tags (multiple), notes, recurrence (e.g. Weekly), file attachment, time estimate, subtasks, Depends On (if another task exists).

**Update** that task once: change title, description, due date, priority, status, tags, notes, recurrence, estimate, subtasks, dependency. Save → confirm all persist.

**Complete** → strikethrough; **uncomplete** → normal. **Delete** → confirm removal.

Validation: empty title → disabled; title >200 → error.

---

### Test 3: Search

- Keyword: type in search (e.g. tag name, word in title/description) → list filters (case-insensitive).
- Semantic (if API key): e.g. `meetings`, `things to discuss with the team` → results by meaning; no match → keyword fallback. See [AI.md](AI.md) for query expectations.

---

### Test 4: Filters & sort

- Quick filters: Today, This Week, High Priority → filter; click again → clear. Combine with search.
- Status filter → filter by Active/InProgress/OnHold/Completed/Cancelled.
- Sort: change sort → order updates. Settings → default sort + "remember" → refresh behaves accordingly.
- Presets: Settings → Filter Presets → create → Tasks page → select preset → filters applied.

---

### Test 5: Bulk operations

Select 2–3 tasks (checkbox → blue border) → toolbar "N task(s) selected" → Change Status → Completed → confirm. Select others → Delete Selected → confirm. Select All → Deselect All / Clear. Recurring tasks: bulk complete → next occurrence created.

---

### Test 6: Export / Import CSV

- **Export:** With/without selection → CSV has configured fields (Settings). Subtasks: setting on → separate rows with parent column; off → parent only.
- **Import:** Import CSV → choose file → tasks + subtasks imported; field matching case-insensitive.

---

### Test 7: Recurring, templates, duplicate

- **Recurring:** Create task with Repeat (Daily/Weekly/Monthly) + optional end date → badge → complete → next occurrence created (same fields + tags + subtasks; dependencies not copied). See [REFERENCE.md](REFERENCE.md) Extras.
- **Templates:** Fill form → Save as template (📋) → name. Templates (📋) → select → form pre-filled → Create.
- **Duplicate:** Open task → Duplicate (📋) → new task "(Copy)", same fields except completion; independent.

---

### Test 8: Calendar, reminders, analytics

- **Calendar:** `/calendar` → Month/Week/Day → tasks on due dates; date "+" → create with date pre-filled; nav (←/→/Today).
- **Reminders:** Overdue + due ≤24h → Reminders (📧); complete overdue → disappears.
- **Analytics:** 📈 → totals, active, completed, overdue, high priority, weekly/monthly, priority breakdown; updates with data.

---

### Test 9: Time tracking, history, estimates

- **Timer:** Start (▶️) on task → increments; Stop (⏹️) → time saved. Start on another → previous stops. Persists after refresh.
- **History:** 📜 on task → modal with actions (newest first); create/edit/complete/archive → logged.
- **Estimate:** Set estimate on task → card "Est: Xh"; track time → under/over comparison (green/red).

---

### Test 10: UI & shortcuts

- **Theme:** Toggle dark/light (🌙/☀️) → persists. Settings → accent color → applies and persists.
- **Responsive:** DevTools device mode @375px → stacked buttons, full-width inputs, modal fits, touch targets; all features work.
- **Shortcuts:** `n` → new task; `s` or `/` → focus search (not while typing). Settings → change shortcuts → test.
- **Notifications:** Allow when prompted; task due soon / overdue → browser notification; Settings → toggle on/off.

---

### Test 11: Settings (all config)

- Defaults: priority, date format, sort → Save → "✓ Saved!" → new task uses defaults; persist after refresh.
- Export: fields + date format → Export CSV uses them.
- UI: toggle task card fields → cards update; persist.
- Search: toggle search fields → only those searched; persist.
- Sort: default + remember option → Tasks page and refresh behave as set.

---

### Test 12: Archive, dependencies, subtasks, tags

- **Archive:** Complete task → Archive (📦) → hidden; Show Archived → Unarchive (📤) → restored.
- **Dependencies:** Task B → Depends On → Task A → B blocked until A done; circular prevented.
- **Subtasks:** Edit parent → add subtasks → parent shows progress (e.g. 1/2); subtasks not in main list.
- **Tags:** Add multiple; autocomplete from backend; color badges; same tag name → same color (DB). Search by tag.

---

### Test 13: Drag-and-drop order

Drag task → visual feedback → drop → order changes; custom order persists after refresh.

---

### Test 14: Semantic search (detailed)

Search box: phrase (e.g. `meetings`, `things to discuss with the team`, `writing docs`). List by semantic similarity; score threshold (default 0.25). No semantic results or no API key → keyword fallback. Clear/Clear Filter → full list (or other filters). See [AI.md](AI.md) and Test 3.

---

### Test 15: What's next? (DB ranking, not AI)

Several tasks (e.g. high priority, due soon, no deps). What's next? → panel with suggestions and reason; click title → edit modal; close (×) → panel closes. Empty list → "No suggestions." or empty.

---

### Test 16: Add from text (natural language)

+ Add Task → sparkle (✦) → text input: e.g. `Review report by Friday, high priority` → Add from text. Modal opens with title, due (Friday), priority High; edit if needed → Create. **Tags** from parse are normalized to first letter capital (e.g. Report, Work). Empty input → button disabled. With LLM key: API parse; without: keyword fallback (e.g. "high priority", "by Friday"). Quick checks: `tomorrow morning jog high prio`, `Call mom tomorrow`, `low prio admin task next week`, `meeting at 10am` (no date) — see [AI.md](AI.md).

---

### Test 17: Smart tagging

Create/edit task → type title/description similar to existing tagged tasks → after ~300ms "From similar tasks:" suggestions → click tag → added. If full text returns no suggestions, backend tries each word (e.g. "Code Program" → try "Code", then "Program"). No API key → no suggestions; type-to-filter tag list still works. Backend: `GET /api/tasks/suggest-tags?text=...`.

---

### Test 18: Dependency suggestions

Edit task → Depends On → "From similar tasks" → suggestions → click to add → Save. Suggestions merge (1) tasks that similar tasks depend on and (2) similar tasks as candidates (by score), up to topK. Similarity uses **title + description only** for the current task (same as smart tagging); shared meaningful word (or weekend/saturday/sunday) adds boost. No key → empty list. Backend: `GET /api/tasks/{id}/suggest-dependencies`.

---

### Test 19: Unit tests

- **Backend:** `cd backend/SmartTaskTracker.API.Tests` → `dotnet test` (e.g. AuthService, TaskService).
- **Frontend:** `cd frontend` → `npm test` (e.g. authService, ThemeContext, useTasks).

---

## Expected behaviors

- **Loading:** Spinner on fetch; "Loading…" on buttons; forms disabled on submit.
- **Errors:** Validation inline; API errors user-friendly; 401 → clear session, redirect to login.
- **Server wake (Render):** Health check first; if down → banner "Server is waking up…"; retry; no "invalid credentials"; when up → banner hides, flows work.

---

**See also:** [AI.md](AI.md) (semantic search, NL task, smart tagging, dependency suggestions), [REFERENCE.md](REFERENCE.md) (schema, setup).

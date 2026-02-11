# Testing Guide

**State:** Dev environment. **Intent:** Verify features. **Action:** Follow scenarios (each test = State → Intent → Action).

---

## Quick Start

**State:** Development environment  
**Intent:** Run application  
**Action:** Start backend and frontend

### 1. Start Backend
```bash
cd backend/SmartTaskTracker.API
dotnet run
```
✅ Backend running on `http://localhost:5000`

### 2. Start Frontend
```bash
cd frontend
npm install  # if first time
npm run dev
```
✅ Frontend running on `http://localhost:5173`

---

## Test Scenarios

### Test 1: Registration

**State:** Unauthenticated user  
**Intent:** Create account  
**Action:** Submit registration form

1. Navigate to `/register`
2. Enter: `testuser`, `test@example.com`, `password123`
3. Click "Register"
4. ✅ Redirects to `/tasks`

**Validation:**
- Empty fields → error
- Username < 3 chars → error
- Password < 6 chars → error
- Invalid email → error

---

### Test 2: Login

**State:** Unauthenticated user  
**Intent:** Access account  
**Action:** Submit credentials

1. Navigate to `/login`
2. Enter: `testuser`, `password123`
3. Click "Login"
4. ✅ Redirects to `/tasks`

**Validation:**
- Wrong password → "Invalid credentials"
- Wrong username → "Invalid credentials"

---

### Test 3: Create Task

**State:** Authenticated user, task list view  
**Intent:** Add new task  
**Action:** Fill form → Submit

1. Click "+ Add Task"
2. Enter: `Test Task`, `This is a test task`, tomorrow's date
3. Click "Create"
4. ✅ Task appears in list

**Validation:**
- Empty title → disabled
- Title > 200 chars → error

---

### Test 4: Search Tasks

**State:** Task list displayed  
**Intent:** Find specific tasks  
**Action:** Type search query

1. Create 2-3 tasks with different titles, descriptions, tags
2. Type in search box: `test` (lowercase)
3. ✅ Should filter tasks matching "test" in title, description, tags, or file name (case-insensitive)
4. Try searching by tag name
5. ✅ Should find tasks with matching tag

---

### Test 5: Update Task

**State:** Task displayed  
**Intent:** Modify task properties  
**Action:** Edit → Update

1. Click "Edit" on any task
2. Modify fields and click "Update"
3. ✅ Task updates in the list

---

### Test 6: Toggle Complete

**State:** Task displayed  
**Intent:** Mark as complete/incomplete  
**Action:** Click completion button

1. Click completion button (✓/○) on a task
2. ✅ Task shows strikethrough when completed, normal when incomplete

---

### Test 7: Delete Task

**State:** Task displayed  
**Intent:** Remove task  
**Action:** Click delete → Confirm

1. Click "Delete" on a task and confirm
2. ✅ Task is removed from the list

---

### Test 8: Token Expiration

**State:** No token in localStorage  
**Intent:** Access protected route  
**Action:** Navigate to /tasks

1. Delete `token` from Local Storage (DevTools → Application)
2. Refresh `/tasks` page
3. ✅ Should redirect to `/login`

---

### Test 9: Protected Routes

**State:** Unauthenticated user  
**Intent:** Access protected route  
**Action:** Navigate directly to /tasks

1. Logout, then navigate directly to `/tasks`
2. ✅ Should redirect to `/login`

---

### Test 10: Dark Mode

**State:** Current theme  
**Intent:** Toggle theme  
**Action:** Click theme toggle (🌙/☀️)

1. Click theme toggle in navbar
2. ✅ Theme switches (light ↔ dark)
3. Refresh page → ✅ Preference persists

---

### Test 11: Refresh Token

**State:** Token expired/missing  
**Intent:** Continue session  
**Action:** Perform any API action

**Scenario A:** Delete `token` only (DevTools → Local Storage)
- ✅ Auto-refreshes and continues working
- ✅ New tokens generated

**Scenario B:** Delete both `token` + `refreshToken`
- ✅ Redirects to `/login`

---

### Test 12: Export to CSV

**State:** Tasks displayed  
**Intent:** Export data  
**Action:** Click "📊 Export CSV"

1. Create tasks with subtasks
2. Export with no selection → ✅ All tasks exported
3. Select 1-2 tasks → ✅ Only selected exported
4. ✅ CSV contains configured fields (Settings)
5. **Subtasks:** Enabled → separate rows with parent column | Disabled → parent tasks only

---

### Test 13: File Upload

**State:** Task form open  
**Intent:** Attach file  
**Action:** Select file (max 5MB)

1. Open task form → Select file
2. ✅ File name appears
3. Save task → ✅ Attachment link (📎) visible
4. Click link → ✅ Opens/downloads file

---

### Test 14: Mobile Responsive

**State:** Desktop view  
**Intent:** Test mobile layout  
**Action:** Open DevTools (F12) → Toggle device mode (Ctrl+Shift+M)

**Test @375px width:**
- ✅ Vertical button stacking
- ✅ Full-width inputs
- ✅ Modal fits screen
- ✅ 44px min touch targets
- ✅ All features functional

---

### Test 15: Recurring Tasks

**State:** Task form open  
**Intent:** Set recurrence  
**Action:** Select "Repeat" (Daily/Weekly/Monthly)

1. Create task with recurrence + optional end date
2. ✅ Shows badge (🔄 Daily/Weekly/Monthly)
3. Complete task → ✅ Next occurrence auto-created with same settings

---

### Test 16: Task Templates

**State:** Task form filled  
**Intent:** Save as template  
**Action:** Click "📋" button

1. Fill task form → Click "📋" → Name template
2. ✅ Template saved
3. Click "📋 Templates" → Select template
4. ✅ Task form opens pre-filled → Create task

---

### Test 17: Analytics Dashboard

**State:** Tasks displayed  
**Intent:** View statistics  
**Action:** Click "📈 Analytics"

**Displays:**
- Total, Active, Completed, Overdue counts
- High priority count
- Weekly/monthly created
- Priority breakdown

✅ Updates on data changes

---

### Test 18: Task Reminders

**State:** Tasks displayed  
**Intent:** View overdue/upcoming  
**Action:** Click "📧 Reminders"

1. Create tasks: 1 overdue, 1 due in 12h, 1 due in 2 days
2. ✅ Shows overdue + upcoming (≤24h)
3. Complete overdue → ✅ Disappears from list

---

### Test 19: Bulk Operations

**State:** Multiple tasks displayed  
**Intent:** Perform batch action  
**Action:** Select tasks → Click bulk action

1. Create 3-4 tasks
2. Click checkbox on first task card
3. ✅ Task card should show blue border (selected)
4. Click checkbox on 2 more tasks
5. ✅ Bulk action toolbar should appear showing "3 task(s) selected"
6. Click "Change Status" -> Completed
7. Confirm the action
8. ✅ Selected tasks should be marked as completed
9. Select 2 more tasks
10. Click "🗑️ Delete Selected"
11. Confirm the action
12. ✅ Selected tasks should be deleted
13. Click "Select All" button
14. ✅ All tasks should be selected
15. Click "Deselect All" or "Clear"
16. ✅ All selections should be cleared

**Validation:**
- Bulk complete only affects incomplete tasks
- Recurring tasks create next occurrences when bulk completed
- Bulk operations show confirmation dialogs
- Selection persists during search/filter/sort operations

---

### Test 20: Keyboard Shortcuts

**State:** Task list view  
**Intent:** Quick actions  
**Action:** Press keyboard shortcuts

1. Press `n` → ✅ Task modal opens
2. Close modal → Press `s` → ✅ Search focused
3. Press `/` → ✅ Search focused
4. Type in search → Press `n` → ✅ Should NOT open modal (disabled while typing)
5. Go to Settings → Change shortcuts → Test new keys work

**Default:** `n`=new task, `s` or `/`=focus search  
**Configurable:** Settings → Keyboard Shortcuts

---

### Test 21: Task Duplication

**State:** Task displayed  
**Intent:** Create similar task  
**Action:** Click duplicate button

1. Create task with properties (title, description, priority, tags, due date, attachment)
2. Click "📋" duplicate button
3. ✅ New task appears with "(Copy)" suffix
4. ✅ All properties copied except completion status
5. ✅ Duplicated task is independent

---

### Test 22: Quick Filters

**State:** Task list displayed  
**Intent:** Filter quickly  
**Action:** Click quick filter button

1. Create tasks: due today, this week, high priority
2. Click "📅 Today" → ✅ Shows only today's tasks
3. Click again → ✅ Clears filter
4. Click "📆 This Week" → ✅ Shows next 7 days
5. Click "🔴 High Priority" → ✅ Shows priority 2 only
6. ✅ Filters work with search

---

### Test 23: Task Archiving

**State:** Completed task displayed  
**Intent:** Archive task  
**Action:** Click archive/show archived

1. Complete task → ✅ "📦 Archive" appears
2. Click "📦 Archive" → ✅ Task hidden
3. Click "📦 Show Archived" → ✅ Shows only archived
4. Click "📤 Unarchive" → ✅ Task restored

---

### Test 24: Tag Colors

**State:** Tasks with tags  
**Intent:** Visual identification  
**Action:** Display colored badges

1. Create task with "Work" → ✅ Colored badge (auto-generated)
2. Create another "Work" → ✅ Same color (DB persisted)
3. Create "Personal" → ✅ Different color

---

### Test 25: Browser Notifications

**State:** Tasks with due dates  
**Intent:** Automatic alerts  
**Action:** Show notifications

1. Navigate to `/tasks` → ✅ Permission requested
2. Create task due in 1 hour → ✅ "⏰ Due Soon" notification
3. Create overdue task → ✅ "⚠️ Overdue" notification
4. Complete task → ✅ Notification stops
5. Settings → Toggle notifications → ✅ Can disable/enable

---

### Test 26: Task Notes

**State:** Task form open  
**Intent:** Add context  
**Action:** Enter notes

1. Create task → Enter notes → ✅ Notes appear on card (italic, muted)
2. Edit task → ✅ Notes pre-filled → Update → ✅ Notes persist

---

### Test 27: User Settings

**State:** Settings page  
**Intent:** Configure defaults  
**Action:** Update settings → Save

1. Navigate to Settings → Update defaults (priority, date format, sort)
2. Save → ✅ "✓ Saved!" confirmation
3. Create new task → ✅ Defaults applied
4. ✅ Settings persist across refreshes

---

### Test 28: Configurable Theme

**State:** Settings page  
**Intent:** Customize theme  
**Action:** Select accent color

1. Settings → Select accent color → ✅ Applies immediately
2. ✅ Persists across refreshes
3. ✅ Works in dark/light themes

---

### Test 29: Configurable Filters

**State:** Settings page  
**Intent:** Save filter presets  
**Action:** Create preset → Save

1. Settings → Filter Presets → Create preset (name, search, status, sort)
2. Tasks page → Select preset → ✅ Filters applied
3. ✅ Presets persist

---

### Test 30: Configurable Export

**State:** Settings page  
**Intent:** Configure CSV export  
**Action:** Select fields → Set date format → Save

1. Settings → Export Settings → Select fields + date format
2. Export CSV → ✅ Only selected fields, correct date format

---

### Test 31: Configurable UI

**State:** Settings page  
**Intent:** Customize task card display  
**Action:** Toggle field visibility → Save

1. Settings → UI Customization → Toggle fields
2. ✅ Task cards show/hide fields accordingly
3. ✅ Settings persist

---

### Test 32: Configurable Search

**State:** Settings page  
**Intent:** Configure search fields  
**Action:** Toggle search fields → Save

1. Settings → Search Configuration → Disable fields
2. Search tasks → ✅ Only enabled fields searched
3. ✅ Settings persist

---

### Test 33: Configurable Sorting

**State:** Settings page  
**Intent:** Set default sort  
**Action:** Configure sort → Save

1. Settings → Set default sort + remember option
2. Tasks page → ✅ Default sort applied
3. Change sort → Refresh → ✅ Remembers if enabled, reverts if disabled

---

### Test 34: Time Tracking

**State:** Task displayed  
**Intent:** Track time spent  
**Action:** Start timer → Stop timer

1. Click "▶️" → ✅ Timer runs (increments every second)
2. Click "⏹️" → ✅ Time saved
3. Start timer on different task → ✅ Previous timer stops
4. ✅ Time persists across refreshes

---

### Test 35: Task History

**State:** Task displayed  
**Intent:** View audit log  
**Action:** Click history button

1. Click "📜" → ✅ Modal shows history (newest first)
2. Create/Edit/Complete/Archive → ✅ Actions logged

---

### Test 36: Task Time Estimates

**State:** Task form open  
**Intent:** Set time estimate  
**Action:** Enter estimated time

1. Create task → Enter estimated time (e.g., 60 min)
2. ✅ Card shows "📊 Est: 1h"
3. Track time → ✅ Shows comparison (green if under, red if over)

---

### Test 37: Import from CSV

**State:** Task list displayed  
**Intent:** Import tasks from file  
**Action:** Click "Import CSV" → Select file

1. Click "📥 Import CSV" → Select file
2. ✅ Tasks imported with all fields mapped
3. ✅ Subtasks linked to parent by title
4. ✅ Flexible field matching (case-insensitive)

---

### Test 38: Task Status Workflow

**State:** Task form open  
**Intent:** Set task status  
**Action:** Select status → Save

1. Create task → Select status (Active/InProgress/OnHold/Completed/Cancelled)
2. ✅ Status badge displayed with color
3. Completed → ✅ Strikethrough
4. Status filter → ✅ Filters by status

---

### Test 39: Task Dependencies

**State:** Multiple tasks displayed  
**Intent:** Link tasks  
**Action:** Add dependency

1. Create Task A, Task B
2. Edit Task B → Select Task A in "Depends On"
3. ✅ Task B blocked until Task A completed
4. ✅ Circular dependencies prevented

---

### Test 40: Task Subtasks

**State:** Task displayed  
**Intent:** Break down task  
**Action:** Create subtask

1. Edit parent task → Add subtasks
2. ✅ Parent shows progress (e.g., "1/2 subtasks")
3. ✅ Subtasks excluded from main list

---

### Test 41: Calendar View

**State:** Task list displayed  
**Intent:** View tasks by date  
**Action:** Navigate to calendar

1. Navigate to `/calendar` → ✅ Month/Week/Day views
2. ✅ Tasks appear on due dates
3. Click date "+" → ✅ Task modal opens with date pre-filled
4. Navigation (←/→/Today) → ✅ Works in all views

---

### Test 42: Multiple Tags

**State:** Task form open  
**Intent:** Add tags to task  
**Action:** Enter tags → Add

1. Type tag → ✅ Autocomplete suggestions (from backend)
2. Press Enter or click Add → ✅ Tag added
3. ✅ Duplicates prevented
4. ✅ Tags displayed as color-coded badges
5. Search by tag → ✅ Finds tasks

---

### Test 43: Drag and Drop Reordering

**State:** Task list displayed  
**Intent:** Customize task order  
**Action:** Drag task → Drop

1. Drag task → ✅ Visual feedback (opacity, border)
2. Drop → ✅ Order updated
3. ✅ Custom order persists across refreshes

---

### Test 44: Unit Tests

**State:** Test environment  
**Intent:** Verify functionality  
**Action:** Run test suite

**Backend:**
```bash
cd backend/SmartTaskTracker.API.Tests
dotnet test
```
✅ Should run all tests (AuthService: 6 tests, TaskService: 6 tests)

**Frontend:**
```bash
cd frontend
npm test
```
✅ Should run all tests (authService, ThemeContext, useTasks)

---

### Test 45: Search (semantic with keyword fallback)

**State:** Task list displayed, search box visible  
**Intent:** Find tasks by meaning; fallback to keyword when no semantic match  
**Action:** Type in search box

1. Type a phrase (e.g. `things to discuss with the team` or `meetings`).
2. ✅ List shows tasks by semantic similarity. If no semantic results (or no API key), backend falls back to keyword search and list shows keyword matches.
3. Clear search or click **Clear Filter** → ✅ List shows all (or filtered by other filters).

**Validation:**
- Search is always semantic-first; keyword fallback when semantic returns 0 (or API unavailable).
- No dropdown; one search box.

**Semantic query expectations (seed data):**  
Semantic = embedding similarity on **title + description + priority label + tag names + first 100 chars of notes**. Results have a `score`; order and extra hits depend on threshold (default 0.25).

| Query | Expect (seed tasks) | Note |
|-------|---------------------|------|
| `meetings` | **Complete sprint retrospective** first | May also get Schedule dentist appointment, Plan weekend trip (scores above threshold). |
| `things to discuss with the team` | **Complete sprint retrospective** first; may get Plan weekend trip | No "meeting" in query → semantic. |
| `writing docs or documentation` | **Complete project documentation** | |
| `food or shopping for food` | **Buy groceries** first | May get Plan weekend trip (description has "restaurants"). |
| `dentist or health checkup` | **Schedule dentist appointment** | |
| `code review or pull request` | **Review code changes** | |
| `vacation or weekend travel` | **Plan weekend trip** | No "trip" in query → semantic. |
| `urgent work` | May get **Complete project documentation**, **Review code changes** (both High priority / Urgent tag in seed) | We embed priority label + tag names; "urgent work" can match. Order may vary. |

---

### Test 46: Suggested next (“What’s next?”)

**State:** Task list displayed  
**Intent:** See suggested next tasks (priority, due date, ready to start)  
**Action:** Click “What’s next?” → Use suggestions

1. Create several tasks: at least one high priority, one due soon, one with no dependencies.
2. Click **What’s next?** (next to “+ Add Task”).
3. ✅ A “Suggested next” panel appears below the toolbar.
4. ✅ Panel lists tasks with optional reason (e.g. “High priority”, “Due soon”, “Ready to start”).
5. Click a suggested task title → ✅ Task edit modal opens for that task.
6. Click **×** (or close panel) → ✅ Panel closes.

**Validation:**
- Empty list → “No suggestions.” or empty panel.
- Loading → “Loading…” shown briefly.
- Suggestions are ordered by priority, then due date, then ready to start (DB-only; no AI).

---

### Test 47: Natural language task (“Add from text”)

**State:** Tasks page, user wants to create a task from free text.  
**Intent:** Get structured task (title, due date, priority) from natural language.  
**Action:** Type in “Add from text” input → click “Add from text” → edit in modal → Create.

1. Find the **“Add from text”** input (placeholder: “e.g. Review report by Friday, high priority”).
2. Enter: `Review report by Friday, high priority`.
3. Click **Add from text** (or press Enter).
4. ✅ Create-task modal opens with **Title** “Review report” (or similar), **Due date** set to next Friday, **Priority** High (or pre-filled from parse).
5. Adjust if needed, click **Create Task** → ✅ Task appears in list.

**Validation:**
- Empty input → “Add from text” button disabled.
- With LLM key: parsing uses API; without: keyword fallback (e.g. “high priority”, “by Friday”, “tomorrow”).
- Modal shows parsed fields; user can edit before creating.

#### Quick test list (Add from text → check modal, then Create)

| # | Input (text) | Expected title | Expected due | Expected priority | Expected description |
|---|--------------|----------------|--------------|-------------------|----------------------|
| 1 | `Review report by Friday, high priority` | Review report | Next Friday 00:00 | High (2) | — |
| 2 | `REVIEW REPORT BY FRIDAY high priority` | Review report | Next Friday 00:00 | High (2) | — |
| 3 | `tomorrow morning jog high prio` | Jog | Tomorrow 08:00 | High (2) | Morning |
| 4 | `review report by friday at 3pm` | Review report | Next Friday 15:00 | Medium (1) | — |
| 5 | `Call mom tomorrow` | Call mom | Tomorrow 00:00 | Medium (1) | — |
| 6 | `low prio admin task next week` | Admin task | Next Monday 00:00 | Low (0) | — |
| 7 | `urgent fix bug tomorrow` | Fix bug | Tomorrow 00:00 | High (2) | — |
| 8 | `meeting at 10am` | Meeting | — (no date phrase) | Medium (1) | — |
| 9 | `(empty)` | — | Button disabled | — | — |

**Notes:** Times in UTC. “Next Friday” = next occurrence of that weekday. With `OPENAI_API_KEY` set, LLM may return slightly different wording; fallback (no key) uses keyword rules above.

---

## Expected Behaviors

✅ **Loading States:**
- Spinner shows when fetching tasks
- Buttons show "Loading..." during async operations
- Forms disable during submission

✅ **Error Handling:**
- Validation errors show inline
- API errors show user-friendly messages
- 401 errors auto-redirect to login (token expired, user not in DB, etc.)

✅ **Server wake (Render free tier / backend down):**
- Login/register: health check first → if server down, banner shows; no "invalid credentials"
- Banner: "Server is waking up. Retrying automatically every 10s." Dismiss or wait
- When server is back: banner hides; login/register/tasks/settings auto-retry

✅ **Validation:**
- Client-side: Immediate feedback
- Server-side: Consistent error format

---
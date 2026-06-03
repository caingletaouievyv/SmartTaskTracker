# UI

Frontend layout, theme, components, and UX conventions. Engineering rules: [architecture.md](architecture.md). Product and API: [project.md](project.md).

---

## Routing

| Route | Page | Auth |
|-------|------|------|
| `/login` | Login | Public |
| `/register` | Register | Public |
| `/tasks` | Main task dashboard | Required |
| `/calendar` | Calendar view | Required |
| `/settings` | User preferences | Required |

Unauthenticated access to protected routes redirects to `/login`.

---

## Global chrome

**Navbar:** App title, navigation (Tasks, Calendar, Settings), theme toggle, logout.

**Dialog:** Shared modal for alerts, confirmations, and prompts (`Dialog.jsx`, `useDialog`). Supports Enter / Escape.

**ServerWakeBanner:** Shown when the backend is cold-starting (Render free tier). Auto-retry; auth flows check `GET /api/health` first to avoid false "invalid credentials" errors.

---

## Tasks page layout

**Top row:** Search (left); Select All and + Add Task (right). No page heading.

**Filter row:** Show Archived; quick filters (Today, This Week, High Priority); status and sort controls; Filter Preset; What's next?; Clear Filter when active.

**Task list:** `TaskCard` per task; drag-and-drop reorder; bulk selection with `BulkActionsBar`.

**Panels (collapsible):** Templates, Analytics, Reminders.

**Modals:** `TaskModal` (create/edit), `TasksSuggestionsModal` (What's next?).

**Search:** Placeholder "Search by meaning or keyword…". Semantic search when configured; keyword fallback otherwise.

**Add task:** Primary + Add Task opens blank modal. Adjacent AI control opens dropdown with Add from text (natural language prefill).

**Back to top:** Appears on scroll (Tasks and Settings).

---

## Task card and modal

**TaskCard:** Configurable fields via Settings (`uiFields`). Priority, status, tags (color badges), due date, recurrence, notes, attachment, timer, subtask progress.

**TaskModal:** Full create/edit form; subtasks; Depends On with dependency suggestions; smart tag suggestions while typing; file attachment; time estimate.

---

## Calendar page

Month, week, and day views. Tasks shown on due dates. Navigate with arrows and Today. Create task with date pre-filled from selected day.

---

## Settings page

Sections: defaults (priority, recurrence, reminders), theme and accent, date format, sort preferences, export fields and format, visible task card fields, search fields, keyboard shortcuts, filter presets.

Accent colors: gray, blue, purple, green, orange, red, teal (`ThemeContext`).

Settings persist via `PUT /api/settings`.

---

## Theme

**Dark / light:** Toggle in Navbar; persisted in localStorage and user settings when authenticated. Respects system preference when no saved choice.

**Accent:** CSS variable `--accent-primary` from selected accent color. Applied to buttons, links, and highlights.

**Implementation:** `ThemeContext.jsx`, `data-theme` on `document.documentElement`.

---

## Keyboard shortcuts

Default (configurable in Settings):

| Key | Action |
|-----|--------|
| `n` | New task |
| `s` or `/` | Focus search |

Shortcuts are ignored while typing in inputs unless configured otherwise.

---

## Notifications

Browser notifications for overdue and upcoming tasks when enabled in Settings. Permission requested on first use. Requires HTTPS or localhost.

---

## Responsive behavior

Mobile-first layout. Filter row wraps on narrow viewports. Touch-friendly controls on task cards and modals. Test at ~375px width.

---

## Component map

| Component | Role |
|-----------|------|
| `Navbar.jsx` | Navigation, theme, logout |
| `TaskCard.jsx` | Single task display |
| `TaskModal.jsx` | Create/edit task |
| `BulkActionsBar.jsx` | Bulk status change and delete |
| `TasksFilterToolbar.jsx` | Filters, sort, presets, What's next? |
| `TasksSearchAndAddToolbar.jsx` | Search, select all, add task / AI menu |
| `TasksSuggestionsModal.jsx` | What's next? list |
| `TasksTemplatesPanel.jsx` | Template list and apply |
| `TasksAnalyticsPanel.jsx` | Analytics summary |
| `TasksRemindersPanel.jsx` | Overdue and upcoming |
| `TaskHistory.jsx` | Audit log modal |
| `ServerWakeBanner.jsx` | Cold-start messaging |

**Hooks:** `useTasks`, `useSettings`, `useDialog`, `useTimer`, `useNotifications`, `useKeyboardShortcuts`.

**Contexts:** `AuthContext`, `ThemeContext`.

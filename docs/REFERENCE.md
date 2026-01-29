# Reference

**State:** Schema, setup, unit test todos.  
**Intent:** Look up when needed.  
**Action:** Use sections below.

---

## Backend setup

1. In `backend/SmartTaskTracker.API` create `appsettings.Development.json`:
   ```json
   { "Jwt": { "Key": "YOUR_SECRET_KEY_HERE_MIN_32_CHARS" } }
   ```
2. Or set env: `JWT_KEY=...` (min 32 chars).
3. Run: `dotnet restore` then `dotnet run`.

Never commit `appsettings.Development.json` (in .gitignore).

---

## Database schema (short)

**Tables:** Users, Tasks, TaskTemplates, TaskHistory, TaskDependencies, Tags, TaskTags, UserSettings.

**Relations:** Users 1:N Tasks/TaskTemplates/Tags; Users 1:1 UserSettings; Tasks N:M Tags (TaskTags); Tasks N:M Tasks (TaskDependencies); Tasks 1:N TaskHistory; Tasks 1:N Tasks (ParentTaskId).

**Enums:** Priority 0–2 (Low/Medium/High), RecurrenceType 0–3 (None/Daily/Weekly/Monthly), TaskStatus 0–4 (Active/InProgress/OnHold/Completed/Cancelled).

Full table/column list: see repo history (was `DATABASE_SCHEMA.md`).

---

## Unit test todos

**Done:** AuthService (backend), authService + ThemeContext (frontend), TaskServiceTests, useTasks.

**Backend missing:** SettingsService, TagService, TaskTemplateService.

**Frontend missing:** taskService, settingsService, tagService, taskTemplateService, analyticsService, reminderService, taskHistoryService; useSettings, useDialog, useTimer, useNotifications, useKeyboardShortcuts; TaskCard, TaskModal, Dialog, TaskHistory, Navbar; AuthContext.

**Priority:** Critical = TaskService ✅; High = useTasks ✅, TaskCard, TaskModal; then services/hooks; then components.

**Pattern:** State → Intent → Action. Backend: xUnit `[Fact]`; Frontend: Vitest `describe`/`it`.

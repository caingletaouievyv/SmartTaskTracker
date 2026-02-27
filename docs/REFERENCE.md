# Reference

Schema, setup, unit test todos. Use sections below when you need to look something up. Code and docs (AI, REFERENCE, TESTING) stay in sync.

---

## Backend setup

1. In `backend/SmartTaskTracker.API` create `appsettings.Development.json`:
   ```json
   { "Jwt": { "Key": "YOUR_SECRET_KEY_HERE_MIN_32_CHARS" } }
   ```
2. Or set env: `JWT_KEY=...` (min 32 chars).
3. Run: `dotnet restore` then `dotnet run`.

Never commit `appsettings.Development.json` (in .gitignore).

**Error handling:** `ErrorHandlingMiddleware` maps `UnauthorizedAccessException`, `SecurityTokenExpiredException`, `SecurityTokenException` → 401. `SettingsService` checks user exists before creating `UserSettings` (avoids FK; throws if user missing → 401).

---

## Database schema (short)

**API (not in schema):** `GET /api/health` — no auth; used for cold-start check (Render free tier). Returns `{ "status": "ok" }`.

**Tables:** Users, Tasks, TaskTemplates, TaskHistory, TaskDependencies, Tags, TaskTags, UserSettings, TaskEmbeddings.

**Relations:** Users 1:N Tasks/TaskTemplates/Tags; Users 1:1 UserSettings; Tasks N:M Tags (TaskTags); Tasks N:M Tasks (TaskDependencies); Tasks 1:N TaskHistory; Tasks 1:N Tasks (ParentTaskId). TaskEmbeddings: TaskId (PK), UserId, EmbeddingJson; invalidated on task update/delete.

**On register:** One sample task is created per user (all fields "Sample" prefixed; no dependencies so dependency suggestions have no seed data). See `TaskService.CreateSampleTaskForUserAsync`, called from `AuthService.RegisterAsync`.

**Enums:** Priority 0–2 (Low/Medium/High), RecurrenceType 0–3 (None/Daily/Weekly/Monthly), TaskStatus 0–4 (Active/InProgress/OnHold/Completed/Cancelled).

Full table/column list: see repo history (was `DATABASE_SCHEMA.md`).

---

## Unit test todos

**Done:** AuthService (backend), authService + ThemeContext (frontend), TaskServiceTests, useTasks.

**Backend missing:** SettingsService, TagService, TaskTemplateService.

**Frontend missing:** taskService, settingsService, tagService, taskTemplateService, analyticsService, reminderService, taskHistoryService; useSettings, useDialog, useTimer, useNotifications, useKeyboardShortcuts; TaskCard, TaskModal, Dialog, TaskHistory, Navbar; AuthContext.

**Priority:** Critical = TaskService ✅; High = useTasks ✅, TaskCard, TaskModal; then services/hooks; then components.

**Pattern:** Backend: xUnit `[Fact]`; Frontend: Vitest `describe`/`it`.

---

## Deploy (Render + Netlify)

**Backend (Render):** Docker (`backend/SmartTaskTracker.API/Dockerfile`). Root Dir = `backend/SmartTaskTracker.API`, Environment = Docker. **Env in dashboard:** `JWT_KEY` (required), `FRONTEND_URL` = Netlify URL with `https://` (required for CORS). DB = PostgreSQL (Render free); `DATABASE_URL` auto when linked. Optional: `SEED_DATABASE=true` to reset seed user and run seed every startup; `false` to stop.

**Frontend (Netlify):** Base dir = `frontend`, publish = `dist`. **Env:** `VITE_API_URL` = Render API URL (e.g. `https://xxx.onrender.com/api`).

**CORS:** Backend allows only `FRONTEND_URL` + localhost. Set `FRONTEND_URL` in Render and redeploy. Full steps: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## AI features (current)

**Current:** Semantic search + NL task + smart tagging + dependency suggestions implemented. "What's next?" = DB ranking only (not AI).

**NL task:** `POST /api/tasks/from-natural-language` → `CreateTaskDto`. Tags normalized to first letter capital. UI: **+ Add Task** (main = blank modal; sparkle = "Add from text"). LLM key: env or `TaskMemory:LlmApiKey`; no key = keyword fallback.

**Smart tagging** ✅ — full text first; if no results, tries each word. **Dependency suggestions** ✅ — query uses **title + description only** (same as smart tagging); from similar tasks' dependencies; results merge pattern-based (what similar tasks depend on) + similar-task candidates; shared meaningful word (weekend/saturday/sunday as one concept) boosts score. **Next:** [AI.md](AI.md).

### Follow the code (trace flows) — AI features

**Semantic search**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/pages/Tasks.jsx` — search input; value in `search` state. |
| 2 | Frontend | `frontend/src/hooks/useTasks.js` — when `search` non-empty, calls `taskService.search(trimmed)`. |
| 3 | Frontend | `frontend/src/services/taskService.js` — `search()` → `GET /api/tasks/search?query=...`. |
| 4 | Backend | `Controllers/TasksController.cs` — `Search()` (route `[HttpGet("search")]`). |
| 5 | Backend | `Services/TaskMemoryService.cs` — `SearchSemanticAsync()`: load tasks → build text → embeddings (LRUCache) → cosine similarity → return `TaskSearchResultDto` list. |
| 6 | Fallback | Same controller: if semantic returns 0 results and query not empty, calls `TaskService.GetTasksAsync(..., search, ...)` (keyword); `TaskService.cs` (title, description, tags, fileName). |

Key backend files: `TaskMemoryService.cs`, `TaskMemoryOptions.cs`, `Helpers/LRUCache.cs`.

**Natural language task (Add from text)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/pages/Tasks.jsx` — sparkle dropdown, "Add from text" input; submit calls `taskService.parseNaturalLanguage(nlInput)`. |
| 2 | Frontend | `frontend/src/services/taskService.js` — `parseNaturalLanguage(text)` → `POST /api/tasks/from-natural-language` body `{ text }`. |
| 3 | Backend | `Controllers/TasksController.cs` — `ParseNaturalLanguage()` → `NaturalLanguageTaskService.ParseAsync(request.Text)`. |
| 4 | Backend | `Services/NaturalLanguageTaskService.cs` — `ParseAsync()`: LLM or keyword fallback; `MergeFallback()`. |
| 5 | Fallback | Same file: `ParseKeywordFallback()` uses `NaturalLanguageParseHelper`. |

Key backend files: `NaturalLanguageTaskService.cs`, `Helpers/NaturalLanguageParseHelper.cs`, `Helpers/TaskMemoryOptions.cs`.

**Smart tagging**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | TaskModal — debounced title/description → `getSuggestedTags(text)`. |
| 2 | Frontend | taskService.getSuggestedTags(text, topK) → `GET /api/tasks/suggest-tags`. |
| 3 | Backend | TasksController — SuggestTags(text, topK) → TaskMemoryService.SuggestTagsAsync. |
| 4 | Backend | TaskMemoryService.SuggestTagsAsync — embed text, similar tasks, tag frequency; if no results, try each word; return TagSuggestionDto. |

Key: `GET /api/tasks/suggest-tags?text=...&topK=5`. DTO: `TagSuggestionDto` in TaskSearchDto.cs.

**Dependency suggestions**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | TaskModal — Depends On, "From similar tasks" button → getSuggestedDependencies(taskId). |
| 2 | Frontend | taskService.getSuggestedDependencies(taskId, topK) → `GET /api/tasks/{id}/suggest-dependencies`. |
| 3 | Backend | TasksController — SuggestDependencies(id, topK) → TaskMemoryService.SuggestDependenciesAsync. |
| 4 | Backend | TaskMemoryService.SuggestDependenciesAsync — embed task title + description, similar tasks, TaskDependencies, return TaskDependencySuggestionDto. |

Key: `GET /api/tasks/{id}/suggest-dependencies?topK=5`. DTO: `TaskDependencySuggestionDto` in TaskSearchDto.cs.

---

## Core & workflow

**Auth (register / login)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/pages/Login.jsx` (or Register) — form submit calls `authService.login()` / `authService.register()`. |
| 2 | Frontend | `frontend/src/services/authService.js` — `login()` → `POST /api/auth/login`; `register()` → `POST /api/auth/register`. |
| 3 | Backend | `Controllers/AuthController.cs` — `Login()`, `Register()` → `AuthService.LoginAsync`, `RegisterAsync`. |
| 4 | Backend | `Services/AuthService.cs` — validate credentials / create user; on register, `CreateSampleTaskForUserAsync(user.Id)`. JWT: `JwtHelper.GenerateToken`. |

Key backend files: `AuthService.cs`, `Helpers/JwtHelper.cs`, `Helpers/JwtOptions.cs`.

**Task CRUD (list, create, update, delete)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/hooks/useTasks.js` — `fetchTasks()` → taskService.getAll(params); create/update/delete → taskService.create/update/delete. |
| 2 | Frontend | `frontend/src/services/taskService.js` — getAll → `GET /api/tasks`; create → `POST /api/tasks`; update → `PUT /api/tasks/{id}`; delete → `DELETE /api/tasks/{id}`. |
| 3 | Backend | `Controllers/TasksController.cs` — GetTasks, Create, Update, Delete → `TaskService.GetTasksAsync`, `CreateTaskAsync`, `UpdateTaskAsync`, `DeleteTaskAsync`. |
| 4 | Backend | `Services/TaskService.cs` — query/filter/sort in GetTasksAsync; TaskMapper for DTOs; tags via UpdateTaskTagsAsync, GetOrCreateTagAsync. |

Key backend files: `TaskService.cs`, `Helpers/TaskMapper.cs`, `Data/AppDbContext.cs`.

**Search (keyword + semantic)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/pages/Tasks.jsx` — search input; `frontend/src/hooks/useTasks.js` — when search non-empty, taskService.search(trimmed) else getAll. |
| 2 | Frontend | `frontend/src/services/taskService.js` — search() → `GET /api/tasks/search?query=...`. |
| 3 | Backend | `Controllers/TasksController.cs` — Search() → TaskMemoryService.SearchSemanticAsync; if 0 results, TaskService.GetTasksAsync (keyword). |

See also: **AI features** trace for semantic search (TaskMemoryService, embeddings).

**Filters & sort**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | `frontend/src/pages/Tasks.jsx` — filter state (status, dueDate, priority, tags, sortBy); passed to useTasks. |
| 2 | Frontend | `frontend/src/hooks/useTasks.js` — fetchTasks(search, status, sortBy, includeArchived, dueDate, priority, tags) → taskService.getAll with params. |
| 3 | Backend | `TaskService.GetTasksAsync` — filters by status, dueDate, priority, tags; OrderBy (sortBy). Filter presets: SettingsService, UserSettings. |

**Bulk operations**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | Tasks page — selection state; bulk Delete / Complete buttons → taskService.bulkDelete(taskIds), bulkComplete(taskIds). |
| 2 | Frontend | taskService — `POST /api/tasks/bulk-delete`, `POST /api/tasks/bulk-complete`. |
| 3 | Backend | TasksController — BulkDelete, BulkComplete → TaskService.BulkDeleteAsync, BulkCompleteAsync. |

**What's next? (DB ranking)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | Tasks page — "What's next?" panel; taskService.getSuggestions() → `GET /api/tasks/ai-suggestions`. |
| 2 | Backend | TasksController — GetSuggestions → TaskService.GetSuggestionsAsync (DB ranking, not embeddings). |
| 3 | Backend | TaskService.GetSuggestionsAsync — suggested tasks + reason (e.g. overdue, high priority). |

**Export / Import**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 (Export) | Frontend | Tasks page — Export CSV builds CSV in browser from tasks + settings.exportFields, settings.exportIncludeSubtasks; download link. No backend export endpoint. |
| 2 (Import) | Frontend | Tasks page — Import CSV → taskService.importCsv(file) → `POST /api/tasks/import-csv`. |
| 3 (Import) | Backend | TasksController — ImportCsv → TaskService.ImportCsvAsync. |

**Extras (recurring, templates, duplicate, calendar, reminders, analytics, time, history)**

| Area | Where | What to look at |
|------|--------|------------------|
| Recurring | TaskService | CreateNextRecurrenceAsync on complete; RecurrenceType, RecurrenceEndDate. |
| Templates | TaskTemplatesController, TaskTemplateService | Save as template → create from template. |
| Duplicate | Frontend | Create task with same data (or backend duplicate endpoint if present). |
| Calendar / Reminders / Analytics / Time / History | Respective controllers and services | Calendar, Reminders, Analytics, TaskService time/history. |

**UI (dark mode, accent, shortcuts, notifications, archive)**

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | ThemeContext (dark mode); Settings → accent; keyboard shortcuts (e.g. `n`, `s`, `/`); notifications; Archive / Show Archived in Tasks. |
| 2 | Backend | UserSettings (theme, accent); archive → task.IsArchived, TaskService filter includeArchived. |

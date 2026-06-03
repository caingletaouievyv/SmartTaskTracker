# Project

Product scope, repository layout, domain rules, API reference, flows, tests, deployment, and current state. Engineering standards: [architecture.md](architecture.md). UI details: [ui.md](ui.md).

---

## Scope

SmartTaskTracker is a full-stack task management application: JWT authentication, rich task workflows, CSV import/export, filters and bulk operations, calendar and reminders, user settings, and optional AI-assisted search and task creation.

**Live:** [Frontend](https://smarttasktracker.netlify.app/) · [Backend API](https://smarttasktracker-kue7.onrender.com)

**Stack:** React (Vite) frontend; ASP.NET Core 9 API; SQLite locally, PostgreSQL in production; hosted on Netlify and Render.

---

## Current state

| Area | Status |
|------|--------|
| Core task CRUD | Complete |
| Auth (register, login, refresh) | Complete |
| Search, filters, bulk, templates | Complete |
| Calendar, reminders, analytics | Complete |
| CSV import/export | Complete |
| AI: semantic search, NL create, tag/dependency suggestions | Complete (requires API keys) |
| What's next? | Complete (database ranking, not LLM) |
| Production deployment | Live on Netlify + Render |
| Unit tests | Backend (xUnit), frontend (Vitest) |

---

## Project layout

What exists and where to look.

### Root

| Path | Purpose |
|------|---------|
| `README.md` | Overview, quick start, demo, doc links |
| `.gitignore` | Git ignore rules |
| `.env` | Local frontend env (optional; `VITE_API_URL` fallback in `api.js`) |
| `render.yaml` | Render backend + DB config (Blueprint); env vars set in dashboard for manual deploy |
| `netlify.toml` | Netlify frontend build (`base=frontend`, `publish=dist`) |
| `docs/docs.md` | Documentation index |
| `docs/project.md` | This file — scope, layout, API, domain, tests, deployment |
| `docs/architecture.md` | Engineering standard (layers, API contract, auth) |
| `docs/ui.md` | Frontend layout, theme, components, UX |
| `docs/demo/` | Demo GIF assets (referenced from README) |

### Frontend (`frontend/`)

```
frontend/
  index.html              HTML entry (favicon.svg)
  public/                 Static assets (favicon.svg); /favicon.ico → favicon.svg in dev
  package.json            Deps + scripts (dev, build, test)
  vite.config.js          Vite build config (+ favicon.ico rewrite)
  tailwind.config.js      TailwindCSS config
  postcss.config.js       PostCSS config
  src/
    main.jsx              App entry
    App.jsx               Root + routing
    App.css / index.css   Global styles
    components/           Reusable UI
      Navbar.jsx          Top nav + logout
      TaskCard.jsx        Single task display
      TaskModal.jsx       Create/edit task form
      ServerWakeBanner.jsx  Server cold-start banner + auto-retry (Render free tier)
      Dialog.jsx          Alerts, confirmations, prompts
      Dialog.css
      TaskHistory.jsx     Task audit log
      BulkActionsBar.jsx  Bulk selection actions (Tasks page)
      TasksFilterToolbar.jsx  Filters, sort, presets, What's next? (Tasks page)
      TasksSearchAndAddToolbar.jsx  Search, select all, Add Task / add-from-text (Tasks page)
      TasksSuggestionsModal.jsx  What's next? suggestion list modal (Tasks page)
      TasksTemplatesPanel.jsx  Templates card (Tasks page)
      TasksAnalyticsPanel.jsx  Analytics summary card (Tasks page)
      TasksRemindersPanel.jsx  Overdue / upcoming reminders card (Tasks page)
    pages/                Page views
      Login.jsx           Login form
      Register.jsx        Register form
      Tasks.jsx           Main tasks dashboard
      Calendar.jsx        Calendar view (tasks by due date)
      Settings.jsx        User settings + preferences
    contexts/             React state
      AuthContext.jsx     Auth state + login/logout/refresh
      ThemeContext.jsx    Dark/light + accent
    hooks/                Custom hooks
      useTasks.js         Task CRUD + list state (search = semantic + keyword fallback)
      useSettings.js      Load/save user settings
      useDialog.js        Dialog open/close state
      useTimer.js         Time tracking timer
      useNotifications.js Browser notifications (overdue/upcoming)
      useKeyboardShortcuts.js  Shortcuts (e.g. n=new, s=search)
    services/             API clients (Axios)
      api.js              Axios instance + auth interceptors; checkServerUp(), server-waking/server-up/server-back
      authService.js      Register, login, refresh
      taskService.js      Task CRUD, search, ai-suggestions, parseNaturalLanguage
      taskTemplateService.js  Template CRUD
      tagService.js       Tag list
      settingsService.js  User settings API
      analyticsService.js Analytics API
      reminderService.js  Reminders API
      taskHistoryService.js  Task history API
    utils/
      dateFormat.js       Date formatting
    test/
      setup.js            Vitest setup
    __tests__/            Unit tests (under contexts/, hooks/, services/)
```

Component roles and UX: [ui.md](ui.md).

### Backend (`backend/SmartTaskTracker.API/`)

```
backend/SmartTaskTracker.API/
  Program.cs               Entry + DI + CORS (FRONTEND_URL env) + DB init; seed rules in Program.cs
  Dockerfile               Build/run for Render (Docker)
  appsettings.json         Config (DB only; JWT in appsettings.Development.json or env)
  SmartTaskTracker.API.csproj
  Controllers/             REST endpoints
    AuthController.cs      Register, login, refresh
    HealthController.cs    GET /api/health (no auth; cold-start check)
    TasksController.cs     Task CRUD, bulk, archive, subtasks, dependencies, import,
                           search, ai-suggestions, from-natural-language
    TaskTemplatesController.cs  Template CRUD
    TagsController.cs      Tag list
    SettingsController.cs  User settings
  Services/                Business logic
    AuthService.cs         Auth + JWT + refresh
    TaskService.cs         Task logic
    TaskTemplateService.cs Template logic
    TagService.cs          Tag + color
    SettingsService.cs     User settings; ensures user exists before creating UserSettings
                           (avoids FK + 401 when stale token)
    TaskMemoryService.cs   Semantic search (lazy embeddings)
    NaturalLanguageTaskService.cs  NL task parse (LLM + keyword fallback)
  Models/                  Domain entities
    User.cs                User + refresh token
    Task.cs                Task (priority, status, recurrence, etc.)
    TaskTemplate.cs
    Tag.cs                 Tag + color
    TaskDependency.cs      Task → Task
    TaskHistory.cs         Audit log row
    TaskEmbedding.cs       Stored embedding vectors
    UserSettings.cs
  DTOs/                    Request/response shapes
    AuthDto.cs
    TaskDto.cs
    TaskTemplateDto.cs
    SettingsDto.cs
    ErrorDto.cs
    AnalyticsDto.cs
    ReminderDto.cs
    TaskHistoryDto.cs
    TaskSearchDto.cs       TaskSearchResultDto, TaskSuggestionDto
  Data/
    AppDbContext.cs        EF Core DbContext
    DbSeeder.cs            Dev seed data
  Helpers/
    JwtHelper.cs           JWT + refresh token generation
    JwtOptions.cs          JWT key/issuer/audience (resolved once in Program)
    TaskMapper.cs          Entity ↔ DTO
    TaskMemoryOptions.cs   TaskMemory + LLM config (provider, topK, cache, LlmProvider, LlmModel)
    TaskIntent.cs          Keyword, Semantic
    LRUCache.cs            LRU cache for embeddings
    NaturalLanguageParseHelper.cs  Date/time/priority/title/tags parsing (keyword fallback)
    PostgresConnectionString.cs  DATABASE_URL normalization for PostgreSQL
  Middleware/
    ErrorHandlingMiddleware.cs  Global error handling; auth exceptions → 401
  Properties/
    launchSettings.json    Launch config
```

Layering and API rules: [architecture.md](architecture.md).

### Tests

```
backend/SmartTaskTracker.API.Tests/
  Services/
    AuthServiceTests.cs         Auth service unit tests
    TaskServiceTests.cs         Task service unit tests
    TaskTemplateServiceTests.cs Template service unit tests
    TagServiceTests.cs          Tag service unit tests
    SettingsServiceTests.cs     Settings service unit tests
  SmartTaskTracker.API.Tests.csproj

frontend/src/
  contexts/__tests__/           ThemeContext tests
  hooks/__tests__/              useTasks tests
  services/__tests__/           api, authService, taskService tests
```

Run commands: [Automated tests](#automated-tests).

---

## Domain model

### Tables

Users, Tasks, TaskTemplates, TaskHistory, TaskDependencies, Tags, TaskTags, UserSettings, TaskEmbeddings

### Relations

- Users → Tasks, TaskTemplates, Tags (one-to-many)
- Users → UserSettings (one-to-one)
- Tasks ↔ Tags (many-to-many via TaskTags)
- Tasks ↔ Tasks (dependencies via TaskDependencies; parent/subtasks via ParentTaskId)
- Tasks → TaskHistory (one-to-many)

### Enums

| Enum | Values |
|------|--------|
| Priority | 0 Low · 1 Medium · 2 High |
| RecurrenceType | 0 None · 1 Daily · 2 Weekly · 3 Monthly |
| TaskStatus | 0 Active · 1 In Progress · 2 On Hold · 3 Completed · 4 Cancelled |

### Domain rules

- **Register:** One sample task per user (fields prefixed with "Sample"; no dependencies).
- **Dependencies:** Prerequisite must be completed before dependent task; circular dependencies rejected.
- **Recurring tasks:** Completing creates the next occurrence.
- **Archive:** Completed tasks can be archived; optional "Show Archived" filter.
- **Bulk complete:** Recurring tasks in a bulk complete create next occurrences.
- **Export:** Client-side CSV from task list using user export field settings.
- **Import:** `POST /api/tasks/import-csv` with parent/subtask columns supported.
- **Custom order:** Drag-and-drop reorder persists via `POST /api/tasks/reorder`.
- **What's next?:** Ranked suggestions from database heuristics (due date, priority, status); not LLM-generated.

---

## API reference

Base path: `/api`. Protected routes require `Authorization: Bearer <access_token>` unless noted.

### Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Liveness check |

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account; returns tokens |
| POST | `/auth/login` | Sign in; returns tokens |
| POST | `/auth/refresh` | Refresh access token |

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasks` | List tasks (filters, sort, pagination params) |
| GET | `/tasks/{id}` | Single task |
| POST | `/tasks` | Create task |
| PUT | `/tasks/{id}` | Update task |
| DELETE | `/tasks/{id}` | Delete task |
| GET | `/tasks/search?query=` | Semantic search with keyword fallback |
| GET | `/tasks/analytics` | Analytics summary |
| GET | `/tasks/reminders` | Overdue and upcoming tasks |
| GET | `/tasks/ai-suggestions` | What's next? ranked list |
| GET | `/tasks/suggest-tags?text=&topK=` | Smart tag suggestions |
| GET | `/tasks/{id}/suggest-dependencies?topK=` | Dependency suggestions |
| POST | `/tasks/from-natural-language` | Parse NL text → `CreateTaskDto` |
| POST | `/tasks/bulk-delete` | Bulk delete |
| POST | `/tasks/bulk-complete` | Bulk complete |
| POST | `/tasks/{id}/archive` | Archive task |
| POST | `/tasks/{id}/unarchive` | Unarchive task |
| GET | `/tasks/{id}/history` | Task audit history |
| POST | `/tasks/import-csv` | CSV import (multipart) |
| POST | `/tasks/{id}/dependencies` | Add dependency |
| DELETE | `/tasks/{id}/dependencies/{dependsOnTaskId}` | Remove dependency |
| GET | `/tasks/{id}/subtasks` | List subtasks |
| POST | `/tasks/{id}/subtasks` | Create subtask |
| POST | `/tasks/reorder` | Persist custom order |
| GET | `/tasks/embedding-check` | Embedding service availability |

### Task templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tasktemplates` | List templates |
| GET | `/tasktemplates/{id}` | Single template |
| POST | `/tasktemplates` | Create template |
| PUT | `/tasktemplates/{id}` | Update template |
| DELETE | `/tasktemplates/{id}` | Delete template |

### Tags

| Method | Path | Description |
|--------|------|-------------|
| GET | `/tags` | List user tags |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/settings` | User settings |
| PUT | `/settings` | Update settings |

Swagger UI: `http://localhost:5000/swagger` (development only).

Error responses: see [architecture.md](architecture.md#api-design).

---

## AI features

Optional features requiring embedding and/or LLM API keys. Without keys, keyword fallbacks apply where documented.

| Feature | UI | API | Behavior |
|---------|-----|-----|----------|
| Semantic search | Tasks search box | `GET /tasks/search` | Embeddings + cosine similarity; keyword fallback |
| Add from text | + Add Task → AI menu | `POST /tasks/from-natural-language` | LLM parse → form prefill; keyword fallback without LLM |
| Smart tagging | Create/edit task | `GET /tasks/suggest-tags` | Tags from similar tasks via embeddings |
| Dependency suggestions | Depends On panel | `GET /tasks/{id}/suggest-dependencies` | Similarity + pattern-based candidates |
| What's next? | Filter toolbar | `GET /tasks/ai-suggestions` | Database ranking only |

**Example NL inputs:** `Review report by Friday, high priority` · `Call mom tomorrow` · `low prio admin task next week`

**Local configuration** (`appsettings.Development.json` or environment):

- `TaskMemory:ApiKey` or `TASKMEMORY_API_KEY` / `HF_TOKEN` — embeddings
- `TaskMemory:LlmApiKey` — natural-language parsing (optional)

Implementation: `TaskMemoryService`, `NaturalLanguageTaskService`. See [architecture.md](architecture.md).

---

## Local setup

**Prerequisites:** .NET 9 SDK, Node.js 18+

### Backend

1. Create `backend/SmartTaskTracker.API/appsettings.Development.json`:

```json
{
  "Jwt": {
    "Key": "YOUR_SECRET_KEY_HERE_MIN_32_CHARS"
  }
}
```

Or set `JWT_KEY` (minimum 32 characters).

2. Run:

```bash
cd backend/SmartTaskTracker.API
dotnet restore
dotnet run
```

API: http://localhost:5000

Do not commit `appsettings.Development.json` (listed in `.gitignore`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

Optional `.env`: `VITE_API_URL=http://localhost:5000/api` (defaults to localhost if unset).

---

## Deployment

Frontend on [Netlify](https://netlify.com); backend on [Render](https://render.com) via Docker.

| Component | Platform | Configuration |
|-----------|----------|---------------|
| Frontend | Netlify | Base: `frontend`; publish: `dist` (`netlify.toml`) |
| Backend | Render | Docker; root: `backend/SmartTaskTracker.API` |
| Database | Render PostgreSQL | Required in production |

### Environment variables

| Platform | Variable | Value |
|----------|----------|-------|
| Render | `JWT_KEY` | Secret key (minimum 32 characters) |
| Render | `FRONTEND_URL` | Netlify origin with `https://`, no trailing slash |
| Render | `DATABASE_URL` | Set when PostgreSQL is linked |
| Render | `SEED_DATABASE` | Optional: `true` to run dev seeder on startup |
| Netlify | `VITE_API_URL` | Backend URL including `/api` |

Configure variables in each platform dashboard. Manual Render deploys do not apply env vars from `render.yaml`.

### Render backend setup

1. New Web Service → connect repository.
2. Environment: Docker; Root Directory: `backend/SmartTaskTracker.API`.
3. Add `JWT_KEY`, `FRONTEND_URL`; link PostgreSQL for `DATABASE_URL`.
4. Deploy.

### Netlify frontend setup

1. Import repository; Netlify reads `netlify.toml`.
2. Set `VITE_API_URL` to the Render API URL (e.g. `https://your-api.onrender.com/api`).
3. Deploy.

### CORS

`FRONTEND_URL` must match the Netlify origin exactly. Redeploy after changes.

### Troubleshooting

| Issue | Resolution |
|-------|------------|
| Backend won't start | Check Render logs; confirm `JWT_KEY` and `DATABASE_URL` |
| CORS errors | Match `FRONTEND_URL` exactly (`https://`, no trailing slash) |
| Cold start | Render free tier sleeps after inactivity; app shows wake banner and retries |
| Frontend unreachable | Verify `VITE_API_URL` includes `/api` |

Push to the connected branch triggers redeploy on both platforms.

---

## Manual test scenarios

Use locally or against production after deploy.

### Auth

- Register with valid credentials → redirect to `/tasks`; sample task created.
- Validate empty fields, username length, password length, email format.
- Login with valid/invalid credentials.
- Logout → visit `/tasks` → redirect to `/login`.
- Remove access token only → next API call refreshes; remove both → login redirect.

### Task CRUD

Create with all fields; update and save; complete; delete with confirmation. Empty title rejected.

### Search and filters

Keyword and semantic search; quick filters; status and sort; filter presets; combine with search.

### Bulk, export, import

Select multiple → status change or delete; Select All. Export CSV; import with subtasks.

### Recurring, templates, duplicate

Complete recurring → next occurrence. Save and apply templates. Duplicate copies fields.

### Calendar, reminders, analytics

Month/week/day views; overdue and upcoming panels; analytics summary.

### Time tracking, history

Timer start/stop; history modal; estimate vs tracked time.

### UI

Theme, accent, shortcuts (`n`, `s`, `/`), notifications, archive. See [ui.md](ui.md).

### AI flows

Semantic search phrases (`meetings`, `things to discuss with the team`). Add from text prefill. Smart tagging and dependency suggestions (require API keys).

### Expected behavior

- Loading spinners and disabled forms during requests.
- Inline validation; API errors shown clearly; 401 clears session.
- Server wake: health check before auth; banner and retry on cold start.

---

## Automated tests

```bash
# Backend
cd backend/SmartTaskTracker.API.Tests && dotnet test

# Frontend
cd frontend && npm test
```

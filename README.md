# SmartTaskTracker

**State:** Full-stack task app — React + ASP.NET Core 9, JWT auth, SQLite/PostgreSQL.  
**Intent:** Run locally, test features, deploy (Netlify + Render).  
**Action:** See below.

---

## Quick Start

**Prerequisites:** .NET 9 SDK, Node.js 18+

| Step | Backend | Frontend |
|------|---------|----------|
| Setup | `cd backend/SmartTaskTracker.API` → create `appsettings.Development.json` with `Jwt:Key` (min 32 chars) or set `JWT_KEY` env | `cd frontend` → `npm install` |
| Run | `dotnet run` → http://localhost:5000 | `npm run dev` → http://localhost:5173 |
| Test | `cd backend/SmartTaskTracker.API.Tests` → `dotnet test` | `cd frontend` → `npm test` |

Swagger: http://localhost:5000/swagger (dev only)

---

## Docs (lazy = open only what you need)

| Doc | When to use |
|-----|--------------|
| [docs/TESTING.md](docs/TESTING.md) | Manual test checklist (all features) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploy to Netlify + Render |
| [docs/AI.md](docs/AI.md) | AI plan (semantic search, NL task creation, etc.) |
| [docs/REFERENCE.md](docs/REFERENCE.md) | DB schema, backend setup, unit test todos |

---

## Project layout (detailed)

**State:** What exists. **Intent:** What each thing does. **Action:** Where to look.

### Root
```
SmartTaskTracker/
  README.md              ← you are here
  .gitignore              Git ignore rules
  .env                    Local env vars (not committed; see docs/DEPLOYMENT.md)
  render.yaml             Render backend + DB config
  netlify.toml            Netlify frontend build config
  docs/
    TESTING.md            Manual test checklist (State → Intent → Action)
    DEPLOYMENT.md         Deploy to Netlify + Render (step-by-step)
    AI.md                 AI plan: use cases + design (semantic search, NL tasks)
    REFERENCE.md          DB schema summary, backend setup, unit test todos
```

### Frontend (`frontend/`)
```
frontend/
  index.html              HTML entry
  package.json            Deps + scripts (dev, build, test)
  vite.config.js          Vite build config
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
      Dialog.jsx          Alerts, confirmations, prompts
      Dialog.css
      TaskHistory.jsx     Task audit log
    pages/                 Page views
      Login.jsx           Login form
      Register.jsx        Register form
      Tasks.jsx          Main tasks dashboard
      Calendar.jsx        Calendar view (tasks by due date)
      Settings.jsx        User settings + preferences
    contexts/              React state
      AuthContext.jsx     Auth state + login/logout/refresh
      ThemeContext.jsx    Dark/light + accent
    hooks/                 Custom hooks
      useTasks.js         Task CRUD + list state
      useSettings.js      Load/save user settings
      useDialog.js        Dialog open/close state
      useTimer.js         Time tracking timer
      useNotifications.js Browser notifications (overdue/upcoming)
      useKeyboardShortcuts.js  Shortcuts (e.g. n=new, s=search)
    services/              API clients (Axios)
      api.js              Axios instance + auth interceptors
      authService.js      Register, login, refresh
      taskService.js      Task CRUD
      taskTemplateService.js  Template CRUD
      tagService.js       Tag CRUD
      settingsService.js  User settings API
      analyticsService.js Analytics API
      reminderService.js  Reminders API
      taskHistoryService.js  Task history API
    utils/
      dateFormat.js       Date formatting
    test/
      setup.js            Vitest setup
    __tests__/            (inside contexts, hooks, services) Unit tests
```

### Backend (`backend/SmartTaskTracker.API/`)
```
backend/SmartTaskTracker.API/
  Program.cs               Entry + DI + CORS + DB init
  appsettings.json         Config (DB, Jwt placeholders)
  SmartTaskTracker.API.csproj
  Controllers/             REST endpoints
    AuthController.cs      Register, login, refresh
    TasksController.cs     Task CRUD, bulk, archive, subtasks, dependencies, import
    TaskTemplatesController.cs  Template CRUD
    TagsController.cs      Tag CRUD
    SettingsController.cs  User settings
  Services/                 Business logic
    AuthService.cs         Auth + JWT + refresh
    TaskService.cs         Task logic
    TaskTemplateService.cs Template logic
    TagService.cs          Tag + color
    SettingsService.cs     User settings
  Models/                   Domain entities
    User.cs                User + refresh token
    Task.cs                Task (priority, status, recurrence, etc.)
    TaskTemplate.cs
    Tag.cs                 Tag + color
    TaskDependency.cs      Task → Task
    TaskHistory.cs         Audit log row
    UserSettings.cs
  DTOs/                     Request/response shapes
    AuthDto.cs
    TaskDto.cs
    TaskTemplateDto.cs
    SettingsDto.cs
    ErrorDto.cs
    AnalyticsDto.cs
    ReminderDto.cs
    TaskHistoryDto.cs
  Data/
    AppDbContext.cs         EF Core DbContext
    DbSeeder.cs             Dev seed data
  Helpers/
    JwtHelper.cs            JWT + refresh token generation
    TaskMapper.cs           Entity ↔ DTO
  Middleware/
    ErrorHandlingMiddleware.cs  Global error handling
  Properties/
    launchSettings.json     Launch config
```

### Tests
```
backend/SmartTaskTracker.API.Tests/
  Services/
    AuthServiceTests.cs     Auth service unit tests
    TaskServiceTests.cs     Task service unit tests
  SmartTaskTracker.API.Tests.csproj
```

---

## Features (short)

Tasks: CRUD, priorities, tags, status, due dates, recurring, templates, subtasks, dependencies, time tracking, calendar, CSV import/export, search/filter/sort, bulk ops, keyboard shortcuts, dark mode, settings, browser notifications.

---

## Deploy

1. Push to GitHub.
2. Backend: Render (use `render.yaml`) — set `JWT_KEY`; use free PostgreSQL.
3. Frontend: Netlify (use `netlify.toml`) — set `VITE_API_URL` to backend URL.
4. Set `FRONTEND_URL` on Render to your Netlify URL.

Full steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## License

MIT

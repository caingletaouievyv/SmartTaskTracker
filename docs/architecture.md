# Architecture

Engineering standard for SmartTaskTracker. Product behavior and API details live in [project.md](project.md). UI conventions live in [ui.md](ui.md).

---

## Principles

- Simple over complex; consistency over one-off patterns
- Explicit over implicit; configurable over hardcoded where users expect choice
- State, intent, action: define current state, intended outcome, then the minimal change
- Backend is the source of truth; the frontend consumes APIs and handles presentation

---

## Stack

| Layer | Technology |
|-------|------------|
| Backend | ASP.NET Core 9, Entity Framework Core, JWT (access + refresh) |
| Database | SQLite (local), PostgreSQL (production) |
| Frontend | React 18, Vite, Axios, React Router |
| Hosting | Netlify (frontend), Render (backend, Docker) |

---

## Backend layers

**Pattern:** Controller → Service → Data (`DbContext`)

| Layer | Responsibility |
|-------|----------------|
| Controller | HTTP only; delegate to services |
| Service | Business logic, validation, orchestration |
| Data | Persistence |
| DTO | API boundary; never expose entities directly |

**Folders:** `Controllers/`, `Services/`, `Data/`, `Models/`, `DTOs/`, `Middleware/`, `Helpers/`. Add `Interfaces/` or `Extensions/` only when needed.

**Core rules**

- Dependency injection throughout
- Async for all I/O
- Pass `CancellationToken` from controllers to services for DB and external calls
- Validation: data annotations on DTOs; business rules in services
- Mapping: entity → DTO via `TaskMapper` or explicit mapping in services

---

## API design

- REST under `/api/[resource]`
- Standard HTTP verbs
- Versioning (`/api/v1/...`) reserved for future breaking changes

**Success responses (current):** Most endpoints return DTOs directly (task list, auth tokens). New major resources may adopt an envelope:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

**Errors:** `ErrorHandlingMiddleware` returns `ErrorDto`:

```json
{
  "message": "User-facing message",
  "details": "Development only",
  "statusCode": 400
}
```

Production omits `details`. Auth and token failures map to 401. Do not leak stack traces or secrets.

**Lists:** Design pagination-ready (`page`, `pageSize`). Task list supports optional paging via `TaskPagedListDto`.

---

## Authentication

- JWT access token (short-lived) + refresh token (longer-lived)
- `AuthService` and `JwtHelper` centralize token issuance
- `[Authorize]` on protected controllers; configuration in `Program.cs`
- Services receive user id from the controller; do not parse tokens in services

---

## CORS and configuration

- Allowed origins from `FRONTEND_URL` (production) plus localhost in development
- Secrets via environment variables or `appsettings.Development.json` (gitignored)
- Never commit JWT keys, API keys, or `.env`

---

## Error handling and logging

- Global: `ErrorHandlingMiddleware`
- Log errors and significant mutations at Information / Warning / Error
- Do not log secrets; avoid `Console.WriteLine` in production paths

---

## Caching

- In-memory LRU for embedding and search paths (`TaskMemoryService`, `LRUCache`)
- Do not cache user-specific critical state without clear invalidation

---

## Frontend architecture

- UI: presentation and local UI state
- API: centralized in `frontend/src/services/` with shared Axios instance (`api.js`)
- Auth and theme: React Context
- Business rules belong on the backend; client validation is for UX only

**Required UX states:** loading, error, empty.

**Protected routes:** Unauthenticated users redirect to login (`App.jsx`, `AuthContext`).

**Server wake:** Single definition in `api.js` (`isServerWakingError`, health check). Mutations must not report success when the server is unavailable. See [ui.md](ui.md).

---

## Testing

- Backend: xUnit in `SmartTaskTracker.API.Tests` (service layer)
- Frontend: Vitest for hooks and services
- Manual scenarios: [project.md](project.md#manual-test-scenarios)

---

## Consistency

- Same layering on every feature
- Same API prefix (`/api/...`)
- Same frontend folder conventions under `frontend/src/`
- When multiple approaches exist, choose the simplest that stays consistent and scalable

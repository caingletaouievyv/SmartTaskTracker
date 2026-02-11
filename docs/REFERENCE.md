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

**Error handling:** `ErrorHandlingMiddleware` maps `UnauthorizedAccessException`, `SecurityTokenExpiredException`, `SecurityTokenException` → 401. `SettingsService` checks user exists before creating `UserSettings` (avoids FK; throws if user missing → 401).

---

## Database schema (short)

**API (not in schema):** `GET /api/health` — no auth; used for cold-start check (Render free tier). Returns `{ "status": "ok" }`.

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

---

## Deploy (Render + Netlify)

**Backend (Render):** Docker (`backend/SmartTaskTracker.API/Dockerfile`). Root Dir = `backend/SmartTaskTracker.API`, Environment = Docker. **Env in dashboard:** `JWT_KEY` (required), `FRONTEND_URL` = Netlify URL with `https://` (required for CORS). DB = PostgreSQL (Render free); `DATABASE_URL` auto when linked. Optional: `SEED_DATABASE=true` to reset seed user and run seed every startup; `false` to stop.

**Frontend (Netlify):** Base dir = `frontend`, publish = `dist`. **Env:** `VITE_API_URL` = Render API URL (e.g. `https://xxx.onrender.com/api`).

**CORS:** Backend allows only `FRONTEND_URL` + localhost. Set `FRONTEND_URL` in Render and redeploy. Full steps: [DEPLOYMENT.md](DEPLOYMENT.md).

---

## AI features (current)

**State:** Semantic search + natural language task implemented. "What's next?" = DB ranking only (not AI).  
**NL task:** `POST /api/tasks/from-natural-language` body `{ "text": "..." }` → `CreateTaskDto`. LLM key: env `OPENAI_API_KEY`, `AI_KEY`, or config `TaskMemory:LlmApiKey`. Optional `MODEL_PROVIDER=deepseek` + `AI_KEY` → DeepSeek (api.deepseek.com); else OpenAI. No key = keyword fallback. See [AI.md](AI.md).

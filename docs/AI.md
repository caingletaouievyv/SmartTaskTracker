# AI Plan (Use Cases + Design)

Semantic search, natural language task, smart tagging, and dependency suggestions are done. This doc covers AI/LLM features only ("What's next?" is DB ranking, not here). Pick next use case from the table below.

---

## Use cases (concise)

| Feature | What | How | Status |
|---------|------|-----|--------|
| **Semantic search** | Find tasks by meaning ("meetings this week" → standup, sync, review) | Embeddings + cosine similarity | ✅ Done |
| **Natural language task** | "Review report by Friday, high priority" → structured task | LLM parse (OpenAI); keyword fallback | ✅ Done |
| **Smart tagging** | Suggest tags from similar past tasks | Semantic similarity + tag frequency | ✅ Done |
| **Task summarization** | Short overview of long descriptions | LLM or extractive | — |
| **Smart due date** | Suggest realistic due date from similar tasks | Historical + workload | — |
| **Context reminders** | Remind at optimal time (patterns, dependencies) | Activity + dependency check | — |
| **Dependency suggestions** | Suggest "depends on X" from patterns | Semantic + same cache | ✅ Done |

**MVP order:** 1) Semantic search ✅, 2) Natural language creation ✅.

**NL task implementation:** `POST /api/tasks/from-natural-language` body `{ "text": "..." }` → returns `CreateTaskDto` (prefill **all** create-form fields). Backend: `NaturalLanguageTaskService` — **LLM** must return every inferable field (title, description, dueDate, priority, **tags** (1–5 from task name), notes, etc.); prompt specifies current/next year for dates and "never empty tags when task name present". **Fallback** merge fills any LLM-missed field (past date → fallback date; empty tags → derive from title). Tags from LLM or fallback are normalized to **first letter capital** (e.g. "report" → "Report") for uniform display. One source of truth: LLM first, fallback fills gaps. Frontend: single **Add task** control — primary button opens blank create modal; sparkle (✦) split opens dropdown with text input + "Add from text". Same AI logo convention as other sites.

**Search:** Tasks list search is semantic-first with keyword fallback (`GET /api/tasks/search` → embeddings then keyword fallback). The search input shows the same sparkle (✦) so users see it’s meaning-aware; placeholder: "Search by meaning or keyword...".

| **Server / cold start** | User mutates (e.g. change status) while backend is down or waking | Show server-wake banner + auto-retry; do not show generic "Failed to update"; no optimistic success (UI stays correct until server responds). |

**Best practice (server-down UX):** One place defines "server down" (`isServerWakingError` in api); all mutation errors (status, reorder, etc.) that match it use the banner and skip generic alerts; no optimistic success so the UI never shows a false "saved" state.

---

## IA design

**Context:** Cached task embeddings, user context.  
**Goal:** Keyword search, semantic search, filter.  
**Steps:** Load/compute embeddings (on demand), classify intent, retrieve with threshold.

**New backend:** `TaskMemoryService`, `TaskIntent` enum; endpoints: `GET /api/tasks/search?query=&intent=`, dev-only `embedding-check`.

**Lazy loading:** Embeddings only when needed (search, suggest-tags, suggest-dependencies). Cache: in-memory LRU + DB (TaskEmbeddings). Task embedding: try memory → try DB → else call HF, then save to DB and memory. Invalidated on task update or delete (so recomputed on next use). Free HF tier: fewer API calls after redeploy.

**Embeddings:** Hugging Face API (recommended) or local ONNX. Config: `TaskMemory.EmbeddingProvider`, `DefaultThreshold`, `DefaultTopK`, `CacheSize`.

**File layout:** `TaskMemoryService.cs`, `TaskIntent.cs`, `TaskMemoryOptions.cs`, DTOs `TaskSearchDto`, helper `LRUCache.cs`, model `TaskEmbedding.cs`, table `TaskEmbeddings`.

Full design details: see repo history (was `IA_DESIGN.md` + `AI_USE_CASES.md`).

---

## Follow the code (trace flows)

Use this to find and follow the implementation when you need to explain or change behavior.

### Semantic search

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | **Frontend** | `frontend/src/pages/Tasks.jsx` — search input; value in `search` state. |
| 2 | **Frontend** | `frontend/src/hooks/useTasks.js` — when `search` non-empty, calls `taskService.search(trimmed)`. |
| 3 | **Frontend** | `frontend/src/services/taskService.js` — `search()` → `GET /api/tasks/search?query=...`. |
| 4 | **Backend** | `Controllers/TasksController.cs` — `Search()` (route `[HttpGet("search")]`). |
| 5 | **Backend** | `Services/TaskMemoryService.cs` — `SearchSemanticAsync()`: load tasks → build text → embeddings (with `LRUCache`) → cosine similarity → return `TaskSearchResultDto` list. |
| 6 | **Fallback** | Same controller: if semantic returns 0 results and query not empty, calls `TaskService.GetTasksAsync(..., search, ...)` (keyword); same in `TaskService.cs` ~line 37 (title, description, tags, fileName). |

Key backend files: `TaskMemoryService.cs` (embedding + similarity), `TaskMemoryOptions.cs` (threshold, topK, API key), `Helpers/LRUCache.cs` (embedding cache).

### Natural language task (Add from text)

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | **Frontend** | `frontend/src/pages/Tasks.jsx` — sparkle dropdown, "Add from text" input; submit calls `taskService.parseNaturalLanguage(nlInput)`. |
| 2 | **Frontend** | `frontend/src/services/taskService.js` — `parseNaturalLanguage(text)` → `POST /api/tasks/from-natural-language` body `{ text }`. |
| 3 | **Backend** | `Controllers/TasksController.cs` — `ParseNaturalLanguage()` → `NaturalLanguageTaskService.ParseAsync(request.Text)`. |
| 4 | **Backend** | `Services/NaturalLanguageTaskService.cs` — `ParseAsync()`: if LLM key set → call LLM, map response to `CreateTaskDto`; else → keyword fallback. Merge fallback (e.g. past date, empty tags) in `MergeFallback()`. |
| 5 | **Fallback** | Same file: `ParseKeywordFallback()` uses `NaturalLanguageParseHelper` (dates, time, priority, title, tags). |

Key backend files: `NaturalLanguageTaskService.cs` (LLM + merge + fallback), `Helpers/NaturalLanguageParseHelper.cs` (date/time/priority/string parsing), `Helpers/TaskMemoryOptions.cs` (LlmProvider, LlmModel, API key).

### Smart tagging

**Context:** User is creating/editing a task (title or description present). Existing tasks have embeddings and tags.  
**Goal:** Suggest tags from similar past tasks; apply with one click.  
**Steps:** Input = **title + description** (frontend sends both as `text`). Backend: embed text → similar tasks (cosine) → tag frequency → top N with color. If full-text query returns no suggestions, backend **tries each word** as a separate query (e.g. "Code Program" → try "Code", then "Program") and returns the first non-empty result. Frontend: debounce 300ms; "From similar tasks:" row. No key → `[]`; local tag filter unchanged.

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | TaskModal — debounced title/description → getSuggestedTags(text). |
| 2 | Frontend | taskService.getSuggestedTags(text, topK) → GET /api/tasks/suggest-tags. |
| 3 | Backend | TasksController — SuggestTags(text, topK) → TaskMemoryService.SuggestTagsAsync. |
| 4 | Backend | TaskMemoryService.SuggestTagsAsync — embed text, similar tasks, tag frequency; if no results, try each word as query; return TagSuggestionDto. |

Key: `GET /api/tasks/suggest-tags?text=...&topK=5`. DTO: `TagSuggestionDto` in TaskSearchDto.cs.

### Dependency suggestions

**Context:** User editing a task; same task embeddings in cache as search/smart tagging.  
**Goal:** Suggest "depends on" tasks from similar tasks’ dependency patterns.  
**Steps:** Reuse TaskMemoryService: embed current task **title + description only** (same input as smart tagging) → similar tasks (cosine, same cache) → from those, collect tasks they “depend on” → return top N as suggestions. Tasks that share any meaningful word (or weekend/saturday/sunday as one concept) get a score boost. one endpoint, e.g. `GET /api/tasks/{id}/suggest-dependencies?topK=5`. **Fallback:** if no similar tasks have dependencies, suggest similar tasks as candidates. No key or no similar tasks → `[]`.

| Step | Where | What to look at |
|------|--------|------------------|
| 1 | Frontend | TaskModal — Depends On, "From similar tasks" button → getSuggestedDependencies(taskId). |
| 2 | Frontend | taskService.getSuggestedDependencies(taskId, topK) → GET /api/tasks/{id}/suggest-dependencies. |
| 3 | Backend | TasksController — SuggestDependencies(id, topK) → TaskMemoryService.SuggestDependenciesAsync. |
| 4 | Backend | TaskMemoryService.SuggestDependenciesAsync — embed task **title + description**, similar tasks, TaskDependencies, return TaskDependencySuggestionDto. |

Key: `GET /api/tasks/{id}/suggest-dependencies?topK=5`. DTO: `TaskDependencySuggestionDto` (Id, Title) in TaskSearchDto.cs.

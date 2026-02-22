# AI Plan (Use Cases + Design)

**State:** Semantic search done. Natural language task done (LLM parse + keyword fallback).  
**Intent:** AI/LLM features only (ranking/"What's next?" is DB-only, not in this doc).  
**Action:** Next = smart tagging or other use cases below.

---

## Use cases (concise)

| Feature | What | How | Status |
|---------|------|-----|--------|
| **Semantic search** | Find tasks by meaning ("meetings this week" → standup, sync, review) | Embeddings + cosine similarity | ✅ Done |
| **Natural language task** | "Review report by Friday, high priority" → structured task | LLM parse (OpenAI); keyword fallback | ✅ Done |
| **Smart tagging** | Suggest tags from similar past tasks | Semantic similarity + tag frequency | — |
| **Task summarization** | Short overview of long descriptions | LLM or extractive | — |
| **Smart due date** | Suggest realistic due date from similar tasks | Historical + workload | — |
| **Context reminders** | Remind at optimal time (patterns, dependencies) | Activity + dependency check | — |
| **Dependency suggestions** | Suggest "depends on X" from patterns | Semantic + NL hints | — |

**MVP order:** 1) Semantic search ✅, 2) Natural language creation ✅.

**NL task implementation:** `POST /api/tasks/from-natural-language` body `{ "text": "..." }` → returns `CreateTaskDto` (prefill **all** create-form fields). Backend: `NaturalLanguageTaskService` — **LLM** must return every inferable field (title, description, dueDate, priority, **tags** (1–5 from task name), notes, etc.); prompt specifies current/next year for dates and "never empty tags when task name present". **Fallback** merge fills any LLM-missed field (past date → fallback date; empty tags → derive from title). One source of truth: LLM first, fallback fills gaps. Frontend: single **Add task** control — primary button opens blank create modal; sparkle (✦) split opens dropdown with text input + "Add from text". Same AI logo convention as other sites.

**Search:** Tasks list search is semantic-first with keyword fallback (`GET /api/tasks/search` → embeddings then keyword fallback). The search input shows the same sparkle (✦) so users see it’s meaning-aware; placeholder: "Search by meaning or keyword...".

| **Server / cold start** | User mutates (e.g. change status) while backend is down or waking | Show server-wake banner + auto-retry; do not show generic "Failed to update"; no optimistic success (UI stays correct until server responds). |

**Best practice (server-down UX):** One place defines "server down" (`isServerWakingError` in api); all mutation errors (status, reorder, etc.) that match it use the banner and skip generic alerts; no optimistic success so the UI never shows a false "saved" state.

---

## IA design (State → Intent → Action)

**State:** Cached task embeddings, user context.  
**Intent:** Keyword search, semantic search, filter.  
**Action:** Load/compute embeddings (lazy), classify intent, retrieve with threshold.

**New backend:** `TaskMemoryService`, `TaskIntent` enum; endpoints: `GET /api/tasks/search?query=&intent=`, dev-only `embedding-check`.

**Lazy:** Embeddings only when semantic search requested; LRU cache; no precompute on startup.

**Embeddings:** Hugging Face API (recommended) or local ONNX. Config: `TaskMemory.EmbeddingProvider`, `DefaultThreshold`, `DefaultTopK`, `CacheSize`.

**File layout:** `TaskMemoryService.cs`, `TaskIntent.cs`, `TaskMemoryOptions.cs`, DTOs `TaskSearchDto`, helper `LRUCache.cs`.

Full design details: see repo history (was `IA_DESIGN.md` + `AI_USE_CASES.md`).

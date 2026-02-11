# AI Plan (Use Cases + Design)

**State:** Planned AI features; IA pattern (State → Intent → Action).  
**Intent:** Implement after deployment.  
**Action:** Phase 1 → Semantic Search, Smart Categorization.

---

## Use cases (concise)

| Feature | What | How |
|---------|------|-----|
| **Semantic search** | Find tasks by meaning ("meetings this week" → standup, sync, review) | Embeddings + cosine similarity |
| **Natural language task** | "Review report by Friday, high priority" → structured task | LLM parse; fallback keyword |
| **Smart tagging** | Suggest tags from similar past tasks | Semantic similarity + tag frequency |
| **Task summarization** | Short overview of long descriptions | LLM or extractive |
| **Smart due date** | Suggest realistic due date from similar tasks | Historical + workload |
| **Context reminders** | Remind at optimal time (patterns, dependencies) | Activity + dependency check |
| **Dependency suggestions** | Suggest "depends on X" from patterns | Semantic + NL hints |

**MVP order:** 1) Semantic search, 2) Natural language creation.

| **Server / cold start** | User mutates (e.g. change status) while backend is down or waking | Show server-wake banner + auto-retry; do not show generic “Failed to update”; no optimistic success (UI stays correct until server responds). |

**Best practice (server-down UX):** One place defines “server down” (`isServerWakingError` in api); all mutation errors (status, reorder, etc.) that match it use the banner and skip generic alerts; no optimistic success so the UI never shows a false “saved” state.

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

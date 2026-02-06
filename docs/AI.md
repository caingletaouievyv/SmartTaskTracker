# AI Plan (Use Cases + Design)

**State:** Planned AI features; IA pattern (State → Intent → Action).  
**Intent:** Implement after deployment.  
**Action:** Phase 1 → Semantic Search, Smart Categorization, Task Suggestions.

---

## Use cases (concise)

| Feature | What | How |
|---------|------|-----|
| **Semantic search** | Find tasks by meaning ("meetings this week" → standup, sync, review) | Embeddings + cosine similarity |
| **AI suggestions** | "What should I do next?" (priority, due date, dependencies) | Ranking + optional LLM context |
| **Natural language task** | "Review report by Friday, high priority" → structured task | LLM parse; fallback keyword |
| **Smart tagging** | Suggest tags from similar past tasks | Semantic similarity + tag frequency |
| **Task summarization** | Short overview of long descriptions | LLM or extractive |
| **Smart due date** | Suggest realistic due date from similar tasks | Historical + workload |
| **Context reminders** | Remind at optimal time (patterns, dependencies) | Activity + dependency check |
| **Dependency suggestions** | Suggest "depends on X" from patterns | Semantic + NL hints |

**MVP order:** 1) Semantic search, 2) Task suggestions, 3) Natural language creation.

---

## IA design (State → Intent → Action)

**State:** Cached task embeddings, user context.  
**Intent:** Keyword search, semantic search, AI suggestion, filter.  
**Action:** Load/compute embeddings (lazy), classify intent, retrieve with threshold.

**New backend:** `TaskMemoryService`, `TaskIntent` enum; endpoints: `GET /api/tasks/search?query=&intent=`, `GET /api/tasks/ai-suggestions`, dev-only `embedding-check`.

**Lazy:** Embeddings only when semantic search requested; LRU cache; no precompute on startup.

**Embeddings:** Hugging Face API (recommended) or local ONNX. Config: `TaskMemory.EmbeddingProvider`, `DefaultThreshold`, `DefaultTopK`, `CacheSize`.

**File layout:** `TaskMemoryService.cs`, `TaskIntent.cs`, `TaskMemoryOptions.cs`, DTOs `TaskSearchDto`, helper `LRUCache.cs`.

Full design details: see repo history (was `IA_DESIGN.md` + `AI_USE_CASES.md`).

# AI Plan (Use Cases + Design)

Engineering agreement: **[ia.md](ia.md)**. Doc index: **[docs.md](docs.md)**.

Semantic search, natural language task, smart tagging, and dependency suggestions are implemented. This document covers AI/LLM features only (the **What's next?** feature uses database ranking, not LLM). The table below lists current and planned AI work.

---

## Use cases (concise)

| Feature | What | How | Status |
|---------|------|-----|--------|
| **Semantic search** | Find tasks by meaning ("meetings this week" → standup, sync, review) | Embeddings + cosine similarity | Done |
| **Natural language task** | "Review report by Friday, high priority" → structured task | LLM parse (OpenAI); keyword fallback | Done |
| **Smart tagging** | Suggest tags from similar past tasks | Semantic similarity + tag frequency | Done |
| **Task summarization** | Short overview of long descriptions | LLM or extractive | — |
| **Smart due date** | Suggest realistic due date from similar tasks | Historical + workload | — |
| **Context reminders** | Remind at optimal time (patterns, dependencies) | Activity + dependency check | — |
| **Dependency suggestions** | Suggest "depends on X" from patterns | Semantic + same cache | Done |

**MVP order:** (1) Semantic search — done. (2) Natural language creation — done.

**NL task implementation:** `POST /api/tasks/from-natural-language` body `{ "text": "..." }` → returns `CreateTaskDto` (prefill **all** create-form fields). Backend: `NaturalLanguageTaskService` — **LLM** must return every inferable field (title, description, dueDate, priority, **tags** (1–5 from task name), notes, etc.); prompt specifies current/next year for dates and "never empty tags when task name present". **Fallback** merge fills any LLM-missed field (past date → fallback date; empty tags → derive from title). Tags from LLM or fallback are normalized to **first letter capital** (e.g. "report" → "Report") for uniform display. One source of truth: LLM first, fallback fills gaps. Frontend: **Add task** — primary control opens a blank create modal; the adjacent AI control opens a dropdown with a text field and **Add from text**.

**Search:** Tasks list search is semantic-first with keyword fallback (`GET /api/tasks/search` → embeddings then keyword fallback). The search field uses the same AI affordance as NL task creation; placeholder: "Search by meaning or keyword...".

### Server / cold start

If the user changes data while the backend is down or waking: show the server-wake banner and auto-retry; do not surface a generic "Failed to update"; avoid optimistic success so the UI stays accurate until the server responds.

**Server-down UX:** Centralize detection in `isServerWakingError` (`api.js`). Mutation paths (status, reorder, etc.) that match should rely on the banner and omit generic error alerts; do not mark data as saved until the server confirms.

---

**Follow the code (trace flows)** for AI features (semantic search, NL task, smart tagging, dependency suggestions): see [reference.md](reference.md#follow-the-code-trace-flows--ai-features).

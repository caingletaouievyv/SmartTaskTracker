# SmartTaskTracker – documentation index

**Layout:** Specs and guides live in **`docs/`** (all markdown filenames **lowercase**). **`README.md`** stays at the **repository root** (quick start, project layout, live links).

| Doc | Path (from repo root) | Use it for |
| --- | --- | --- |
| **readme.md** | `README.md` | Run commands, prerequisites, project tree, feature overview, links |
| **docs.md** | `docs/docs.md` | This index |
| **ia.md** | `docs/ia.md` | Engineering source of truth — architecture, layers, API conventions, workflow (optional local file; see `.gitignore`) |
| **ai.md** | `docs/ai.md` | AI / LLM features plan, server-wake UX, NL task and search behavior |
| **reference.md** | `docs/reference.md` | DB overview, setup, “follow the code” traces, unit-test backlog |
| **testing.md** | `docs/testing.md` | Manual test scenarios (all features) |
| **deployment.md** | `docs/deployment.md` | Netlify + Render, env vars, CORS |

**Demo assets:** `docs/demo/` (GIFs + `readme.md`).

**Stack:** ASP.NET Core 9, EF Core, SQLite / PostgreSQL · React (Vite) · JWT.

**Rule:** If **`docs/reference.md`** or **`docs/ai.md`** disagree with **`docs/ia.md`** on *how* to structure or extend the system, follow **`docs/ia.md`**. Feature-specific flows and checklists in **reference**, **ai**, **testing**, and **deployment** still win for *what* the product does today.

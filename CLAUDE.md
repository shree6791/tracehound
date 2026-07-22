# CLAUDE.md

Guidance for agents working in this repo.

---

## What Tracehound is

Cloudflare-only demo: simulated checkout telemetry + a chat UI that investigates it with Claude tools.

Two Workers:

- **`app/`** (TypeScript) — public HTTP, serves the React UI, runs investigate (`/health`, `/investigate` only)
- **`simulation/`** (Python) — checkout simulation, incident KV, Analytics Engine **writes**, minute cron

`agent/` is a TypeScript library **imported by `app/`**, not a separate deployable. Do not reintroduce a FastAPI/LangGraph server, a third host, or an app→simulation service binding for checkout — cron (or direct curl to the simulation Worker) produces AE data.

---

## Layout

```
shared/config.json     ← edit domain constants here only
frontend/src/          ← React UI
agent/src/             ← investigate tool loop (TS)
simulation/src/        ← Python Worker
app/src/               ← public TS Worker
scripts/               ← sync-config, deploy, smoke-ae, health (not on CF runtime)
tests/                 ← node:test + tsx
```

Concern folders under each package: `config/`, `infra/`, `models/`, `services/`, `routes/`, `cron/` as applicable.

Generated (do not hand-edit):

- `agent/src/config/index.ts`
- `simulation/src/config/__init__.py`

After changing `shared/config.json`: `npm run sync-config`.

AE dataset name: `tracehound_analytics` (not `*_spans`).

---

## Commands

```bash
npm run sync-config          # generate configs
npm run sync-config:check    # CI drift gate
npm run deploy               # simulation first, then app
npm run deploy:staging
npm run ci                   # drift + test + typecheck + UI build
npm test
npm run smoke:ae             # live AE SQL
npm run check:health
```

Simulation local: `cd simulation && uv run pywrangler dev`  
App local: `cd app && npm run dev` (build UI first; secrets in `app/.dev.vars`)

---

## Critical paths

| Concern | Where |
|---|---|
| Public routes | `app/src/index.ts`, `app/src/routes/` |
| Investigate loop | `agent/src/services/investigate.ts` |
| HTTP adapter | `app/src/services/investigateHandler.ts` |
| UI client | `frontend/src/services/investigateClient.ts` |
| Tools + SQL | `agent/src/services/tools.ts`, `sql.ts` |
| AE read | `agent/src/infra/analytics.ts` |
| Checkout sim | `simulation/src/services/checkout.py` |
| Incidents | `simulation/src/services/incidents.py` |
| AE write | `simulation/src/infra/analytics_writer.py` |
| Cron | `simulation/src/cron/__init__.py` |

Keep `ANALYTICS_COLUMNS` / service names in sync via shared config — never copy constants between agent and simulation by hand.

---

## Constraints (do not fight these)

| Constraint | Detail |
|---|---|
| Free-tier Worker size | Thin Anthropic tool loop only; no LangGraph in Workers |
| AE binding write-only | Writes in simulation; reads via SQL HTTP API |
| Investigate budget | Soft ~22s deadline, 5 iters — tune in `shared/config.json` |
| Incident window | 5 minutes (`incident.durationMs`); span `duration_ms` is stamped for AE, not a sleep |
| Python Workers | Needs `compatibility_flags = ["python_workers"]` |
| Deploy order | Simulation before app (`npm run deploy`) |
| Secrets | Never commit `.env` / `.dev.vars`; rotate if exposed |

Deep dives: read the code paths in the table above (README has the system diagram).

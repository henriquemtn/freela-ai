# freela-ai

Personal CRM + lead discovery. Full spec in [SPEC.md](SPEC.md); conventions in [CLAUDE.md](CLAUDE.md).

## Running locally

Requires Node 22+, pnpm and a Postgres instance.

```bash
cp .env.example .env        # adjust DATABASE_URL if you use another Postgres
docker compose up -d        # optional: Postgres on port 5433
pnpm install                # also generates the Prisma Client
pnpm db:migrate             # apply migrations
pnpm dev                    # http://localhost:3000
pnpm worker                 # in another terminal: runs discovery searches
```

After a migration (`pnpm db:migrate`), restart `pnpm dev`: the dev server keeps the
previously generated Prisma Client in memory.

Don't run `pnpm build` while `pnpm dev` is running: both write to `.next` and the dev
server can end up serving stale code. If that happens, stop it, `rm -rf .next`, restart.

### Lead discovery

Discovery uses the **Claude CLI** (`claude`, already logged in) with web search; no
external API key. The worker runs it non-interactively and restricted: empty temp
directory, only WebSearch/WebFetch, no shell, no MCP servers, no app secrets in its
environment, timeout and output limits, output validated with Zod. Every result must
cite its source page; nothing enters the CRM without your approval.

- Model: `FREELA_CLAUDE_MODEL` (default `sonnet`). Each term takes a few minutes.
- Offline/demo: `FREELA_DISCOVERY_PROVIDER=sample` returns data labeled “[Exemplo]”.

### Lead research

“Pesquisar com Claude” on a company (or “Adicionar e pesquisar” in Discovery) queues a
research job for the worker. Instructions live in the project skill
`.claude/skills/freela-business-research/SKILL.md` (also usable directly in Claude Code).
Claude reports website status, contact channels, signals and opportunities with sources;
the 0–100 score is computed in code from those signals (`src/research/score.ts`, spec §10).

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm test` | tests (Vitest); the db test needs `DATABASE_URL` |
| `pnpm lint` | ESLint |
| `pnpm worker` | background worker (discovery runs and research jobs) |
| `pnpm db:migrate` | create/apply migrations (`prisma migrate dev`) |
| `pnpm build` | production build |

## Layout

- `prisma/schema.prisma` — `Company`, `Contact`, `Activity`, `Task` models
- `src/core/pipeline.ts` — stage transitions, Limbo, priority rules (tested)
- `src/core/tasks.ts` — due status and next-action rules (tested)
- `src/discovery/` — provider adapter (Claude, sample), normalization, dedupe, run execution (tested)
- `src/lib/claude.ts` — restricted Claude CLI execution adapter
- `src/research/` — research output schema, explainable scoring (tested), job execution
- `src/worker.ts` — polls Postgres for queued runs (`FOR UPDATE SKIP LOCKED`)
- `src/app/companies/actions.ts` — server actions, validated with Zod
- `src/core/deals.ts`, `followups.ts`, `analytics.ts` — deal effects, follow-up rules, revenue/funnel (tested)
- `src/core/outreach.ts` — first-contact templates: variables, template choice, WhatsApp link (tested)
- `src/lib/crm.ts` — shared server operations (stage transitions, next action, last interaction)
- `src/app/` — pages: Overview, Results, Discovery, Outreach, Pipeline (Kanban), Companies, Tasks, Limbo

## Status

- [x] Phase 0 — foundation (Next.js 16, Tailwind 4, shadcn/ui, Prisma 7, Postgres)
- [x] Phase 1 — core CRM: companies, contacts, timeline, stages, Limbo, search/filters
- [x] Phase 2 — Kanban, tasks, dashboard
- [x] Phase 3 — Discovery (Claude web search)
- [x] Phase 4 — Website verification and Claude research
- [x] Phase 5 — Deals, outreach, follow-up suggestions, results (revenue and conversion)

# FENIX

Personal CRM + lead discovery. Full spec in [FENIX.md](FENIX.md); conventions in [CLAUDE.md](CLAUDE.md).

## Running locally

Requires Node 22+, pnpm and a Postgres instance.

```bash
cp .env.example .env        # adjust DATABASE_URL if you use another Postgres
docker compose up -d        # optional: Postgres on port 5433
pnpm install                # also generates the Prisma Client
pnpm db:migrate             # apply migrations
pnpm dev                    # http://localhost:3000
```

## Scripts

| Script | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm test` | tests (Vitest); the db test needs `DATABASE_URL` |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | create/apply migrations (`prisma migrate dev`) |
| `pnpm build` | production build |

## Layout

- `prisma/schema.prisma` — `Company`, `Contact`, `Activity`, `Task` models
- `src/core/pipeline.ts` — stage transitions, Limbo, priority rules (tested)
- `src/core/tasks.ts` — due status and next-action rules (tested)
- `src/app/companies/actions.ts` — server actions, validated with Zod
- `src/app/` — pages: Overview, Pipeline (Kanban), Companies, Tasks, Limbo

## Status

- [x] Phase 0 — foundation (Next.js 16, Tailwind 4, shadcn/ui, Prisma 7, Postgres)
- [x] Phase 1 — core CRM: companies, contacts, timeline, stages, Limbo, search/filters
- [x] Phase 2 — Kanban, tasks, dashboard
- [ ] Phase 3 — Discovery
- [ ] Phase 4 — Claude research
- [ ] Phase 5 — Deals and outreach

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OPanel Dist Service is a backend file distribution service for OPanel (a Minecraft server panel). It proxies GitHub releases and assets, providing a stable CDN for downloading OPanel JAR files.

## Commands

```bash
npm run dev    # Development server with hot reload (tsx watch)
npm run build  # prisma generate + compile TypeScript to ./dist
npm start      # Run production server (dotenv + node)
```

### Database / Prisma

```bash
npx prisma migrate dev --name <name>   # Create + apply a migration (uses DIRECT_URL)
npx prisma generate                    # Regenerate the client into src/generated/prisma
npx prisma migrate deploy              # Apply pending migrations in production
npx prisma studio                      # Browse the database
```

The generated client lives in `src/generated/prisma` and is **gitignored**, so `prisma generate` must run before a build — it's wired into both `build` and `postinstall`.

## Architecture

```
src/
├── index.ts          # Entry point, starts Express server on PORT; disconnects Prisma on shutdown
├── app.ts            # App factory, middleware setup, global error handler
├── types.ts          # Shared TypeScript interfaces
├── generated/prisma/ # Generated Prisma Client (gitignored — run `prisma generate`)
├── middleware/
│   └── auth.ts       # statsAuth — guards /api/stats via STATS_KEY (x-api-key header or ?key=)
├── routes/
│   ├── releases.ts   # GET /api/releases - lists all GitHub releases with parsed assets
│   ├── download.ts   # GET /api/download/:assetId - streams JAR file from cache/GitHub
│   └── stats.ts      # GET /api/stats - returns download statistics
└── services/
    ├── github.ts     # Fetches releases from opanel-mc/opanel GitHub repo, caches in MemoryCache
    ├── cache.ts      # Generic in-memory TTL cache (MemoryCache<T>)
    ├── fileCache.ts  # Downloaded JAR files cached to ./cache directory (FileCache)
    ├── db.ts         # PrismaClient singleton (PrismaPg adapter over the pooled DATABASE_URL)
    └── stats.ts      # Download stats backed by Postgres; aggregates derived via GROUP BY

prisma/
├── schema.prisma     # DownloadRecord model (+ generator/datasource)
└── migrations/       # SQL migration history
prisma.config.ts      # Prisma CLI config; datasource url = DIRECT_URL (for migrations)
```

### Key patterns

- **Asset naming convention**: `opanel-{server}-{gameVersion}-build-{opanelVersion}.jar` (parsed via regex in `github.ts:7`)
- **GitHub token**: Optional via `GITHUB_TOKEN` env var — reduces rate limiting
- **Caching**: Releases cached in-memory with configurable TTL (`CACHE_TTL`, default 300s); JAR files cached on disk in `./cache`
- **Database**: Supabase Postgres via Prisma 7 with the `@prisma/adapter-pg` driver adapter (Prisma 7 removed the Rust engine, so an adapter is required). Runtime queries use the **pooled** `DATABASE_URL` (port 6543, pgbouncer); migrations/introspection use the **direct** `DIRECT_URL` (port 5432), configured in `prisma.config.ts` (the schema datasource block has no `url` — `directUrl` was removed in v7). RLS is enabled on `download_record` as defense-in-depth against Supabase Data API exposure; the backend connects as the table owner so RLS does not block it.
- **Stats persistence**: Every download inserts one row into the `download_record` table. There is no denormalized daily table — totals, daily counts, and per-server/game-version/opanel-version breakdowns are all derived via `GROUP BY` in `getSnapshot()`. `GET /api/stats` returns the 30-day history plus the most recent `MAX_RECORDS` (10,000) raw records. `recordDownload()` is fire-and-forget (errors are logged, never block the download response).

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `GITHUB_TOKEN` | — | GitHub API token (optional, reduces rate limiting) |
| `CACHE_DIR` | `./cache` | Where to store downloaded JAR files |
| `CACHE_TTL` | `300` | Release list cache TTL in seconds |
| `DATABASE_URL` | — | **Required.** Pooled Postgres connection (Supabase pgbouncer, port 6543) used by the runtime client |
| `DIRECT_URL` | — | **Required for migrations.** Direct Postgres connection (port 5432) used by Prisma CLI commands |
| `STATS_KEY` | — | API key required to access `GET /api/stats` (via `x-api-key` header or `?key=`) |
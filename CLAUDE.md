# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OPanel Dist Service is a backend file distribution service for OPanel (a Minecraft server panel). It proxies GitHub releases and assets, providing a stable CDN for downloading OPanel JAR files.

## Commands

```bash
npm run dev    # Development server with hot reload (tsx watch)
npm run build  # Compile TypeScript to ./dist
npm start      # Run production server (dotenv + node)
```

## Architecture

```
src/
├── index.ts          # Entry point, starts Express server on PORT
├── app.ts            # App factory, middleware setup, global error handler
├── types.ts          # Shared TypeScript interfaces
├── routes/
│   ├── releases.ts   # GET /api/releases - lists all GitHub releases with parsed assets
│   ├── download.ts   # GET /api/download/:assetId - streams JAR file from cache/GitHub
│   └── stats.ts      # GET /api/stats - returns download statistics
└── services/
    ├── github.ts     # Fetches releases from opanel-mc/opanel GitHub repo, caches in MemoryCache
    ├── cache.ts      # Generic in-memory TTL cache (MemoryCache<T>)
    ├── fileCache.ts  # Downloaded JAR files cached to ./cache directory (FileCache)
    └── stats.ts      # Persists download stats to ./data/stats.json, auto-rolls at midnight UTC
```

### Key patterns

- **Asset naming convention**: `opanel-{server}-{gameVersion}-build-{opanelVersion}.jar` (parsed via regex in `github.ts:7`)
- **GitHub token**: Optional via `GITHUB_TOKEN` env var — reduces rate limiting
- **Caching**: Releases cached in-memory with configurable TTL (`CACHE_TTL`, default 300s); JAR files cached on disk in `./cache`
- **Stats persistence**: Debounced writes every 500ms to `STATS_FILE` (default `./data/stats.json`); daily rollover at UTC midnight
- **No database**: All state is in-memory or flat JSON files

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server listen port |
| `GITHUB_TOKEN` | — | GitHub API token (optional, reduces rate limiting) |
| `CACHE_DIR` | `./cache` | Where to store downloaded JAR files |
| `CACHE_TTL` | `300` | Release list cache TTL in seconds |
| `STATS_FILE` | `./data/stats.json` | Path to stats JSON file |
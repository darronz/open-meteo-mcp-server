# Open-Meteo MCP Server — Hardening

## What This Is

An MCP server that provides Claude with weather forecast and historical weather data via the Open-Meteo API. It runs locally over stdio and exposes two tools: `get_weather_forecast` and `get_historical_weather`. This project is a cleanup and hardening pass on the existing working codebase.

## Core Value

Reliable, well-typed weather data tools that don't silently fail or hang when the upstream API misbehaves.

## Requirements

### Validated

- ✓ Weather forecast tool with configurable hourly/daily variables — existing
- ✓ Historical weather tool with date range queries — existing
- ✓ Stdio transport for Claude Desktop integration — existing
- ✓ Error responses returned in MCP format with isError flag — existing

### Active

- [ ] Type-safe handler arguments (replace `args: any` with interfaces)
- [ ] Deduplicated fetch/error/response logic into shared helper
- [ ] Deduplicated hourly/daily schema fragments between tool definitions
- [ ] Fetch timeout via AbortController (30s default)
- [ ] Client-side input validation (coordinate bounds, date format)
- [ ] Upgrade @modelcontextprotocol/sdk to latest stable
- [ ] Tool dispatch via registry/map instead of if-statement chain
- [ ] Graceful shutdown with SIGTERM handler
- [ ] Unit tests for parameter building, validation, and error handling
- [ ] Integration tests for tool dispatch and MCP request/response cycle

### Out of Scope

- New tools (geocoding, air quality, marine) — separate effort
- Response caching — adds complexity, not needed for local MCP use
- Rate limiting / retry logic — Open-Meteo free tier is generous enough for Claude usage
- Multi-file module splitting — single file is fine at this scale

## Context

- Single-file TypeScript codebase (~283 lines in `src/index.ts`)
- Two tools with near-identical implementation patterns
- Open-Meteo API requires no auth (free public API)
- MCP SDK 0.6.x is outdated; latest has different patterns
- No tests exist currently
- Codebase map available at `.planning/codebase/`

## Constraints

- **Compatibility**: Must remain a working MCP server throughout — no breaking the stdio contract
- **Dependencies**: Minimize new dependencies; prefer Node.js built-ins
- **Runtime**: Node.js 18+ (keep existing minimum)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Upgrade MCP SDK to latest | Current 0.6.x is outdated, latest has better types and patterns | — Pending |
| Keep single-file structure | ~300 lines doesn't warrant module splitting | — Pending |
| 30s fetch timeout | Balances responsiveness with slow API responses | — Pending |

---
*Last updated: 2026-02-18 after initialization*

# Codebase Concerns

**Analysis Date:** 2026-02-18

## Tech Debt

**Type Safety Issues:**
- Issue: Functions use `args: any` for API parameters instead of typed interfaces
- Files: `src/index.ts` (lines 116, 177)
- Impact: No compile-time validation of tool parameters; runtime errors possible if Claude passes unexpected argument shapes
- Fix approach: Create TypeScript interfaces for `WeatherForecastArgs` and `HistoricalWeatherArgs` with proper typing for latitude, longitude, hourly, daily arrays, etc.

**Code Duplication:**
- Issue: Tool definition schemas (hourly/daily properties) are duplicated across `WEATHER_TOOL` and `HISTORICAL_WEATHER_TOOL`
- Files: `src/index.ts` (lines 26-42, 86-102)
- Impact: Maintenance burden; schema changes must be made in two places; risk of inconsistency
- Fix approach: Extract common schema fragments into shared constants, then compose tool definitions from them

**Duplicated API Logic:**
- Issue: `getWeatherForecast()` and `getHistoricalWeather()` share nearly identical fetch/error handling patterns
- Files: `src/index.ts` (lines 116-174 vs 177-237)
- Impact: Bug fixes must be applied in two places; inconsistency in error handling behavior
- Fix approach: Extract shared fetch logic into a generic `fetchWeatherAPI(url: string, params: URLSearchParams)` helper function

**Inadequate Error Handling:**
- Issue: HTTP error status codes are caught but network timeouts, JSON parse errors, and aborted requests may throw unhandled exceptions
- Files: `src/index.ts` (lines 145-173, 208-236)
- Impact: Malformed API responses or network issues could crash the MCP server connection
- Fix approach: Expand catch blocks to handle all async error types; validate JSON response structure before returning

## Known Issues

**No Input Validation:**
- Symptoms: Invalid coordinates (latitude > 90, longitude > 180) are passed directly to API; invalid date formats in historical queries are not caught before API calls
- Files: `src/index.ts` (lines 127-140, 189-203)
- Trigger: Call with `latitude: 200, longitude: 400` or `start_date: "invalid"`
- Workaround: Open-Meteo API returns 400 errors which are caught, but validation should happen client-side for better UX

**Missing Date Format Validation:**
- Symptoms: Historical weather queries accept any string as `start_date`/`end_date` without validating YYYY-MM-DD format
- Files: `src/index.ts` (lines 181-182, 192-193)
- Trigger: Call `get_historical_weather` with `start_date: "13/01/2024"` or `"not-a-date"`
- Workaround: API returns error; error message bubbles up to user

**No Handling of API Rate Limits:**
- Symptoms: If Claude makes rapid consecutive requests, Open-Meteo may return 429 (Too Many Requests); response is treated as generic error
- Files: `src/index.ts` (lines 119-121, 164-166)
- Trigger: Simulate by making 100+ requests in rapid succession
- Workaround: None; user must manually retry after delay

## Security Considerations

**Unbounded Array Parameters:**
- Risk: `hourly` and `daily` parameters accept unlimited array lengths; could lead to extremely large API requests
- Files: `src/index.ts` (lines 26-31, 33-42, 86-91, 93-102)
- Current mitigation: None; Open-Meteo API has limits but they are not enforced client-side
- Recommendations: Add `maxItems: 20` (or appropriate limit) to hourly/daily array schemas in tool definitions

**External API Reliance:**
- Risk: Entire service depends on open-meteo.com availability; no fallback or caching
- Files: `src/index.ts` (lines 142, 205)
- Current mitigation: None
- Recommendations: Consider implementing response caching for recent queries (especially historical data which doesn't change); implement exponential backoff for transient failures

**No Request Timeout:**
- Risk: `fetch()` requests have no timeout; if Open-Meteo is slow or unresponsive, the MCP server connection may hang indefinitely
- Files: `src/index.ts` (lines 145, 208)
- Current mitigation: None
- Recommendations: Add AbortController with 30-second timeout to fetch calls

**Missing CORS/SSL Verification:**
- Risk: Hardcoded HTTPS URLs rely on proper SSL validation; no explicit verification
- Files: `src/index.ts` (lines 142, 205)
- Current mitigation: Node.js/fetch default SSL validation
- Recommendations: No action needed if trusting Node.js built-in verification; consider documenting this assumption

## Performance Bottlenecks

**Large Response Payloads:**
- Problem: Weather data is serialized to full JSON strings (lines 157, 220) without pagination or filtering
- Files: `src/index.ts` (lines 157, 220)
- Cause: A 90-day historical query with hourly data could return 2,160+ data points; stringifying all at once uses memory
- Improvement path: Implement response truncation or streaming; warn users if response exceeds size threshold

**Synchronous JSON.stringify:**
- Problem: Large JSON objects are stringified synchronously, blocking the event loop
- Files: `src/index.ts` (lines 157, 220)
- Cause: No async JSON processing
- Improvement path: Consider using `JSON.stringify()` with a replacer if response needs post-processing; for now acceptable given typical payload sizes

## Fragile Areas

**Tool Handler Dispatch:**
- Files: `src/index.ts` (lines 260-270)
- Why fragile: String-based tool name matching using `if` statements; adding new tools requires modifying handler logic; no enum or switch safety
- Safe modification: Extract tool registry into a Map of `toolName -> handler` function; use `server.setRequestHandler()` pattern with a lookup
- Test coverage: No tests exist; handler dispatch has no test coverage

**Tool Definition Synchronization:**
- Files: `src/index.ts` (lines 11-60, 63-113, 253-256)
- Why fragile: Tool definitions in constants must match handler names (lines 261-267); mismatch causes runtime errors
- Safe modification: Extract tools into a shared registry; auto-generate handler dispatch from registry
- Test coverage: No tests to catch name mismatches

**API Endpoint Hardcoding:**
- Files: `src/index.ts` (lines 142, 205)
- Why fragile: API endpoints are hardcoded strings; no abstraction or configuration
- Safe modification: Move to environment variables or config object; document fallbacks if migration needed
- Test coverage: No tests for API URL construction

## Scaling Limits

**Single-Threaded Node Process:**
- Current capacity: Single MCP server instance handles one tool call at a time (async/await queues sequential calls)
- Limit: Heavy concurrent usage will queue requests; no worker threads or clustering
- Scaling path: Not needed for typical Claude usage; if horizontally scaling, run multiple MCP server instances and configure Claude to pick one

**No Caching:**
- Current capacity: Each request hits Open-Meteo; no local cache of responses
- Limit: Repeated queries for same location/date range hit API multiple times
- Scaling path: Implement in-memory cache with TTL (e.g., 1 hour for forecasts, indefinite for historical); consider Redis if distributed caching needed

**Memory Usage in Large Responses:**
- Current capacity: 283-line single-file application; typical responses are < 100KB JSON
- Limit: 90-day historical queries with all variables could generate responses > 1MB
- Scaling path: Implement pagination or streaming responses; add response size validation before returning

## Dependencies at Risk

**@modelcontextprotocol/sdk (^0.6.0):**
- Risk: Major version changes could introduce breaking API changes
- Impact: Tool schema, server registration, or transport could change
- Migration plan: Monitor SDK releases; pin to specific version when stable; use yarn/npm audit to track security issues

**Node.js Version Requirement (18+):**
- Risk: End-of-life for Node 18 is April 2025; users running EOL versions may miss security updates
- Impact: Installation on older systems will fail
- Migration plan: Update README to recommend Node 20 LTS (stable until April 2026); consider setting `engines` field in package.json

**TypeScript Version Pinning:**
- Risk: `typescript: ^5.0.0` may introduce breaking type changes in 6.x
- Impact: Build could fail or type checking could become stricter
- Migration plan: Monitor TypeScript releases; test minor version upgrades before applying

## Missing Critical Features

**No Request/Response Logging:**
- Problem: When users report issues with weather data, there's no server-side logs to diagnose (requests/responses are lost)
- Blocks: Debugging user issues; monitoring API performance; detecting patterns in failures
- Recommendation: Add optional `DEBUG=weather-mcp:*` environment variable for verbose logging of request/response details

**No Health Check Endpoint:**
- Problem: Claude or other MCP clients cannot verify server health before issuing requests
- Blocks: Graceful degradation if server is unresponsive
- Recommendation: Implement optional health check tool that verifies Open-Meteo connectivity

**No Graceful Shutdown:**
- Problem: No signal handlers for SIGTERM; server exits immediately without cleanup
- Blocks: Proper integration into container orchestration (Docker, Kubernetes)
- Recommendation: Add `process.on('SIGTERM', ...)` handler to close transport gracefully

## Test Coverage Gaps

**No Unit Tests:**
- What's not tested: API parameter building (URLSearchParams construction), error message formatting, response JSON structure validation
- Files: `src/index.ts` (lines 116-237)
- Risk: Changes to URL construction or error handling could silently break tool functionality
- Priority: **High** - Basic parameter/error handling tests prevent regressions

**No Integration Tests:**
- What's not tested: Full request/response cycle with real Open-Meteo API calls or mocked HTTP responses
- Files: `src/index.ts` (entire module)
- Risk: Schema mismatches between tool definitions and handler logic go undetected
- Priority: **High** - Test tool dispatch and server connectivity

**No Type Tests:**
- What's not tested: TypeScript type narrowing; correct types flow through handler dispatch
- Files: `src/index.ts` (lines 116-237)
- Risk: `args: any` defeats type system; potential for undefined property access at runtime
- Priority: **Medium** - Would catch parameter validation bugs early

**No Mocking of External APIs:**
- What's not tested: Behavior when Open-Meteo returns errors, timeouts, or malformed responses
- Files: `src/index.ts` (lines 145-173, 208-236)
- Risk: Error handling code is untested; edge cases (network failures, JSON parse errors) unknown
- Priority: **High** - Critical for production reliability

---

*Concerns audit: 2026-02-18*

# Coding Conventions

**Analysis Date:** 2026-02-18

## Naming Patterns

**Files:**
- Lowercase with extension: `index.ts`
- Descriptive names reflecting primary export or module purpose
- Single file architecture for small modules

**Functions:**
- camelCase for function names: `getWeatherForecast()`, `getHistoricalWeather()`, `main()`
- Async functions prefix with descriptive verb: `async function getWeatherForecast(...)`
- Private/helper functions use camelCase
- Main entry point named `main()`

**Variables:**
- camelCase for all variable declarations: `latitude`, `longitude`, `forecast_days`, `params`, `response`, `data`
- Constants use UPPER_SNAKE_CASE: `WEATHER_TOOL`, `HISTORICAL_WEATHER_TOOL`
- Destructured variables follow camelCase: `const { latitude, longitude, hourly, daily } = args`
- Abbreviations in camelCase: `args`, `url` (not URL)

**Types:**
- Inline object types using `any` for flexible parameters: `args: any`
- TypeScript strict mode enabled for compile-time checking
- No explicit type exports in current codebase

## Code Style

**Formatting:**
- 2-space indentation (inferred from tsconfig and source)
- Semicolons at end of statements
- Template literals for string interpolation: `` `https://api.open-meteo.com/v1/forecast?${params.toString()}` ``
- Multi-line object literals with consistent indentation

**Linting:**
- No ESLint or Prettier configuration found
- TypeScript strict mode enabled in `tsconfig.json`
- Compiler options: `"strict": true`

## Import Organization

**Order:**
1. Framework/SDK imports first: `import { Server } from "@modelcontextprotocol/sdk/server/index.js"`
2. Child process imports follow: `import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"`
3. Multiple imports from same package grouped with destructuring

**Path Style:**
- Full relative paths with file extensions: `@modelcontextprotocol/sdk/server/index.js`
- Explicit `.js` extensions in import paths (ESM module format)
- No path aliases configured

## Error Handling

**Patterns:**
- Try-catch blocks for async operations: wraps API fetch calls in `try { ... } catch (error) { ... }`
- Type guards for error objects: `error instanceof Error ? error.message : String(error)`
- Error responses returned as structured MCP response format with `isError: true` flag
- Graceful degradation: errors don't throw but return user-friendly messages
- Process-level error handling in `main().catch()` with `process.exit(1)`

**Example from `src/index.ts` (lines 144-173):**
```typescript
try {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
} catch (error) {
  return {
    content: [
      {
        type: "text",
        text: `Error fetching weather data: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
    ],
    isError: true,
  };
}
```

## Logging

**Framework:** console methods only

**Patterns:**
- Use `console.error()` for diagnostic output and errors: `console.error("Weather MCP Server running on stdio")`
- Errors logged with contextual messages: `console.error("Fatal error:", error)`
- No structured logging or log levels beyond console
- Server startup logged to stderr

## Comments

**When to Comment:**
- Block comments above function/tool definitions explaining purpose
- Inline comments rare in current codebase
- Self-documenting through clear naming preferred

**JSDoc/TSDoc:**
- Not used in current codebase
- Types defined inline in schema objects rather than as separate type definitions

**Example tool documentation style from `src/index.ts` (lines 10-14):**
```typescript
// Define the weather forecast tool
const WEATHER_TOOL = {
  name: "get_weather_forecast",
  description:
    "Get weather forecast for a location using Open-Meteo API. Returns hourly and daily weather data including temperature, precipitation, wind, and more.",
  // ...
};
```

## Function Design

**Size:**
- Functions kept under 30 lines typically
- Single responsibility: `getWeatherForecast()` handles one API endpoint and response shape

**Parameters:**
- Use destructuring for complex parameter objects: `const { latitude, longitude, hourly = [...], daily = [...] } = args`
- Provide default values in destructuring: `hourly = ["temperature_2m", "precipitation", "wind_speed_10m"]`
- Accept `any` type for flexibility with MCP request objects

**Return Values:**
- Async functions return MCP-formatted response objects: `{ content: [{ type: "text", text: "..." }], isError?: true }`
- Consistent return shape regardless of success/failure
- Data serialized as JSON strings for text content

## Module Design

**Exports:**
- Single entry file pattern: `src/index.ts` is the sole module
- No named exports; module executes `main()` at top level
- Server instantiation and handlers defined at module level

**Module structure in `src/index.ts`:**
1. Imports (lines 3-8)
2. Tool definitions as constants (lines 11-113)
3. Utility functions (lines 116-237)
4. Server initialization (lines 240-250)
5. Request handlers (lines 253-270)
6. Entry point function `main()` (lines 273-277)
7. Error handling and startup (lines 279-282)

---

*Convention analysis: 2026-02-18*

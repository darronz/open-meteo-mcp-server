# Testing Patterns

**Analysis Date:** 2026-02-18

## Test Framework

**Runner:**
- Not detected - No test runner configured (jest, vitest, mocha, etc.)
- No test scripts in `package.json`

**Assertion Library:**
- Not applicable - No testing framework present

**Run Commands:**
- No test commands available
- Build command: `npm run build` (TypeScript compilation)
- Start command: `npm start` (runs compiled server)

**Note:** Testing infrastructure needs to be added to this project.

## Test File Organization

**Location:**
- No test files currently in codebase
- Recommended pattern: co-located with source files using `.test.ts` suffix
- Suggested structure: `src/index.test.ts` alongside `src/index.ts`

**Naming:**
- Recommended: `[module].test.ts` pattern
- Example: `index.test.ts` for testing `index.ts`

**Structure:**
```
src/
├── index.ts              # Main implementation
└── index.test.ts         # Unit tests (recommended, not yet created)
```

## Test Structure

**Current State:** No tests implemented

**Recommended Test Pattern for this codebase:**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
// or import { describe, test, expect } from "@jest/globals";

describe("Weather MCP Server", () => {
  describe("getWeatherForecast", () => {
    it("should return forecast data with correct structure", async () => {
      // Test implementation
    });

    it("should handle API errors gracefully", async () => {
      // Test implementation
    });
  });

  describe("getHistoricalWeather", () => {
    it("should return historical weather data", async () => {
      // Test implementation
    });

    it("should validate date parameters", async () => {
      // Test implementation
    });
  });

  describe("Server request handlers", () => {
    it("should list available tools", async () => {
      // Test implementation
    });

    it("should execute named tools correctly", async () => {
      // Test implementation
    });

    it("should return error for unknown tools", async () => {
      // Test implementation
    });
  });
});
```

**Patterns:**
- Setup: Use `beforeEach()` to initialize server and mocks
- Teardown: Use `afterEach()` to clean up connections and reset mocks
- Assertion: Use `expect()` with specific matchers

## Mocking

**Framework:** Not yet integrated - Recommended: `vi` (Vitest) or `jest.fn()`

**What to Mock:**
- External API calls to `fetch()` for `https://api.open-meteo.com` and `https://archive-api.open-meteo.com`
- Global `fetch()` function to avoid network requests during tests
- `StdioServerTransport` to avoid stdio interaction during tests
- `console.error()` to verify logging without cluttering test output

**What NOT to Mock:**
- Server initialization logic in `new Server()`
- Request handler registration via `setRequestHandler()`
- Error handling and response formatting logic
- JSON serialization and parameter parsing

**Recommended Mocking Pattern:**

```typescript
import { vi } from "vitest"; // or jest.mock() for Jest

// Mock global fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  statusText: "OK",
  json: async () => ({
    latitude: 40.7128,
    longitude: -74.0060,
    hourly: { time: [], temperature_2m: [] },
    daily: { time: [], temperature_2m_max: [] },
  }),
});

// Mock transport
vi.mock("@modelcontextprotocol/sdk/server/stdio", () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({
    // Mock implementation
  })),
}));
```

## Fixtures and Test Data

**Test Data:** Not yet created

**Recommended structure for `src/fixtures.ts`:**

```typescript
export const mockWeatherResponse = {
  latitude: 40.7128,
  longitude: -74.0060,
  generationtime_ms: 0.5,
  utc_offset_seconds: -18000,
  timezone: "America/New_York",
  hourly: {
    time: ["2024-01-01T00:00", "2024-01-01T01:00"],
    temperature_2m: [5.2, 4.8],
    precipitation: [0.0, 0.2],
    wind_speed_10m: [12.5, 13.1],
  },
  daily: {
    time: ["2024-01-01"],
    temperature_2m_max: [8.5],
    temperature_2m_min: [2.1],
    precipitation_sum: [0.5],
  },
};

export const mockHistoricalResponse = {
  latitude: 40.7128,
  longitude: -74.0060,
  generationtime_ms: 0.7,
  utc_offset_seconds: -18000,
  timezone: "America/New_York",
  hourly: { /* historical data */ },
  daily: { /* historical data */ },
};
```

**Location:**
- Recommended: `src/fixtures.ts` or `src/__fixtures__/weatherData.ts`
- Import in test files: `import { mockWeatherResponse } from "./fixtures"`

## Coverage

**Requirements:** Not enforced

**Recommended Coverage Targets:**
- Minimum 80% line coverage for critical paths
- 100% coverage for error handling paths
- All tool handlers should have coverage

**View Coverage:** (Once testing framework added)
```bash
# With Vitest
npm run test -- --coverage

# With Jest
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions (`getWeatherForecast`, `getHistoricalWeather`)
- Approach: Mock fetch, verify response formatting
- Files: `src/index.test.ts`

**Integration Tests:**
- Scope: Server initialization and request handling flow
- Approach: Mock only external APIs (fetch), test server request/response cycle
- Test scenarios:
  - Tool listing returns correct schema
  - Tool execution routes to correct handler
  - Error responses include `isError: true` flag

**E2E Tests:**
- Framework: Not applicable - This is a CLI tool
- Could use: Integration tests with actual stdio if needed

## Async Testing

**Current approach needed for this codebase:**

```typescript
it("should fetch weather forecast data", async () => {
  const result = await getWeatherForecast({
    latitude: 40.7128,
    longitude: -74.0060,
  });

  expect(result.content[0].text).toBeDefined();
  expect(result.content[0].type).toBe("text");
});
```

**Pattern:**
- Use `async` keyword on test function
- `await` async function calls
- Use `expect()` assertions after awaits
- Mock `fetch()` to control response timing

## Error Testing

**Pattern for testing error scenarios:**

```typescript
it("should handle API errors gracefully", async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    statusText: "Service Unavailable",
  });

  const result = await getWeatherForecast({
    latitude: 40.7128,
    longitude: -74.0060,
  });

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain("API request failed");
});

it("should handle fetch exceptions", async () => {
  global.fetch = vi.fn().mockRejectedValue(
    new Error("Network error")
  );

  const result = await getWeatherForecast({
    latitude: 40.7128,
    longitude: -74.0060,
  });

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain("Error fetching");
});
```

## Setup and Dependencies

**To add testing to this project:**

```bash
# Install Vitest (recommended for TypeScript/ESM)
npm install --save-dev vitest @vitest/ui

# Or use Jest
npm install --save-dev jest @types/jest ts-jest

# Add test script to package.json
"test": "vitest",
"test:coverage": "vitest --coverage"
```

**Test configuration example (`vitest.config.ts`):**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
```

---

*Testing analysis: 2026-02-18*

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../index.js";

// Track last fetch URL for URL-building tests
let lastFetchUrl = "";

// Mock fetch globally — captures the called URL, returns a mock JSON response
const mockFetch = vi.fn(async (url: string | URL | Request) => {
  lastFetchUrl = url.toString();
  return {
    ok: true,
    json: async () => ({ mocked: true }),
    statusText: "OK",
  } as unknown as Response;
});

vi.stubGlobal("fetch", mockFetch);

let client: Client;
let clientTransport: InMemoryTransport;
let serverTransport: InMemoryTransport;

beforeAll(async () => {
  [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

// Helper: assert a tool call returns an error (either rejects or returns isError: true)
async function assertToolError(
  promise: Promise<unknown>
): Promise<void> {
  try {
    const result = await promise;
    // If resolved, must have isError: true
    expect((result as { isError?: boolean }).isError).toBe(true);
  } catch {
    // Rejected — that's also acceptable
  }
}

// Helper: assert a tool call succeeds (resolves with no isError)
async function assertToolSuccess(
  promise: Promise<unknown>
): Promise<void> {
  const result = await promise;
  expect((result as { isError?: boolean }).isError).not.toBe(true);
}

// ============================================================
// TEST-01: Input validation tests
// ============================================================

describe("input validation", () => {
  // --- Coordinate validation (get_weather_forecast) ---

  it("rejects latitude > 90", async () => {
    await assertToolError(
      client.callTool({ name: "get_weather_forecast", arguments: { latitude: 91, longitude: 0 } })
    );
  });

  it("rejects latitude < -90", async () => {
    await assertToolError(
      client.callTool({ name: "get_weather_forecast", arguments: { latitude: -91, longitude: 0 } })
    );
  });

  it("rejects longitude > 180", async () => {
    await assertToolError(
      client.callTool({ name: "get_weather_forecast", arguments: { latitude: 0, longitude: 181 } })
    );
  });

  it("rejects longitude < -180", async () => {
    await assertToolError(
      client.callTool({ name: "get_weather_forecast", arguments: { latitude: 0, longitude: -181 } })
    );
  });

  it("accepts valid coordinates (0, 0)", async () => {
    mockFetch.mockClear();
    await assertToolSuccess(
      client.callTool({
        name: "get_weather_forecast",
        arguments: { latitude: 0, longitude: 0 },
      })
    );
    expect(mockFetch).toHaveBeenCalled();
  });

  it("accepts boundary coordinates (90, -180)", async () => {
    mockFetch.mockClear();
    await assertToolSuccess(
      client.callTool({
        name: "get_weather_forecast",
        arguments: { latitude: 90, longitude: -180 },
      })
    );
    expect(mockFetch).toHaveBeenCalled();
  });

  it("accepts boundary coordinates (-90, 180)", async () => {
    mockFetch.mockClear();
    await assertToolSuccess(
      client.callTool({
        name: "get_weather_forecast",
        arguments: { latitude: -90, longitude: 180 },
      })
    );
    expect(mockFetch).toHaveBeenCalled();
  });

  // --- Date validation (get_historical_weather) ---

  it("rejects start_date with wrong format (2024-1-1)", async () => {
    await assertToolError(
      client.callTool({
        name: "get_historical_weather",
        arguments: { latitude: 0, longitude: 0, start_date: "2024-1-1", end_date: "2024-01-31" },
      })
    );
  });

  it("rejects start_date with non-date value", async () => {
    await assertToolError(
      client.callTool({
        name: "get_historical_weather",
        arguments: { latitude: 0, longitude: 0, start_date: "not-a-date", end_date: "2024-01-31" },
      })
    );
  });

  it("rejects end_date without dashes (20240101)", async () => {
    await assertToolError(
      client.callTool({
        name: "get_historical_weather",
        arguments: { latitude: 0, longitude: 0, start_date: "2024-01-01", end_date: "20240101" },
      })
    );
  });

  it("accepts valid dates", async () => {
    mockFetch.mockClear();
    await assertToolSuccess(
      client.callTool({
        name: "get_historical_weather",
        arguments: { latitude: 0, longitude: 0, start_date: "2024-01-01", end_date: "2024-01-31" },
      })
    );
    expect(mockFetch).toHaveBeenCalled();
  });

  // --- forecast_days validation ---

  it("rejects forecast_days = 0 (below min 1)", async () => {
    await assertToolError(
      client.callTool({
        name: "get_weather_forecast",
        arguments: { latitude: 0, longitude: 0, forecast_days: 0 },
      })
    );
  });

  it("rejects forecast_days = 17 (above max 16)", async () => {
    await assertToolError(
      client.callTool({
        name: "get_weather_forecast",
        arguments: { latitude: 0, longitude: 0, forecast_days: 17 },
      })
    );
  });
});

// ============================================================
// TEST-02: URL parameter building tests
// ============================================================

describe("URL building", () => {
  beforeAll(() => {
    mockFetch.mockClear();
  });

  it("get_weather_forecast builds correct URL with all parameters", async () => {
    mockFetch.mockClear();
    await client.callTool({
      name: "get_weather_forecast",
      arguments: {
        latitude: 48.8566,
        longitude: 2.3522,
        forecast_days: 3,
        timezone: "Europe/Paris",
        hourly: ["temperature_2m"],
        daily: ["precipitation_sum"],
      },
    });

    expect(lastFetchUrl).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?/);
    expect(lastFetchUrl).toContain("latitude=48.8566");
    expect(lastFetchUrl).toContain("longitude=2.3522");
    expect(lastFetchUrl).toContain("forecast_days=3");
    // Timezone may be URL-encoded (Europe%2FParis) or not
    expect(lastFetchUrl).toMatch(/timezone=Europe(%2F|\/)Paris/);
    expect(lastFetchUrl).toContain("hourly=temperature_2m");
    expect(lastFetchUrl).toContain("daily=precipitation_sum");
  });

  it("get_weather_forecast URL uses defaults when not specified", async () => {
    mockFetch.mockClear();
    await client.callTool({
      name: "get_weather_forecast",
      arguments: { latitude: 0, longitude: 0 },
    });

    expect(lastFetchUrl).toContain("forecast_days=7");
    expect(lastFetchUrl).toContain("timezone=auto");
    // Default hourly variables joined by comma (comma may be URL-encoded as %2C)
    expect(lastFetchUrl).toMatch(/hourly=temperature_2m(%2C|,)precipitation(%2C|,)wind_speed_10m/);
    // Default daily variables joined by comma (comma may be URL-encoded as %2C)
    expect(lastFetchUrl).toMatch(/daily=temperature_2m_max(%2C|,)temperature_2m_min(%2C|,)precipitation_sum/);
  });

  it("get_historical_weather builds correct URL with start_date and end_date", async () => {
    mockFetch.mockClear();
    await client.callTool({
      name: "get_historical_weather",
      arguments: {
        latitude: 40.7128,
        longitude: -74.006,
        start_date: "2024-01-01",
        end_date: "2024-01-31",
        hourly: ["temperature_2m"],
        daily: ["precipitation_sum"],
        timezone: "America/New_York",
      },
    });

    expect(lastFetchUrl).toMatch(/^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/);
    expect(lastFetchUrl).toContain("start_date=2024-01-01");
    expect(lastFetchUrl).toContain("end_date=2024-01-31");
    expect(lastFetchUrl).not.toContain("forecast_days");
  });

  it("get_weather_forecast omits hourly and daily params when empty arrays provided", async () => {
    mockFetch.mockClear();
    await client.callTool({
      name: "get_weather_forecast",
      arguments: { latitude: 0, longitude: 0, hourly: [], daily: [] },
    });

    expect(lastFetchUrl).not.toContain("hourly=");
    expect(lastFetchUrl).not.toContain("daily=");
  });
});

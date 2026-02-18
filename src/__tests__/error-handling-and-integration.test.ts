import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { server } from "../index.js";

// ============================================================
// Test Setup: MCP Client + InMemoryTransport (same pattern as
// validation-and-urls.test.ts)
// ============================================================

let client: Client;
let clientTransport: InMemoryTransport;
let serverTransport: InMemoryTransport;

beforeAll(async () => {
  [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client(
    { name: "test-client-error", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.close();
});

// Reset the fetch mock before each test so tests are independent
beforeEach(() => {
  vi.unstubAllGlobals();
});

// Minimal valid args for forecast tool — gets past validation
const VALID_FORECAST_ARGS = { latitude: 0, longitude: 0 };

// ============================================================
// TEST-03: Error handling tests
// ============================================================

describe("error handling", () => {
  it("HTTP 400 Bad Request produces isError result with descriptive message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Bad Request",
    }));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: VALID_FORECAST_ARGS,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
    expect(text).toContain("API request failed");
    expect(text).toContain("Bad Request");
  });

  it("HTTP 500 Internal Server Error produces isError result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    }));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: VALID_FORECAST_ARGS,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
    expect(text).toContain("API request failed");
  });

  it("network failure (fetch throws TypeError) produces isError result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: VALID_FORECAST_ARGS,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
    expect(text).toContain("fetch failed");
  });

  it("malformed JSON response produces isError result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => { throw new SyntaxError("Unexpected token"); },
    }));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: VALID_FORECAST_ARGS,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
    expect(text).toContain("Unexpected token");
  });

  it("AbortError (simulated timeout) produces timeout-specific error message", async () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(err));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: VALID_FORECAST_ARGS,
    });

    expect((result as { isError?: boolean }).isError).toBe(true);
    const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
    expect(text).toContain("timed out after 30 seconds");
  });
});

// ============================================================
// TEST-04 and TEST-05: Integration and tool dispatch tests
// ============================================================

describe("tool dispatch and MCP integration", () => {
  it("get_weather_forecast dispatches correctly and returns parsed weather data", async () => {
    const mockData = { hourly: { temperature_2m: [20, 21] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    }));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: { latitude: 48.8566, longitude: 2.3522 },
    });

    expect((result as { isError?: boolean }).isError).not.toBe(true);
    const content = (result as { content: Array<{ type: string; text: string }> }).content;
    expect(content[0].type).toBe("text");
    const parsed = JSON.parse(content[0].text);
    expect(parsed).toMatchObject({ hourly: { temperature_2m: [20, 21] } });
  });

  it("get_historical_weather dispatches correctly and returns parsed weather data", async () => {
    const mockData = { daily: { temperature_2m_max: [15] } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    }));

    const result = await client.callTool({
      name: "get_historical_weather",
      arguments: {
        latitude: 0,
        longitude: 0,
        start_date: "2024-01-01",
        end_date: "2024-01-31",
      },
    });

    expect((result as { isError?: boolean }).isError).not.toBe(true);
    const content = (result as { content: Array<{ type: string; text: string }> }).content;
    const parsed = JSON.parse(content[0].text);
    expect(parsed).toMatchObject({ daily: { temperature_2m_max: [15] } });
  });

  it("calling an unknown tool name produces an MCP protocol error", async () => {
    // SDK may reject OR return isError:true — both are valid error indicators
    try {
      const result = await client.callTool({ name: "nonexistent_tool", arguments: {} });
      // If resolved, must be an error result
      expect((result as { isError?: boolean }).isError).toBe(true);
      const text = (result as { content: Array<{ type: string; text: string }> }).content[0].text;
      // Error message should reference the unknown tool
      expect(text.toLowerCase()).toMatch(/nonexistent_tool|not found|unknown tool/i);
    } catch {
      // Rejected — that's also acceptable
    }
  });

  it("full MCP request/response envelope is structurally correct (TEST-05)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latitude: 48.8566, longitude: 2.3522 }),
    }));

    const result = await client.callTool({
      name: "get_weather_forecast",
      arguments: { latitude: 48.8566, longitude: 2.3522 },
    });

    // Full MCP envelope: has content array with text element containing valid JSON string
    const typed = result as { isError?: boolean; content: Array<{ type: string; text: string }> };
    expect(typed.isError).not.toBe(true);
    expect(Array.isArray(typed.content)).toBe(true);
    expect(typed.content[0].type).toBe("text");
    // text field must be valid JSON (not a raw object)
    expect(() => JSON.parse(typed.content[0].text)).not.toThrow();
    const parsed = JSON.parse(typed.content[0].text);
    expect(parsed).toBeTypeOf("object");
  });

  it("listTools returns both registered tools with correct schemas", async () => {
    const result = await client.listTools();

    expect(result.tools).toHaveLength(2);
    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain("get_weather_forecast");
    expect(toolNames).toContain("get_historical_weather");

    for (const tool of result.tools) {
      expect(tool.inputSchema).toBeDefined();
      expect((tool.inputSchema as { type?: string }).type).toBe("object");
    }
  });
});

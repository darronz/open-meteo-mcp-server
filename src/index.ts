#!/usr/bin/env node

// QUAL-01 (typed args): Satisfied by Zod-validated registerTool callbacks — no `args: any` needed.
// QUAL-04 (registry dispatch): Satisfied by McpServer.registerTool — no if/else or switch on tool name needed.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Shared Zod schema fragments — defined once and reused by both tool registrations (QUAL-03)
const LATITUDE = z.number().min(-90).max(90).describe("Latitude coordinate (WGS84)");
const LONGITUDE = z.number().min(-180).max(180).describe("Longitude coordinate (WGS84)");

const HOURLY_VARIABLES = z
  .array(z.string())
  .default(["temperature_2m", "precipitation", "wind_speed_10m"])
  .describe("Hourly weather variables to include");

const DAILY_VARIABLES = z
  .array(z.string())
  .default(["temperature_2m_max", "temperature_2m_min", "precipitation_sum"])
  .describe("Daily weather variables to include");

const TIMEZONE = z
  .string()
  .default("auto")
  .describe("Timezone for the data (e.g., America/New_York, Europe/London, auto)");

// Shared fetch/error/response helper — defined once, called by both tools (QUAL-02)
async function fetchWeatherData(url: string): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  try {
    const response = await fetch(url, { signal: controller.signal });

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
    if (error instanceof Error && error.name === "AbortError") {
      return {
        content: [
          {
            type: "text",
            text: "Error fetching weather data: Request timed out after 30 seconds",
          },
        ],
        isError: true,
      };
    }
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
  } finally {
    clearTimeout(timeoutId);
  }
}

// Create the MCP server using the high-level McpServer API
const server = new McpServer({ name: "weather-mcp-server", version: "1.0.0" });

// Register the weather forecast tool
server.registerTool("get_weather_forecast", {
  description:
    "Get weather forecast for a location using Open-Meteo API. Returns hourly and daily weather data including temperature, precipitation, wind, and more.",
  inputSchema: {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    hourly: HOURLY_VARIABLES,
    daily: DAILY_VARIABLES,
    forecast_days: z
      .number()
      .min(1)
      .max(16)
      .default(7)
      .describe("Number of forecast days (1-16)"),
    timezone: TIMEZONE,
  },
}, async ({ latitude, longitude, hourly, daily, forecast_days, timezone }) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    forecast_days: forecast_days.toString(),
    timezone: timezone,
  });

  if (hourly && hourly.length > 0) {
    params.append("hourly", hourly.join(","));
  }

  if (daily && daily.length > 0) {
    params.append("daily", daily.join(","));
  }

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  return fetchWeatherData(url);
});

// Register the historical weather tool
server.registerTool("get_historical_weather", {
  description:
    "Get historical weather data for a location using Open-Meteo Archive API. Returns past weather observations including temperature, precipitation, wind, and more.",
  inputSchema: {
    latitude: LATITUDE,
    longitude: LONGITUDE,
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .describe("Start date in YYYY-MM-DD format (e.g., 2024-01-01)"),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .describe("End date in YYYY-MM-DD format (e.g., 2024-01-31)"),
    hourly: HOURLY_VARIABLES,
    daily: DAILY_VARIABLES,
    timezone: TIMEZONE,
  },
}, async ({ latitude, longitude, start_date, end_date, hourly, daily, timezone }) => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: start_date,
    end_date: end_date,
    timezone: timezone,
  });

  if (hourly && hourly.length > 0) {
    params.append("hourly", hourly.join(","));
  }

  if (daily && daily.length > 0) {
    params.append("daily", daily.join(","));
  }

  const url = `https://archive-api.open-meteo.com/v1/archive?${params.toString()}`;
  return fetchWeatherData(url);
});

export { server };

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");

  process.on("SIGTERM", async () => {
    console.error("Received SIGTERM, shutting down...");
    await server.close();
    process.exit(0);
  });

  process.on("SIGINT", async () => {
    console.error("Received SIGINT, shutting down...");
    await server.close();
    process.exit(0);
  });
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'));
if (isDirectRun) {
  main().catch((error) => { console.error("Fatal error:", error); process.exit(1); });
}

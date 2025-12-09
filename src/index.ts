#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Define the weather forecast tool
const WEATHER_TOOL = {
  name: "get_weather_forecast",
  description:
    "Get weather forecast for a location using Open-Meteo API. Returns hourly and daily weather data including temperature, precipitation, wind, and more.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude coordinate (WGS84)",
      },
      longitude: {
        type: "number",
        description: "Longitude coordinate (WGS84)",
      },
      hourly: {
        type: "array",
        description:
          "Hourly weather variables to include (e.g., temperature_2m, precipitation, wind_speed_10m)",
        items: { type: "string" },
        default: ["temperature_2m", "precipitation", "wind_speed_10m"],
      },
      daily: {
        type: "array",
        description:
          "Daily weather variables to include (e.g., temperature_2m_max, precipitation_sum)",
        items: { type: "string" },
        default: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
        ],
      },
      forecast_days: {
        type: "number",
        description: "Number of forecast days (1-16)",
        default: 7,
        minimum: 1,
        maximum: 16,
      },
      timezone: {
        type: "string",
        description:
          "Timezone for the forecast (e.g., America/New_York, Europe/London, auto)",
        default: "auto",
      },
    },
    required: ["latitude", "longitude"],
  },
};

// Define the historical weather tool
const HISTORICAL_WEATHER_TOOL = {
  name: "get_historical_weather",
  description:
    "Get historical weather data for a location using Open-Meteo Archive API. Returns past weather observations including temperature, precipitation, wind, and more.",
  inputSchema: {
    type: "object",
    properties: {
      latitude: {
        type: "number",
        description: "Latitude coordinate (WGS84)",
      },
      longitude: {
        type: "number",
        description: "Longitude coordinate (WGS84)",
      },
      start_date: {
        type: "string",
        description: "Start date in YYYY-MM-DD format (e.g., 2024-01-01)",
      },
      end_date: {
        type: "string",
        description: "End date in YYYY-MM-DD format (e.g., 2024-01-31)",
      },
      hourly: {
        type: "array",
        description:
          "Hourly weather variables to include (e.g., temperature_2m, precipitation, wind_speed_10m)",
        items: { type: "string" },
        default: ["temperature_2m", "precipitation", "wind_speed_10m"],
      },
      daily: {
        type: "array",
        description:
          "Daily weather variables to include (e.g., temperature_2m_max, precipitation_sum)",
        items: { type: "string" },
        default: [
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
        ],
      },
      timezone: {
        type: "string",
        description:
          "Timezone for the data (e.g., America/New_York, Europe/London, auto)",
        default: "auto",
      },
    },
    required: ["latitude", "longitude", "start_date", "end_date"],
  },
};

// Function to fetch weather forecast data
async function getWeatherForecast(args: any) {
  const {
    latitude,
    longitude,
    hourly = ["temperature_2m", "precipitation", "wind_speed_10m"],
    daily = ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
    forecast_days = 7,
    timezone = "auto",
  } = args;

  // Build the API URL
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
}

// Function to fetch historical weather data
async function getHistoricalWeather(args: any) {
  const {
    latitude,
    longitude,
    start_date,
    end_date,
    hourly = ["temperature_2m", "precipitation", "wind_speed_10m"],
    daily = ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
    timezone = "auto",
  } = args;

  // Build the API URL for historical data
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
          text: `Error fetching historical weather data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  }
}

// Create and configure the server
const server = new Server(
  {
    name: "weather-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [WEATHER_TOOL, HISTORICAL_WEATHER_TOOL],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_weather_forecast") {
    return await getWeatherForecast(request.params.arguments);
  }

  if (request.params.name === "get_historical_weather") {
    return await getHistoricalWeather(request.params.arguments);
  }

  throw new Error(`Unknown tool: ${request.params.name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

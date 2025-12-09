# Weather MCP Server

An MCP (Model Context Protocol) server for retrieving weather forecasts and historical weather data using the Open-Meteo API.

## Features

- Get weather forecasts for any location (up to 16 days ahead)
- Get historical weather data for any past date range
- Customizable weather variables (temperature, precipitation, wind speed, and more)
- Hourly and daily weather data
- No API key required - uses the free Open-Meteo API
- Timezone support

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

## Usage with Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "weather": {
      "command": "/absolute/path/to/node",
      "args": ["/absolute/path/to/weather-mcp-server/dist/index.js"]
    }
  }
}
```

Replace the paths with:

- Your Node.js binary path (find it with `which node` on macOS/Linux)
- The actual path to this project's `dist/index.js` file

**Example for macOS with nvm:**

```json
{
  "mcpServers": {
    "weather": {
      "command": "/Users/username/.nvm/versions/node/v22.16.0/bin/node",
      "args": ["/Users/username/Sites/weather-mcp-server/dist/index.js"]
    }
  }
}
```

After configuration, restart Claude Desktop completely (Cmd+Q on macOS, then reopen).

## Available Tools

### get_weather_forecast

Get weather forecast for a location.

**Parameters:**

- `latitude` (number, required): Latitude coordinate in WGS84 format
- `longitude` (number, required): Longitude coordinate in WGS84 format
- `forecast_days` (number, optional): Number of forecast days (1-16, default: 7)
- `hourly` (array, optional): Hourly weather variables to include
  - Default: `["temperature_2m", "precipitation", "wind_speed_10m"]`
  - Available: temperature_2m, precipitation, wind_speed_10m, relative_humidity_2m, cloud_cover, etc.
- `daily` (array, optional): Daily weather variables to include
  - Default: `["temperature_2m_max", "temperature_2m_min", "precipitation_sum"]`
  - Available: temperature_2m_max, temperature_2m_min, precipitation_sum, wind_speed_10m_max, etc.
- `timezone` (string, optional): Timezone for the data (e.g., "America/New_York", "Europe/London", "auto")
  - Default: "auto" (uses location-based timezone)

**Example - Simple forecast:**

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "forecast_days": 5
}
```

**Example - Custom variables:**

```json
{
  "latitude": 51.5074,
  "longitude": -0.1278,
  "forecast_days": 3,
  "hourly": ["temperature_2m", "precipitation", "wind_speed_10m", "relative_humidity_2m"],
  "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum", "wind_speed_10m_max"],
  "timezone": "Europe/London"
}
```

### get_historical_weather

Get historical weather data for a past date range.

**Parameters:**

- `latitude` (number, required): Latitude coordinate in WGS84 format
- `longitude` (number, required): Longitude coordinate in WGS84 format
- `start_date` (string, required): Start date in YYYY-MM-DD format (e.g., "2024-01-01")
- `end_date` (string, required): End date in YYYY-MM-DD format (e.g., "2024-01-31")
- `hourly` (array, optional): Hourly weather variables to include
  - Default: `["temperature_2m", "precipitation", "wind_speed_10m"]`
- `daily` (array, optional): Daily weather variables to include
  - Default: `["temperature_2m_max", "temperature_2m_min", "precipitation_sum"]`
- `timezone` (string, optional): Timezone for the data
  - Default: "auto"

**Example - Last week's weather:**

```json
{
  "latitude": 40.7128,
  "longitude": -74.0060,
  "start_date": "2024-11-27",
  "end_date": "2024-12-03"
}
```

**Example - Monthly historical data:**

```json
{
  "latitude": 48.8566,
  "longitude": 2.3522,
  "start_date": "2024-01-01",
  "end_date": "2024-01-31",
  "daily": ["temperature_2m_max", "temperature_2m_min", "precipitation_sum"],
  "timezone": "Europe/Paris"
}
```

## Using with Claude Desktop

Once configured, you can ask Claude Desktop natural language questions like:

- "What's the weather forecast for San Francisco?"
- "Get me a 5-day forecast for Tokyo"
- "What was the weather like in London last week?"
- "Show me historical weather for New York from January 1 to January 31, 2024"

Claude will automatically use the appropriate tool to fetch the weather data.

## Response Format

Both tools return weather data in JSON format with the following structure:

```json
{
  "latitude": 37.7749,
  "longitude": -122.4194,
  "timezone": "America/Los_Angeles",
  "hourly": {
    "time": ["2024-12-04T00:00", "2024-12-04T01:00", ...],
    "temperature_2m": [8.3, 7.6, ...],
    "precipitation": [0, 0, ...],
    "wind_speed_10m": [0.4, 1.1, ...]
  },
  "daily": {
    "time": ["2024-12-04", "2024-12-05", ...],
    "temperature_2m_max": [13.4, 16.5, ...],
    "temperature_2m_min": [6.5, 7.5, ...],
    "precipitation_sum": [0, 0, ...]
  }
}
```

## Development

**Build the project:**

```bash
npm run build
```

**Run the server directly:**

```bash
npm start
```

**Test the server:**

```bash
node test-server.js
```

The test script will verify both forecast and historical weather tools are working correctly.

## API Documentation

This server uses the free Open-Meteo API:

- [Open-Meteo Weather Forecast API](https://open-meteo.com/en/docs)
- [Open-Meteo Historical Weather API](https://open-meteo.com/en/docs/historical-weather-api)

## Troubleshooting

### Server not appearing in Claude Desktop

1. Check that the paths in your `claude_desktop_config.json` are absolute paths
2. Verify Node.js version is 18 or higher (`node --version`)
3. Ensure the server was built successfully (`npm run build`)
4. Restart Claude Desktop completely (quit and reopen, not just close the window)
5. Check Claude Desktop logs at `~/Library/Logs/Claude/mcp-server-weather.log` (macOS)

### Server timing out

If you're using nvm (Node Version Manager), make sure to specify the full path to the Node binary in your configuration, not just `node`.

### Invalid coordinates

- Latitude must be between -90 and 90
- Longitude must be between -180 and 180
- Use WGS84 coordinate system (standard GPS coordinates)

### Date format errors

Ensure dates are in YYYY-MM-DD format (e.g., "2024-01-15", not "01/15/2024")

## Common Locations

Here are some coordinates for major cities to get you started:

- San Francisco: 37.7749, -122.4194
- New York: 40.7128, -74.0060
- London: 51.5074, -0.1278
- Tokyo: 35.6762, 139.6503
- Paris: 48.8566, 2.3522
- Sydney: -33.8688, 151.2093

## License

MIT

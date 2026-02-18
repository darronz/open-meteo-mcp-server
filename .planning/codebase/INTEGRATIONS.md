# External Integrations

**Analysis Date:** 2026-02-18

## APIs & External Services

**Weather Data:**
- Open-Meteo Forecast API (`https://api.open-meteo.com/v1/forecast`)
  - SDK/Client: Native JavaScript fetch API
  - Auth: No authentication required (public API)
  - Used in: `getWeatherForecast()` function at `src/index.ts:116-174`
  - Features: 1-16 day weather forecasts with customizable variables (temperature, precipitation, wind, humidity, cloud cover)

- Open-Meteo Archive API (`https://archive-api.open-meteo.com/v1/archive`)
  - SDK/Client: Native JavaScript fetch API
  - Auth: No authentication required (public API)
  - Used in: `getHistoricalWeather()` function at `src/index.ts:177-237`
  - Features: Historical weather data for any past date range

## Data Storage

**Databases:**
- None - This is a stateless server

**File Storage:**
- None - No file persistence

**Caching:**
- None - All requests are made to Open-Meteo in real-time

## Authentication & Identity

**Auth Provider:**
- None - Open-Meteo APIs are free and require no authentication
- No API keys, tokens, or credentials needed

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Console-based logging via `console.error()` for server startup
- Error responses returned as JSON text responses in MCP response format

## CI/CD & Deployment

**Hosting:**
- Claude Desktop application (local integration)
- macOS: Configured via `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: Configured via `%APPDATA%\Claude\claude_desktop_config.json`

**CI Pipeline:**
- None detected

## Environment Configuration

**Required env vars:**
- None

**Secrets location:**
- Not applicable (no secrets needed)

## API Endpoints

**Incoming:**
- None - This is an MCP server that receives tool calls via stdio

**Outgoing:**
- `https://api.open-meteo.com/v1/forecast` - POST/GET with URL parameters
  - Parameters: latitude, longitude, forecast_days, timezone, hourly, daily
  - Response: JSON object with latitude, longitude, timezone, hourly data array, daily data array

- `https://archive-api.open-meteo.com/v1/archive` - POST/GET with URL parameters
  - Parameters: latitude, longitude, start_date, end_date, timezone, hourly, daily
  - Response: JSON object with location info and historical weather arrays

## Tool Integration (MCP)

**Available Tools:**
1. `get_weather_forecast` - Defined at `src/index.ts:11-60`
   - Inputs: latitude, longitude, forecast_days (optional), hourly (optional), daily (optional), timezone (optional)
   - Output: JSON weather forecast data
   - Error handling: Returns error message in isError response

2. `get_historical_weather` - Defined at `src/index.ts:63-113`
   - Inputs: latitude, longitude, start_date, end_date, hourly (optional), daily (optional), timezone (optional)
   - Output: JSON historical weather data
   - Error handling: Returns error message in isError response

## Network Requirements

**Outbound Access:**
- HTTPS access to `api.open-meteo.com` required
- HTTPS access to `archive-api.open-meteo.com` required
- No proxy configuration visible

**Rate Limiting:**
- Open-Meteo free tier has rate limits (not explicitly configured in code)
- No rate limiting implementation in MCP server

## Webhook & Callback Support

**Incoming Webhooks:**
- None

**Outgoing Webhooks:**
- None

---

*Integration audit: 2026-02-18*

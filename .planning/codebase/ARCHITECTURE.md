# Architecture

**Analysis Date:** 2026-02-18

## Pattern Overview

**Overall:** Monolithic MCP (Model Context Protocol) Server - Single-file implementation with embedded tool handlers and API integration layer.

**Key Characteristics:**
- Stdio-based transport for bidirectional communication with Claude Desktop
- Request-response handler pattern for tool listing and execution
- Direct HTTP fetch-based integration with external Open-Meteo APIs
- Synchronous tool definition with async execution handlers
- Error handling at tool execution level with standardized MCP response format

## Layers

**Presentation/Protocol Layer:**
- Purpose: Handles MCP protocol communication and transport
- Location: `src/index.ts` lines 1-8, 273-276
- Contains: Server initialization, transport setup, request handler registration
- Depends on: `@modelcontextprotocol/sdk` library, Node.js stdio
- Used by: Claude Desktop (external client)

**Tool Definition Layer:**
- Purpose: Declares available tools with JSON schemas and parameter definitions
- Location: `src/index.ts` lines 11-113
- Contains: WEATHER_TOOL and HISTORICAL_WEATHER_TOOL object definitions with inputSchema validation
- Depends on: None
- Used by: Request handler to enumerate available tools

**Tool Execution Layer:**
- Purpose: Implements async tool handlers that process arguments and return results
- Location: `src/index.ts` lines 116-237
- Contains: getWeatherForecast() and getHistoricalWeather() functions
- Depends on: Native Node.js fetch API, URL/URLSearchParams
- Used by: MCP request handler (CallToolRequestSchema)

**Integration Layer:**
- Purpose: Makes HTTP requests to external weather APIs
- Location: `src/index.ts` lines 142, 205 (API endpoints)
- Contains: URL construction, query parameter building, HTTP response handling
- Depends on: Open-Meteo free API (https://api.open-meteo.com/v1/forecast, https://archive-api.open-meteo.com/v1/archive)
- Used by: Tool execution functions

**Error Handling Layer:**
- Purpose: Catches and formats errors for MCP clients
- Location: `src/index.ts` lines 144-173, 207-236
- Contains: Try-catch blocks, error formatting to MCP content format, isError flag setting
- Depends on: Tool execution layer
- Used by: MCP protocol to inform client of failures

## Data Flow

**Weather Forecast Request Flow:**

1. Claude Desktop sends tool call via stdio transport with `get_weather_forecast` name and parameters
2. MCP server's CallToolRequestSchema handler receives request at line 260
3. Handler matches tool name at line 261, invokes getWeatherForecast() with request.params.arguments
4. getWeatherForecast() at line 116:
   - Destructures parameters (latitude, longitude, hourly, daily, forecast_days, timezone)
   - Builds URLSearchParams with coordinates and forecast days (lines 127-140)
   - Constructs API URL to https://api.open-meteo.com/v1/forecast (line 142)
5. fetch() sends GET request, receives JSON response
6. Response wrapped in MCP content format with type "text" (lines 154-160)
7. Returns content array to MCP client
8. On error: catches exception, formats error message, sets isError: true (lines 161-172)

**Historical Weather Request Flow:**

1. Claude Desktop sends tool call with `get_historical_weather` name
2. MCP server matches tool name at line 265, invokes getHistoricalWeather()
3. getHistoricalWeather() at line 177:
   - Destructures parameters (latitude, longitude, start_date, end_date, hourly, daily, timezone)
   - Builds URLSearchParams with date range (lines 189-203)
   - Constructs API URL to https://archive-api.open-meteo.com/v1/archive (line 205)
4. fetch() sends GET request, receives JSON response
5. Response wrapped in MCP content format (lines 216-223)
6. On error: formats error message with isError: true (lines 224-235)

**State Management:**
- No persistent state; stateless request/response processing
- Tool definitions cached in memory at server startup (WEATHER_TOOL, HISTORICAL_WEATHER_TOOL constants)
- No inter-request communication or session state

## Key Abstractions

**MCP Server Abstraction:**
- Purpose: Encapsulates Model Context Protocol implementation
- Examples: `src/index.ts` lines 240-250 (Server instantiation)
- Pattern: Composition - Server object with capabilities object defining tool support

**Tool Handler Pattern:**
- Purpose: Maps tool names to async execution functions
- Examples: `src/index.ts` lines 260-270 (CallToolRequestSchema handler)
- Pattern: Switch/if-statement dispatch based on request.params.name

**Tool Schema Pattern:**
- Purpose: Declares tool interface with JSON Schema validation
- Examples: WEATHER_TOOL.inputSchema (lines 15-59), HISTORICAL_WEATHER_TOOL.inputSchema (lines 68-112)
- Pattern: JSON Schema objects with type, properties, required, and default values

**API Integration Abstraction:**
- Purpose: Encapsulates Open-Meteo API communication
- Examples: getWeatherForecast() (lines 116-174), getHistoricalWeather() (lines 177-237)
- Pattern: URLSearchParams for query construction, fetch API for HTTP, JSON parsing for response

## Entry Points

**Server Startup Entry Point:**
- Location: `src/index.ts` lines 273-282 (main() function)
- Triggers: npm start command or direct node execution
- Responsibilities:
  - Creates StdioServerTransport instance for stdio communication (line 274)
  - Connects MCP server to transport (line 275)
  - Logs startup confirmation to stderr (line 276)
  - Handles fatal errors with process exit code 1 (lines 279-281)

**Tool Listing Entry Point:**
- Location: `src/index.ts` lines 253-257 (ListToolsRequestSchema handler)
- Triggers: Claude Desktop queries available tools on connection
- Responsibilities: Returns array of WEATHER_TOOL and HISTORICAL_WEATHER_TOOL definitions

**Tool Execution Entry Point:**
- Location: `src/index.ts` lines 260-270 (CallToolRequestSchema handler)
- Triggers: Claude Desktop executes a tool by name with parameters
- Responsibilities:
  - Routes requests to getWeatherForecast or getHistoricalWeather based on tool name
  - Passes request.params.arguments to handler function
  - Throws error for unknown tool names

## Error Handling

**Strategy:** Try-catch blocks at tool execution layer with standardized MCP error response format.

**Patterns:**
- HTTP errors: Check response.ok status, throw Error with statusText (lines 147, 210)
- Network/fetch errors: Caught by try-catch, formatted with error message (lines 144-172, 207-236)
- Type errors: Use instanceof Error check to safely extract error.message (lines 167, 230)
- Unknown tools: Throw Error from request handler (line 269)
- Response format: All errors returned as MCP content with isError: true flag
- Error messages: JSON wrapped in text content for consistency with success responses

## Cross-Cutting Concerns

**Logging:**
- Startup confirmation logged to stderr: `console.error("Weather MCP Server running on stdio")` (line 276)
- Fatal errors logged to stderr: `console.error("Fatal error:", error)` (line 280)
- No request-level logging for individual tool invocations

**Validation:**
- Input validation delegated to MCP framework via JSON Schema inputSchema
- Coordinate bounds checked conceptually (not enforced in code): latitude -90 to 90, longitude -180 to 180
- Date format validation: Expected YYYY-MM-DD format, not explicitly validated
- Parameter defaults provided in destructuring with || operator: lines 120-123, 183-185

**Authentication:**
- Open-Meteo API requires no authentication (free tier)
- No API key management needed
- Timezone parameter passed through to API (default "auto")

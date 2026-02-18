# Codebase Structure

**Analysis Date:** 2026-02-18

## Directory Layout

```
open-meteo-mcp-server/
├── dist/                      # Compiled JavaScript output
├── node_modules/              # Dependencies (not committed)
├── src/                        # TypeScript source code
│   └── index.ts               # Single source file - entire server implementation
├── package.json               # Project metadata and dependencies
├── package-lock.json          # Locked dependency versions
├── tsconfig.json              # TypeScript compiler configuration
├── README.md                  # User documentation
├── .gitignore                 # Git ignore rules
└── .planning/                 # GSD planning directory
    └── codebase/              # Analysis documents
```

## Directory Purposes

**src:**
- Purpose: TypeScript source code for the MCP server
- Contains: Single monolithic index.ts file with all server logic
- Key files: `src/index.ts` (283 lines) - server initialization, tool definitions, handlers, API integration

**dist:**
- Purpose: Compiled JavaScript output from TypeScript
- Contains: Compiled index.js and source maps (if enabled)
- Key files: `dist/index.js` - executable server entry point
- Generated: Yes (by npm run build)
- Committed: No (in .gitignore by convention)

**node_modules:**
- Purpose: Installed npm dependencies
- Contains: @modelcontextprotocol/sdk, @types/node, typescript, etc.
- Generated: Yes (by npm install)
- Committed: No (in .gitignore)

**root:**
- Purpose: Project configuration and documentation
- Contains: Package manifests, TypeScript config, README, git config

## Key File Locations

**Entry Points:**
- `src/index.ts`: Main application entry point - defines MCP server, tools, handlers, and main() function (lines 1-283)
- `dist/index.js`: Compiled executable (generated from src/index.ts)

**Configuration:**
- `package.json`: NPM project metadata - defines bin script `weather-mcp-server` pointing to dist/index.js (lines 1-19)
- `tsconfig.json`: TypeScript compiler options - targets ES2022, Node16 modules, strict mode (lines 1-12)
- `.gitignore`: Git ignore rules - prevents committing node_modules, dist, etc.

**Core Logic:**
- `src/index.ts` lines 11-113: Tool definitions (WEATHER_TOOL, HISTORICAL_WEATHER_TOOL with JSON schemas)
- `src/index.ts` lines 116-174: getWeatherForecast() handler for forecast requests
- `src/index.ts` lines 177-237: getHistoricalWeather() handler for historical requests
- `src/index.ts` lines 240-270: MCP server initialization, request handler setup
- `src/index.ts` lines 273-282: main() startup function with transport setup

**Testing:**
- No test directory or test files present in codebase
- README.md lines 205-210 reference a test-server.js file not present in repository

**Documentation:**
- `README.md`: Comprehensive user guide - features, installation, usage, API reference, troubleshooting (lines 1-258)

## Naming Conventions

**Files:**
- Source files: camelCase with .ts extension (index.ts)
- Compiled files: camelCase with .js extension (index.js)
- Config files: kebab-case or dot-prefix (tsconfig.json, package.json, .gitignore)
- Documentation: UPPERCASE.md (README.md) or lowercase planning docs

**Directories:**
- Standard npm structure: src, dist, node_modules (lowercase)
- Planning directory: .planning (dot-prefix for tools-specific metadata)

**Variables & Functions:**
- Functions: camelCase (getWeatherForecast, getHistoricalWeather, main)
- Constants: UPPER_SNAKE_CASE (WEATHER_TOOL, HISTORICAL_WEATHER_TOOL)
- Variables: camelCase (latitude, longitude, forecast_days, timezone, params, url, response)
- Type annotations: Loose typing (using `any` at lines 116, 177)

**Types:**
- No explicit TypeScript interfaces defined in codebase
- Tool schemas defined as object literals with type: "object", properties: {...}
- Parameter annotations use `any` type (lines 116, 177)

## Where to Add New Code

**New Weather Tool (e.g., get_alerts):**
- Tool definition: Add to `src/index.ts` before line 240, following WEATHER_TOOL pattern (object with name, description, inputSchema)
- Handler function: Add new async function before line 240 (e.g., getWeatherAlerts(args: any))
- Registration: Add condition in CallToolRequestSchema handler (line 260-267) to match new tool name
- Update tool listing: Add new tool to array returned by ListToolsRequestSchema handler (line 255)

**Utility Functions (if extracting common code):**
- Location: Add to `src/index.ts` after line 113 and before tool handlers, or extract to separate file
- If separate file: Create `src/utils.ts` or `src/api.ts` and import at top of index.ts
- Imports should go at top of file with existing sdk imports (lines 2-8)

**API Integration (if adding new API):**
- Location: Add new integration function near existing API handlers (lines 116-237)
- Pattern: Follow getWeatherForecast pattern - URLSearchParams for query building, fetch() for HTTP, error handling
- External APIs: Add endpoint URL similar to lines 142, 205
- Response format: Wrap API response in MCP content format (lines 154-160, 216-223)

**Configuration (if needed):**
- Environment variables: Not currently used; if needed, read via process.env in main() function (line 273)
- Command-line args: Not currently used; if needed, access via process.argv in main() function
- Config files: Keep configuration in package.json if simple (version, name), or create separate config.ts file

## Special Directories

**node_modules:**
- Purpose: Contains installed npm dependencies
- Generated: Yes (by npm install)
- Committed: No (.gitignore prevents commitment)
- Size: Significant (should be excluded from version control)

**dist:**
- Purpose: Contains compiled JavaScript output
- Generated: Yes (by npm run build / tsc)
- Committed: No (typically excluded from version control)
- Build command: `npm run build` (executes tsc per package.json line 9)

**.git:**
- Purpose: Git version control metadata
- Contains: Repository history, branches, remotes
- Generated: Yes (by git init and operations)
- Committed: No (metadata directory)

**.planning:**
- Purpose: GSD (Generation with Source Direction) planning and analysis documents
- Contains: Codebase analysis, implementation plans, phase execution records
- Generated: Yes (created by GSD tools)
- Committed: Yes (documentation artifacts)

## Build & Deployment

**Development Build:**
```bash
npm run build              # Compiles src/index.ts to dist/index.js
```

**Runtime Execution:**
```bash
npm start                  # Runs dist/index.js via Node.js
./dist/index.js            # Direct execution with shebang (#!/usr/bin/env node at line 1)
```

**Entry Point:**
- CLI command (from package.json bin): `weather-mcp-server` → `./dist/index.js`
- Direct invocation: `node dist/index.js` (requires built dist directory)

**Configuration for Claude Desktop:**
- Location: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- Required: Absolute path to Node.js binary and absolute path to dist/index.js
- Transport: Stdio (bidirectional pipe communication)

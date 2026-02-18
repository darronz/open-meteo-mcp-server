# Technology Stack

**Analysis Date:** 2026-02-18

## Languages

**Primary:**
- TypeScript 5.0+ - Full codebase compiled to ES2022 JavaScript

**Secondary:**
- JavaScript (Node.js runtime)

## Runtime

**Environment:**
- Node.js v18+ (minimum requirement as per README)
- Current test environment: v25.6.0

**Package Manager:**
- npm (version managed via package-lock.json)
- Lockfile: present (`package-lock.json`)

## Frameworks

**Core:**
- @modelcontextprotocol/sdk v0.6.1 - MCP server framework for Claude Desktop integration

**Build/Dev:**
- TypeScript v5.0+ - Language compiler
- Node.js built-in modules - fetch (native HTTP client), URL parsing

## Key Dependencies

**Critical:**
- @modelcontextprotocol/sdk v0.6.1 - Provides Server, StdioServerTransport, and request schemas
  - Transitive dependencies:
    - content-type v1.0.5 - MIME type parsing
    - raw-body v3.0.0 - Body parsing utility
    - zod v3.23.8 - Schema validation library

**Development:**
- @types/node v20.19.28 - TypeScript type definitions for Node.js standard library
- typescript v5.0.0 - TypeScript compiler

## Configuration

**Environment:**
- No environment variables required
- No .env files in use
- All configuration is hardcoded for Open-Meteo API integration

**Build:**
- `tsconfig.json` - Compiled output to `./dist` directory
  - Target: ES2022
  - Module format: Node16 (ESM)
  - Module resolution: Node16
  - Strict mode enabled
  - Root directory: `./src`

**Package Configuration:**
- `package.json` - Project metadata and scripts
  - Type: ES module ("type": "module")
  - Bin entry: `weather-mcp-server` points to `./dist/index.js`

## Platform Requirements

**Development:**
- Node.js v18 or higher
- npm for package management
- Standard Unix-like environment (tested on macOS)

**Production:**
- Node.js v18 or higher
- Deployment as MCP server integrated with Claude Desktop
- Runs on macOS (`~/Library/Application Support/Claude/claude_desktop_config.json`)
- Runs on Windows (`%APPDATA%\Claude\claude_desktop_config.json`)

## Scripts

**Available Commands:**
- `npm run build` - Compile TypeScript to JavaScript (outputs to `dist/`)
- `npm start` - Run the compiled server via `node dist/index.js`
- Server starts and listens on stdin/stdout for MCP protocol messages

## Entry Point

**Main Application:**
- `src/index.ts` - Single source file containing:
  - MCP server setup and configuration
  - Tool definitions (weather forecast and historical weather)
  - API request handlers
  - Error handling and response formatting

---

*Stack analysis: 2026-02-18*

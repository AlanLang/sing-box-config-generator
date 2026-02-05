# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack SingBox configuration generator with a React frontend and Rust (Axum) backend. The frontend is built with Rsbuild and uses TanStack Router for routing. The backend serves as both an API server and static file server.

## Architecture

### Monorepo Structure

```
src/
├── backend/       # Rust backend (Axum)
│   ├── api/       # API route handlers
│   └── error.rs   # Error handling
├── frontend/      # React frontend
│   ├── api/       # API client functions
│   ├── components/
│   ├── routes/    # TanStack Router routes
│   └── lib/
└── main.rs        # Rust entry point
```

### Backend (Rust + Axum)

- **Framework**: Axum with Tokio async runtime
- **Port**: 3005 (configurable via `PORT` env var)
- **Static serving**: Serves frontend from `./web` directory with SPA fallback
- **Data storage**: File-based storage in `./data/logs/` (JSON files)
- **API routes**: All routes are under `/api` prefix
  - `/api/log` - POST (create), GET (list), PUT (update), DELETE (delete)

The backend is a single-binary server that handles both API requests and serves the compiled frontend.

### Frontend (React + Rsbuild)

- **Build tool**: Rsbuild (Rspack-based)
- **Router**: TanStack Router with file-based routing
- **State management**: TanStack Query for server state
- **UI framework**: Radix UI + Tailwind CSS
- **Entry point**: `src/frontend/index.tsx`
- **Build output**: `./web` directory
- **Dev proxy**: `/api` requests proxy to `http://localhost:3005`

Routes are automatically generated from `src/frontend/routes/` by TanStack Router plugin. The route tree is generated at `src/frontend/routes/routeTree.gen.ts`.

### Path Aliases

TypeScript uses `@/*` to reference `src/frontend/*` files.

## Development Commands

### Frontend Development

```bash
# Start dev server with hot reload (port 3000 by default)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Note: `npm run dev` also attempts to run `cargo run` - you may want to run frontend and backend separately during development.

### Backend Development

```bash
# Run Rust backend server (port 3005)
cargo run

# Build backend
cargo build --release
```

### Code Quality

```bash
# Format and lint frontend code with Biome
npm run check

# Format only
npm run format
```

**Biome configuration**: Only checks `src/frontend/**` files, excluding:
- UI components (`src/frontend/components/**/*.{ts,tsx}`)
- Generated files (`src/frontend/routes/routeTree.gen.ts`)
- CSS files (`src/frontend/index.css`)

### Git Hooks

Husky is configured with lint-staged to run `biome check --write` on staged TypeScript/JavaScript files before commit.

## Key Technical Decisions

### Frontend-Backend Communication

- Frontend uses `ky` HTTP client with base URL `/api`
- During development: Rsbuild proxies `/api` to backend
- In production: Backend serves both API and static files

### Data Persistence

Logs are stored as individual JSON files in `./data/logs/`, named by UUID. Each file contains the full log object with `uuid`, `name`, and `json` fields.

### Error Handling

- Backend uses custom `AppError` type for consistent error responses
- Frontend has global error handling in TanStack Query mutation callbacks that displays toast notifications

### Type Safety

- Frontend uses strict TypeScript with generated route types
- Backend uses Rust's type system with serde for JSON serialization

## Common Patterns

### Adding a New API Endpoint

1. Add handler function in `src/backend/api/` (create new module if needed)
2. Register route in `src/main.rs` under the router
3. Create API client function in `src/frontend/api/`
4. Use TanStack Query mutations/queries in components

### Adding a New Frontend Route

Create a new file in `src/frontend/routes/`. The route tree will be auto-generated. Use `createFileRoute` or `createRoute` from TanStack Router.

### UI Components

Reusable UI components are in `src/frontend/components/ui/` (Radix UI wrappers) and `src/frontend/components/` (app-specific).

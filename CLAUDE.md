# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

A full-stack SingBox configuration generator with React frontend and Rust (Axum) backend. Manages configuration modules (logs, rulesets, inbounds) with CRUD operations.

## Architecture

**Tech Stack**:
- Backend: Rust + Axum + Tokio (port 3005)
- Frontend: React + Rsbuild + TanStack Router + TanStack Query
- UI: Radix UI + Tailwind CSS
- Storage: File-based JSON (./data/{module}/)

**Key Paths**:
```
src/
├── backend/api/     # Rust API handlers
├── frontend/
│   ├── api/         # API client (ky)
│   ├── components/  # Reusable components
│   └── routes/      # File-based routes (auto-generated)
└── main.rs          # Server entry + routes
```

**Path Alias**: `@/*` → `src/frontend/*`

## Core Patterns

### Data Model (All Config Modules)
```typescript
{
  uuid: string,      // UUID v4, frontend-generated
  name: string,      // 2-50 chars (validated)
  json: string       // JSON config content
}
```

Storage: `./data/{module}/{uuid}.json`

### API Convention
All endpoints under `/api/{module}`:
- POST - Create (201 CREATED / 409 CONFLICT)
- GET - List (200 OK)
- PUT - Update (200 OK / 404 NOT_FOUND)
- DELETE - Delete (200 OK / 404 NOT_FOUND)

### Frontend Architecture
- **TanStack Query**: Server state management with `queryKey: ["{module}", "list"]`
- **FocusEditor**: Shared full-screen editor component
  - **Critical**: Must be placed OUTSIDE conditional rendering to fix empty state creation bug
- **Validation**: Zod schemas with 2-50 char name validation
- **Error Handling**: Toast notifications on mutations

### Critical Bug Fix Pattern
```tsx
// ❌ WRONG - FocusEditor inside conditional
{items.length === 0 ? <EmptyState /> : (
  <>
    <Grid />
    <FocusEditor />  // Can't create when empty!
  </>
)}

// ✅ CORRECT - FocusEditor outside conditional
{items.length === 0 ? <EmptyState /> : <Grid />}
<FocusEditor isOpen={focusMode} />  // Always rendered
```

## Development

**Quick Start**:
```bash
# Backend (port 3005)
cargo run

# Frontend (port 3000)
npm run dev
```

**Code Quality**:
```bash
npm run check        # Biome lint + format
npm run build        # Production build
```

**Git**: Husky runs `biome check --write` on staged files before commit.

## Technical Decisions

- **Frontend-Backend**: `ky` client with `/api` prefix. Dev proxy to port 3005.
- **File Storage**: Each config item = one JSON file named `{uuid}.json`
- **Error Handling**: Backend uses `AppError`, frontend shows toast notifications
- **Type Safety**: TypeScript (strict) + Rust (serde JSON)

## Adding New Config Modules

Use the `/add-config-module` skill (if available) for step-by-step guidance to add new config management modules following the log/ruleset/inbound pattern.

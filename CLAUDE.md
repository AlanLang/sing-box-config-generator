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

## Skills

- **`/add-config-module`** - Add new config management modules (log/ruleset/inbound pattern)
- **`/commit`** - Create git commits with proper formatting and conventions
- **`/notify-telegram`** - Send task completion summaries to Telegram (requires configuration)

## Telegram Notifications

**IMPORTANT**: After completing any non-trivial task, send a summary notification via Telegram.

**Notification Timing**: Send notification AFTER git push completes successfully.

**Setup Required**: Follow `.claude/telegram-config.md` to configure:
- Telegram Bot Token
- Chat ID

**When to Notify**:
- ✅ Feature implementation completed
- ✅ Bug fix completed
- ✅ Refactoring completed
- ✅ Configuration changes
- ❌ Skip for trivial operations (reading files, searching)

**Complete Task Flow**:
1. Complete the task
2. Git commit changes
3. Git push to remote
4. Send Telegram notification with results

**Notification Pattern**:
```bash
./.claude/scripts/telegram-notify.sh "✅ Task Completed

📋 Task: {brief description}

🔧 Changes:
- {key changes}

✨ Results: {outcomes}

Commit: {commit message}"
```

See `/notify-telegram` skill for detailed guidelines.

## Git Workflow

**IMPORTANT**: Always commit AND push changes after completing tasks (unless no files changed).

**Standard Workflow**:
1. **Commit** changes with proper message format
2. **Push** to remote repository immediately after commit
3. **Notify** via Telegram with results

Use the `/commit` skill for detailed guidelines and automation, or follow this quick format:

```bash
# 1. Commit
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# 2. Push immediately
git push
```

**Quick Reference**: `feat`(新增) | `fix`(修复) | `docs`(文档) | `refactor`(重构) | `style`(格式) | `perf`(优化) | `test`(测试) | `build`(构建) | `chore`(杂项)

**Push Policy**: Always push after successful commit unless explicitly asked not to.

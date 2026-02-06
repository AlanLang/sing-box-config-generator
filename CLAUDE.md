# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

A full-stack SingBox configuration generator with React frontend and Rust (Axum) backend. Manages configuration modules (logs, rulesets, inbounds) with CRUD operations.

## Architecture

**Tech Stack**:
- Backend: Rust + Axum + Tokio (dev: 3005, prod: 3006)
- Frontend: React + Rsbuild + TanStack Router + TanStack Query
- UI: Radix UI + Tailwind CSS
- Storage: File-based JSON (./data/{module}/)
- Package Manager: **Bun** (not npm/pnpm)

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

## Code Modification Rules

### components/ui Directory Protection

**CRITICAL RULE**: The `src/frontend/components/ui/` directory contains shadcn components and MUST NOT be modified manually.

- ❌ **NEVER** directly edit files in `components/ui/`
- ✅ **ONLY** modify these components through shadcn CLI updates
- ✅ Use `bunx shadcn@latest add <component>` to update components
- ✅ For style customization, use className props or wrapper components

**Rationale**: These are vendor-managed components that should maintain compatibility with shadcn updates. Manual modifications will be lost on updates and may cause inconsistencies.

**If you need to customize shadcn components**:
1. Create a wrapper component in `components/` (not `components/ui/`)
2. Use the wrapper to apply custom styles and behavior
3. Never modify the original shadcn component

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
# Install dependencies (first time)
bun install

# Backend (port 3005)
cargo run

# Frontend (port 3000)
bun run dev
```

**Production Build**:
```bash
# Frontend
bun run build

# Backend
cargo build --release
```

**Code Quality**:
```bash
bun run check        # Biome lint + format
bun run build        # Production build
```

**Deployment**:
```bash
./.claude/scripts/deploy.sh    # Build + restart service + health check
```

**Git**: Husky runs `biome check --write` on staged files before commit.

**IMPORTANT**: Always use `bun` for package management, not `npm` or `pnpm`. Lock file: `bun.lock`

## Deployment

**Production Deployment via systemd**:

The application runs as a systemd service in production. Complete deployment workflow:

```bash
# Automated deployment (recommended)
./.claude/scripts/deploy.sh
```

This script will:
1. ✅ Build frontend (`bun run build`)
2. ✅ Build backend (`cargo build --release`)
3. ✅ Update systemd service if needed
4. ✅ Restart service (`systemctl restart sing-box-config-generator`)
5. ✅ Health check at `http://localhost:3006/api/log` (30s timeout)
6. ✅ Display service status and logs

**Service Management**:
```bash
# View status
systemctl status sing-box-config-generator

# View logs
sudo journalctl -u sing-box-config-generator -f

# Manual control
sudo systemctl restart sing-box-config-generator
sudo systemctl stop sing-box-config-generator
sudo systemctl start sing-box-config-generator
```

**Service Files**:
- Service definition: `sing-box-config-generator.service`
- Deployment script: `.claude/scripts/deploy.sh`
- Binary location: `./target/release/sing-box-config-generator`

**Note**: The `/start` skill automatically runs deployment before committing. For other workflows, run deployment manually when needed.

## Technical Decisions

- **Frontend-Backend**: `ky` client with `/api` prefix. Dev proxy to port 3005.
- **File Storage**: Each config item = one JSON file named `{uuid}.json`
- **Error Handling**: Backend uses `AppError`, frontend shows toast notifications
- **Type Safety**: TypeScript (strict) + Rust (serde JSON)

## Skills

- **`/add-config-module`** - Add new config management modules (log/ruleset/inbound pattern)
- **`/commit`** - Create git commits with proper formatting and conventions
- **`/deploy`** - Build, restart service, verify health before committing changes
- **`/notify-telegram`** - Send task completion summaries to Telegram (requires configuration)
- **`/start`** - Execute tasks autonomously with automatic deployment, commit, push, and Telegram notifications

## Telegram Notifications

**Setup Required**: Follow `.claude/telegram-config.md` to configure:
- Telegram Bot Token
- Chat ID

**Automatic Notifications (Only with `/start` skill)**:
The `/start` skill automatically sends notifications after completing tasks. For other workflows, notifications are optional unless explicitly requested.

**Manual Usage**:
Use `/notify-telegram` skill or the script directly:

```bash
./.claude/scripts/telegram-notify.sh "✅ Task Completed

📋 Task: {brief description}

🔧 Changes:
- {key changes}

✨ Results: {outcomes}"
```

See `/notify-telegram` skill for detailed guidelines.

## Git Workflow

**Automatic Workflow (Only with `/start` skill)**:
The `/start` skill automatically handles deployment, commit, and push after completing tasks. For other workflows, these operations are performed only when explicitly requested.

**Manual Workflow**:
When you need to deploy, commit, or push changes, use the skills or follow this process:

```bash
# 1. Deploy (build + restart + health check)
./.claude/scripts/deploy.sh

# 2. Commit (use /commit skill or manual)
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# 3. Push to remote
git push
```

**Commit Message Format**:
`feat`(新增) | `fix`(修复) | `docs`(文档) | `refactor`(重构) | `style`(格式) | `perf`(优化) | `test`(测试) | `build`(构建) | `chore`(杂项)

**Available Skills**:
- `/deploy` - Build, restart service, and verify health
- `/commit` - Create properly formatted git commits

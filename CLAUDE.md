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

**Production Build**:
```bash
# Frontend
npm run build

# Backend
cargo build --release
```

**Code Quality**:
```bash
npm run check        # Biome lint + format
npm run build        # Production build
```

**Deployment**:
```bash
./.claude/scripts/deploy.sh    # Build + restart service + health check
```

**Git**: Husky runs `biome check --write` on staged files before commit.

## Deployment

**Production Deployment via systemd**:

The application runs as a systemd service in production. Complete deployment workflow:

```bash
# Automated deployment (recommended)
./.claude/scripts/deploy.sh
```

This script will:
1. ✅ Build frontend (`npm run build`)
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

**IMPORTANT**: Always run deployment script before committing code changes to ensure they work in production.

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

## Telegram Notifications

**IMPORTANT**: After completing any non-trivial task, send a summary notification via Telegram.

**Notification Timing**: Send notification AFTER successful deployment, commit, and push.

**Setup Required**: Follow `.claude/telegram-config.md` to configure:
- Telegram Bot Token
- Chat ID

**When to Notify**:
- ✅ Feature implementation completed and deployed
- ✅ Bug fix completed and deployed
- ✅ Refactoring completed and deployed
- ✅ Configuration changes deployed
- ❌ Skip for trivial operations (reading files, searching)

**Complete Task Flow**:
1. Complete the task (code changes)
2. **Deploy** (build + restart + health check)
3. **If deployment succeeds:**
   - Git commit changes
   - Git push to remote
   - Send Telegram notification with results
4. **If deployment fails:**
   - Fix issues and retry
   - Do NOT commit or push

**Notification Pattern**:
```bash
./.claude/scripts/telegram-notify.sh "✅ Task Completed & Deployed

📋 Task: {brief description}

🔧 Changes:
- {key changes}

✨ Results: {outcomes}

🚀 Deployment: Success
Commit: {commit message}"
```

See `/notify-telegram` skill for detailed guidelines.

## Git Workflow

**IMPORTANT**: Always deploy, commit, AND push changes after completing tasks (unless no files changed).

**Standard Workflow**:
1. **Deploy** - Build and verify changes work in production
2. **Commit** - Create commit with proper message format (only if deployment succeeds)
3. **Push** - Push to remote repository immediately after commit
4. **Notify** - Send Telegram notification with results

Use the `/deploy` and `/commit` skills for automation, or follow this manual process:

```bash
# 1. Deploy (build + restart + health check)
./.claude/scripts/deploy.sh

# 2. Only if deployment succeeds, commit
git commit -m "$(cat <<'EOF'
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"

# 3. Push immediately
git push

# 4. Notify
./.claude/scripts/telegram-notify.sh "task summary"
```

**Quick Reference**: `feat`(新增) | `fix`(修复) | `docs`(文档) | `refactor`(重构) | `style`(格式) | `perf`(优化) | `test`(测试) | `build`(构建) | `chore`(杂项)

**Deployment Policy**: Always deploy and verify before committing code changes.

**Push Policy**: Always push after successful commit unless explicitly asked not to.

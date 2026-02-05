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

Use the `/add-config-module` skill for step-by-step guidance to add new config management modules following the log/ruleset/inbound pattern.

## Git Commit Guidelines

**IMPORTANT**: Always create a git commit after completing tasks (unless no files changed).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Types (使用中文主题)
- **feat**: 新增功能
- **fix**: 修复 bug
- **docs**: 文档更新
- **style**: 代码格式调整（不影响功能）
- **refactor**: 代码重构
- **perf**: 性能优化
- **test**: 测试相关
- **build**: 构建系统或依赖变更
- **chore**: 其他杂项

### Scope (可选)
- `backend` - 后端
- `frontend` - 前端
- `api` - API 接口
- `ui` - UI 组件
- 或具体模块名（log, ruleset, inbound 等）

### Examples

```bash
feat(frontend): 实现 inbound 配置管理功能

- 添加后端 CRUD API 端点
- 实现前端页面和 API 客户端
- 集成到侧边栏导航

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

```bash
fix: 修复空状态下无法创建配置的问题

将 FocusEditor 移到条件判断外部

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Rules
1. 主题使用中文，简洁清晰（≤50 字符）
2. Body 可选，用于详细说明
3. 必须保留 Co-Authored-By 署名
4. 使用 HEREDOC 传递 commit message 以确保格式正确

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

## Claude Code Workflow Rules

### 自动提交代码

**IMPORTANT**: 每次完成任务后，你必须自动创建 git commit 提交代码。

### Git Commit Message 规范

提交信息必须使用中文，遵循以下格式：

```
<type>(<scope>): <subject>

<body>（可选）

<footer>（可选）
```

#### 提交类型（Type）

- **feat**: 新增功能或特性
- **fix**: 修复 bug 或异常
- **docs**: 文档相关的修改
- **style**: 代码风格调整（不影响代码含义，如格式化、缺少分号等）
- **refactor**: 代码重构（既不是新增功能，也不是修复 bug）
- **perf**: 性能优化
- **test**: 测试相关（新增测试或修复测试）
- **build**: 构建系统或外部依赖的变更（如 npm, cargo, webpack 等）
- **ci**: CI/CD 配置文件和脚本的变更
- **chore**: 其他不修改源代码或测试的变更

#### 作用域（Scope）

作用域表示影响范围，可选值：
- `backend` - 后端相关
- `frontend` - 前端相关
- `api` - API 接口
- `ui` - UI 组件
- `router` - 路由
- `config` - 配置文件
- 或其他具体的模块名称

如果影响范围广泛，可以省略 scope。

#### 主题（Subject）

- 使用中文简短描述（不超过 50 个字符）
- 使用祈使语气（如：添加、修复、更新）
- 不要以句号结尾
- 清晰说明做了什么改动

#### 提交示例

```
feat(frontend): 添加入站配置管理页面

实现入站配置的 CRUD 功能，包括列表展示、新增、编辑和删除操作。
使用 TanStack Query 进行数据管理，添加炫酷的动画效果。

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

```
fix(backend): 修复日志文件读取时的路径错误

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

```
refactor: 提取可复用的 JSON 编辑器组件

将 FocusEditor 组件从日志页面中提取出来，使其可以在多个页面中复用。

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

#### 注意事项

1. 每次完成任务后必须提交代码（除非没有任何文件变更）
2. Commit message 必须使用中文
3. 严格遵循上述格式规范
4. 保留 `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>` 署名

# Commit Skill

Automates git commit creation with proper commit message formatting for this project.

## When to Use

- After completing a task that modified files
- When user explicitly asks to commit changes
- When multiple related changes are ready to be committed together

## Commit Message Format

```
<type>(<scope>): <subject>

<body>

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Commit Types (使用中文主题)

| Type | Description | Example |
|------|-------------|---------|
| **feat** | 新增功能 | feat(frontend): 实现 DNS 配置管理页面 |
| **fix** | 修复 bug | fix(api): 修复创建配置时的并发问题 |
| **docs** | 文档更新 | docs: 更新 README 添加部署说明 |
| **style** | 代码格式调整（不影响功能） | style(frontend): 统一组件命名规范 |
| **refactor** | 代码重构 | refactor: 提取公共配置管理逻辑 |
| **perf** | 性能优化 | perf(backend): 优化文件读取性能 |
| **test** | 测试相关 | test: 添加 API 端点单元测试 |
| **build** | 构建系统或依赖变更 | build: 升级 Rust 到 1.75 |
| **ci** | CI/CD 配置 | ci: 添加 GitHub Actions 工作流 |
| **chore** | 其他杂项 | chore: 清理未使用的依赖 |

## Scope Options (可选)

- `backend` - Rust 后端相关
- `frontend` - React 前端相关
- `api` - API 接口层
- `ui` - UI 组件
- `router` - 路由相关
- 或具体模块名：`log`, `ruleset`, `inbound`, `dns` 等

**提示**: 影响范围广泛时可省略 scope。

## Subject Guidelines

- **使用中文**简短描述（不超过 50 个字符）
- **使用祈使语气**：添加、修复、更新、重构、优化
- **不要**以句号结尾
- **清晰说明**做了什么改动

## Body Guidelines (可选)

- 详细说明改动的原因和内容
- 使用 bullet points 列举多个改动
- 可以包含技术细节、影响范围等
- 空行分隔 subject 和 body

## Commit Workflow

### Step 1: Review Changes
```bash
git status           # See changed files
git diff             # See unstaged changes
git log --oneline -5 # Check recent commit style
```

### Step 2: Analyze Changes

Based on the diff and changed files, determine:
1. **Type**: What kind of change? (feat/fix/docs/refactor/etc)
2. **Scope**: Which part of the codebase? (optional)
3. **Subject**: What was done in one sentence?
4. **Body**: Do we need detailed explanation?

### Step 3: Stage Files

```bash
# Add specific files (preferred for clarity)
git add src/backend/api/dns.rs
git add src/frontend/routes/dns/

# Or add all changes if appropriate
git add .
```

### Step 4: Create Commit

Use HEREDOC format to ensure proper formatting:

```bash
git commit -m "$(cat <<'EOF'
feat(frontend): 实现 DNS 配置管理页面

- 添加 DNS 配置 CRUD 功能
- 实现列表展示和编辑功能
- 集成到侧边栏导航
- 添加表单验证和错误处理

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 5: Verify

```bash
git status           # Should show clean working tree
git log -1 --stat    # Review the commit
```

## Common Scenarios

### Scenario 1: New Feature (Multiple Files)

**Changes**: Backend API + Frontend page + Navigation
```bash
feat: 实现 outbound 配置管理功能

- 添加后端 CRUD API 端点 (/api/outbound)
- 实现前端页面和 API 客户端
- 集成到侧边栏导航
- 遵循现有模块的设计模式

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Scenario 2: Bug Fix (Single Issue)

**Changes**: Fix FocusEditor positioning
```bash
fix(frontend): 修复空状态下无法创建配置的问题

将 FocusEditor 组件移到条件判断外部，确保在空状态下也能正常渲染和使用。

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Scenario 3: Refactoring (Code Restructure)

**Changes**: Extract reusable component
```bash
refactor: 提取可复用的配置卡片组件

将 ConfigCard 从各个页面中提取出来，统一样式和交互逻辑。

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Scenario 4: Documentation (No Code Change)

**Changes**: Update README or docs
```bash
docs: 更新开发文档添加部署指南

- 添加生产环境部署步骤
- 更新环境变量说明
- 补充常见问题解答

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### Scenario 5: Multiple Small Changes

**Changes**: Various fixes and improvements
```bash
chore: 代码清理和优化

- 移除未使用的导入
- 统一变量命名
- 更新依赖版本
- 修复 lint 警告

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Best Practices

1. **One commit per logical change** - Don't mix unrelated changes
2. **Descriptive subjects** - Reader should understand the change without reading code
3. **Use body for complex changes** - Explain why, not just what
4. **Check recent commits** - Follow the project's existing style
5. **Run tests first** - Ensure changes work before committing
6. **Review diff** - Double-check what you're committing

## Anti-Patterns (Avoid These)

❌ **Too vague**: `git commit -m "update files"`
✅ **Better**: `feat(frontend): 添加配置项导出功能`

❌ **Mixed languages**: `feat: add 新功能`
✅ **Better**: `feat: 添加配置导入功能`

❌ **Multiple unrelated changes**: Mixing feature + bugfix
✅ **Better**: Create separate commits

❌ **No Co-Authored-By**: Missing attribution
✅ **Better**: Always include `Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>`

## Quick Reference

```bash
# Common commit patterns
feat: 添加 {feature}
fix: 修复 {bug}
docs: 更新 {document}
refactor: 重构 {component}
style: 格式化 {files}
perf: 优化 {aspect}
test: 添加 {test}
build: 升级 {dependency}
chore: {misc changes}

# With scope
feat(frontend): 添加 {feature}
fix(backend): 修复 {bug}
docs(api): 更新 {document}
```

## Notes

- This skill follows the project's established Git conventions
- All commit messages must use Chinese for the subject
- Always preserve the `Co-Authored-By` attribution
- Use HEREDOC format (`cat <<'EOF'`) for multi-line messages
- Check `git log` to see examples of recent commits in this repo

# Start Skill 更新日志

## 2026-02-05 - GitHub Commit 链接与消息长度限制

### 新增功能

#### 1. GitHub Commit 链接
- 在任务完成的 Telegram 通知中自动添加 GitHub commit 链接
- 支持多种 Git remote URL 格式：
  - SSH: `git@github.com:owner/repo.git`
  - HTTPS: `https://github.com/owner/repo.git`
  - 无后缀: `https://github.com/owner/repo`

**示例消息**:
```
✅ 任务完成

📋 任务: 添加新功能

🔧 主要改动:
- 实现了 XXX 功能
- 优化了 YYY 性能

📝 Commit:
feat(module): 添加新功能

🔗 查看更改: https://github.com/AlanLang/sing-box-config-generator/commit/abc123

🚀 部署状态: 成功
📤 推送状态: 完成
```

#### 2. Telegram 消息长度限制处理
- 自动检测消息长度（Telegram 限制：4096 字符）
- 如果超过 4000 字符，自动截断详细信息
- 保留最重要的信息：任务描述、commit 标题、GitHub 链接

**截断后的消息**:
```
✅ 任务完成

📋 任务: 添加新功能

🔧 主要改动: (内容较长，详见 GitHub)

📝 Commit: feat(module): 添加新功能

🔗 查看更改: https://github.com/AlanLang/sing-box-config-generator/commit/abc123

🚀 部署状态: 成功
📤 推送状态: 完成
```

### 技术实现

#### GitHub URL 提取
```bash
# 获取 commit hash 和 remote URL
COMMIT_HASH=$(git rev-parse HEAD 2>/dev/null || echo "N/A")
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")

# 提取 owner/repo（移除 .git 后缀）
REPO_PATH=$(echo "$REMOTE_URL" | sed -E 's/\.git$//' | sed -E 's/.*[:/]([^/]+\/[^/]+)$/\1/')

# 构建 GitHub commit URL
COMMIT_URL="https://github.com/${REPO_PATH}/commit/${COMMIT_HASH}"
```

#### 消息长度限制
```bash
MAX_LENGTH=4000  # 留一些安全余地（Telegram 限制 4096）

if [ ${#FINAL_MESSAGE} -gt $MAX_LENGTH ]; then
    # 构建简化版消息
    FINAL_MESSAGE="... (truncated) ..."
fi
```

### 更新内容

**修改文件**:
- `.claude/skills/start/SKILL.md`
  - 第 7 步：发送完成通知（添加 GitHub 链接和长度检测）
  - 错误处理：部署失败（添加长度检测）
  - 示例场景：更新所有示例（标注包含 GitHub 链接）

### 验证测试

✅ 所有测试通过:
- GitHub URL 提取（SSH 格式）
- GitHub URL 提取（HTTPS 格式）
- GitHub URL 提取（无 .git 后缀）
- 消息长度检测（< 4000 字符）
- 消息长度检测（> 4000 字符，自动截断）

### 使用说明

无需额外配置，start skill 会自动：
1. 从 git remote 提取仓库信息
2. 在 push 完成后获取 commit hash
3. 构建 GitHub commit URL
4. 添加到 Telegram 通知中
5. 自动处理超长消息

### 兼容性

- 向后兼容：如果无法获取 remote URL，不会显示链接
- 错误处理：所有 git 命令都有失败回退机制
- 平台支持：仅支持 GitHub（其他平台的 URL 提取逻辑不同）

### 限制

- 仅支持 GitHub 仓库（GitLab、Bitbucket 等需要不同的 URL 格式）
- 需要 git remote 配置正确
- commit 必须已经 push 到远程仓库（否则链接无效）

### 未来改进

- [ ] 支持其他 Git 托管平台（GitLab、Bitbucket）
- [ ] 添加短链接支持（减少消息长度）
- [ ] 支持多个 commit 的情况

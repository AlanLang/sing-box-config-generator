# Telegram 通知配置指南

本指南将帮助你设置 Telegram 通知功能，以便在任务完成后自动接收通知。

## 前置条件

- 一个 Telegram 账号
- 能够访问 Telegram（Web/Desktop/Mobile）

## 配置步骤

### 第 1 步: 创建 Telegram Bot

1. 在 Telegram 中搜索 `@BotFather`
2. 发送 `/newbot` 命令
3. 按照提示设置 Bot 的名称和用户名
   - 名称：任意（例如：`Claude Task Notifier`）
   - 用户名：必须以 `bot` 结尾（例如：`my_claude_tasks_bot`）
4. 创建成功后，BotFather 会返回一个 **Bot Token**
   - 格式��似：`1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **重要**：妥善保管这个 Token，不要泄露给他人

### 第 2 步: 获取 Chat ID

#### 方法 1：通过 Bot 获取（推荐）

1. 在 Telegram 中搜索你刚创建的 Bot（例如：`@my_claude_tasks_bot`）
2. 点击 `Start` 或发送 `/start` 消息
3. 发送任意消息给 Bot（例如：`hello`）
4. 在浏览器中访问以下 URL（替换 `YOUR_BOT_TOKEN`）：
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
5. 在返回的 JSON 中找到 `"chat":{"id":123456789}`
6. 其中的数字就是你的 **Chat ID**

#### 方法 2：使用专用 Bot

1. 在 Telegram 中搜索 `@userinfobot`
2. 点击 `Start` 或发送 `/start`
3. Bot 会返回你的 **User ID**（即 Chat ID）

### 第 3 步: 配置环境变量

在项目根目录创建或编辑 `.env` 文件：

```bash
# 在项目根目录执行
nano .env
```

添加以下内容（替换为你的实际值）：

```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
TELEGRAM_CHAT_ID="123456789"
```

保存文件后，确保文件权限安全：

```bash
chmod 600 .env
```

### 第 4 步: 加载环境变量

为了让脚本能够读取环境变量，你需要：

**选项 A：在 shell 配置中添加（推荐）**

编辑你的 shell 配置文件（`~/.bashrc` 或 `~/.zshrc`）：

```bash
# 添加以下行（替换为实际路径）
export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
export TELEGRAM_CHAT_ID="123456789"
```

然后重新加载配置：

```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

**选项 B：项目级环境变量**

在 `.env` 文件中配置（已在第 3 步完成），然后通过脚本自动加载。

### 第 5 步: 测试配置

运行测试脚本验证配置：

```bash
./.claude/scripts/telegram-notify.sh "✅ 测试通知

这是一条来自 Claude Code 的测试消息。

如果你收到这条消息，说明配置成功！"
```

如果配置正确，你应该会在 Telegram 中收到测试消息。

## 故障排查

### 问题 1: "Bot Token 无效"

**错误信息**: `{"ok":false,"error_code":401,"description":"Unauthorized"}`

**解决方法**:
- 检查 `TELEGRAM_BOT_TOKEN` 是否正确
- 确保没有多余的空格或引号
- 重新从 BotFather 获取 Token

### 问题 2: "Chat ID 无效"

**错误信息**: `{"ok":false,"error_code":400,"description":"Bad Request: chat not found"}`

**解决方法**:
- 确保已经向 Bot 发送过消息（点击 Start）
- 检查 `TELEGRAM_CHAT_ID` 是否正确
- 使用 `getUpdates` API 重新获取 Chat ID

### 问题 3: "环境变量未设置"

**错误信息**: `Error: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set`

**解决方法**:
- 确认 `.env` 文件存在且格式正确
- 检查环境变量是否已导出：
  ```bash
  echo $TELEGRAM_BOT_TOKEN
  echo $TELEGRAM_CHAT_ID
  ```
- 重新加载 shell 配置或重启终端

### 问题 4: "网络连接失败"

**错误信息**: `curl: (6) Could not resolve host` 或类似网络错误

**解决方法**:
- 检查网络连接
- 确认可以访问 `api.telegram.org`
- 检查防火墙或代理设置

### 问题 5: "权限被拒绝"

**错误信息**: `Permission denied: ./.claude/scripts/telegram-notify.sh`

**解决方法**:
```bash
chmod +x ./.claude/scripts/telegram-notify.sh
```

## 安全建议

1. **不要提交 .env 文件到 Git**
   - 确保 `.env` 在 `.gitignore` 中
   - 检查：`git status` 应该不显示 `.env`

2. **保护 Bot Token**
   - 不要在公开场合分享
   - 定期更换（通过 BotFather 的 `/revoke`）
   - 如果泄露，立即撤销并重新生成

3. **限制 Bot 权限**
   - Bot 只需要发送消息的权限
   - 不需要管理员权限或读取其他消息

4. **审查通知内容**
   - 不要在通知中包含敏感信息
   - 避免发送完整的代码内容
   - 只发送摘要和关键信息

## 自定义通知

你可以修改 `.claude/scripts/telegram-notify.sh` 来自定义：

- 消息格式（Markdown 或 HTML）
- 通知时机（只在特定任务类型）
- 附加信息（链接、时间戳等）
- 错误处理策略

## 高级配置

### 使用 Telegram 群组

1. 创建一个群组并添加你的 Bot
2. 使用 `getUpdates` API 获取群组的 Chat ID（负数）
3. 在 `.env` 中使用群组的 Chat ID

### 消息格式化

Telegram 支持 Markdown 和 HTML 格式：

```bash
# Markdown (默认)
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="*Bold* _Italic_ \`Code\`" \
  -d parse_mode="Markdown"

# HTML
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" \
  -d chat_id="${CHAT_ID}" \
  -d text="<b>Bold</b> <i>Italic</i> <code>Code</code>" \
  -d parse_mode="HTML"
```

### 添加按钮和链接

参考 Telegram Bot API 文档添加 Inline Keyboard：
https://core.telegram.org/bots/api#inlinekeyboardmarkup

## 相关文档

- [Telegram Bot API 文档](https://core.telegram.org/bots/api)
- [BotFather 命令列表](https://core.telegram.org/bots#botfather)
- [Telegram Bot 最佳实践](https://core.telegram.org/bots/features)

## 需要帮助？

如果遇到问题：

1. 检查本文档的故障排查部分
2. 查看脚本日志（如果有）
3. 测试 Bot Token 和 Chat ID 的有效性
4. 访问 Telegram Bot API 文档获取详细信息

---

**下一步**: 配置完成后，Claude 会在每次完成任务后自动发送通知到你的 Telegram！

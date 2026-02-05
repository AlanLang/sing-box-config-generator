# Telegram 通知 - 快速设置

## 📋 概述

在任务完成后自动发送 Telegram 通知，让你随时掌握项目进度。

## ⚡ 快速开始

### 1️⃣ 创建 Telegram Bot

```bash
# 1. 在 Telegram 搜索 @BotFather
# 2. 发送命令: /newbot
# 3. 按提示设置 Bot 名称和用户名
# 4. 复制 Bot Token（格式：1234567890:ABC...）
```

### 2️⃣ 获取 Chat ID

```bash
# 方法 1: 使用 @userinfobot（最简单）
# - 搜索 @userinfobot
# - 点击 Start，获取你的 User ID

# 方法 2: 通过 API
# - 向你的 Bot 发送任意消息
# - 访问: https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates
# - 找到 "chat":{"id":123456789}
```

### 3️⃣ 配置环境变量

**方法 A: Shell 配置（推荐）**

编辑 `~/.bashrc` 或 `~/.zshrc`：

```bash
export TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
export TELEGRAM_CHAT_ID="123456789"
```

重新加载：
```bash
source ~/.bashrc  # 或 source ~/.zshrc
```

**方法 B: 项目 .env 文件**

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 并填入实际值
nano .env
```

### 4️⃣ 测试配置

```bash
./.claude/scripts/telegram-notify.sh "✅ 测试通知

这是一条测试消息！如果收到说明配置成功。"
```

## ✅ 完成！

配置成功后，Claude 会在每次完成任务后自动发送通知。

## 📚 详细文档

- **完整配置指南**: `.claude/telegram-config.md`
- **Skill 文档**: `.claude/skills/notify-telegram/SKILL.md`
- **故障排查**: 见 `.claude/telegram-config.md` 的故障排查部分

## 🔧 文件说明

```
.claude/
├── telegram-config.md              # 详细配置指南
├── QUICK-START-TELEGRAM.md         # 本文件（快速开始）
├── scripts/
│   └── telegram-notify.sh          # 通知脚本
└── skills/
    └── notify-telegram/
        └── SKILL.md                 # Skill 文档

.env.example                         # 环境变量模板
.env                                 # 你的配置（不会提交到 Git）
```

## ❓ 常见问题

**Q: 是否必须配置？**
A: 不是必须的。如果不配置，Claude 仍然可以正常工作，只是不会发送通知。

**Q: 配置后立即生效吗？**
A: 是的，配置后重新加载 shell 或重启终端即可。

**Q: 通知会包含敏感信息吗？**
A: 不会。通知只包含任务摘要、文件名和结果，不会发送代码内容或敏感数据。

**Q: 可以自定义通知格式吗？**
A: 可以。编辑 `.claude/scripts/telegram-notify.sh` 即可自定义。

**Q: 通知发送失败会影响任务执行吗？**
A: 不会。通知发送失败时，任务仍会正常完成，只是会显示警告信息。

## 🔐 安全提示

- ✅ 永远不要提交 `.env` 文件到 Git
- ✅ 不要在公开场合分享 Bot Token
- ✅ 定期更换 Bot Token（通过 @BotFather）
- ✅ 如果 Token 泄露，立即撤销

---

**需要帮助？** 查看完整文档：`.claude/telegram-config.md`

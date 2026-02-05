# Notify Telegram Skill

Sends task completion summaries to Telegram after completing any significant task.

## When to Use

- **Automatically**: After completing any non-trivial task (feature, fix, refactor, etc.)
- **Manually**: When user explicitly requests to send a summary
- **Never**: For trivial operations (reading files, listing directories)

## What to Send

Send a concise summary including:
1. **Task completed**: What was done
2. **Key changes**: Files modified/created
3. **Status**: Success/partial success/issues encountered
4. **Next steps** (if any)

## Message Format

Use clear, structured messages with emojis for readability:

```
✅ Task Completed

📋 Task: {brief description}

🔧 Changes:
- {file/component 1}
- {file/component 2}

✨ Results:
{key outcomes or metrics}

{optional: ⚠️ Issues/Next Steps if any}
```

## Usage

This skill requires environment variables to be configured. See `.claude/telegram-config.md` for setup instructions.

### Send Notification

Call the notification script with a summary:

```bash
/home/alan/code/sing-box-config-generator/.claude/scripts/telegram-notify.sh "Task summary message"
```

### Environment Variables Required

- `TELEGRAM_BOT_TOKEN`: Your Telegram Bot API token
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID

## Examples

### Example 1: Feature Completion

```bash
/home/alan/code/sing-box-config-generator/.claude/scripts/telegram-notify.sh "✅ Task Completed

📋 Task: 实现 DNS 配置管理功能

🔧 Changes:
- src/backend/api/dns.rs (new)
- src/frontend/routes/dns/ (new)
- src/frontend/components/Sidebar.tsx

✨ Results:
- CRUD API endpoints created
- Frontend page with list/edit views
- Integrated into navigation

Commit: feat: 实现 DNS 配置管理功能"
```

### Example 2: Bug Fix

```bash
/home/alan/code/sing-box-config-generator/.claude/scripts/telegram-notify.sh "✅ Bug Fixed

📋 Task: 修复空状态下无法创建配置的问题

🔧 Changes:
- src/frontend/routes/*/index.tsx (4 files)

✨ Results:
- FocusEditor 组件移到条件判断外部
- 空状态创建功能恢复正常
- 所有配置模块已修复

Commit: fix(frontend): 修复空状态下无法创建配置的问题"
```

### Example 3: Task with Issues

```bash
/home/alan/code/sing-box-config-generator/.claude/scripts/telegram-notify.sh "⚠️ Task Partially Completed

📋 Task: 优化 API 性能

🔧 Changes:
- src/backend/api/common.rs
- src/backend/file_manager.rs

✨ Results:
- 实现文件缓存机制
- 性能提升约 40%

⚠️ Next Steps:
- 需要添加缓存失效策略
- 考虑内存使用限制"
```

## Integration Pattern

After completing a task, automatically call this skill:

```typescript
// Task completion logic
async function completeTask(taskSummary: string) {
  // 1. Commit changes (if any)
  await commitChanges();

  // 2. Send Telegram notification
  await notifyTelegram(taskSummary);

  // 3. Inform user
  console.log("Task completed and notification sent");
}
```

## Best Practices

1. **Keep it concise**: 3-5 bullet points max
2. **Be specific**: Mention actual file names/components
3. **Include status**: Clear success/warning indicators
4. **Reference commits**: Include commit message if committed
5. **Highlight blockers**: Mention any issues requiring attention
6. **Use emojis**: Makes notifications scannable on mobile

## Error Handling

If notification fails:
- Log the error but don't block task completion
- Inform user that notification failed
- Provide fallback message content to user directly

## Privacy & Security

- Never send sensitive data (tokens, passwords, API keys)
- Don't include full file contents
- Keep messages at summary level
- Be mindful of what goes into Telegram

## Customization

Users can customize:
- Message format in the script
- When notifications are sent
- What information is included
- Emoji choices

See `.claude/scripts/telegram-notify.sh` to modify behavior.

## Notes

- This skill depends on `curl` being available
- Network connectivity required
- Respects user's Telegram rate limits
- Silent failure - won't disrupt workflow if Telegram is unavailable

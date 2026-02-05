#!/bin/bash

# Telegram 通知脚本
# 用于发送任务完成通知到 Telegram

set -euo pipefail

# 颜色定义（用于终端输出）
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# 加载环境变量
# 优先级：环境变量 > .env 文件
if [ -f "${PROJECT_ROOT}/.env" ]; then
    log_info "Loading environment variables from .env"
    # 安全地加载 .env 文件，避免执行任意代码
    while IFS='=' read -r key value; do
        # 跳过注释和空行
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue

        # 移除引号
        value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")

        # 只导出 TELEGRAM_ 开头的变量
        if [[ "$key" =~ ^TELEGRAM_ ]]; then
            export "$key=$value"
        fi
    done < "${PROJECT_ROOT}/.env"
fi

# 检查必需的环境变量
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
    log_error "Error: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set"
    log_error ""
    log_error "Please configure your Telegram credentials:"
    log_error "1. Read the setup guide: ${PROJECT_ROOT}/.claude/telegram-config.md"
    log_error "2. Set environment variables in ~/.bashrc or ~/.zshrc:"
    log_error "   export TELEGRAM_BOT_TOKEN='your_bot_token'"
    log_error "   export TELEGRAM_CHAT_ID='your_chat_id'"
    log_error "3. Or create a .env file in the project root"
    log_error ""
    exit 1
fi

# 获取消息内容
MESSAGE="${1:-}"

if [ -z "$MESSAGE" ]; then
    log_error "Usage: $0 <message>"
    log_error "Example: $0 '✅ Task completed successfully'"
    exit 1
fi

# 发送 Telegram 消息
send_telegram_message() {
    local message="$1"
    local api_url="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage"

    log_info "Sending notification to Telegram..."

    # 使用 curl 发送消息
    response=$(curl -s -X POST "$api_url" \
        -d chat_id="${TELEGRAM_CHAT_ID}" \
        -d text="${message}" \
        -d parse_mode="Markdown" \
        -w "\n%{http_code}")

    # 分离响应体和状态码
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n-1)

    # 检查响应状态
    if [ "$http_code" -eq 200 ]; then
        # 检查 Telegram API 响应
        if echo "$response_body" | grep -q '"ok":true'; then
            log_info "✅ Notification sent successfully"
            return 0
        else
            log_error "❌ Telegram API returned an error:"
            echo "$response_body" | grep -o '"description":"[^"]*"' || echo "$response_body"
            return 1
        fi
    else
        log_error "❌ HTTP request failed with status code: $http_code"
        echo "$response_body"
        return 1
    fi
}

# 主逻辑
main() {
    # 显示配置信息（隐藏敏感部分）
    log_info "Configuration:"
    log_info "  Bot Token: ${TELEGRAM_BOT_TOKEN:0:10}...${TELEGRAM_BOT_TOKEN: -4}"
    log_info "  Chat ID: ${TELEGRAM_CHAT_ID}"
    log_info ""

    # 发送消息
    if send_telegram_message "$MESSAGE"; then
        exit 0
    else
        log_error "Failed to send notification"
        log_warning "The task was completed, but notification failed"
        log_warning "Check your Telegram configuration and network connection"
        exit 1
    fi
}

# 捕获 Ctrl+C
trap 'log_warning "Interrupted by user"; exit 130' INT

# 执行主逻辑
main

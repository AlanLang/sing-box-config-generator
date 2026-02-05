#!/bin/bash

# 部署脚本 - 构建、重启服务并验证
# 用于每次代码修改后的完整部署流程

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目配置
PROJECT_ROOT="/home/alan/code/sing-box-config-generator"
SERVICE_NAME="sing-box-config-generator"
SERVICE_FILE="${PROJECT_ROOT}/${SERVICE_NAME}.service"
SYSTEMD_DIR="/etc/systemd/system"
HEALTH_CHECK_URL="http://localhost:3006/api/log"
HEALTH_CHECK_TIMEOUT=30

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

log_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# 错误处理
on_error() {
    log_error "部署失败！请检查上述错误信息。"
    exit 1
}

trap on_error ERR

# 切换到项目目录
cd "$PROJECT_ROOT"

log_info "开始部署 SingBox Config Generator..."
echo ""

# ==================== Step 1: 构建前端 ====================
log_step "1/6 构建前端..."
log_info "运行: npm run build"

if npm run build; then
    log_info "✅ 前端构建成功"
else
    log_error "❌ 前端构建失败"
    exit 1
fi
echo ""

# ==================== Step 2: 构建后端 ====================
log_step "2/6 构建后端..."
log_info "运行: cargo build --release"

if cargo build --release; then
    log_info "✅ 后端构建成功"
else
    log_error "❌ 后端构建失败"
    exit 1
fi
echo ""

# ==================== Step 3: 安装/更新 systemd service ====================
log_step "3/6 配置 systemd service..."

if [ ! -f "$SERVICE_FILE" ]; then
    log_error "Service 文件不存在: $SERVICE_FILE"
    exit 1
fi

# 检查 service 是否需要更新
if [ -f "${SYSTEMD_DIR}/${SERVICE_NAME}.service" ]; then
    if ! diff -q "$SERVICE_FILE" "${SYSTEMD_DIR}/${SERVICE_NAME}.service" > /dev/null; then
        log_info "检测到 service 文件变更，正在更新..."
        sudo cp "$SERVICE_FILE" "$SYSTEMD_DIR/"
        sudo systemctl daemon-reload
        log_info "✅ Service 文件已更新"
    else
        log_info "Service 文件无变更"
    fi
else
    log_info "首次安装 service 文件..."
    sudo cp "$SERVICE_FILE" "$SYSTEMD_DIR/"
    sudo systemctl daemon-reload
    sudo systemctl enable "$SERVICE_NAME"
    log_info "✅ Service 已安装并启用"
fi
echo ""

# ==================== Step 4: 重启服务 ====================
log_step "4/6 重启服务..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    log_info "正在重启服务..."
    sudo systemctl restart "$SERVICE_NAME"
else
    log_info "正在启动服务..."
    sudo systemctl start "$SERVICE_NAME"
fi

sleep 2
log_info "✅ 服务已重启"
echo ""

# ==================== Step 5: 健康检查 ====================
log_step "5/6 健康检查..."
log_info "等待服务启动..."

RETRY_COUNT=0
MAX_RETRIES=$HEALTH_CHECK_TIMEOUT

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        if curl -sf "$HEALTH_CHECK_URL" > /dev/null 2>&1; then
            log_info "✅ 服务运行正常"
            break
        fi
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        log_error "❌ 健康检查失败：服务未能正常响应"
        log_error "查看日志: sudo journalctl -u $SERVICE_NAME -n 50 --no-pager"
        exit 1
    fi

    echo -n "."
    sleep 1
done

echo ""
echo ""

# ==================== Step 6: 验证服务状态 ====================
log_step "6/6 验证服务状态..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    log_info "✅ 服务状态: $(systemctl is-active $SERVICE_NAME)"

    # 显示服务信息
    echo ""
    log_info "服务信息:"
    echo "  - 名称: $SERVICE_NAME"
    echo "  - 状态: $(systemctl is-active $SERVICE_NAME)"
    echo "  - PID: $(systemctl show -p MainPID --value $SERVICE_NAME)"
    echo "  - 运行时间: $(systemctl show -p ActiveEnterTimestamp --value $SERVICE_NAME | cut -d' ' -f2-3)"
    echo "  - 端口: 3006"
    echo "  - 健康检查: $HEALTH_CHECK_URL"
else
    log_error "❌ 服务未运行"
    exit 1
fi

echo ""
log_info "========================================="
log_info "🎉 部署成功！"
log_info "========================================="
echo ""
log_info "常用命令:"
echo "  查看状态:   systemctl status $SERVICE_NAME"
echo "  查看日志:   sudo journalctl -u $SERVICE_NAME -f"
echo "  重启服务:   sudo systemctl restart $SERVICE_NAME"
echo "  停止服务:   sudo systemctl stop $SERVICE_NAME"
echo ""
log_info "访问应用: http://localhost:3006"
echo ""

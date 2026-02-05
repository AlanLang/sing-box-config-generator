# 部署指南

## 概述

SingBox Config Generator 使用 systemd 进行生产部署。本指南介绍完整的部署流程。

## 快速开始

### 自动部署（推荐）

```bash
# 运行部署脚本
./.claude/scripts/deploy.sh
```

部署脚本会自动完成：
1. 构建前端（npm run build）
2. 构建后端（cargo build --release）
3. 安装/更新 systemd service
4. 重启服务
5. 健康检查
6. 显示服务状态

### 首次部署

首次部署时，脚本会自动：
- 安装 systemd service 文件到 `/etc/systemd/system/`
- 启用服务（开机自启）
- 启动服务

### 后续部署

后续部署时，脚本会：
- 检查 service 文件是否有变更
- 如有变更，更新并重新加载
- 重启服务
- 验证服务健康状态

## 系统要求

### 软件依赖

- **Node.js** >= 18
- **Rust** >= 1.70
- **npm** 或 **pnpm**
- **systemd**（Linux 系统自带）

### 权限要求

- 需要 `sudo` 权限来管理 systemd 服务
- 用户需要在项目目录有读写权限

## 部署流程详解

### Step 1: 构建前端

```bash
npm run build
```

输出目录：`./web/`（由 rsbuild 生成）

构建内容：
- HTML、CSS、JavaScript 静态文件
- 前端路由配置
- 静态资源（图片、字体等）

### Step 2: 构建后端

```bash
cargo build --release
```

输出文件：`./target/release/sing-box-config-generator`

优化选项：
- Release 模式（性能优化）
- 去除调试符号
- LTO（Link Time Optimization）

### Step 3: 配置 Service

Service 文件位置：`./sing-box-config-generator.service`

关键配置：
```ini
[Service]
Type=simple
User=alan
WorkingDirectory=/home/alan/code/sing-box-config-generator
ExecStart=/home/alan/code/sing-box-config-generator/target/release/sing-box-config-generator
Restart=always
```

### Step 4: 重启服务

```bash
sudo systemctl restart sing-box-config-generator
```

服务会：
- 停止旧进程
- 启动新进程
- 监听端口 3006（生产环境，开发环境使用 3005）

### Step 5: 健康检查

检查端点：`http://localhost:3006/api/log`

超时时间：30 秒

验证内容：
- 服务是否运行
- API 是否响应
- 端口是否可访问

## 服务管理

### 查看状态

```bash
# 查看服务状态
systemctl status sing-box-config-generator

# 检查是否运行
systemctl is-active sing-box-config-generator
```

### 查看日志

```bash
# 实时日志
sudo journalctl -u sing-box-config-generator -f

# 最近 100 行
sudo journalctl -u sing-box-config-generator -n 100

# 今天的日志
sudo journalctl -u sing-box-config-generator --since today

# 带时间戳
sudo journalctl -u sing-box-config-generator -o short-precise
```

### 手动控制

```bash
# 启动
sudo systemctl start sing-box-config-generator

# 停止
sudo systemctl stop sing-box-config-generator

# 重启
sudo systemctl restart sing-box-config-generator

# 重新加载配置
sudo systemctl daemon-reload
sudo systemctl restart sing-box-config-generator
```

### 开机自启

```bash
# 启用开机自启
sudo systemctl enable sing-box-config-generator

# 禁用开机自启
sudo systemctl disable sing-box-config-generator

# 查看是否已启用
systemctl is-enabled sing-box-config-generator
```

## 故障排查

### 问题 1: 端口占用

**症状**：服务启动失败，日志显示 "Address already in use"

**解决方法**：
```bash
# 查找占用端口的进程
sudo lsof -i :3006

# 或使用
sudo netstat -tulpn | grep 3006

# 杀死占用进程
sudo kill -9 <PID>

# 重启服务
sudo systemctl restart sing-box-config-generator
```

### 问题 2: 权限错误

**症状**：服务启动失败，日志显示权限被拒绝

**解决方法**：
```bash
# 检查二进制文件权限
ls -l target/release/sing-box-config-generator

# 确保可执行
chmod +x target/release/sing-box-config-generator

# 检查工作目录权限
ls -ld /home/alan/code/sing-box-config-generator

# 确保 alan 用户有访问权限
sudo chown -R alan:alan /home/alan/code/sing-box-config-generator
```

### 问题 3: 依赖缺失

**症状**：服务启动失败，日志显示找不到库文件

**解决方法**：
```bash
# 检查动态库依赖
ldd target/release/sing-box-config-generator

# 安装缺失的系统库（示例）
sudo apt install libssl-dev  # Debian/Ubuntu
sudo yum install openssl-devel  # RHEL/CentOS

# 重新构建
cargo build --release
```

### 问题 4: 健康检查失败

**症状**：部署脚本显示健康检查超时

**解决方法**：
```bash
# 手动测试 API
curl -v http://localhost:3006/api/log

# 查看服务日志
sudo journalctl -u sing-box-config-generator -n 50

# 检查服务是否真的在运行
systemctl is-active sing-box-config-generator

# 检查进程
ps aux | grep sing-box-config-generator
```

### 问题 5: 构建失败

**前端构建失败**：
```bash
# 清理缓存
rm -rf node_modules web
npm install
npm run build
```

**后端构建失败**：
```bash
# 清理构建缓存
cargo clean
cargo build --release

# 更新依赖
cargo update
```

## 回滚策略

### 快速回滚

```bash
# 1. 停止服务
sudo systemctl stop sing-box-config-generator

# 2. 回退代码
git log --oneline -10  # 查找上一个工作版本
git reset --hard <commit-hash>

# 3. 重新部署
./.claude/scripts/deploy.sh
```

### 保留日志的回滚

```bash
# 1. 创建备份分支
git branch backup-$(date +%Y%m%d-%H%M%S)

# 2. 回退到指定版本
git checkout <working-commit>

# 3. 重新部署
./.claude/scripts/deploy.sh
```

## 性能优化

### 构建优化

**Cargo.toml** 中添加：
```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

### 运行时优化

**Environment 变量**：
```ini
# 在 service 文件中添加
Environment="RUST_LOG=warn"  # 减少日志输出
Environment="MALLOC_CONF=background_thread:true"  # 内存优化
```

### 监控和告警

**设置资源限制**：
```ini
# 在 service 文件中添加
MemoryMax=512M
CPUQuota=50%
```

**监控命令**：
```bash
# 查看资源使用
systemctl show sing-box-config-generator --property=MemoryCurrent,CPUUsageNSec

# 实时监控
watch -n 1 'systemctl show sing-box-config-generator --property=MemoryCurrent'
```

## 环境变量

### 配置环境变量

在 service 文件中添加：
```ini
[Service]
Environment="RUST_LOG=info"
Environment="DATABASE_URL=/path/to/db"
Environment="API_KEY=your-api-key"
```

或使用 EnvironmentFile：
```ini
[Service]
EnvironmentFile=/home/alan/code/sing-box-config-generator/.env.production
```

### 可用环境变量

- `RUST_LOG`: 日志级别（trace|debug|info|warn|error）
- `PORT`: API 端口（默认 3005，生产环境设置为 3006）
- 其他应用特定变量...

## 备份和恢复

### 备份

```bash
# 备份配置和数据
tar -czf backup-$(date +%Y%m%d).tar.gz \
  sing-box-config-generator.service \
  .env \
  data/

# 备份到远程
rsync -avz backup-*.tar.gz user@backup-server:/backups/
```

### 恢复

```bash
# 解压备份
tar -xzf backup-20240205.tar.gz

# 恢复 service
sudo cp sing-box-config-generator.service /etc/systemd/system/
sudo systemctl daemon-reload

# 重新部署
./.claude/scripts/deploy.sh
```

## 监控建议

### 日志监控

使用 systemd 的日志功能：
```bash
# 设置日志大小限制
sudo journalctl --vacuum-size=100M
sudo journalctl --vacuum-time=7d
```

### 服务健康监控

创建监控脚本（cron）：
```bash
#!/bin/bash
if ! systemctl is-active --quiet sing-box-config-generator; then
    echo "Service is down!" | mail -s "Alert" admin@example.com
fi
```

### 性能监控

使用系统工具：
```bash
# 实时性能
htop

# 网络连接
ss -tulpn | grep 3006

# 磁盘使用
du -sh /home/alan/code/sing-box-config-generator
```

## 安全建议

1. **最小权限原则**：服务以非 root 用户运行
2. **防火墙配置**：限制端口访问
3. **日志审计**：定期检查访问日志
4. **定期更新**：保持依赖库最新
5. **备份策略**：定期备份配置和数据

## 常见命令速查

```bash
# 部署
./.claude/scripts/deploy.sh

# 查看状态
systemctl status sing-box-config-generator

# 查看日志
sudo journalctl -u sing-box-config-generator -f

# 重启服务
sudo systemctl restart sing-box-config-generator

# 测试 API
curl http://localhost:3006/api/log

# 查看资源
systemctl show sing-box-config-generator --property=MemoryCurrent

# 回滚
git reset --hard HEAD~1 && ./.claude/scripts/deploy.sh
```

## 相关文档

- [Claude.md](./CLAUDE.md) - 项目总体说明
- [Deploy Skill](./.claude/skills/deploy/SKILL.md) - 部署 skill 文档
- [Commit Skill](./.claude/skills/commit/SKILL.md) - 提交规范

## 支持

遇到问题？
1. 查看日志：`sudo journalctl -u sing-box-config-generator -n 100`
2. 检查服务状态：`systemctl status sing-box-config-generator`
3. 查看本文档的故障排查部分
4. 检查 GitHub Issues

# SingBox Config Generator

SingBox 配置文件可视化生成器 —— 基于 React + Rust (Axum) 的全栈 Web 应用，帮助你通过图形界面轻松管理和生成 [sing-box](https://sing-box.sagernet.org/) 的配置文件。

## 功能概览

### 配置管理

将 sing-box 的复杂 JSON 配置拆分为独立模块，支持可视化编辑和自由组合：

- **Config（主配置）** - 组合各模块生成完整的 sing-box 配置文件，支持一键下载
- **Log（日志）** - 日志级别和输出方式配置
- **DNS Server（DNS 服务器）** - DNS 服务器定义，支持配置 detour 字段
- **DNS Config（DNS 路由）** - DNS 路由规则，将请求分配到不同 DNS 服务器
- **Inbound（入站）** - 入站代理协议配置（如 tun、mixed 等）
- **Outbound（出站）** - 出站代理协议配置（如 direct、block、shadowsocks 等）
- **RuleSet（规则集）** - 远程或本地规则集定义
- **Rule（规则）** - 自定义路由匹配规则
- **Route（路由）** - 路由规则组合，支持 Ruleset 和 Rule 两种类型
- **Experimental（实验性）** - sing-box 实验性功能配置（如 clash_api）

### 订阅管理

- **Subscribe（订阅）** - 管理代理节点订阅链接，支持一键刷新获取最新节点
- **Filter（过滤器）** - 通过简单匹配或正则表达式过滤订阅节点
- **Outbound Group（出站分组）** - 将节点组织为选择器（selector）、URL 测试等分组，支持拖拽排序

### 备份与恢复

- **Backup（备份）** - 一键备份所有配置数据，支持上传/下载备份文件
- 基于 SHA-256 的数据变更检测
- tar.gz 压缩存储

### 其他特性

- 内置 Monaco 代码编辑器，支持 JSON 语法高亮和自动补全
- 深色/浅色主题切换
- 响应式布局，适配移动端和桌面端
- 数据版本自动迁移，确保向后兼容

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Rsbuild |
| 路由 | TanStack Router（基于文件的自动路由） |
| 状态管理 | TanStack Query |
| UI 组件 | Radix UI (shadcn/ui) |
| 样式 | Tailwind CSS 4 |
| 代码编辑器 | Monaco Editor |
| 后端框架 | Rust + Axum + Tokio |
| 数据存储 | 文件系统（JSON） |
| 包管理器 | Bun |

## 快速开始

### 环境要求

- [Bun](https://bun.sh/) >= 1.0
- [Rust](https://www.rust-lang.org/) >= 1.85 (edition 2024)

### 安装依赖

```bash
bun install
```

### 开发模式

前端和后端需要分别启动：

```bash
# 启动后端（端口 3005）
cargo run

# 启动前端（端口 3000，自动代理 API 到后端）
bun run dev
```

### 生产构建

```bash
# 构建前端
bun run build

# 构建后端
cargo build --release
```

构建产物：
- 前端：`dist/` 目录（由后端静态服务托管）
- 后端：`target/release/sing-box-config-generator`

### 部署

项目通过 systemd 服务运行，使用部署脚本一键完成：

```bash
./.claude/scripts/deploy.sh
```

部署脚本会自动执行：构建前端 → 构建后端 → 重启服务 → 健康检查。

生产环境运行在端口 **3006**。

## 项目结构

```
src/
├── backend/
│   ├── api/            # Rust API 处理器（各模块 CRUD）
│   └── migration/      # 数据版本迁移
├── frontend/
│   ├── api/            # API 客户端（基于 ky）
│   ├── components/     # 可复用组件
│   │   └── ui/         # shadcn/ui 组件（勿手动修改）
│   └── routes/         # 页面路由（自动生成）
└── main.rs             # 服务入口 + 路由注册
data/                   # 配置数据存储目录
backups/                # 备份文件存储目录
```

## API 接口

所有模块遵循统一的 RESTful 约定：

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/{module}` | 创建配置 |
| `GET` | `/api/{module}` | 获取列表 |
| `PUT` | `/api/{module}` | 更新配置 |
| `DELETE` | `/api/{module}` | 删除配置 |
| `GET` | `/download/{uuid}` | 生成并下载完整配置 |

支持的模块：`log`、`ruleset`、`rule`、`route`、`inbound`、`outbound`、`dns-server`、`dns-config`、`experimental`、`subscribe`、`filter`、`outbound-group`、`config`、`backup`。

## 代码质量

```bash
# Biome 代码检查和格式化
bun run check

# TypeScript 类型检查
bun run type-check

# Rust 格式检查
cargo fmt --check
```

项目使用 Husky 配置了 Git pre-commit 钩子，提交时自动运行 Biome 检查。

## License

MIT

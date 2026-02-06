# 订阅链接解析功能修复说明

## 问题描述

之前通过订阅获取的 outbound 配置不完整，所有字段都是空值：
```json
{
  "tag": "美国实验性 IEPL 专线 1-花云",
  "type": "trojan",
  "server": "",
  "server_port": 0,
  "password": ""
}
```

## 修复内容

### 1. 完整实现订阅链接解析器

在 `src/backend/api/config_generator.rs` 中重构了 `parse_subscription_line` 函数，现在支持完整解析以下协议：

#### Shadowsocks (ss://)
- **支持格式**：
  - SIP002: `ss://base64(method:password)@server:port#tag`
  - 旧格式: `ss://base64(method:password@server:port)#tag`
- **解析字段**：
  - `type`: "shadowsocks"
  - `server`: 服务器地址
  - `server_port`: 端口号
  - `method`: 加密方式 (如 aes-128-gcm, chacha20-poly1305)
  - `password`: 密码
  - `tag`: 节点名称

#### Trojan
- **格式**：`trojan://password@server:port?security=tls&sni=domain#tag`
- **解析字段**：
  - `type`: "trojan"
  - `server`: 服务器地址
  - `server_port`: 端口号
  - `password`: 密码
  - `tls`: TLS 配置（如果有 security=tls 参数）
    - `enabled`: true
    - `server_name`: SNI 域名
    - `alpn`: ALPN 协议列表
  - `tag`: 节点名称

#### VMess
- **格式**：`vmess://base64(json_config)`
- **JSON 配置包含**：
  - `v`: 版本号
  - `ps`: 节点名称
  - `add`: 服务器地址
  - `port`: 端口
  - `id`: UUID
  - `aid`: AlterID
  - `net`: 传输协议 (tcp, ws, grpc)
  - `type`: 伪装类型
  - `host`: 主机名
  - `path`: 路径
  - `tls`: TLS 配置
  - `sni`: SNI
- **解析字段**：
  - `type`: "vmess"
  - `server`: 服务器地址
  - `server_port`: 端口号
  - `uuid`: UUID
  - `alter_id`: AlterID
  - `security`: 加密方式 (默认 "auto")
  - `tls`: TLS 配置（如果启用）
  - `transport`: 传输层配置（WebSocket, gRPC 等）
  - `tag`: 节点名称

#### VLESS
- **格式**：`vless://uuid@server:port?encryption=none&security=tls&sni=domain&type=ws&path=/path#tag`
- **解析字段**：
  - `type`: "vless"
  - `server`: 服务器地址
  - `server_port`: 端口号
  - `uuid`: UUID
  - `flow`: 流控模式（如 xtls-rprx-vision）
  - `tls`: TLS/Reality 配置
    - `enabled`: true
    - `server_name`: SNI 域名
    - `alpn`: ALPN 协议列表
  - `transport`: 传输层配置
    - `type`: 传输类型 (tcp, ws, grpc, http)
    - `path`: 路径
    - `headers`: HTTP 头（如 Host）
    - `service_name`: gRPC 服务名
  - `tag`: 节点名称

### 2. 命名规范

订阅节点的 tag 命名格式为：`{原始节点名}-{订阅名称}`

例如：
- 原始节点名：`美国实验性 IEPL 专线 1`
- 订阅名称：`花云`
- 最终 tag：`美国实验性 IEPL 专线 1-花云`

这样可以避免不同订阅中同名节点的冲突。

## 测试方法

### 方式一：使用测试脚本

```bash
./test-subscription-parser.sh
```

这个脚本会生成测试用的订阅链接和 base64 编码的订阅内容。

### 方式二：手动测试

1. **创建订阅**：
   - 进入"订阅管理"页面
   - 添加新订阅，输入真实的订阅链接
   - 点击"刷新"获取最新节点

2. **创建过滤器**（可选）：
   - 进入"订阅过滤器"页面
   - 创建过滤规则（如：包含"香港"、"美国"等关键词）
   - 用于筛选特定地区的节点

3. **配置 Outbound 组**：
   - 进入"Outbound 组"页面
   - 创建新组，选择过滤器或直接选择订阅
   - 保存配置

4. **生成配置**：
   - 进入"配置管理"页面
   - 创建或编辑配置
   - 选择相应的 Log、DNS、Inbound、Route、Outbound 组
   - 点击"下载配置"按钮

5. **验证结果**：
   - 打开下载的 JSON 文件
   - 检查 `outbounds` 数组
   - 确认每个 outbound 都包含完整的服务器信息：
     - `server`: 不为空
     - `server_port`: 不为 0
     - `password`/`uuid`: 不为空
     - 其他协议特定字段完整

### 测试用例示例

#### Shadowsocks 示例
```
ss://YWVzLTEyOC1nY206dGVzdA==@192.168.100.1:8888#US%20Server%201
```

**期望输出**：
```json
{
  "type": "shadowsocks",
  "tag": "US Server 1-订阅名",
  "server": "192.168.100.1",
  "server_port": 8888,
  "method": "aes-128-gcm",
  "password": "test"
}
```

#### Trojan 示例
```
trojan://password123@example.com:443?security=tls&sni=example.com#HK%20Server
```

**期望输出**：
```json
{
  "type": "trojan",
  "tag": "HK Server-订阅名",
  "server": "example.com",
  "server_port": 443,
  "password": "password123",
  "tls": {
    "enabled": true,
    "server_name": "example.com"
  }
}
```

## 技术细节

### Base64 解码
使用 `base64` crate 的标准引擎解码：
```rust
base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content)
```

### URL 解码
使用 `urlencoding` crate 解码 URL 编码的字符：
```rust
urlencoding::decode(value).unwrap_or(value.into()).to_string()
```

### JSON 解析
使用 `serde_json` 解析 VMess 的 JSON 配置：
```rust
serde_json::from_str::<Value>(&decoded_str)
```

### 查询参数解析
手动解析 URL 查询参数（`?key=value&key2=value2`）：
```rust
for param in query.split('&') {
  if let Some((key, value)) = param.split_once('=') {
    // 处理参数
  }
}
```

## 兼容性说明

- ✅ 支持标准的 SingBox outbound 格式
- ✅ 自动处理 URL 编码的节点名称
- ✅ 支持 TLS/Reality 配置
- ✅ 支持多种传输层协议（TCP, WebSocket, gRPC, HTTP）
- ✅ 兼容各主流代理订阅服务商的格式

## 注意事项

1. **订阅刷新**：首次添加订阅后，需要点击"刷新"按钮获取最新节点
2. **节点过期**：定期刷新订阅以获取最新的节点信息
3. **过滤规则**：使用过滤器可以只选择需要的节点，避免配置过大
4. **命名冲突**：系统会自动在节点名后添加订阅名称，避免冲突
5. **错误处理**：如果某个节点解析失败，会记录错误并跳过该节点

## 相关文件

- `src/backend/api/config_generator.rs`: 配置生成和订阅解析主逻辑
- `src/backend/api/subscribe.rs`: 订阅管理 API
- `test-subscription-parser.sh`: 测试脚本

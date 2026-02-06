# 订阅配置更新说明

## 修改内容

### 1. 字段顺序调整

所有协议的 outbound 配置字段顺序现在遵循以下规范：

```
tag (最前)
↓
type
↓
server
↓
server_port
↓
认证字段 (password/uuid/method)
↓
TLS 配置
↓
传输层配置
```

**示例输出**：
```json
{
  "tag": "美国节点-花云",
  "type": "trojan",
  "server": "example.com",
  "server_port": 443,
  "password": "your_password",
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com"
  }
}
```

### 2. TLS 配置增强

所有协议的 TLS 配置现在都包含 `insecure` 字段：

#### Shadowsocks
通常不使用 TLS，但如果配置了 TLS：
```json
{
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "domain.com"
  }
}
```

#### Trojan
```json
{
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com",
    "alpn": ["h2", "http/1.1"]  // 可选
  }
}
```

#### VMess
```json
{
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com"
  }
}
```

#### VLESS
```json
{
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com",
    "alpn": ["h2", "http/1.1"]  // 可选
  }
}
```

## 技术实现

### serde_json 的 preserve_order

Cargo.toml 中已启用 `preserve_order` 功能：
```toml
serde_json = { version = "1.0.145", features = ["preserve_order"] }
```

这确保 `Map<String, Value>` 按照插入顺序保持字段顺序。

### 字段插入顺序

所有解析函数都遵循以下模式：

```rust
fn parse_xxx(url: &str, tag: String) -> Result<Value, AppError> {
  let mut outbound = Map::new();

  // 1. Tag (最前)
  outbound.insert("tag".to_string(), Value::String(tag));

  // 2. Type
  outbound.insert("type".to_string(), Value::String("protocol_type".to_string()));

  // 3. Server info
  outbound.insert("server".to_string(), Value::String(server));
  outbound.insert("server_port".to_string(), Value::Number(port.into()));

  // 4. Auth fields
  outbound.insert("password".to_string(), Value::String(password));

  // 5. TLS (if needed)
  let mut tls_obj = Map::new();
  tls_obj.insert("enabled".to_string(), Value::Bool(true));
  tls_obj.insert("insecure".to_string(), Value::Bool(true));
  tls_obj.insert("server_name".to_string(), Value::String(sni));
  outbound.insert("tls".to_string(), Value::Object(tls_obj));

  // 6. Transport (if needed)
  outbound.insert("transport".to_string(), Value::Object(transport_obj));

  Ok(Value::Object(outbound))
}
```

## 完整示例

### Trojan 节点
**订阅链接**：
```
trojan://password123@example.com:443?security=tls&sni=example.com#HK%20Server
```

**生成配置**：
```json
{
  "tag": "HK Server-花云",
  "type": "trojan",
  "server": "example.com",
  "server_port": 443,
  "password": "password123",
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com"
  }
}
```

### VMess 节点
**订阅链接**：
```
vmess://eyJ2IjoiMiIsInBzIjoiU0cgTm9kZSIsImFkZCI6InNnLmV4YW1wbGUuY29tIiwicG9ydCI6IjQ0MyIsImlkIjoiYjgzMTM4MWQtNjMyNC00ZDUzLWFkNGYtOGNkYTQ4YjMwODExIiwiYWlkIjoiMCIsIm5ldCI6IndzIiwidHlwZSI6Im5vbmUiLCJob3N0Ijoic2cuZXhhbXBsZS5jb20iLCJwYXRoIjoiL3BhdGgiLCJ0bHMiOiJ0bHMifQ==
```

**生成配置**：
```json
{
  "tag": "SG Node-花云",
  "type": "vmess",
  "server": "sg.example.com",
  "server_port": 443,
  "uuid": "b831381d-6324-4d53-ad4f-8cda48b30811",
  "alter_id": 0,
  "security": "auto",
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "sg.example.com"
  },
  "transport": {
    "type": "ws",
    "path": "/path",
    "headers": {
      "Host": "sg.example.com"
    }
  }
}
```

### VLESS 节点
**订阅链接**：
```
vless://b831381d-6324-4d53-ad4f-8cda48b30811@example.com:443?encryption=none&security=tls&sni=example.com&type=ws&path=%2Fpath#JP%20Node
```

**生成配置**：
```json
{
  "tag": "JP Node-花云",
  "type": "vless",
  "server": "example.com",
  "server_port": 443,
  "uuid": "b831381d-6324-4d53-ad4f-8cda48b30811",
  "flow": "none",
  "tls": {
    "enabled": true,
    "insecure": true,
    "server_name": "example.com"
  },
  "transport": {
    "type": "ws",
    "path": "/path"
  }
}
```

## 注意事项

### insecure 字段说明

`"insecure": true` 表示跳过 TLS 证书验证。这在以下场景中很有用：
- 测试环境
- 使用自签名证书
- 证书配置不规范的服务器

**安全提示**：在生产环境中，如果服务器有有效证书，建议设置为 `false`。

### 字段顺序的重要性

虽然 JSON 标准不保证对象字段顺序，但保持一致的字段顺序有以下好处：
1. **可读性**：更容易人工阅读和调试
2. **版本控制**：Git diff 更清晰
3. **工具兼容性**：某些工具可能依赖特定顺序

## 测试方法

1. **刷新订阅**：
   ```bash
   # 通过 API 刷新订阅
   curl -X GET "http://localhost:3005/api/subscribe/refresh?uuid=YOUR_UUID"
   ```

2. **生成配置**：
   ```bash
   # 下载配置
   curl -X GET "http://localhost:3005/api/config/generate/YOUR_CONFIG_UUID" -o config.json
   ```

3. **验证字段**：
   ```bash
   # 使用 jq 查看字段顺序
   cat config.json | jq '.outbounds[0]'

   # 验证 TLS 配置
   cat config.json | jq '.outbounds[] | select(.tls) | .tls'
   ```

## 相关文件

- `src/backend/api/config_generator.rs`: 配置生成和订阅解析主逻辑
  - `parse_shadowsocks()`: Shadowsocks 解析器
  - `parse_trojan()`: Trojan 解析器
  - `parse_vmess()`: VMess 解析器
  - `parse_vless()`: VLESS 解析器
- `Cargo.toml`: 依赖配置（包含 preserve_order 特性）

## 版本历史

### v2 (当前版本)
- ✅ 调整字段顺序：tag → type → 其他字段
- ✅ 所有 TLS 配置添加 `insecure: true`
- ✅ 参考 sing-box-config 项目的实现规范

### v1 (初始版本)
- ✅ 实现基础的订阅链接解析
- ✅ 支持四种主要协议
- ⚠️ 字段顺序不规范
- ⚠️ TLS 配置缺少 insecure 字段

# Fix Config Skill

完善和调整 SingBox Config 配置和生成功能。

## 触发关键词

- `/fix-config`
- `完善 config`
- `完善配置`
- `调整配置`
- `修复配置`

## 功能说明

此 skill 用于对 SingBox Config 配置表单和生成逻辑进行调整、完善和修复。涉及前端表单 UI 和后端配置生成两个部分。

## 关键文件

### 前端
- **配置表单**: `src/frontend/components/config-form.tsx`
  - 主表单组件，处理用户输入
  - 包含各模块配置 sections（Log, DNS, Inbounds, Route, Experimental）
  - 表单验证逻辑

- **配置 Sections**: `src/frontend/components/config-sections/`
  - `log-config-section.tsx` - 日志配置
  - `dns-config-section.tsx` - DNS 配置
  - `inbounds-config-section.tsx` - Inbounds 配置
  - `route-config-section.tsx` - Route 配置
  - `experimental-config-section.tsx` - Experimental 配置

### 后端
- **配置生成器**: `src/backend/api/config_generator.rs`
  - `generate_config()` - 主生成入口
  - `resolve_log()` - 解析日志模块
  - `resolve_dns()` - 解析 DNS 配置
  - `resolve_inbounds()` - 解析 Inbounds
  - `resolve_outbounds_and_route()` - 解析 Outbounds 和 Route
  - `resolve_route()` - 解析 Route 配置
  - `resolve_experimental()` - 解析 Experimental 配置

## 配置数据结构

### 前端 TypeScript 接口

```typescript
interface SingBoxConfig {
  name: string;               // 配置名称
  log: string;                // 日志配置 UUID
  dns: {
    config?: string;          // DNS 基础配置 UUID（可选）
    servers: string[];        // DNS 服务器 UUID 列表
    rules?: {
      rule_set: string[];     // Ruleset UUID 列表
      server: string;         // DNS 服务器 UUID
    }[];
    final: string;            // Final DNS 服务器 UUID
  };
  inbounds: string[];         // Inbound UUID 列表
  route: {
    config?: string;          // Route 基础配置 UUID（可选）
    rules?: {
      rulesets: string[];     // Ruleset UUID 列表
      outbound: string;       // Outbound UUID
    }[];
    final: string;            // Final Outbound UUID
    default_domain_resolver?: string;  // 默认域名解析器 UUID（可选）
  };
  experimental?: string;      // Experimental 配置 UUID（可选）
}
```

### 后端 Rust 结构

```rust
pub struct ConfigCreateDto {
  pub name: String,
  pub log: String,
  pub dns: DnsConfigDto,
  pub inbounds: Vec<String>,
  pub route: RouteConfigDto,
  pub experimental: Option<String>,
}
```

## 工作流程

1. **分析任务需求**
   - 明确需要修改的部分（前端/后端/两者）
   - 确定修改范围（新增字段/修改逻辑/修复 bug）

2. **前端修改**（如适用）
   - 更新 `config-form.tsx` 中的接口定义
   - 修改相关 section 组件
   - 更新表单状态管理
   - 调整表单验证逻辑

3. **后端修改**（如适用）
   - 更新 Rust 数据结构
   - 修改配置生成逻辑
   - 调整模块解析函数
   - 更新错误处理

4. **验证生成的配置**
   - 检查生成的 JSON 配置文件格式
   - 验证所有字段是否正确解析
   - 确保符合 SingBox 配置规范

5. **代码质量检查**
   - ✅ 前端: `bun run check`（Biome）
   - ✅ 前端: `bun run type-check`（TypeScript）
   - ✅ 后端: `cargo fmt --check`（如修改了 Rust 代码）

6. **部署和测试**
   - 执行部署脚本
   - 进行端到端测试
   - 验证配置生成功能

## 常见任务类型

### 1. 添加新的配置字段

**前端**:
- 更新 `SingBoxConfig` 接口
- 在表单中添加状态管理
- 添加输入组件
- 更新 `handleSave()` 方法

**后端**:
- 更新 `ConfigCreateDto` 结构
- 修改对应的 `resolve_*()` 函数
- 更新生成逻辑

### 2. 修改现有字段的验证逻辑

**前端**:
- 调整 `isValid` 检查逻辑
- 更新相关的验证函数
- 修改错误提示信息

### 3. 优化配置生成逻辑

**后端**:
- 修改 `config_generator.rs` 中的解析函数
- 优化模块加载逻辑
- 改进错误处理

### 4. 修复配置格式问题

**后端**:
- 检查 JSON 结构生成
- 验证字段映射
- 修复 SingBox 兼容性问题

## 验证配置文件

生成的 SingBox 配置必须符合以下结构：

```json
{
  "log": { /* log config */ },
  "dns": {
    "servers": [ /* dns servers */ ],
    "rules": [ /* dns rules */ ],
    "final": "dns-tag"
  },
  "inbounds": [ /* inbound configs */ ],
  "outbounds": [ /* outbound configs */ ],
  "route": {
    "rules": [ /* route rules */ ],
    "final": "outbound-tag",
    "default_domain_resolver": "dns-tag"  // 可选
  },
  "experimental": { /* experimental config */ }  // 可选
}
```

**关键验证点**:
1. ✅ 所有 UUID 引用正确解析为实际配置
2. ✅ Tag 字段正确提取和引用
3. ✅ 必填字段全部存在
4. ✅ 数据类型正确（string/array/object）
5. ✅ 嵌套结构正确
6. ✅ 可选字段正确处理（存在时包含，不存在时省略）

## 测试建议

### 前端测试
```bash
# 1. 开发模式测试
bun run dev

# 2. 手动测试
# - 创建新配置
# - 编辑现有配置
# - 验证表单验证逻辑
# - 测试各种输入组合
```

### 后端测试
```bash
# 1. 格式检查
cargo fmt --check

# 2. 编译检查
cargo build

# 3. 手动测试
# - 创建测试配置
# - 触发配置生成
# - 检查生成的 JSON 文件
# - 验证 SingBox 可以加载配置
```

### 端到端测试
```bash
# 1. 部署到测试环境
./.claude/scripts/deploy.sh

# 2. 完整流程测试
# - 创建配置（包含所有模块）
# - 下载生成的配置文件
# - 使用 SingBox 验证配置
# - 检查配置是否正常工作
```

## 注意事项

1. **同步修改**
   - 前后端数据结构必须保持一致
   - 修改接口时两边都要更新

2. **向后兼容**
   - 添加新字段时考虑已有配置
   - 新字段应设为可选（Option）
   - 提供合理的默认值

3. **错误处理**
   - 提供清晰的错误消息
   - 前端显示用户友好的提示
   - 后端记录详细的错误日志

4. **代码质量**
   - 遵循项目代码规范
   - 运行所有质量检查
   - 保持代码一致性

5. **配置验证**
   - 确保生成的配置符合 SingBox 规范
   - 测试各种边界情况
   - 验证可选字段的处理

## 使用示例

```bash
# 添加新的配置字段
/fix-config 在 Route 配置中添加 default_mark 字段

# 修复配置生成问题
完善 config DNS 规则解析逻辑有问题

# 优化表单验证
/fix-config 优化配置表单的验证逻辑，增加更详细的错误提示

# 修复字段映射
完善配置 Experimental 字段没有正确生成到最终配置中
```

## 相关文档

- **项目文档**: `/home/alan/code/sing-box-config-generator/CLAUDE.md`
- **SingBox 文档**: https://sing-box.sagernet.org/configuration/
- **配置 API**: `src/backend/api/config.rs`
- **部署脚本**: `.claude/scripts/deploy.sh`

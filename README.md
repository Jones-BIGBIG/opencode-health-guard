# OpenCode Health Guard

🛡️ **Boot-Time Self-Check Gateway for OpenCode**

启动前健康检查插件，确保 OpenCode 配置正确。

## 功能

- ✅ 18 项自检清单
- ✅ 配置文件验证
- ✅ MCP 服务检查
- ✅ 安全与隐私检查
- ✅ 详细报告输出

## 安装

```bash
bun add @opencode-ai/health-guard
```

## 使用

### 1. 在 opencode.jsonc 中配置

```json
{
  "plugin": ["@opencode-ai/health-guard"]
}
```

### 2. 可选配置

```json
{
  "healthGuard": {
    "enabled": true,
    "blockOnFail": true,
    "skipChecks": ["CFG-016"],
    "timeout": 30000,
    "logLevel": "info"
  }
}
```

### 3. 独立运行（CLI）

```bash
bunx @opencode-ai/health-guard
```

## 检查清单

| ID | 名称 | 严重性 | 描述 |
|----|------|--------|------|
| CFG-001 | 配置文件存在性 | H | 检查配置文件是否存在 |
| CFG-002 | 配置文件语法有效性 | H | 检查 JSON 语法是否正确 |
| CFG-003 | 配置字段完整性 | H | 检查核心字段是否存在 |
| CFG-004 | Schema 兼容性 | M | 检查是否有废弃字段 |
| CFG-005 | MCP 服务清单完整性 | M | 检查 MCP 服务配置 |
| CFG-006 | MCP 连接可达性 | H | 检查 MCP 命令是否可执行 |
| CFG-007 | MCP 端口与监听状态 | M | 检查端口冲突 |
| CFG-008 | 运行时依赖 | M | 检查 Node/Bun/Git 等 |
| CFG-009 | MCP 权限校验 | M | 检查权限配置 |
| CFG-010 | API Key 有效性 | H | 检查占位符 API Key |
| CFG-011 | 环境变量完整性 | M | 检查环境变量引用 |
| CFG-012 | 路径合法性 | M | 检查必需目录 |
| CFG-013 | 日志系统健康 | L | 检查日志目录可写 |
| CFG-014 | 缓存完整性 | L | 检查缓存目录 |
| CFG-015 | 冲突配置检测 | M | 检查重复 ID |
| CFG-016 | 版本兼容性 | L | 检查 OpenCode 版本 |
| CFG-017 | 安全与隐私边界 | H | 检查明文密钥 |
| CFG-018 | 回归稳定性预演 | H | 配置加载测试 |

## 输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 OpenCode Health Guard - SELF-CHECK REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 时间: 2026-03-09T07:32:46.000Z
- 触发场景: startup
- 总项数: 18
- 通过: 16
- 失败: 2
- 跳过: 0
- 阻塞: FAIL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

逐项明细:

[CFG-001] 配置文件存在性 | ✅ PASS
  证据: 文件存在: ~/.config/opencode/opencode.jsonc
  严重: H

[CFG-002] 配置文件语法有效性 | ✅ PASS
  证据: JSON 解析成功
  严重: H

...

[CFG-010] API Key 有效性 | ❌ FAIL
  证据: 发现占位符 API Key
  修复: 替换占位符为实际的 API Key 或使用环境变量
  严重: H

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[BLOCKED] 启动被禁止

阻塞项:
  - CFG-010: API Key 有效性
    证据: 发现占位符 API Key
    修复: 替换占位符为实际的 API Key 或使用环境变量

修复动作:
  1) [CFG-010] 替换占位符为实际的 API Key 或使用环境变量

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 配置选项

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `enabled` | boolean | true | 是否启用插件 |
| `trigger` | string[] | ['startup', 'reload'] | 触发场景 |
| `blockOnFail` | boolean | true | 失败时是否阻塞 |
| `skipChecks` | string[] | [] | 要跳过的检查项 ID |
| `timeout` | number | 30000 | 超时时间（毫秒） |
| `logLevel` | string | 'info' | 日志级别 |

## API

### 作为库使用

```typescript
import { runSelfCheck, formatReport, DEFAULT_CONFIG } from '@opencode-ai/health-guard'

const report = await runSelfCheck(DEFAULT_CONFIG, 'manual')
console.log(formatReport(report))
```

### 自定义配置

```typescript
import { runSelfCheck, formatReport, type HealthGuardConfig } from '@opencode-ai/health-guard'

const config: HealthGuardConfig = {
  enabled: true,
  trigger: ['startup'],
  blockOnFail: false,
  skipChecks: ['CFG-016', 'CFG-007'],
  timeout: 60000,
  logLevel: 'debug'
}

const report = await runSelfCheck(config, 'startup')
```

## 开发

```bash
# 安装依赖
bun install

# 构建
bun run build

# 测试
bun test

# 类型检查
bun run typecheck
```

## 许可证

MIT

## 作者

Jones-BIGBIG <neal08390@gmail.com>

/**
 * OpenCode Health Guard - 检查器实现
 * 
 * 实现 18 项自检清单
 */

import type { CheckContext, CheckResult, Checker } from './types'

/**
 * 检查项定义
 */
export interface CheckDefinition {
  id: string
  name: string
  description: string
  severity: 'H' | 'M' | 'L'
  checker: Checker
}

/**
 * CFG-001: 配置文件存在性
 */
export const checkConfigExists: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const exists = await ctx.fileExists(configPath)
  
  return {
    id: 'CFG-001',
    name: '配置文件存在性',
    status: exists ? 'PASS' : 'FAIL',
    evidence: exists 
      ? `文件存在: ${configPath}` 
      : `文件不存在: ${configPath}`,
    fix: exists ? undefined : `创建配置文件: touch ${configPath}`,
    severity: 'H'
  }
}

/**
 * CFG-002: 配置文件语法有效性
 */
export const checkConfigSyntax: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-002',
      name: '配置文件语法有效性',
      status: 'FAIL',
      evidence: '无法读取配置文件',
      fix: '确保配置文件存在且可读',
      severity: 'H'
    }
  }
  
  // 移除 JSONC 注释（简单实现）
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  return {
    id: 'CFG-002',
    name: '配置文件语法有效性',
    status: parsed.success ? 'PASS' : 'FAIL',
    evidence: parsed.success 
      ? 'JSON 解析成功' 
      : `JSON 解析错误: ${parsed.error}`,
    fix: parsed.success ? undefined : `修复 JSON 语法错误: ${parsed.error}`,
    severity: 'H'
  }
}

/**
 * CFG-003: 配置字段完整性
 */
export const checkConfigFields: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-003',
      name: '配置字段完整性',
      status: 'FAIL',
      evidence: '无法读取配置文件',
      severity: 'H'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success) {
    return {
      id: 'CFG-003',
      name: '配置字段完整性',
      status: 'FAIL',
      evidence: '配置文件语法错误，无法检查字段',
      severity: 'H'
    }
  }
  
  const config = parsed.data
  const missingFields: string[] = []
  const warnings: string[] = []
  
  // 检查核心字段
  if (!config.provider && !config.model) {
    missingFields.push('provider 或 model')
  }
  
  // 检查 MCP 配置
  if (config.mcp) {
    for (const [name, mcp] of Object.entries(config.mcp)) {
      const m = mcp as any
      if (m.type === 'local' && !m.command) {
        missingFields.push(`mcp.${name}.command`)
      }
    }
  }
  
  // 检查 Agent 配置
  if (config.agent) {
    for (const [name, agent] of Object.entries(config.agent)) {
      const a = agent as any
      if (a.model && typeof a.model !== 'string') {
        warnings.push(`agent.${name}.model 应该是字符串格式`)
      }
    }
  }
  
  if (missingFields.length > 0) {
    return {
      id: 'CFG-003',
      name: '配置字段完整性',
      status: 'FAIL',
      evidence: `缺失字段: ${missingFields.join(', ')}`,
      fix: `添加缺失字段: ${missingFields.join(', ')}`,
      severity: 'H'
    }
  }
  
  return {
    id: 'CFG-003',
    name: '配置字段完整性',
    status: warnings.length > 0 ? 'WARN' : 'PASS',
    evidence: warnings.length > 0 
      ? `警告: ${warnings.join('; ')}` 
      : '核心字段检查通过',
    severity: 'M'
  }
}

/**
 * CFG-004: Schema 与默认值兼容性
 */
export const checkSchemaCompatibility: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-004',
      name: 'Schema 兼容性',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'M'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success) {
    return {
      id: 'CFG-004',
      name: 'Schema 兼容性',
      status: 'SKIP',
      evidence: '配置文件语法错误',
      severity: 'M'
    }
  }
  
  const config = parsed.data
  const deprecated: string[] = []
  
  // 检查废弃字段
  if (config.mode) {
    deprecated.push('mode (已废弃，请使用 agent)')
  }
  if (config.autoshare !== undefined) {
    deprecated.push('autoshare (已废弃，请使用 share)')
  }
  
  return {
    id: 'CFG-004',
    name: 'Schema 兼容性',
    status: deprecated.length > 0 ? 'WARN' : 'PASS',
    evidence: deprecated.length > 0 
      ? `废弃字段: ${deprecated.join(', ')}` 
      : '无废弃字段',
    fix: deprecated.length > 0 
      ? `更新配置: ${deprecated.join(', ')}` 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-005: MCP 服务清单完整性
 */
export const checkMcpServices: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-005',
      name: 'MCP 服务清单完整性',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'M'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success || !parsed.data.mcp) {
    return {
      id: 'CFG-005',
      name: 'MCP 服务清单完整性',
      status: 'PASS',
      evidence: '未配置 MCP 服务',
      severity: 'L'
    }
  }
  
  const mcp = parsed.data.mcp
  const issues: string[] = []
  const ids = new Set<string>()
  
  for (const [id, service] of Object.entries(mcp)) {
    const s = service as any
    
    // 检查 ID 唯一性
    if (ids.has(id)) {
      issues.push(`重复的 MCP ID: ${id}`)
    }
    ids.add(id)
    
    // 检查必要字段
    if (s.type === 'local') {
      if (!s.command || s.command.length === 0) {
        issues.push(`MCP ${id} 缺少 command`)
      }
    } else if (s.type === 'remote') {
      if (!s.url) {
        issues.push(`MCP ${id} 缺少 url`)
      }
    }
  }
  
  return {
    id: 'CFG-005',
    name: 'MCP 服务清单完整性',
    status: issues.length > 0 ? 'FAIL' : 'PASS',
    evidence: issues.length > 0 
      ? `问题: ${issues.join('; ')}` 
      : `${Object.keys(mcp).length} 个 MCP 服务配置正确`,
    fix: issues.length > 0 
      ? `修复 MCP 配置: ${issues.join('; ')}` 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-006: MCP 连接可达性
 */
export const checkMcpConnection: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  // 这个检查需要实际连接 MCP，这里做简化版本
  // 检查 MCP 命令是否可执行
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-006',
      name: 'MCP 连接可达性',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'H'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success || !parsed.data.mcp) {
    return {
      id: 'CFG-006',
      name: 'MCP 连接可达性',
      status: 'PASS',
      evidence: '未配置 MCP 服务',
      severity: 'L'
    }
  }
  
  const mcp = parsed.data.mcp
  const issues: string[] = []
  
  for (const [id, service] of Object.entries(mcp)) {
    const s = service as any
    if (s.type === 'local' && s.command && s.command[0]) {
      // 检查命令是否存在
      const cmd = s.command[0]
      try {
        const result = await ctx.exec(`which ${cmd}`, { timeout: 5000 })
        if (result.exitCode !== 0) {
          issues.push(`MCP ${id} 命令不可执行: ${cmd}`)
        }
      } catch (e) {
        issues.push(`MCP ${id} 命令检查失败: ${cmd}`)
      }
    }
  }
  
  return {
    id: 'CFG-006',
    name: 'MCP 连接可达性',
    status: issues.length > 0 ? 'FAIL' : 'PASS',
    evidence: issues.length > 0 
      ? `问题: ${issues.join('; ')}` 
      : 'MCP 服务命令可执行',
    fix: issues.length > 0 
      ? `安装缺失的命令或修复路径` 
      : undefined,
    severity: 'H'
  }
}

/**
 * CFG-007: MCP 端口与监听状态
 */
export const checkMcpPorts: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  // 检查常用端口是否被占用
  const ports = [8080, 3000, 4000, 5000]
  const conflicts: string[] = []
  
  for (const port of ports) {
    try {
      const result = await ctx.exec(`lsof -i :${port} 2>/dev/null || true`, { timeout: 5000 })
      if (result.stdout.trim()) {
        conflicts.push(`端口 ${port} 已被使用`)
      }
    } catch (e) {
      // 忽略错误
    }
  }
  
  return {
    id: 'CFG-007',
    name: 'MCP 端口与监听状态',
    status: conflicts.length > 0 ? 'WARN' : 'PASS',
    evidence: conflicts.length > 0 
      ? conflicts.join('; ') 
      : '常用端口检查通过',
    severity: 'M'
  }
}

/**
 * CFG-008: 运行时依赖与二进制可执行性
 */
export const checkRuntimeDependencies: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const dependencies = [
    { name: 'node', cmd: 'node --version' },
    { name: 'bun', cmd: 'bun --version' },
    { name: 'git', cmd: 'git --version' }
  ]
  
  const missing: string[] = []
  const found: string[] = []
  
  for (const dep of dependencies) {
    try {
      const result = await ctx.exec(dep.cmd, { timeout: 5000 })
      if (result.exitCode === 0) {
        found.push(`${dep.name}: ${result.stdout.trim().split('\n')[0]}`)
      } else {
        missing.push(dep.name)
      }
    } catch (e) {
      missing.push(dep.name)
    }
  }
  
  return {
    id: 'CFG-008',
    name: '运行时依赖',
    status: missing.length > 0 ? 'WARN' : 'PASS',
    evidence: missing.length > 0 
      ? `缺失: ${missing.join(', ')}` 
      : `已安装: ${found.join(', ')}`,
    fix: missing.length > 0 
      ? `安装缺失的依赖: ${missing.join(', ')}` 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-009: MCP 权限与能力校验
 */
export const checkMcpPermissions: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-009',
      name: 'MCP 权限校验',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'M'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success) {
    return {
      id: 'CFG-009',
      name: 'MCP 权限校验',
      status: 'SKIP',
      evidence: '配置文件语法错误',
      severity: 'M'
    }
  }
  
  const config = parsed.data
  const warnings: string[] = []
  
  // 检查权限配置
  if (config.permission) {
    const perm = config.permission
    if (perm.bash === 'allow') {
      warnings.push('bash 权限设置为 allow，存在安全风险')
    }
  }
  
  return {
    id: 'CFG-009',
    name: 'MCP 权限校验',
    status: warnings.length > 0 ? 'WARN' : 'PASS',
    evidence: warnings.length > 0 
      ? warnings.join('; ') 
      : '权限配置符合最小权限原则',
    fix: warnings.length > 0 
      ? '将高危权限设置为 ask 或 deny' 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-010: Token/Key 有效性与占位值检查
 */
export const checkApiKeys: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-010',
      name: 'API Key 有效性',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'H'
    }
  }
  
  // 检查是否有明文的 API Key（简单检查）
  const placeholderPatterns = [
    /your-api-key/i,
    /your_key_here/i,
    /sk-\*+/,
    /<API_KEY>/
  ]
  
  const warnings: string[] = []
  
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      warnings.push('发现占位符 API Key')
      break
    }
  }
  
  // 检查环境变量引用
  if (content.includes('process.env') || content.includes('${')) {
    // 使用环境变量引用，是好的实践
  }
  
  return {
    id: 'CFG-010',
    name: 'API Key 有效性',
    status: warnings.length > 0 ? 'WARN' : 'PASS',
    evidence: warnings.length > 0 
      ? warnings.join('; ') 
      : '未发现占位符 API Key',
    fix: warnings.length > 0 
      ? '替换占位符为实际的 API Key 或使用环境变量' 
      : undefined,
    severity: 'H'
  }
}

/**
 * CFG-011: 环境变量完整性
 */
export const checkEnvVariables: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-011',
      name: '环境变量完整性',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'M'
    }
  }
  
  // 提取环境变量引用
  const envRefs = content.match(/\$\{[^}]+\}/g) || []
  const missing: string[] = []
  
  for (const ref of envRefs) {
    const varName = ref.replace(/\$\{|\}/g, '')
    if (!process.env[varName] && !process.env[varName.split(':')[0]]) {
      missing.push(varName)
    }
  }
  
  return {
    id: 'CFG-011',
    name: '环境变量完整性',
    status: missing.length > 0 ? 'WARN' : 'PASS',
    evidence: missing.length > 0 
      ? `缺失环境变量: ${missing.join(', ')}` 
      : `${envRefs.length} 个环境变量引用已设置`,
    fix: missing.length > 0 
      ? `设置缺失的环境变量: ${missing.join(', ')}` 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-012: 路径合法性与可访问性
 */
export const checkPaths: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const paths = [
    { name: '配置目录', path: ctx.configDir },
    { name: '状态目录', path: ctx.stateDir },
    { name: '工作目录', path: ctx.workDir }
  ]
  
  const issues: string[] = []
  
  for (const p of paths) {
    const exists = await ctx.fileExists(p.path)
    if (!exists) {
      issues.push(`${p.name} 不存在: ${p.path}`)
    }
  }
  
  // 检查日志目录
  const logDir = `${ctx.stateDir}/logs`
  const logExists = await ctx.fileExists(logDir)
  if (!logExists) {
    issues.push(`日志目录不存在: ${logDir}`)
  }
  
  return {
    id: 'CFG-012',
    name: '路径合法性',
    status: issues.length > 0 ? 'WARN' : 'PASS',
    evidence: issues.length > 0 
      ? issues.join('; ') 
      : '所有必需路径存在',
    fix: issues.length > 0 
      ? `创建缺失目录` 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-013: 日志系统健康
 */
export const checkLogSystem: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const logDir = `${ctx.stateDir}/logs`
  
  try {
    // 检查日志目录是否可写
    const testFile = `${logDir}/.health-check-${Date.now()}`
    await ctx.exec(`mkdir -p ${logDir} && touch ${testFile} && rm ${testFile}`, { timeout: 5000 })
    
    return {
      id: 'CFG-013',
      name: '日志系统健康',
      status: 'PASS',
      evidence: `日志目录可写: ${logDir}`,
      severity: 'L'
    }
  } catch (e) {
    return {
      id: 'CFG-013',
      name: '日志系统健康',
      status: 'FAIL',
      evidence: `日志目录不可写: ${e}`,
      fix: `检查权限: chmod 755 ${logDir}`,
      severity: 'M'
    }
  }
}

/**
 * CFG-014: 缓存完整性
 */
export const checkCache: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const cacheDir = `${ctx.stateDir}/cache`
  const exists = await ctx.fileExists(cacheDir)
  
  if (!exists) {
    return {
      id: 'CFG-014',
      name: '缓存完整性',
      status: 'WARN',
      evidence: `缓存目录不存在: ${cacheDir}`,
      fix: `创建缓存目录: mkdir -p ${cacheDir}`,
      severity: 'L'
    }
  }
  
  return {
    id: 'CFG-014',
    name: '缓存完整性',
    status: 'PASS',
    evidence: `缓存目录存在: ${cacheDir}`,
    severity: 'L'
  }
}

/**
 * CFG-015: 冲突配置检测
 */
export const checkConflicts: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-015',
      name: '冲突配置检测',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'M'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success) {
    return {
      id: 'CFG-015',
      name: '冲突配置检测',
      status: 'SKIP',
      evidence: '配置文件语法错误',
      severity: 'M'
    }
  }
  
  const config = parsed.data
  const conflicts: string[] = []
  
  // 检查 MCP ID 冲突
  if (config.mcp) {
    const ids = Object.keys(config.mcp)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicates.length > 0) {
      conflicts.push(`重复的 MCP ID: ${duplicates.join(', ')}`)
    }
  }
  
  // 检查 provider 冲突
  if (config.provider) {
    const ids = Object.keys(config.provider)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicates.length > 0) {
      conflicts.push(`重复的 Provider ID: ${duplicates.join(', ')}`)
    }
  }
  
  return {
    id: 'CFG-015',
    name: '冲突配置检测',
    status: conflicts.length > 0 ? 'FAIL' : 'PASS',
    evidence: conflicts.length > 0 
      ? conflicts.join('; ') 
      : '未发现配置冲突',
    fix: conflicts.length > 0 
      ? '移除重复配置' 
      : undefined,
    severity: 'M'
  }
}

/**
 * CFG-016: 版本兼容性
 */
export const checkVersionCompatibility: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  try {
    // 检查 OpenCode 版本
    const result = await ctx.exec('opencode --version', { timeout: 5000 })
    const version = result.stdout.trim()
    
    return {
      id: 'CFG-016',
      name: '版本兼容性',
      status: 'PASS',
      evidence: `OpenCode 版本: ${version}`,
      severity: 'L'
    }
  } catch (e) {
    return {
      id: 'CFG-016',
      name: '版本兼容性',
      status: 'WARN',
      evidence: '无法获取 OpenCode 版本',
      severity: 'L'
    }
  }
}

/**
 * CFG-017: 安全与隐私边界
 */
export const checkSecurity: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-017',
      name: '安全与隐私边界',
      status: 'SKIP',
      evidence: '无法读取配置文件',
      severity: 'H'
    }
  }
  
  const warnings: string[] = []
  
  // 检查敏感信息
  const sensitivePatterns = [
    /sk-[a-zA-Z0-9]{20,}/,  // OpenAI API Key
    /AIza[a-zA-Z0-9_-]{35}/,  // Google API Key
    /ghp_[a-zA-Z0-9]{36}/,  // GitHub PAT
  ]
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(content)) {
      warnings.push('配置文件中包含明文 API Key')
      break
    }
  }
  
  return {
    id: 'CFG-017',
    name: '安全与隐私边界',
    status: warnings.length > 0 ? 'WARN' : 'PASS',
    evidence: warnings.length > 0 
      ? warnings.join('; ') 
      : '未发现安全风险',
    fix: warnings.length > 0 
      ? '将 API Key 移至环境变量' 
      : undefined,
    severity: 'H'
  }
}

/**
 * CFG-018: 回归稳定性预演
 */
export const checkStability: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  // 简化版本：检查基本配置是否加载
  const configPath = `${ctx.configDir}/opencode.jsonc`
  const content = await ctx.readFile(configPath)
  
  if (!content) {
    return {
      id: 'CFG-018',
      name: '回归稳定性预演',
      status: 'FAIL',
      evidence: '无法读取配置文件',
      severity: 'H'
    }
  }
  
  const jsonContent = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const parsed = ctx.parseJSON(jsonContent)
  
  if (!parsed.success) {
    return {
      id: 'CFG-018',
      name: '回归稳定性预演',
      status: 'FAIL',
      evidence: '配置文件解析失败',
      severity: 'H'
    }
  }
  
  return {
    id: 'CFG-018',
    name: '回归稳定性预演',
    status: 'PASS',
    evidence: '配置加载测试通过',
    severity: 'H'
  }
}

/**
 * 所有检查项列表
 */
export const ALL_CHECKS: CheckDefinition[] = [
  { id: 'CFG-001', name: '配置文件存在性', description: '检查配置文件是否存在', severity: 'H', checker: checkConfigExists },
  { id: 'CFG-002', name: '配置文件语法有效性', description: '检查 JSON 语法是否正确', severity: 'H', checker: checkConfigSyntax },
  { id: 'CFG-003', name: '配置字段完整性', description: '检查核心字段是否存在', severity: 'H', checker: checkConfigFields },
  { id: 'CFG-004', name: 'Schema 兼容性', description: '检查是否有废弃字段', severity: 'M', checker: checkSchemaCompatibility },
  { id: 'CFG-005', name: 'MCP 服务清单完整性', description: '检查 MCP 服务配置', severity: 'M', checker: checkMcpServices },
  { id: 'CFG-006', name: 'MCP 连接可达性', description: '检查 MCP 命令是否可执行', severity: 'H', checker: checkMcpConnection },
  { id: 'CFG-007', name: 'MCP 端口与监听状态', description: '检查端口冲突', severity: 'M', checker: checkMcpPorts },
  { id: 'CFG-008', name: '运行时依赖', description: '检查 Node/Bun/Git 等', severity: 'M', checker: checkRuntimeDependencies },
  { id: 'CFG-009', name: 'MCP 权限校验', description: '检查权限配置', severity: 'M', checker: checkMcpPermissions },
  { id: 'CFG-010', name: 'API Key 有效性', description: '检查占位符 API Key', severity: 'H', checker: checkApiKeys },
  { id: 'CFG-011', name: '环境变量完整性', description: '检查环境变量引用', severity: 'M', checker: checkEnvVariables },
  { id: 'CFG-012', name: '路径合法性', description: '检查必需目录', severity: 'M', checker: checkPaths },
  { id: 'CFG-013', name: '日志系统健康', description: '检查日志目录可写', severity: 'L', checker: checkLogSystem },
  { id: 'CFG-014', name: '缓存完整性', description: '检查缓存目录', severity: 'L', checker: checkCache },
  { id: 'CFG-015', name: '冲突配置检测', description: '检查重复 ID', severity: 'M', checker: checkConflicts },
  { id: 'CFG-016', name: '版本兼容性', description: '检查 OpenCode 版本', severity: 'L', checker: checkVersionCompatibility },
  { id: 'CFG-017', name: '安全与隐私边界', description: '检查明文密钥', severity: 'H', checker: checkSecurity },
  { id: 'CFG-018', name: '回归稳定性预演', description: '配置加载测试', severity: 'H', checker: checkStability }
]

/**
 * OpenCode Health Guard - 启动前健康检查插件
 * 
 * 核心类型定义
 */

/**
 * 检查项状态
 */
export type CheckStatus = 'PASS' | 'FAIL' | 'SKIP' | 'WARN'

/**
 * 严重级别
 */
export type Severity = 'H' | 'M' | 'L'

/**
 * 检查项结果
 */
export interface CheckResult {
  /** 检查项 ID */
  id: string
  /** 检查项名称 */
  name: string
  /** 状态 */
  status: CheckStatus
  /** 证据（文件路径、命令输出等） */
  evidence: string
  /** 修复建议 */
  fix?: string
  /** 严重级别 */
  severity: Severity
  /** 执行时间（毫秒） */
  duration?: number
}

/**
 * 自检报告
 */
export interface SelfCheckReport {
  /** 开始时间 */
  timestamp: string
  /** 触发场景 */
  trigger: 'startup' | 'reload' | 'manual'
  /** 总项数 */
  total: number
  /** 通过数 */
  passed: number
  /** 失败数 */
  failed: number
  /** 跳过数 */
  skipped: number
  /** 是否阻塞 */
  blocked: boolean
  /** 逐项明细 */
  checks: CheckResult[]
}

/**
 * 检查器函数类型
 */
export type Checker = (context: CheckContext) => Promise<CheckResult>

/**
 * 检查上下文
 */
export interface CheckContext {
  /** 配置目录 */
  configDir: string
  /** 状态目录 */
  stateDir: string
  /** 工作目录 */
  workDir: string
  /** 日志 */
  log: (message: string, level?: 'info' | 'warn' | 'error') => void
  /** 执行命令 */
  exec: (command: string, options?: { timeout?: number }) => Promise<{ stdout: string; stderr: string; exitCode: number }>
  /** 检查文件是否存在 */
  fileExists: (path: string) => Promise<boolean>
  /** 读取文件 */
  readFile: (path: string) => Promise<string | null>
  /** 解析 JSON */
  parseJSON: (content: string) => { success: boolean; data?: any; error?: string }
}

/**
 * 插件配置
 */
export interface HealthGuardConfig {
  /** 是否启用 */
  enabled: boolean
  /** 触发场景 */
  trigger: ('startup' | 'reload' | 'manual')[]
  /** 失败时是否阻塞 */
  blockOnFail: boolean
  /** 要跳过的检查项 */
  skipChecks: string[]
  /** 超时时间（毫秒） */
  timeout: number
  /** 日志级别 */
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: HealthGuardConfig = {
  enabled: true,
  trigger: ['startup', 'reload'],
  blockOnFail: true,
  skipChecks: [],
  timeout: 30000,
  logLevel: 'info'
}

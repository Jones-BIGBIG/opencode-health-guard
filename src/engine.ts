/**
 * OpenCode Health Guard - 核心检查引擎
 */

import type { 
  CheckContext, 
  CheckResult, 
  SelfCheckReport, 
  HealthGuardConfig,
  CheckStatus
} from './types'
import { ALL_CHECKS } from './checkers'

/**
 * 创建检查上下文
 */
export function createCheckContext(
  configDir: string = `${process.env.HOME}/.config/opencode`,
  stateDir: string = `${process.env.HOME}/.opencode`,
  workDir: string = process.cwd()
): CheckContext {
  return {
    configDir,
    stateDir,
    workDir,
    
    log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
      const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️'
      console.error(`[HealthGuard] ${prefix} ${message}`)
    },
    
    exec: async (command: string, options?: { timeout?: number }) => {
      const timeout = options?.timeout || 30000
      
      try {
        const proc = Bun.spawn(command, {
          shell: true,
          timeout,
          stdout: 'pipe',
          stderr: 'pipe'
        })
        
        const stdout = await new Response(proc.stdout).text()
        const stderr = await new Response(proc.stderr).text()
        const exitCode = await proc.exited
        
        return { stdout, stderr, exitCode }
      } catch (e) {
        return { 
          stdout: '', 
          stderr: String(e), 
          exitCode: 1 
        }
      }
    },
    
    fileExists: async (path: string): Promise<boolean> => {
      try {
        const file = Bun.file(path)
        return await file.exists()
      } catch {
        return false
      }
    },
    
    readFile: async (path: string): Promise<string | null> => {
      try {
        const file = Bun.file(path)
        if (!(await file.exists())) {
          return null
        }
        return await file.text()
      } catch {
        return null
      }
    },
    
    parseJSON: (content: string) => {
      try {
        const data = JSON.parse(content)
        return { success: true, data }
      } catch (e) {
        return { success: false, error: String(e) }
      }
    }
  }
}

/**
 * 运行自检
 */
export async function runSelfCheck(
  config: HealthGuardConfig,
  trigger: 'startup' | 'reload' | 'manual' = 'startup'
): Promise<SelfCheckReport> {
  const startTime = Date.now()
  const context = createCheckContext()
  
  const checks: CheckResult[] = []
  let passed = 0
  let failed = 0
  let skipped = 0
  
  // 过滤要跳过的检查项
  const checksToRun = ALL_CHECKS.filter(c => !config.skipChecks.includes(c.id))
  
  // 运行检查
  for (const check of checksToRun) {
    const checkStart = Date.now()
    
    try {
      const result = await Promise.race([
        check.checker(context),
        new Promise<CheckResult>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), config.timeout)
        )
      ])
      
      result.duration = Date.now() - checkStart
      checks.push(result)
      
      if (result.status === 'PASS') passed++
      else if (result.status === 'FAIL') failed++
      else if (result.status === 'SKIP') skipped++
      
    } catch (e) {
      checks.push({
        id: check.id,
        name: check.name,
        status: 'FAIL',
        evidence: `检查超时或异常: ${e}`,
        fix: '检查配置或增加超时时间',
        severity: check.severity,
        duration: Date.now() - checkStart
      })
      failed++
    }
  }
  
  // 计算阻塞状态
  const blocked = config.blockOnFail && failed > 0
  
  const report: SelfCheckReport = {
    timestamp: new Date().toISOString(),
    trigger,
    total: checksToRun.length,
    passed,
    failed,
    skipped,
    blocked,
    checks
  }
  
  return report
}

/**
 * 格式化报告
 */
export function formatReport(report: SelfCheckReport): string {
  const lines: string[] = []
  
  lines.push('')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('🔒 OpenCode Health Guard - SELF-CHECK REPORT')
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push(`- 时间: ${report.timestamp}`)
  lines.push(`- 触发场景: ${report.trigger}`)
  lines.push(`- 总项数: ${report.total}`)
  lines.push(`- 通过: ${report.passed}`)
  lines.push(`- 失败: ${report.failed}`)
  lines.push(`- 跳过: ${report.skipped}`)
  lines.push(`- 阻塞: ${report.blocked ? 'FAIL' : 'PASS'}`)
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')
  lines.push('逐项明细:')
  lines.push('')
  
  for (const check of report.checks) {
    const statusIcon = check.status === 'PASS' ? '✅' 
                     : check.status === 'FAIL' ? '❌' 
                     : check.status === 'WARN' ? '⚠️' 
                     : '⏭️'
    
    lines.push(`[${check.id}] ${check.name} | ${statusIcon} ${check.status}`)
    lines.push(`  证据: ${check.evidence}`)
    if (check.fix) {
      lines.push(`  修复: ${check.fix}`)
    }
    lines.push(`  严重: ${check.severity}`)
    if (check.duration) {
      lines.push(`  耗时: ${check.duration}ms`)
    }
    lines.push('')
  }
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  if (report.blocked) {
    lines.push('')
    lines.push('[BLOCKED] 启动被禁止')
    lines.push('')
    lines.push('阻塞项:')
    
    const failedChecks = report.checks.filter(c => c.status === 'FAIL')
    for (const check of failedChecks) {
      lines.push(`  - ${check.id}: ${check.name}`)
      lines.push(`    证据: ${check.evidence}`)
      if (check.fix) {
        lines.push(`    修复: ${check.fix}`)
      }
    }
    
    lines.push('')
    lines.push('修复动作:')
    for (const check of failedChecks) {
      if (check.fix) {
        lines.push(`  1) [${check.id}] ${check.fix}`)
      }
    }
  } else {
    lines.push('')
    lines.push('[PASS] 自检完成，可启动')
  }
  
  lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  lines.push('')
  
  return lines.join('\n')
}

/**
 * 获取失败的检查项
 */
export function getFailedChecks(report: SelfCheckReport): CheckResult[] {
  return report.checks.filter(c => c.status === 'FAIL')
}

/**
 * 获取警告的检查项
 */
export function getWarningChecks(report: SelfResult): CheckResult[] {
  return report.checks.filter(c => c.status === 'WARN')
}

/**
 * 获取修复命令
 */
export function getFixCommands(report: SelfCheckReport): string[] {
  return report.checks
    .filter(c => c.status === 'FAIL' && c.fix)
    .map(c => c.fix as string)
}

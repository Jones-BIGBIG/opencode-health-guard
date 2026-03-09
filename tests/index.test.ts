import { test, describe, expect, beforeEach, mock } from 'bun:test'
import type { CheckContext, CheckResult } from '../src/types'
import {
  checkConfigExists,
  checkConfigSyntax,
  checkConfigFields,
  checkMcpServices,
  ALL_CHECKS
} from '../src/checkers'
import { createCheckContext, runSelfCheck, formatReport } from '../src/engine'

describe('CheckContext', () => {
  test('createCheckContext should return valid context', () => {
    const ctx = createCheckContext()
    
    expect(ctx.configDir).toBeDefined()
    expect(ctx.stateDir).toBeDefined()
    expect(ctx.workDir).toBeDefined()
    expect(ctx.log).toBeFunction()
    expect(ctx.exec).toBeFunction()
    expect(ctx.fileExists).toBeFunction()
    expect(ctx.readFile).toBeFunction()
    expect(ctx.parseJSON).toBeFunction()
  })

  test('parseJSON should parse valid JSON', () => {
    const ctx = createCheckContext()
    const result = ctx.parseJSON('{"key": "value"}')
    
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ key: 'value' })
  })

  test('parseJSON should handle invalid JSON', () => {
    const ctx = createCheckContext()
    const result = ctx.parseJSON('{"key": invalid}')
    
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('Checkers', () => {
  let mockContext: CheckContext

  beforeEach(() => {
    mockContext = {
      configDir: '/tmp/test-config',
      stateDir: '/tmp/test-state',
      workDir: '/tmp/test-work',
      log: mock(() => {}),
      exec: mock(async () => ({ stdout: '', stderr: '', exitCode: 0 })),
      fileExists: mock(async () => true),
      readFile: mock(async () => '{"test": true}'),
      parseJSON: (content: string) => {
        try {
          return { success: true, data: JSON.parse(content) }
        } catch (e) {
          return { success: false, error: String(e) }
        }
      }
    }
  })

  describe('CFG-001: 配置文件存在性', () => {
    test('should PASS when config exists', async () => {
      mockContext.fileExists = mock(async () => true)
      
      const result = await checkConfigExists(mockContext)
      
      expect(result.id).toBe('CFG-001')
      expect(result.status).toBe('PASS')
      expect(result.severity).toBe('H')
    })

    test('should FAIL when config does not exist', async () => {
      mockContext.fileExists = mock(async () => false)
      
      const result = await checkConfigExists(mockContext)
      
      expect(result.status).toBe('FAIL')
      expect(result.fix).toBeDefined()
    })
  })

  describe('CFG-002: 配置文件语法有效性', () => {
    test('should PASS for valid JSON', async () => {
      mockContext.readFile = mock(async () => '{"provider": "test"}')
      
      const result = await checkConfigSyntax(mockContext)
      
      expect(result.status).toBe('PASS')
    })

    test('should FAIL for invalid JSON', async () => {
      mockContext.readFile = mock(async () => '{"provider": invalid}')
      
      const result = await checkConfigSyntax(mockContext)
      
      expect(result.status).toBe('FAIL')
    })
  })

  describe('CFG-003: 配置字段完整性', () => {
    test('should PASS for valid config', async () => {
      mockContext.readFile = mock(async () => '{"provider": {"test": {}}, "model": "test/model"}')
      
      const result = await checkConfigFields(mockContext)
      
      expect(result.status).toBe('PASS')
    })

    test('should FAIL when missing provider and model', async () => {
      mockContext.readFile = mock(async () => '{}')
      
      const result = await checkConfigFields(mockContext)
      
      expect(result.status).toBe('FAIL')
      expect(result.evidence).toContain('缺失')
    })
  })

  describe('CFG-005: MCP 服务清单完整性', () => {
    test('should PASS for valid MCP config', async () => {
      mockContext.readFile = mock(async () => JSON.stringify({
        mcp: {
          'test-server': {
            type: 'local',
            command: ['node', 'server.js']
          }
        }
      }))
      
      const result = await checkMcpServices(mockContext)
      
      expect(result.status).toBe('PASS')
    })

    test('should FAIL for MCP missing command', async () => {
      mockContext.readFile = mock(async () => JSON.stringify({
        mcp: {
          'test-server': {
            type: 'local',
            command: []
          }
        }
      }))
      
      const result = await checkMcpServices(mockContext)
      
      expect(result.status).toBe('FAIL')
    })
  })
})

describe('Engine', () => {
  test('runSelfCheck should return complete report', async () => {
    const config = {
      enabled: true,
      trigger: ['startup', 'reload'] as const,
      blockOnFail: true,
      skipChecks: [] as string[],
      timeout: 30000,
      logLevel: 'info' as const
    }
    
    const report = await runSelfCheck(config, 'manual')
    
    expect(report.timestamp).toBeDefined()
    expect(report.trigger).toBe('manual')
    expect(report.total).toBe(18)
    expect(report.checks).toBeArray()
    expect(report.checks.length).toBe(18)
  })

  test('runSelfCheck should respect skipChecks', async () => {
    const config = {
      enabled: true,
      trigger: ['startup'] as const,
      blockOnFail: false,
      skipChecks: ['CFG-016', 'CFG-017'],
      timeout: 30000,
      logLevel: 'info' as const
    }
    
    const report = await runSelfCheck(config, 'startup')
    
    expect(report.total).toBe(16)
    expect(report.checks.find(c => c.id === 'CFG-016')).toBeUndefined()
    expect(report.checks.find(c => c.id === 'CFG-017')).toBeUndefined()
  })

  test('formatReport should format correctly', async () => {
    const report = {
      timestamp: '2026-03-09T00:00:00.000Z',
      trigger: 'startup' as const,
      total: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      blocked: true,
      checks: [
        { id: 'CFG-001', name: 'Test 1', status: 'PASS' as const, evidence: 'OK', severity: 'H' as const },
        { id: 'CFG-002', name: 'Test 2', status: 'FAIL' as const, evidence: 'Error', fix: 'Fix it', severity: 'H' as const }
      ]
    }
    
    const formatted = formatReport(report)
    
    expect(formatted).toContain('SELF-CHECK REPORT')
    expect(formatted).toContain('CFG-001')
    expect(formatted).toContain('CFG-002')
    expect(formatted).toContain('[BLOCKED]')
  })
})

describe('ALL_CHECKS', () => {
  test('should have 18 checks', () => {
    expect(ALL_CHECKS.length).toBe(18)
  })

  test('all checks should have required properties', () => {
    for (const check of ALL_CHECKS) {
      expect(check.id).toBeDefined()
      expect(check.id).toMatch(/^CFG-\d{3}$/)
      expect(check.name).toBeDefined()
      expect(check.description).toBeDefined()
      expect(['H', 'M', 'L']).toContain(check.severity)
      expect(check.checker).toBeFunction()
    }
  })

  test('check IDs should be unique', () => {
    const ids = ALL_CHECKS.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})

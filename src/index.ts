/**
 * OpenCode Health Guard - 启动前健康检查插件
 * 
 * @packageDocumentation
 * 
 * Boot-Time Self-Check Gateway for OpenCode
 * 
 * ## 功能
 * 
 * - 18 项自检清单
 * - 配置文件验证
 * - MCP 服务检查
 * - 安全与隐私检查
 * - 详细报告输出
 * 
 * ## 使用方式
 * 
 * 1. 安装插件:
 *    ```bash
 *    bun add @opencode-ai/health-guard
 *    ```
 * 
 * 2. 在 opencode.jsonc 中配置:
 *    ```json
 *    {
 *      "plugin": ["@opencode-ai/health-guard"]
 *    }
 *    ```
 * 
 * 3. 可选配置:
 *    ```json
 *    {
 *      "healthGuard": {
 *        "enabled": true,
 *        "blockOnFail": true,
 *        "skipChecks": ["CFG-016"]
 *      }
 *    }
 *    ```
 */

import type { Plugin, Hooks } from '@opencode-ai/plugin'
import type { Config } from '@opencode-ai/sdk'
import { DEFAULT_CONFIG, type HealthGuardConfig } from './types'
import { runSelfCheck, formatReport } from './engine'

/**
 * 插件 ID
 */
export const PLUGIN_ID = 'health-guard'

/**
 * 插件版本
 */
export const VERSION = '1.0.0'

/**
 * Health Guard 插件
 */
const healthGuardPlugin: Plugin = async (input) => {
  const { client, project, directory } = input
  
  // 合并配置
  const config: HealthGuardConfig = {
    ...DEFAULT_CONFIG,
    ...(project as any)?.healthGuard || {}
  }
  
  if (!config.enabled) {
    console.log(`[${PLUGIN_ID}] 插件已禁用`)
    return {}
  }
  
  console.log(`[${PLUGIN_ID}] 🛡️ Health Guard v${VERSION} 已加载`)
  
  const hooks: Hooks = {
    /**
     * 事件钩子 - 在服务器连接时执行自检
     */
    event: async ({ event }) => {
      if (event.type === 'server.connected') {
        if (!config.trigger.includes('startup')) {
          return
        }
        
        console.log(`[${PLUGIN_ID}] 开始自检...`)
        
        try {
          const report = await runSelfCheck(config, 'startup')
          const formatted = formatReport(report)
          
          // 输出到控制台
          console.error(formatted)
          
          // 如果阻塞，发送警告通知
          if (report.blocked) {
            console.log(`[${PLUGIN_ID}] ⚠️ 自检失败，发现 ${report.failed} 个问题`)
            
            // 可以通过 client 发送通知
            // await client.toast.show({
            //   title: 'Health Guard',
            //   message: `自检失败: ${report.failed} 个问题`,
            //   variant: 'error'
            // })
          } else {
            console.log(`[${PLUGIN_ID}] ✅ 自检通过`)
          }
          
        } catch (e) {
          console.error(`[${PLUGIN_ID}] ❌ 自检异常: ${e}`)
        }
      }
    },
    
    /**
     * 配置钩子 - 在配置更新时执行自检
     */
    config: async (cfg: Config) => {
      if (!config.trigger.includes('reload')) {
        return
      }
      
      console.log(`[${PLUGIN_ID}] 检测到配置更新，执行自检...`)
      
      try {
        const report = await runSelfCheck(config, 'reload')
        const formatted = formatReport(report)
        
        console.error(formatted)
        
        if (report.blocked) {
        console.log(`[${PLUGIN_ID}] ⚠️ 配置更新后自检失败`)
        }
        
      } catch (e) {
        console.error(`[${PLUGIN_ID}] ❌ 自检异常: ${e}`)
      }
    }
  }
  
  return hooks
}

// 默认导出插件
export default healthGuardPlugin

// 导出类型和工具
export * from './types'
export * from './checkers'
export * from './engine'

/**
 * CLI 入口 - 用于独立运行
 */
if (import.meta.main) {
  const config: HealthGuardConfig = {
    ...DEFAULT_CONFIG,
    blockOnFail: false // CLI 模式不阻塞
  }
  
  runSelfCheck(config, 'manual')
    .then(report => {
      console.log(formatReport(report))
      process.exit(report.failed > 0 ? 1 : 0)
    })
    .catch(e => {
      console.error('自检异常:', e)
      process.exit(1)
    })
}

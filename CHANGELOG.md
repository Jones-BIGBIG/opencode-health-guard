# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-09

### Added

- 18 项自检清单
  - CFG-001: 配置文件存在性
  - CFG-002: 配置文件语法有效性
  - CFG-003: 配置字段完整性
  - CFG-004: Schema 兼容性
  - CFG-005: MCP 服务清单完整性
  - CFG-006: MCP 连接可达性
  - CFG-007: MCP 端口与监听状态
  - CFG-008: 运行时依赖
  - CFG-009: MCP 权限校验
  - CFG-010: API Key 有效性
  - CFG-011: 环境变量完整性
  - CFG-012: 路径合法性
  - CFG-013: 日志系统健康
  - CFG-014: 缓存完整性
  - CFG-015: 冲突配置检测
  - CFG-016: 版本兼容性
  - CFG-017: 安全与隐私边界
  - CFG-018: 回归稳定性预演

- OpenCode 插件集成
  - `event` 钩子支持
  - `config` 钩子支持

- CLI 独立运行模式

- 可配置选项
  - `enabled`: 启用/禁用
  - `trigger`: 触发场景
  - `blockOnFail`: 失败时阻塞
  - `skipChecks`: 跳过检查项
  - `timeout`: 超时设置
  - `logLevel`: 日志级别

### Documentation

- README.md
- CONTRIBUTING.md
- LICENSE (MIT)

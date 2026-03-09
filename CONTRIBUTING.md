# Contributing to OpenCode Health Guard

感谢你考虑为 OpenCode Health Guard 做贡献！

## 开发流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 代码规范

- 使用 TypeScript
- 遵循现有的代码风格
- 添加必要的类型定义
- 编写清晰的提交信息

## 提交信息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `refactor:` 代码重构
- `test:` 测试相关
- `chore:` 构建/工具相关

## 添加新的检查项

1. 在 `src/checkers.ts` 中添加检查函数
2. 在 `ALL_CHECKS` 数组中注册
3. 更新 `README.md` 中的检查清单表格

示例:

```typescript
export const checkNewFeature: Checker = async (ctx: CheckContext): Promise<CheckResult> => {
  const result = await someCheck()
  
  return {
    id: 'CFG-019',
    name: '新功能检查',
    status: result ? 'PASS' : 'FAIL',
    evidence: result ? '检查通过' : '检查失败',
    fix: result ? undefined : '修复建议',
    severity: 'M'
  }
}
```

## 测试

```bash
# 运行测试
bun test

# 类型检查
bun run typecheck

# 构建
bun run build
```

## 问题反馈

如果你发现 bug 或有功能建议，请创建 [Issue](https://github.com/Jones-BIGBIG/opencode-health-guard/issues)。

# Codex Skills

一个基于 React + Vite 的 Codex Skills 官方插件与技能说明站。

## 功能

- 官方分类筛选：按精选、开发者工具、创意设计、生产力、金融、安全等分类浏览。
- 插件能力卡片：展示插件名称、开发者、版本、能力标签、适合场景和代表技能。
- 搜索：支持按插件、技能、用途和分类快速过滤。
- 工作流说明：解释 Plugin、Skill、App/MCP 与最终交付物之间的关系。
- 可靠性说明：页面数据来自当前 Codex 插件清单、本地 `.codex-plugin/plugin.json` 和 `skills/*/SKILL.md` 元数据。

## 开发

```bash
npm install
npm run dev
```

## DeepSeek AI 分析

页面里的“AI 项目分析”支持在界面中填写 DeepSeek API Key。Key 会保存在当前浏览器的本地存储中，后续分析会自动使用。

你也可以复制 `.env.example` 为 `.env.local`，作为本地开发服务的兜底配置：

```bash
DEEPSEEK_API_KEY=sk-your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-chat
```

然后重新运行：

```bash
npm run dev
```

页面会通过本地 Vite 代理调用 DeepSeek，Key 不会写死在代码里。`.env.local` 已被 `.gitignore` 排除，不会提交到 GitHub。

## 构建

```bash
npm run build
```

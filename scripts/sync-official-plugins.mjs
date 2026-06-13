import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const outputDataPath = path.join(projectRoot, "src", "data", "officialPlugins.json");
const outputLogoDir = path.join(projectRoot, "public", "plugin-logos");

const categoryLabels = {
  "Business & Operations": "商业与运营",
  Communication: "沟通协作",
  Creativity: "创意设计",
  "Data & Analytics": "数据与分析",
  "Developer Tools": "开发者工具",
  "Education & Research": "教育与研究",
  Engineering: "开发者工具",
  Finance: "金融",
  Productivity: "生产力",
  Research: "教育与研究",
  Security: "安全",
  Travel: "旅行",
  Other: "其他",
};

const marketplaceRoots = [
  {
    name: "openai-curated",
    root:
      process.env.CODEX_OFFICIAL_PLUGINS_ROOT ||
      path.join(homedir(), ".codex", ".tmp", "plugins"),
  },
  {
    name: "openai-bundled",
    root: path.join(homedir(), ".codex", ".tmp", "bundled-marketplaces", "openai-bundled"),
  },
];

const categoryUseCases = {
  "商业与运营": {
    focus: "客户管理、销售运营、商机跟进和业务流程协作",
    value: "让 Codex 能结合客户、账户、线索或运营系统里的上下文，辅助你完成调研、跟进、总结和计划制定。",
    examples: ["整理客户和账户信息", "生成销售跟进计划", "梳理业务流程中的关键事项"],
  },
  沟通协作: {
    focus: "邮件、会议、消息和团队协作",
    value: "让 Codex 能围绕沟通记录、收件箱、会议纪要或团队频道整理信息，帮助你快速回复、总结和推进后续事项。",
    examples: ["总结沟通记录", "起草回复和后续事项", "整理会议或频道中的关键信息"],
  },
  创意设计: {
    focus: "视觉设计、图片生成、视频制作和创意资产处理",
    value: "让 Codex 能把创意 brief、产品信息或素材需求转成可执行的设计与内容制作流程。",
    examples: ["生成创意方案", "整理设计素材需求", "制作或改造图片、视频和营销资产"],
  },
  "数据与分析": {
    focus: "数据查询、指标分析、报表和洞察提炼",
    value: "让 Codex 能连接数据工具或分析平台，把问题拆成查询、解释、可视化和报告输出。",
    examples: ["查询和解释数据", "生成指标分析报告", "把业务问题拆成可执行的数据分析步骤"],
  },
  开发者工具: {
    focus: "代码开发、部署、调试、基础设施和工程自动化",
    value: "让 Codex 能接入开发工具链，辅助你完成代码实现、环境排查、部署配置和工程工作流。",
    examples: ["排查工程问题", "生成部署或配置建议", "把开发工具链信息带入 Codex 任务"],
  },
  教育与研究: {
    focus: "资料检索、文献管理、研究分析和知识整理",
    value: "让 Codex 能围绕研究资料、文献库或专业数据源提炼信息，形成可复用的研究结论。",
    examples: ["检索和整理研究资料", "提炼文献或知识库结论", "生成研究摘要和分析提纲"],
  },
  金融: {
    focus: "财务数据、市场信息、投资研究和金融工作流",
    value: "让 Codex 能结合金融数据源、公司资料或交易相关信息，辅助你做分析、比较和材料准备。",
    examples: ["分析公司和市场信息", "整理财务或投资研究材料", "比较标的、交易或风险因素"],
  },
  生产力: {
    focus: "文档、任务、项目管理、办公协同和日常自动化",
    value: "让 Codex 能接入常用办公系统，把分散的信息整理成清晰的任务、文档、计划或执行清单。",
    examples: ["整理文档和文件信息", "生成任务清单或项目计划", "把办公系统里的上下文转成可执行内容"],
  },
  安全: {
    focus: "代码安全、漏洞扫描、风险验证和修复建议",
    value: "让 Codex 能以安全工作流审查代码和变更，帮助你发现、确认并处理潜在风险。",
    examples: ["扫描代码安全风险", "验证漏洞是否真实可复现", "生成修复建议和审查说明"],
  },
  旅行: {
    focus: "行程、出行信息、预订和旅行决策",
    value: "让 Codex 能围绕目的地、行程和服务信息整理选择，帮助你规划和比较出行方案。",
    examples: ["规划行程和路线", "比较出行或住宿方案", "整理旅行相关信息"],
  },
  其他: {
    focus: "特定业务工具和垂直场景工作流",
    value: "让 Codex 能连接对应服务，把外部上下文纳入对话、分析和执行流程。",
    examples: ["读取外部工具上下文", "整理垂直场景信息", "生成下一步执行建议"],
  },
};

const pluginUseCasePatterns = [
  { pattern: /gmail|outlook-email|superhuman|mail/i, examples: ["整理收件箱重点", "起草邮件回复", "提炼邮件中的待办事项"] },
  { pattern: /calendar|calendly/i, examples: ["查看日程安排", "整理会议准备事项", "生成日程协调建议"] },
  { pattern: /slack|teams/i, examples: ["总结频道讨论", "提炼团队消息里的待办", "生成可发送的回复草稿"] },
  { pattern: /zoom|fireflies|otter|granola|read-ai|circleback/i, examples: ["总结会议记录", "提炼行动项", "从过往对话中查找关键上下文"] },
  { pattern: /canva|figma|picsart|shutterstock|heygen|fal|remotion|biorender|hyperframes/i, examples: ["生成创意方向", "制作或调整视觉资产", "把设计需求拆成可执行步骤"] },
  { pattern: /github|circleci|vercel|cloudflare|netlify|sentry|datadog|supabase|neon|render|temporal/i, examples: ["排查工程问题", "整理部署和监控信息", "生成代码或配置修改建议"] },
  { pattern: /apollo|attio|clay|outreach|actively|zoominfo|close|salesforce|hubspot/i, examples: ["整理客户和线索信息", "生成销售跟进计划", "分析账户优先级和机会点"] },
  { pattern: /zotero|scite|readwise|midpage|biorxiv|research/i, examples: ["整理研究资料", "生成文献摘要", "提炼可引用的研究结论"] },
  { pattern: /factset|pitchbook|moody|lseg|morningstar|daloopa|aiera|alpaca|binance|stripe|quickbooks/i, examples: ["分析公司和市场信息", "整理财务数据", "生成投资或业务分析材料"] },
];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function resolvePluginDir(marketplaceRoot, entry) {
  const sourcePath =
    typeof entry.source === "string" ? entry.source : entry.source?.path;
  if (!sourcePath) return null;
  return path.resolve(marketplaceRoot, sourcePath);
}

function extensionFor(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return extension || ".png";
}

function copyLogo(pluginDir, plugin, slug) {
  const logoPath = plugin.interface?.logo || plugin.interface?.composerIcon;
  if (!logoPath) return "";

  const absoluteLogoPath = path.resolve(pluginDir, logoPath);
  if (!existsSync(absoluteLogoPath)) return "";

  const extension = extensionFor(absoluteLogoPath);
  const outputName = `${slug}${extension}`;
  copyFileSync(absoluteLogoPath, path.join(outputLogoDir, outputName));
  return `/plugin-logos/${outputName}`;
}

function pluginUseCases(plugin, categoryInfo) {
  const identifier = `${plugin.slug} ${plugin.name}`;
  const matched = pluginUseCasePatterns.find(({ pattern }) => pattern.test(identifier));
  return matched?.examples || categoryInfo.examples;
}

function createChineseContent(plugin) {
  const categoryInfo = categoryUseCases[plugin.category] || categoryUseCases.其他;
  const developer = plugin.developer || plugin.name;
  const useCases = pluginUseCases(plugin, categoryInfo);

  const shortZh = `${plugin.name} 是一款面向${categoryInfo.focus}的 Codex 官方插件。`;
  const whatZh = `${plugin.name} 是由 ${developer} 提供的 Codex 官方插件，定位在${plugin.category}场景。它的作用是把 ${plugin.name} 相关的工具、数据或工作流接入 Codex，让你可以在同一个对话里完成信息读取、分析、整理和后续执行。`;
  const valueZh = `${categoryInfo.value} 对需要频繁在 ${plugin.name} 和 Codex 之间切换的人来说，它可以减少复制粘贴和手工整理，让任务上下文更完整。`;
  const howZh = `使用时通常先在 Codex 插件目录中添加并完成授权，然后在新线程里直接说明目标，或用 @${plugin.slug} 指定这个插件。Codex 会根据你的请求调用插件能力，读取必要上下文，并把结果整理成可继续修改的文本、计划、列表或操作建议。`;
  const useCasesZh = useCases.map((item) => `用 ${plugin.name} ${item}`);

  return {
    shortZh,
    detailZh: {
      what: whatZh,
      value: valueZh,
      how: howZh,
    },
    useCasesZh,
  };
}

function normalizePlugin(entry, marketplaceRoot, marketplaceName) {
  const pluginDir = resolvePluginDir(marketplaceRoot, entry);
  if (!pluginDir) return null;

  const manifestPath = path.join(pluginDir, ".codex-plugin", "plugin.json");
  if (!existsSync(manifestPath)) return null;

  const manifest = readJson(manifestPath);
  const sourceCategory = manifest.interface?.category || entry.category || "Other";
  const category = categoryLabels[sourceCategory] || sourceCategory || "其他";
  const slug = manifest.name || entry.name;
  const logo = copyLogo(pluginDir, manifest, slug);

  const basePlugin = {
    slug,
    name: manifest.interface?.displayName || manifest.name || entry.name,
    short: manifest.interface?.shortDescription || manifest.description || "",
    description:
      manifest.interface?.longDescription ||
      manifest.interface?.shortDescription ||
      manifest.description ||
      "",
    category,
    sourceCategory,
    version: manifest.version || "",
    developer: manifest.interface?.developerName || manifest.author?.name || "",
    homepage: manifest.homepage || manifest.interface?.websiteURL || manifest.author?.url || "",
    websiteURL: manifest.interface?.websiteURL || manifest.homepage || "",
    brandColor: manifest.interface?.brandColor || "#f8fafc",
    logo,
    capabilities: manifest.interface?.capabilities || [],
    defaultPrompt: manifest.interface?.defaultPrompt || [],
    marketplace: marketplaceName,
    authentication: entry.policy?.authentication || "",
    installation: entry.policy?.installation || "",
  };
  return {
    ...basePlugin,
    ...createChineseContent(basePlugin),
  };
}

function readMarketplace({ name, root }) {
  const marketplacePath = path.join(root, ".agents", "plugins", "marketplace.json");
  if (!existsSync(marketplacePath)) return [];

  const marketplace = readJson(marketplacePath);
  return (marketplace.plugins || [])
    .map((entry) => normalizePlugin(entry, root, name))
    .filter(Boolean);
}

mkdirSync(path.dirname(outputDataPath), { recursive: true });
rmSync(outputLogoDir, { recursive: true, force: true });
mkdirSync(outputLogoDir, { recursive: true });

const pluginsBySlug = new Map();
for (const root of marketplaceRoots) {
  for (const plugin of readMarketplace(root)) {
    if (!pluginsBySlug.has(plugin.slug)) {
      pluginsBySlug.set(plugin.slug, plugin);
    }
  }
}

const plugins = [...pluginsBySlug.values()].sort((first, second) => {
  const categoryCompare = first.category.localeCompare(second.category, "zh-CN");
  if (categoryCompare !== 0) return categoryCompare;
  return first.name.localeCompare(second.name, "en");
});

const generatedAt = new Date().toISOString();
writeFileSync(
  outputDataPath,
  `${JSON.stringify({ generatedAt, count: plugins.length, plugins }, null, 2)}\n`,
  "utf8",
);

console.log(`Synced ${plugins.length} official plugins to ${outputDataPath}`);

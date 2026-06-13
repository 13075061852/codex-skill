import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Brush,
  Building2,
  Check,
  Clock,
  Copy,
  FileText,
  Footprints,
  GraduationCap,
  Layers,
  MessageCircle,
  Moon,
  Plane,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Shield,
  Sparkles,
  Star,
  Sun,
  Tag,
  TerminalSquare,
  Timer,
  TrendingUp,
  Workflow,
  X,
} from "lucide-react";
import officialPlugins from "./data/officialPlugins.json";
import workflowTemplates from "./data/workflowTemplates.json";
import "./styles.css";

const categoryIcons = {
  精选: Star,
  "商业与运营": Building2,
  沟通协作: MessageCircle,
  创意设计: Brush,
  "数据与分析": BarChart3,
  开发者工具: TerminalSquare,
  "教育与研究": GraduationCap,
  金融: FileText,
  其他: Sparkles,
  生产力: BriefcaseBusiness,
  安全: Shield,
  旅行: Plane,
};

const plugins = officialPlugins.plugins;
const categories = [
  "精选",
  ...Object.keys(categoryIcons).filter((category) =>
    plugins.some((plugin) => plugin.category === category),
  ),
];

const normalize = (value) => value.toLowerCase().trim();
const deepseekKeyStorageKey = "codex-skill.deepseekApiKey";
const analysisStorageKey = "codex-skill.latestAnalysis";
const analysisHistoryStorageKey = "codex-skill.analysisHistory";
const projectIdeaStorageKey = "codex-skill.projectIdea";

const initialAnalysis = {
  summary: "",
  designDirection: [],
  recommendedSkills: [],
  workflow: [],
  cautions: [],
  detailedPrompt: "",
};

async function readJsonResponse(response) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      error: text,
    };
  }
}

function normalizeAnalysisRecord(record) {
  if (!record || typeof record !== "object" || !record.analysis) return null;
  return {
    id: record.id || `analysis-${record.savedAt || Date.now()}`,
    projectIdea: record.projectIdea || "",
    savedAt: record.savedAt || new Date().toISOString(),
    analysis: normalizeAnalysisPayload(record.analysis),
  };
}

function readLegacyAnalysisRecord() {
  try {
    const rawValue = window.localStorage.getItem(analysisStorageKey);
    if (!rawValue) return null;
    const stored = JSON.parse(rawValue);
    return normalizeAnalysisRecord(stored);
  } catch {
    return null;
  }
}

function readStoredAnalysisHistory() {
  try {
    const rawValue = window.localStorage.getItem(analysisHistoryStorageKey);
    const stored = rawValue ? JSON.parse(rawValue) : [];
    const history = Array.isArray(stored)
      ? stored.map(normalizeAnalysisRecord).filter(Boolean)
      : [];
    const legacyRecord = readLegacyAnalysisRecord();
    const mergedHistory =
      history.length || !legacyRecord ? history : [legacyRecord];

    return mergedHistory.sort(
      (first, second) => new Date(second.savedAt) - new Date(first.savedAt),
    );
  } catch {
    return readLegacyAnalysisRecord() ? [readLegacyAnalysisRecord()] : [];
  }
}

function readStoredAnalysis() {
  return readStoredAnalysisHistory()[0]?.analysis || null;
}

function readStoredAnalysisProjectIdea() {
  return readStoredAnalysisHistory()[0]?.projectIdea || "";
}

function forceCloudflareServiceText(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/\b(Vercel|Netlify|Render|Railway|Fly\.io|GitHub Pages)\b/g, "Cloudflare Pages / Workers")
    .replace(/\b(Supabase|Firebase|Firestore|Neon|PlanetScale|Turso|PostgreSQL|Postgres|MySQL|MongoDB)\b/g, "Cloudflare D1 / R2")
    .replace(/对象存储|文件存储|图片存储|静态资源存储|S3/g, "Cloudflare R2")
    .replace(/数据库|用户数据|会话记录|对话历史/g, "Cloudflare D1");
}

function normalizeAnalysisList(items) {
  return Array.isArray(items) ? items.map(forceCloudflareServiceText) : [];
}

function normalizeRecommendedSkills(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    const name = forceCloudflareServiceText(item?.name || "");
    return {
      ...item,
      name,
      category: forceCloudflareServiceText(item?.category || ""),
      reason: forceCloudflareServiceText(item?.reason || ""),
      firstPrompt: forceCloudflareServiceText(item?.firstPrompt || ""),
    };
  });
}

const capabilityLabels = {
  Interactive: "可交互",
  Read: "读取上下文",
  Write: "写入/修改",
};

const authLabels = {
  ON_INSTALL: "安装时授权",
  NONE: "无需授权",
  OAUTH: "OAuth 授权",
};

const installLabels = {
  AVAILABLE: "可安装",
  INSTALLED: "已安装",
};

const categoryScenarios = {
  "商业与运营": [
    {
      title: "客户与商机梳理",
      prompt: (plugin) =>
        `用 ${plugin.name} 查找最近需要跟进的客户或商机，并按优先级整理下一步动作。`,
      effect: "把分散的客户、账户或销售线索整理成优先级列表，附带跟进建议和可执行事项。",
    },
    {
      title: "业务流程推进",
      prompt: (plugin) =>
        `用 ${plugin.name} 总结当前业务流程中的阻塞点，并给出今天可以推进的三件事。`,
      effect: "提炼流程状态、风险点和下一步责任动作，减少在业务系统里来回查找信息。",
    },
  ],
  沟通协作: [
    {
      title: "沟通记录总结",
      prompt: (plugin) =>
        `用 ${plugin.name} 总结最近和这个项目相关的消息、会议或邮件，并提炼待办事项。`,
      effect: "从沟通上下文中抽取结论、决定、待办和负责人，形成可以继续执行的清单。",
    },
    {
      title: "回复草稿",
      prompt: (plugin) =>
        `用 ${plugin.name} 根据最近的上下文起草一段简洁回复，语气专业并包含下一步安排。`,
      effect: "生成可直接修改和发送的回复草稿，并保留关键背景信息。",
    },
  ],
  创意设计: [
    {
      title: "创意资产生成",
      prompt: (plugin) =>
        `用 ${plugin.name} 根据这个产品需求生成一组可执行的视觉方案，并说明每个方案适合的渠道。`,
      effect: "把创意需求转成设计方向、素材结构、文案重点或可继续编辑的视觉资产。",
    },
    {
      title: "素材改造",
      prompt: (plugin) =>
        `用 ${plugin.name} 把这张素材改造成适合社交媒体发布的版本，并保留品牌风格。`,
      effect: "围绕图片、视频或设计稿进行改造，输出更贴近发布场景的素材方案。",
    },
  ],
  "数据与分析": [
    {
      title: "指标查询",
      prompt: (plugin) =>
        `用 ${plugin.name} 查询最近 30 天的核心指标变化，并解释最值得关注的异常。`,
      effect: "把数据源中的指标、趋势和异常整理成可读分析，帮助你快速判断问题方向。",
    },
    {
      title: "分析报告",
      prompt: (plugin) =>
        `用 ${plugin.name} 对这个业务问题做一次数据分析，并输出结论、证据和建议动作。`,
      effect: "围绕业务问题生成结构化分析结果，包含结论、数据依据和下一步建议。",
    },
  ],
  开发者工具: [
    {
      title: "工程排查",
      prompt: (plugin) =>
        `用 ${plugin.name} 检查这个项目的问题，并给出最可能的原因和修复步骤。`,
      effect: "读取工程上下文、日志或平台信息，定位问题并转成可执行的修复建议。",
    },
    {
      title: "配置与部署",
      prompt: (plugin) =>
        `用 ${plugin.name} 检查当前部署或配置是否正确，并指出需要修改的地方。`,
      effect: "围绕代码、部署、监控或基础设施状态做检查，减少手工切换工具的成本。",
    },
  ],
  "教育与研究": [
    {
      title: "资料检索",
      prompt: (plugin) =>
        `用 ${plugin.name} 查找这个主题的关键资料，并按可信度整理摘要。`,
      effect: "从文献、资料库或研究工具中提炼信息，形成可引用、可继续写作的研究摘要。",
    },
    {
      title: "知识整理",
      prompt: (plugin) =>
        `用 ${plugin.name} 把这些资料整理成研究提纲，标出证据、争议点和下一步问题。`,
      effect: "把零散资料转成结构化提纲，帮助继续写报告、论文、综述或调研结论。",
    },
  ],
  金融: [
    {
      title: "公司与市场分析",
      prompt: (plugin) =>
        `用 ${plugin.name} 分析这家公司最近的关键变化，并整理投资或业务判断依据。`,
      effect: "提取财务、市场、新闻或交易相关信息，形成结论、证据和风险提示。",
    },
    {
      title: "财务数据整理",
      prompt: (plugin) =>
        `用 ${plugin.name} 整理这组财务数据的重点变化，并指出需要进一步核查的问题。`,
      effect: "把金融数据和材料转成可读摘要，方便做估值、比较、尽调或汇报。",
    },
  ],
  生产力: [
    {
      title: "文档与任务整理",
      prompt: (plugin) =>
        `用 ${plugin.name} 整理这个项目相关的文档和任务，并生成今天的执行清单。`,
      effect: "把办公系统中的文档、文件或任务上下文变成清晰的待办、计划和产出草稿。",
    },
    {
      title: "协同内容生成",
      prompt: (plugin) =>
        `用 ${plugin.name} 根据现有资料生成一份项目更新，包含进展、风险和下一步。`,
      effect: "快速生成可共享的项目更新、说明文档、计划或协同材料。",
    },
  ],
  安全: [
    {
      title: "安全扫描",
      prompt: (plugin) =>
        `用 ${plugin.name} 扫描当前仓库的安全风险，并按严重程度列出可复现问题。`,
      effect: "发现潜在漏洞、危险配置或不安全代码，并给出风险说明和修复方向。",
    },
    {
      title: "漏洞验证",
      prompt: (plugin) =>
        `用 ${plugin.name} 验证这个漏洞是否真实可复现，并给出最小修复建议。`,
      effect: "把疑似安全问题转成可验证结论，减少误报，并生成更具体的修复步骤。",
    },
  ],
  旅行: [
    {
      title: "行程规划",
      prompt: (plugin) =>
        `用 ${plugin.name} 根据我的时间和预算规划一份行程，并比较几个可选方案。`,
      effect: "围绕目的地、时间、预算和偏好生成路线、选择理由和注意事项。",
    },
    {
      title: "出行决策",
      prompt: (plugin) =>
        `用 ${plugin.name} 比较这些出行或住宿选择，告诉我哪个更适合当前需求。`,
      effect: "把旅行相关信息整理成可比较的决策表和推荐结论。",
    },
  ],
  其他: [
    {
      title: "垂直工具查询",
      prompt: (plugin) =>
        `用 ${plugin.name} 查询这个问题相关的信息，并整理成可执行建议。`,
      effect: "把特定服务中的上下文带入 Codex，输出摘要、判断和下一步动作。",
    },
  ],
};

const pluginScenarioPatterns = [
  {
    pattern: /codex-security|security/i,
    scenarios: [
      {
        title: "仓库安全审查",
        prompt: "用 Codex Security 扫描当前仓库，列出高风险漏洞、证据位置和修复建议。",
        effect: "按严重程度输出安全发现，说明为什么有风险，并给出可落地的修复方向。",
      },
      {
        title: "变更安全复查",
        prompt: "用 Codex Security 检查我这次改动是否引入安全风险。",
        effect: "聚焦当前 diff，找出新引入的风险、误用 API 或敏感数据处理问题。",
      },
    ],
  },
  {
    pattern: /gmail|outlook-email|superhuman|mail/i,
    scenarios: [
      {
        title: "邮件重点整理",
        prompt: (plugin) =>
          `用 ${plugin.name} 总结我今天最重要的邮件，并列出需要回复的事项。`,
        effect: "从邮件线程中提炼重点、截止时间、联系人和建议回复顺序。",
      },
      {
        title: "邮件回复草稿",
        prompt: (plugin) =>
          `用 ${plugin.name} 根据这封邮件起草回复，语气礼貌，明确下一步安排。`,
        effect: "生成可直接编辑的邮件草稿，并保留上下文中的关键承诺和限制。",
      },
    ],
  },
  {
    pattern: /slack|teams/i,
    scenarios: [
      {
        title: "频道讨论总结",
        prompt: (plugin) =>
          `用 ${plugin.name} 总结这个项目频道最近的讨论，提炼决定和待办。`,
        effect: "把团队消息整理成结论、分歧、负责人和后续动作。",
      },
      {
        title: "团队消息草稿",
        prompt: (plugin) =>
          `用 ${plugin.name} 起草一条项目进展消息，包含当前状态、风险和需要协助的地方。`,
        effect: "生成适合发到团队频道的简洁更新，减少重复整理上下文。",
      },
    ],
  },
  {
    pattern: /zoom|fireflies|otter|granola|read-ai|circleback/i,
    scenarios: [
      {
        title: "会议纪要提炼",
        prompt: (plugin) =>
          `用 ${plugin.name} 总结最近一次会议，列出决定、行动项和未解决问题。`,
        effect: "从会议记录或转录中提取可执行纪要，避免手工翻找录音和笔记。",
      },
      {
        title: "历史上下文查找",
        prompt: (plugin) =>
          `用 ${plugin.name} 查找我们之前关于这个客户需求的讨论，并总结关键背景。`,
        effect: "在过往会议中定位相关内容，给当前写作、决策或开发任务补足背景。",
      },
    ],
  },
  {
    pattern: /figma/i,
    scenarios: [
      {
        title: "设计转实现",
        prompt: "用 Figma 读取当前设计稿，整理组件结构、颜色、间距和前端实现注意点。",
        effect: "把设计稿转成可执行的前端说明，降低实现时漏掉样式和交互细节的概率。",
      },
      {
        title: "设计系统同步",
        prompt: "用 Figma 检查这个组件的设计规范，并生成可复用的实现规则。",
        effect: "提取组件状态、变量和约束，帮助代码实现保持和设计系统一致。",
      },
    ],
  },
  {
    pattern: /canva|picsart|shutterstock|biorender|fal/i,
    scenarios: [
      {
        title: "视觉素材生成",
        prompt: (plugin) =>
          `用 ${plugin.name} 根据这段产品说明生成一组宣传图方向，并说明每张图的用途。`,
        effect: "把文字需求转成具体视觉方案、素材建议或可继续编辑的图片资产。",
      },
      {
        title: "素材搜索或改造",
        prompt: (plugin) =>
          `用 ${plugin.name} 找到适合这个主题的素材，并改造成适合发布的版本。`,
        effect: "围绕主题、渠道和品牌风格挑选或调整素材，让输出更接近可发布状态。",
      },
    ],
  },
  {
    pattern: /heygen|hyperframes|remotion/i,
    scenarios: [
      {
        title: "视频生成",
        prompt: (plugin) =>
          `用 ${plugin.name} 根据这段脚本生成一条短视频方案，包含画面节奏和字幕安排。`,
        effect: "把脚本或网页内容转成视频结构、镜头安排、字幕或可渲染的视频工作流。",
      },
      {
        title: "视频资产迭代",
        prompt: (plugin) =>
          `用 ${plugin.name} 把这个产品介绍改成 30 秒演示视频，并突出三个卖点。`,
        effect: "围绕目标时长和信息重点生成可执行的视频制作方案或素材修改建议。",
      },
    ],
  },
  {
    pattern: /github|circleci|sentry|datadog|vercel|cloudflare|netlify|supabase|neon|render|temporal/i,
    scenarios: [
      {
        title: "工程问题排查",
        prompt: (plugin) =>
          `用 ${plugin.name} 检查最近的构建、部署或错误信息，找出失败原因和修复步骤。`,
        effect: "结合工程平台上下文定位失败点，输出原因、证据和具体修复动作。",
      },
      {
        title: "发布前检查",
        prompt: (plugin) =>
          `用 ${plugin.name} 检查这个项目发布前还缺哪些配置、监控或部署步骤。`,
        effect: "把平台配置、部署状态或运行日志整理成发布检查清单。",
      },
    ],
  },
  {
    pattern: /zotero|scite|readwise|biorxiv|research|midpage/i,
    scenarios: [
      {
        title: "文献摘要",
        prompt: (plugin) =>
          `用 ${plugin.name} 查找这个主题的关键文献，并总结主要结论和证据。`,
        effect: "从研究资料中提炼可信结论、引用线索和后续阅读方向。",
      },
      {
        title: "研究提纲",
        prompt: (plugin) =>
          `用 ${plugin.name} 根据这些资料生成研究提纲，区分已证实结论和待验证问题。`,
        effect: "把资料整理成可继续写论文、报告或调研文档的结构化内容。",
      },
    ],
  },
  {
    pattern: /factset|pitchbook|morningstar|moody|lseg|daloopa|aiera|alpaca|binance|stripe|quickbooks/i,
    scenarios: [
      {
        title: "财务与市场分析",
        prompt: (plugin) =>
          `用 ${plugin.name} 分析这家公司或资产的关键数据，并列出主要机会和风险。`,
        effect: "把金融数据、公司资料或交易信息整理成判断依据和风险提示。",
      },
      {
        title: "投资材料整理",
        prompt: (plugin) =>
          `用 ${plugin.name} 整理这份财务材料，提炼可用于汇报的核心观点。`,
        effect: "输出适合投资研究、财务汇报或业务决策的结构化摘要。",
      },
    ],
  },
];

function getCapabilityLabel(capability) {
  return capabilityLabels[capability] || capability;
}

function getPolicyLabel(value, labels) {
  return labels[value] || value || "未标注";
}

function getDescriptionParagraphs(plugin) {
  const description = plugin.description || plugin.short || plugin.shortZh || "";
  return description
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderScenarioText(value, plugin) {
  return typeof value === "function" ? value(plugin) : value;
}

function getCoreScenarios(plugin) {
  const matchedScenarios =
    pluginScenarioPatterns.find(({ pattern }) =>
      pattern.test(`${plugin.slug} ${plugin.name} ${plugin.short} ${plugin.description}`),
    )?.scenarios ||
    categoryScenarios[plugin.category] ||
    categoryScenarios.其他;

  const scenarios = matchedScenarios.map((scenario) => ({
    title: scenario.title,
    prompt: renderScenarioText(scenario.prompt, plugin),
    effect: renderScenarioText(scenario.effect, plugin),
  }));

  return scenarios.slice(0, 3);
}

function buildAnalysisCatalog() {
  return plugins.map((plugin) => ({
    name: plugin.name,
    category: plugin.category,
    description: plugin.shortZh,
    useCases: plugin.useCasesZh,
    scenarios: getCoreScenarios(plugin),
  }));
}

function normalizeAnalysisPayload(payload) {
  if (!payload || typeof payload !== "object") return initialAnalysis;
  return {
    summary: forceCloudflareServiceText(payload.summary || ""),
    designDirection: normalizeAnalysisList(payload.designDirection),
    recommendedSkills: normalizeRecommendedSkills(payload.recommendedSkills),
    workflow: normalizeAnalysisList(payload.workflow),
    cautions: normalizeAnalysisList(payload.cautions),
    detailedPrompt: forceCloudflareServiceText(payload.detailedPrompt || ""),
  };
}

function buildDetailedPrompt(analysis, projectIdea) {
  if (analysis.detailedPrompt) return formatDetailedPrompt(analysis.detailedPrompt);

  const skills = analysis.recommendedSkills
    .map((item) => `- ${item.name}：${item.reason}${item.firstPrompt ? `\n  建议指令：${item.firstPrompt}` : ""}`)
    .join("\n");
  const designDirection = analysis.designDirection.map((item) => `- ${item}`).join("\n");
  const workflow = analysis.workflow.map((item, index) => `${index + 1}. ${item}`).join("\n");

  return `项目名称：${projectIdea || "待分析项目"}\n\n项目目标：\n- 请明确这个项目要解决的问题、目标用户和最终交付物。\n\n设计方向：\n${designDirection || "- 请先判断目标用户、核心场景、页面结构和视觉风格。"}\n\n推荐技能与使用方式：\n${skills || "- 请根据项目需要推荐合适的 Codex 技能或插件，并说明原因。"}\n- Cloudflare Pages / Workers：所有部署、上线、域名、CDN、边缘函数和生产环境发布都统一使用这套服务。\n- Cloudflare D1 / R2：所有数据库、用户数据、会话记录、对象存储、图片和文件存储都统一使用这套服务。\n\n执行步骤：\n${workflow || "1. 先确认项目目标和交付物。\n2. 再拆解页面、功能和素材需求。\n3. 使用 Cloudflare Pages / Workers 完成部署和生产环境配置。\n4. 使用 Cloudflare D1 / R2 完成数据与文件存储设计。"}\n\n输出要求：\n- 使用中文输出。\n- 按项目列表形式展示，不要写成一整段。\n- 每个阶段都要包含目标、要做的事情、使用的技能和交付物。\n- 推荐部署平台时只能写 Cloudflare Pages / Workers。\n- 推荐数据存储时只能写 Cloudflare D1 / R2。`;
}

function formatDetailedPrompt(prompt) {
  return prompt
    .replace(/\r\n/g, "\n")
    .replace(/\s*(项目目标[:：])/g, "\n\n$1\n")
    .replace(/\s*(设计方向[:：])/g, "\n\n$1\n")
    .replace(/\s*(推荐技能[:：])/g, "\n\n$1\n")
    .replace(/\s*(功能模块[:：])/g, "\n\n$1\n")
    .replace(/\s*(交付物[:：])/g, "\n\n$1\n")
    .replace(/\s*(执行要求[:：])/g, "\n\n$1\n")
    .replace(/\s*(执行步骤[:：])/g, "\n\n$1\n")
    .replace(/\s*(输出格式[:：])/g, "\n\n$1\n")
    .replace(/\s+([一二三四五六七八九十]、)/g, "\n\n$1")
    .replace(/\s+(\d+\.\s*)/g, "\n$1")
    .replace(/([。；])\s*(?=[\u4e00-\u9fa5A-Za-z0-9])/g, "$1\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatAnalysisTime(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "刚刚";
  }
}

function parseHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return {};
  const params = {};
  for (const part of hash.split("&")) {
    const [key, value] = part.split("=");
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || "");
  }
  return params;
}

function writeHash(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  const newHash = parts.length ? `#${parts.join("&")}` : "";
  if (window.location.hash !== newHash) {
    history.replaceState(null, "", newHash || window.location.pathname);
  }
}

function App() {
  const [urlState, setUrlState] = useState(parseHash);
  const [activeCategory, setActiveCategory] = useState(() => urlState.cat || "精选");
  const [activeTab, setActiveTab] = useState(() => urlState.tab || "analysis");
  const [query, setQuery] = useState(() => urlState.q || "");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    window.matchMedia("(max-width: 900px)").matches,
  );
  const [selectedPlugin, setSelectedPlugin] = useState(() => {
    if (urlState.plugin) {
      return plugins.find((p) => p.slug === urlState.plugin) || null;
    }
    return null;
  });
  const [projectIdea, setProjectIdea] = useState(() =>
    window.localStorage.getItem(projectIdeaStorageKey) || "",
  );
  const [deepseekApiKey, setDeepseekApiKey] = useState(() =>
    window.localStorage.getItem(deepseekKeyStorageKey) || "",
  );
  const [analysisResult, setAnalysisResult] = useState(() => readStoredAnalysis());
  const [analysisProjectIdea, setAnalysisProjectIdea] = useState(() =>
    readStoredAnalysisProjectIdea(),
  );
  const [analysisHistory, setAnalysisHistory] = useState(() =>
    readStoredAnalysisHistory(),
  );
  const [analysisError, setAnalysisError] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    const stored = window.localStorage.getItem("codex-skill.theme");
    return stored || "light";
  });
  const searchInputRef = React.useRef(null);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      window.localStorage.setItem("codex-skill.theme", next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const syncSidebarToViewport = (event) => {
      if (event.matches) {
        setSidebarCollapsed(true);
      }
    };

    syncSidebarToViewport(mediaQuery);
    mediaQuery.addEventListener("change", syncSidebarToViewport);
    return () => mediaQuery.removeEventListener("change", syncSidebarToViewport);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const params = parseHash();
      setUrlState(params);
      if (params.cat) setActiveCategory(params.cat);
      if (params.tab) setActiveTab(params.tab);
      if (params.q) setQuery(params.q);
      if (params.plugin) {
        const found = plugins.find((p) => p.slug === params.plugin);
        if (found) setSelectedPlugin(found);
      } else {
        setSelectedPlugin(null);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    writeHash({
      tab: activeTab !== "analysis" ? activeTab : undefined,
      cat: activeCategory !== "精选" ? activeCategory : undefined,
      q: query || undefined,
      plugin: selectedPlugin?.slug || undefined,
    });
  }, [activeTab, activeCategory, query, selectedPlugin]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        setActiveTab("plugins");
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === "Escape") {
        if (isAnalysisModalOpen) {
          setIsAnalysisModalOpen(false);
        } else if (selectedPlugin) {
          setSelectedPlugin(null);
        } else if (isInput) {
          e.target.blur();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAnalysisModalOpen, selectedPlugin]);

  const visiblePlugins = useMemo(() => {
    const term = normalize(query);
    return plugins.filter((plugin) => {
      const matchesCategory =
        activeCategory === "精选" || plugin.category === activeCategory;
      const scenarioText = getCoreScenarios(plugin)
        .map((scenario) => `${scenario.title} ${scenario.prompt} ${scenario.effect}`)
        .join(" ");
      const matchesText =
        `${plugin.name} ${plugin.category} ${plugin.shortZh} ${plugin.short} ${plugin.developer} ${scenarioText}`
        .toLowerCase()
        .includes(term);
      return matchesCategory && (!term || matchesText);
    });
  }, [activeCategory, query]);

  const categoryCount = (category) =>
    category === "精选"
      ? plugins.length
      : plugins.filter((plugin) => plugin.category === category).length;

  const handleAnalyzeProject = async (event) => {
    event.preventDefault();
    const idea = projectIdea.trim();
    if (!idea) {
      setAnalysisError("请先输入你想做的项目方向。");
      return;
    }
    if (!deepseekApiKey.trim()) {
      setAnalysisError("请先配置 DeepSeek API Key。Key 会保存在本机浏览器。");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    try {
      const response = await fetch("/api/deepseek-analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectIdea: idea,
          deepseekApiKey: deepseekApiKey.trim(),
          catalog: buildAnalysisCatalog(),
        }),
      });

      const payload = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(payload.error || "DeepSeek 分析失败，请稍后再试。");
      }

      const normalizedAnalysis = normalizeAnalysisPayload(payload.analysis);
      const savedAt = new Date().toISOString();
      const analysisRecord = {
        id: `analysis-${Date.now()}`,
        projectIdea: idea,
        savedAt,
        analysis: normalizedAnalysis,
      };

      setAnalysisResult(normalizedAnalysis);
      setAnalysisProjectIdea(idea);
      setAnalysisHistory((currentHistory) => {
        const nextHistory = [analysisRecord, ...currentHistory].slice(0, 20);
        window.localStorage.setItem(
          analysisHistoryStorageKey,
          JSON.stringify(nextHistory),
        );
        window.localStorage.setItem(analysisStorageKey, JSON.stringify(analysisRecord));
        return nextHistory;
      });
      setIsAnalysisModalOpen(true);
    } catch (error) {
      setAnalysisError(error.message || "DeepSeek 分析失败，请检查本地服务和 API Key。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApiKeyChange = (value) => {
    setDeepseekApiKey(value);
    window.localStorage.setItem(deepseekKeyStorageKey, value);
  };

  const handleProjectIdeaChange = (value) => {
    setProjectIdea(value);
    window.localStorage.setItem(projectIdeaStorageKey, value);
  };

  const handleClearApiKey = () => {
    setDeepseekApiKey("");
    window.localStorage.removeItem(deepseekKeyStorageKey);
  };

  const handleOpenAnalysisRecord = (record) => {
    setAnalysisResult(record.analysis);
    setAnalysisProjectIdea(record.projectIdea);
    setIsAnalysisModalOpen(true);
  };

  return (
    <main className={`app-shell${sidebarCollapsed ? " collapsed" : ""}`}>
      <aside className="sidebar" aria-label="插件分类侧边栏">
        <a className="side-brand" href="#top">
          <span className="cube-logo">
            <Workflow size={21} />
          </span>
          <span className="brand-text">Codex Skills</span>
        </a>

        <nav className="category-nav" aria-label="插件分类">
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            return (
              <button
                className={activeCategory === category ? "active" : ""}
                key={category}
                onClick={() => {
                  setActiveCategory(category);
                  setActiveTab("plugins");
                }}
                title={sidebarCollapsed ? category : undefined}
                type="button"
              >
                <Icon size={18} />
                <span className="category-name">
                  {category === "精选" ? "全部" : category}
                </span>
                <span className="category-count">({categoryCount(category)})</span>
              </button>
            );
          })}
        </nav>

        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={theme === "dark" ? "切换到亮色模式" : "切换到暗色模式"}
          type="button"
        >
          {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
          <span>{theme === "dark" ? "暗色模式" : "亮色模式"}</span>
        </button>

        <button
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
          title={sidebarCollapsed ? "展开" : "收起"}
          type="button"
        >
          {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          <span className="sidebar-toggle-text">
            {sidebarCollapsed ? "已收起" : "已展开"}
          </span>
        </button>

      </aside>

      <section className="main-stage" id="top">
        <div className="content-grid">
          <div className="left-content">
            <div className="view-tabs" role="tablist" aria-label="内容切换">
              <button
                aria-selected={activeTab === "analysis"}
                className={activeTab === "analysis" ? "active" : ""}
                onClick={() => setActiveTab("analysis")}
                role="tab"
                type="button"
              >
                AI 分析
              </button>
              <button
                aria-selected={activeTab === "plugins"}
                className={activeTab === "plugins" ? "active" : ""}
                onClick={() => setActiveTab("plugins")}
                role="tab"
                type="button"
              >
                插件列表
              </button>
              <button
                aria-selected={activeTab === "workflows"}
                className={activeTab === "workflows" ? "active" : ""}
                onClick={() => setActiveTab("workflows")}
                role="tab"
                type="button"
              >
                工作流模板
              </button>
            </div>

            <div className="tab-content">
              {activeTab === "analysis" ? (
                <div className="tab-pane" role="tabpanel">
                  <AiAnalysisPanel
                    analysisError={analysisError}
                    analysisHistory={analysisHistory}
                    analysisResult={analysisResult}
                    deepseekApiKey={deepseekApiKey}
                    isAnalyzing={isAnalyzing}
                    onApiKeyChange={handleApiKeyChange}
                    onAnalyze={handleAnalyzeProject}
                    onClearApiKey={handleClearApiKey}
                    onOpenRecord={handleOpenAnalysisRecord}
                    onOpenResult={() => setIsAnalysisModalOpen(true)}
                    projectIdea={projectIdea}
                    setProjectIdea={handleProjectIdeaChange}
                  />
                </div>
              ) : activeTab === "workflows" ? (
                <div className="tab-pane" role="tabpanel">
                  <WorkflowTemplates />
                </div>
              ) : (
                <div className="tab-pane plugins-tab-pane" role="tabpanel">
                  <section className="search-toolbar" aria-label="插件搜索和筛选">
                    <div className="search-panel">
                      <div className="search-row">
                        <Search size={20} />
                        <input
                          ref={searchInputRef}
                          aria-label="搜索插件"
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="搜索插件、分类或能力..."
                          type="search"
                          value={query}
                        />
                        {!query && (
                          <kbd className="search-shortcut" title="按 / 聚焦搜索">/</kbd>
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="plugins-panel" id="plugins">
                    {visiblePlugins.length === 0 ? (
                      <div className="empty-state">
                        <Search size={40} strokeWidth={1.5} />
                        <h3>没有找到匹配的插件</h3>
                        <p>
                          尝试更换关键词，或切换到「全部」分类浏览所有插件。
                          {query && (
                            <button
                              className="empty-clear-btn"
                              onClick={() => setQuery("")}
                              type="button"
                            >
                              清除搜索
                            </button>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="plugin-grid">
                        {visiblePlugins.map((plugin, index) => (
                          <PluginCard
                            key={plugin.slug}
                            onOpen={() => setSelectedPlugin(plugin)}
                            plugin={plugin}
                            index={index}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      {selectedPlugin ? (
        <PluginDetail
          onClose={() => setSelectedPlugin(null)}
          onOpenPlugin={(p) => setSelectedPlugin(p)}
          plugin={selectedPlugin}
        />
      ) : null}
      {analysisResult && isAnalysisModalOpen ? (
        <AiAnalysisModal
          analysis={analysisResult}
          onClose={() => setIsAnalysisModalOpen(false)}
          projectIdea={analysisProjectIdea || projectIdea}
        />
      ) : null}
    </main>
  );
}

function AiAnalysisPanel({
  analysisError,
  analysisHistory,
  analysisResult,
  deepseekApiKey,
  isAnalyzing,
  onApiKeyChange,
  onAnalyze,
  onClearApiKey,
  onOpenRecord,
  onOpenResult,
  projectIdea,
  setProjectIdea,
}) {
  return (
    <section className="ai-panel" aria-label="AI 项目方向分析">
      <div className="ai-panel-head">
        <div className="ai-panel-icon">
          <Bot size={19} />
        </div>
        <div>
          <h2>AI 项目分析</h2>
          <p>输入你想做的项目方向，DeepSeek 会自动分析设计方向和需要使用的技能。</p>
        </div>
      </div>

      <div className="api-key-config">
        <label htmlFor="deepseek-api-key">DeepSeek API Key</label>
        <div>
          <input
            autoComplete="off"
            id="deepseek-api-key"
            onChange={(event) => onApiKeyChange(event.target.value)}
            placeholder="请输入 sk- 开头的 DeepSeek API Key，本机保存"
            type="password"
            value={deepseekApiKey}
          />
          <button disabled={!deepseekApiKey} onClick={onClearApiKey} type="button">
            清除
          </button>
        </div>
        <p>Key 只保存在当前浏览器的本地存储中，请不要在公共电脑上保存。</p>
      </div>

      <form className="ai-form" onSubmit={onAnalyze}>
        <textarea
          aria-label="项目方向"
          onChange={(event) => setProjectIdea(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
              return;
            }
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }}
          placeholder="例如：我想做一个面向独立开发者的 SaaS 官网，能展示产品功能、收集用户邮箱，并生成一套社媒宣传素材。按 Enter 开始分析，Shift + Enter 换行。"
          rows={3}
          value={projectIdea}
        />
        <button disabled={isAnalyzing} type="submit">
          {isAnalyzing ? "分析中..." : "开始分析"}
        </button>
      </form>

      {analysisError ? <p className="ai-error">{analysisError}</p> : null}

      {analysisResult ? (
        <div className="ai-result-preview">
          <div>
            <strong>已生成分析结果</strong>
            <p>{analysisResult.summary || "点击查看完整分析、推荐技能和详细提示词。"}</p>
          </div>
          <button onClick={onOpenResult} type="button">
            查看弹窗
          </button>
        </div>
      ) : null}

      {analysisHistory.length ? (
        <section className="analysis-history" aria-label="AI 分析生成记录">
          <div className="analysis-history-head">
            <strong>生成记录</strong>
            <span>已保存 {analysisHistory.length} 条</span>
          </div>
          <div className="analysis-history-list">
            {analysisHistory.map((record) => (
              <button
                key={record.id}
                onClick={() => onOpenRecord(record)}
                type="button"
              >
                <span>
                  <strong>{record.projectIdea || "未命名项目"}</strong>
                  <small>{record.analysis.summary || "点击查看完整分析结果。"}</small>
                </span>
                <time dateTime={record.savedAt}>{formatAnalysisTime(record.savedAt)}</time>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function AiAnalysisModal({ analysis, onClose, projectIdea }) {
  return (
    <div className="analysis-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        aria-label="AI 项目分析结果"
        className="analysis-modal"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="analysis-modal-head">
          <div>
            <span>DeepSeek 分析结果</span>
            <h2>项目方向与技能建议</h2>
          </div>
          <button aria-label="关闭分析结果" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <AiAnalysisResult analysis={analysis} projectIdea={projectIdea} />
      </section>
    </div>
  );
}

function AiAnalysisResult({ analysis, projectIdea }) {
  const detailedPrompt = buildDetailedPrompt(analysis, projectIdea);
  const [copyStatus, setCopyStatus] = useState("");

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(detailedPrompt);
      setCopyStatus("已复制");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setCopyStatus("复制失败");
      window.setTimeout(() => setCopyStatus(""), 1800);
    }
  };

  return (
    <div className="ai-result">
      <section className="prompt-panel">
        <div className="prompt-panel-head">
          <h3>详细提示词</h3>
          <button onClick={handleCopyPrompt} type="button">
            {copyStatus || "复制提示词"}
          </button>
        </div>
        <pre>{detailedPrompt}</pre>
      </section>

      {analysis.summary ? (
        <div className="ai-summary">
          <span>项目判断</span>
          <p>{analysis.summary}</p>
        </div>
      ) : null}

      <AnalysisList title="设计方向" items={analysis.designDirection} />
      <RecommendedSkills items={analysis.recommendedSkills} />
      <AnalysisList title="执行路径" items={analysis.workflow} />
      <AnalysisList title="注意事项" items={analysis.cautions} />
    </div>
  );
}

function AnalysisList({ items, title }) {
  if (!items.length) return null;
  return (
    <div className="ai-result-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function RecommendedSkills({ items }) {
  if (!items.length) return null;
  return (
    <div className="ai-result-section">
      <h3>推荐技能</h3>
      <div className="skill-recommendations">
        {items.map((item) => (
          <article key={`${item.name}-${item.reason}`}>
            <strong>{item.name}</strong>
            <span>{item.category}</span>
            <p>{item.reason}</p>
            {item.firstPrompt ? <code>{item.firstPrompt}</code> : null}
          </article>
        ))}
      </div>
    </div>
  );
}

function CopyableCode({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="copyable-code">
      <code>{text}</code>
      <button
        className={`copy-btn${copied ? " copied" : ""}`}
        onClick={handleCopy}
        title="复制提示词"
        type="button"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

function PluginCard({ onOpen, plugin, index = 0 }) {
  const Icon = categoryIcons[plugin.category] || Sparkles;
  const isOfficial = plugin.marketplace?.startsWith("openai-");

  return (
    <button
      className="plugin-card"
      onClick={onOpen}
      style={{ "--accent": plugin.brandColor, animationDelay: `${index * 40}ms` }}
      type="button"
    >
      {isOfficial ? (
        <span aria-label="官方认证插件" className="official-badge" title="官方认证">
          <Star size={13} />
        </span>
      ) : null}
      <div className="plugin-card-head">
        <div className={`plugin-icon${plugin.logo ? " has-logo" : " fallback-icon"}`}>
          {plugin.logo ? (
            <img alt="" src={plugin.logo} />
          ) : (
            <Icon size={28} />
          )}
        </div>
        <div className="plugin-title">
          <h3>{plugin.name}</h3>
        </div>
      </div>
      <p>{plugin.shortZh}</p>
      <div className="plugin-card-foot" aria-label="插件摘要">
        <span>{plugin.developer || plugin.marketplace}</span>
        <span>{(plugin.capabilities || []).length ? `${plugin.capabilities.length} 项能力` : "基础连接"}</span>
        <span>{getCoreScenarios(plugin).length} 个核心场景</span>
      </div>
    </button>
  );
}

function PluginDetail({ onClose, onOpenPlugin, plugin }) {
  const Icon = categoryIcons[plugin.category] || Sparkles;
  const coreScenarios = getCoreScenarios(plugin);

  const relatedPlugins = useMemo(() => {
    return plugins
      .filter((p) => p.slug !== plugin.slug && p.category === plugin.category)
      .slice(0, 4);
  }, [plugin]);
  return (
    <div className="detail-backdrop" role="presentation" onClick={onClose}>
      <aside
        aria-label={`${plugin.name} 插件详情`}
        className="plugin-detail"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="detail-head">
          <div
            className={`detail-logo${plugin.logo ? " has-logo" : " fallback-icon"}`}
            style={{ "--accent": plugin.brandColor }}
          >
            {plugin.logo ? <img alt="" src={plugin.logo} /> : <Icon size={30} />}
          </div>
          <div>
            <span>{plugin.category}</span>
            <h2>{plugin.name}</h2>
            <p>{plugin.shortZh}</p>
          </div>
          <button aria-label="关闭详情" className="detail-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className="detail-summary-grid" aria-label="插件关键信息">
          <div>
            <span>开发方</span>
            <strong>{plugin.developer || "官方插件"}</strong>
          </div>
          <div>
            <span>安装</span>
            <strong>{getPolicyLabel(plugin.installation, installLabels)}</strong>
          </div>
          <div>
            <span>授权</span>
            <strong>{getPolicyLabel(plugin.authentication, authLabels)}</strong>
          </div>
          <div>
            <span>能力</span>
            <strong>{(plugin.capabilities || []).length || "基础"}</strong>
          </div>
        </div>

        <div className="detail-section">
          <h3>这个插件是什么</h3>
          <p>{plugin.detailZh.what}</p>
        </div>

        <div className="detail-section">
          <h3>官方原始说明</h3>
          <div className="official-description">
            {getDescriptionParagraphs(plugin).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h3>它怎么样</h3>
          <p>{plugin.detailZh.value}</p>
        </div>

          <div className="detail-section">
          <h3>核心使用场景</h3>
          <div className="scenario-list">
            {coreScenarios.map((scenario) => (
              <article className="scenario-card" key={`${scenario.title}-${scenario.prompt}`}>
                <h4>{scenario.title}</h4>
                <div>
                  <span>你输入</span>
                  <CopyableCode text={scenario.prompt} />
                </div>
                <div>
                  <span>会得到</span>
                  <p>{scenario.effect}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="detail-section">
          <h3>典型用途</h3>
          <ul>
            {plugin.useCasesZh.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <dl className="detail-meta">
          <div>
            <dt>开发方</dt>
            <dd>{plugin.developer || "官方插件"}</dd>
          </div>
          <div>
            <dt>版本</dt>
            <dd>{plugin.version || "未标注"}</dd>
          </div>
          <div>
            <dt>来源</dt>
            <dd>{plugin.marketplace}</dd>
          </div>
          <div>
            <dt>原分类</dt>
            <dd>{plugin.sourceCategory || "未标注"}</dd>
          </div>
        </dl>

        {relatedPlugins.length > 0 && (
          <div className="detail-section">
            <h3>同类推荐</h3>
            <div className="related-plugins">
              {relatedPlugins.map((rp) => {
                const RpIcon = categoryIcons[rp.category] || Sparkles;
                return (
                  <button
                    className="related-plugin-card"
                    key={rp.slug}
                    onClick={() => onOpenPlugin ? onOpenPlugin(rp) : onClose()}
                    type="button"
                  >
                    <div className={`plugin-icon${rp.logo ? " has-logo" : " fallback-icon"}`}>
                      {rp.logo ? <img alt="" src={rp.logo} /> : <RpIcon size={20} />}
                    </div>
                    <div>
                      <strong>{rp.name}</strong>
                      <span>{rp.shortZh}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

const difficultyColors = {
  "初级": "diff-easy",
  "中级": "diff-medium",
  "高级": "diff-hard",
};

function WorkflowTemplates() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [workflowFilter, setWorkflowFilter] = useState("全部");

  const allCategories = ["全部", ...new Set(workflowTemplates.map((t) => t.category))];

  const filtered = workflowFilter === "全部"
    ? workflowTemplates
    : workflowTemplates.filter((t) => t.category === workflowFilter);

  if (selectedWorkflow) {
    return (
      <WorkflowDetail
        onBack={() => setSelectedWorkflow(null)}
        template={selectedWorkflow}
      />
    );
  }

  return (
    <section className="workflow-panel" aria-label="工作流模板">
      <div className="workflow-filters">
        {allCategories.map((cat) => (
          <button
            className={workflowFilter === cat ? "active" : ""}
            key={cat}
            onClick={() => setWorkflowFilter(cat)}
            type="button"
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="workflow-grid">
        {filtered.map((template, index) => (
          <button
            className="workflow-card"
            key={template.id}
            onClick={() => setSelectedWorkflow(template)}
            style={{ animationDelay: `${index * 50}ms` }}
            type="button"
          >
            <div className="workflow-card-top">
              <span className={`workflow-difficulty ${difficultyColors[template.difficulty] || ""}`}>
                {template.difficulty}
              </span>
              <span className="workflow-time">
                <Timer size={13} />
                {template.estimatedTime}
              </span>
            </div>
            <h3>{template.title}</h3>
            <p>{template.description}</p>
            <div className="workflow-card-tags">
              {template.tags.map((tag) => (
                <span key={tag}>
                  <Tag size={11} />
                  {tag}
                </span>
              ))}
            </div>
            <div className="workflow-card-foot">
              <span>{template.steps.length} 个步骤</span>
              <span className="workflow-arrow">
                开始
                <ArrowUpRight size={14} />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function WorkflowDetail({ onBack, template }) {
  const [copiedStep, setCopiedStep] = useState(null);

  const handleCopyStep = async (prompt, index) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedStep(index);
      window.setTimeout(() => setCopiedStep(null), 1500);
    } catch {
      setCopiedStep(null);
    }
  };

  const handleCopyAll = async () => {
    const allPrompts = template.steps
      .map((step, i) => `步骤 ${i + 1}：${step.name}\n${step.prompt}`)
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(allPrompts);
      setCopiedStep("all");
      window.setTimeout(() => setCopiedStep(null), 1500);
    } catch {
      setCopiedStep(null);
    }
  };

  return (
    <section className="workflow-detail" aria-label={template.title}>
      <button className="workflow-back" onClick={onBack} type="button">
        ← 返回模板列表
      </button>

      <div className="workflow-detail-head">
        <span className={`workflow-difficulty ${difficultyColors[template.difficulty] || ""}`}>
          {template.difficulty}
        </span>
        <h2>{template.title}</h2>
        <p>{template.description}</p>
        <div className="workflow-detail-meta">
          <span>
            <Timer size={14} />
            预计 {template.estimatedTime}
          </span>
          <span>
            <Layers size={14} />
            {template.steps.length} 个步骤
          </span>
          <span>
            <Footprints size={14} />
            {template.category}
          </span>
        </div>
      </div>

      <div className="workflow-detail-actions">
        <button className="workflow-copy-all" onClick={handleCopyAll} type="button">
          {copiedStep === "all" ? <><Check size={15} /> 已复制全部</> : <><Copy size={15} /> 复制全部提示词</>}
        </button>
      </div>

      <div className="workflow-steps">
        {template.steps.map((step, index) => (
          <div className="workflow-step" key={index}>
            <div className="workflow-step-num">{index + 1}</div>
            <div className="workflow-step-content">
              <h3>{step.name}</h3>
              <div className="workflow-step-prompt">
                <code>{step.prompt}</code>
                <button
                  className={`copy-btn${copiedStep === index ? " copied" : ""}`}
                  onClick={() => handleCopyStep(step.prompt, index)}
                  title="复制此步骤"
                  type="button"
                >
                  {copiedStep === index ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              {step.tips && (
                <div className="workflow-step-tips">
                  <Sparkles size={13} />
                  <span>{step.tips}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);

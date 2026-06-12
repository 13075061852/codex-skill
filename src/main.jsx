import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bot,
  BriefcaseBusiness,
  Brush,
  Building2,
  ChartNoAxesCombined,
  ChevronDown,
  Code2,
  Database,
  FileText,
  FlaskConical,
  Gamepad2,
  Github,
  Globe2,
  GraduationCap,
  Image,
  MessageCircle,
  Plane,
  PanelLeftClose,
  PanelLeftOpen,
  Presentation,
  Puzzle,
  Search,
  Shield,
  Sparkles,
  Star,
  Table2,
  TerminalSquare,
  Video,
  Workflow,
} from "lucide-react";
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
  研究: Workflow,
  安全: Shield,
  旅行: Plane,
};

const categories = Object.keys(categoryIcons);

const plugins = [
  {
    name: "Browser",
    slug: "browser",
    category: "开发者工具",
    icon: Globe2,
    accent: "#2f8cff",
    short: "搜索网页并提取最新可靠信息。",
  },
  {
    name: "Build Web Apps",
    slug: "build-web-apps",
    category: "开发者工具",
    icon: Code2,
    accent: "#27c7ff",
    short: "使用现代框架创建完整 Web 应用。",
  },
  {
    name: "Canva",
    slug: "canva",
    category: "创意设计",
    icon: Brush,
    accent: "#8b6dff",
    short: "创建、编辑和改造高质量视觉设计。",
  },
  {
    name: "Cloudflare",
    slug: "cloudflare",
    category: "开发者工具",
    icon: Database,
    accent: "#ff8a2a",
    short: "管理域名、DNS，并部署边缘函数。",
  },
  {
    name: "Cloudinary",
    slug: "cloudinary",
    category: "开发者工具",
    icon: Image,
    accent: "#4c8dff",
    short: "上传、转换并分发图片和视频资源。",
  },
  {
    name: "Codex Security",
    slug: "codex-security",
    category: "安全",
    icon: Shield,
    accent: "#a998ff",
    short: "执行安全分析、漏洞扫描和最佳实践检查。",
  },
  {
    name: "Documents",
    slug: "documents",
    category: "生产力",
    icon: FileText,
    accent: "#dce9ff",
    short: "创建、编辑和导出文档成果。",
  },
  {
    name: "Game Studio",
    slug: "game-studio",
    category: "开发者工具",
    icon: Gamepad2,
    accent: "#806cff",
    short: "规划、原型和迭代浏览器游戏。",
  },
  {
    name: "GitHub",
    slug: "github",
    category: "开发者工具",
    icon: Github,
    accent: "#f5f7ff",
    short: "检索仓库、处理 PR、审查代码和管理流程。",
  },
  {
    name: "HyperFrames by HeyGen",
    slug: "hyperframes",
    category: "创意设计",
    icon: Video,
    accent: "#7b58ff",
    short: "用 HTML 和动效工作流创建视频内容。",
  },
  {
    name: "Life Science Research",
    slug: "life-science-research",
    category: "教育与研究",
    icon: FlaskConical,
    accent: "#2488ff",
    short: "检索并分析生命科学文献和数据。",
  },
  {
    name: "OpenAI Developers",
    slug: "openai-developers",
    category: "开发者工具",
    icon: Bot,
    accent: "#f4f7ff",
    short: "集成 OpenAI API、Agents 和 ChatGPT Apps。",
  },
  {
    name: "Presentations",
    slug: "presentations",
    category: "生产力",
    icon: Presentation,
    accent: "#ff673e",
    short: "创建、编辑和导出演示文稿。",
  },
  {
    name: "Public Equity Investing",
    slug: "public-equity-investing",
    category: "金融",
    icon: ChartNoAxesCombined,
    accent: "#d7dce7",
    short: "研究上市公司、财报、估值和市场数据。",
  },
  {
    name: "Spreadsheets",
    slug: "spreadsheets",
    category: "生产力",
    icon: Table2,
    accent: "#22d979",
    short: "分析数据、建立模型并创建电子表格。",
  },
  {
    name: "Vercel",
    slug: "vercel",
    category: "开发者工具",
    icon: TerminalSquare,
    accent: "#ffffff",
    short: "构建、部署和排查 Vercel 项目。",
  },
  {
    name: "Zotero",
    slug: "zotero",
    category: "教育与研究",
    icon: BookOpen,
    accent: "#f33a45",
    short: "检索、整理并引用 Zotero 文献资料。",
  },
];

const normalize = (value) => value.toLowerCase().trim();

function App() {
  const [activeCategory, setActiveCategory] = useState("精选");
  const [query, setQuery] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visiblePlugins = useMemo(() => {
    const term = normalize(query);
    return plugins.filter((plugin) => {
      const matchesCategory =
        activeCategory === "精选" || plugin.category === activeCategory;
      const matchesText = `${plugin.name} ${plugin.category} ${plugin.short}`
        .toLowerCase()
        .includes(term);
      return matchesCategory && (!term || matchesText);
    });
  }, [activeCategory, query]);

  const categoryCount = (category) =>
    category === "精选"
      ? plugins.length
      : plugins.filter((plugin) => plugin.category === category).length;

  return (
    <main className={`app-shell${sidebarCollapsed ? " collapsed" : ""}`}>
      <aside className="sidebar" aria-label="插件分类侧边栏">
        <a className="side-brand" href="#top">
          <span className="cube-logo">
            <Puzzle size={21} />
          </span>
          <span className="brand-text">Codex 指南</span>
        </a>

        <nav className="category-nav" aria-label="插件分类">
          {categories.map((category) => {
            const Icon = categoryIcons[category];
            return (
              <button
                className={activeCategory === category ? "active" : ""}
                key={category}
                onClick={() => setActiveCategory(category)}
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
            <section className="search-toolbar" aria-label="插件搜索和筛选">
              <div className="search-panel">
                <div className="search-row">
                  <Search size={20} />
                  <input
                    aria-label="搜索插件"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索插件、分类或能力..."
                    type="search"
                    value={query}
                  />
                  <kbd>⌘ K</kbd>
                </div>
                <div className="filter-row">
                  <button type="button">
                    {activeCategory === "精选" ? "全部分类" : activeCategory}
                    <ChevronDown size={16} />
                  </button>
                  <button type="button">
                    全部类型
                    <ChevronDown size={16} />
                  </button>
                  <button type="button">
                    全部集成
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            </section>

            <section className="plugins-panel" id="plugins">
              <div className="panel-heading">
                <div>
                  <h2>官方插件</h2>
                  <p>由 OpenAI 和合作伙伴精选，面向真实工作场景构建。</p>
                </div>
                <strong>{visiblePlugins.length} 个插件</strong>
              </div>
              <div className="plugin-grid">
                {visiblePlugins.map((plugin) => (
                  <PluginCard key={plugin.slug} plugin={plugin} />
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}

function PluginCard({ plugin }) {
  const Icon = plugin.icon;
  return (
    <article className="plugin-card" style={{ "--accent": plugin.accent }}>
      <ArrowUpRight className="card-arrow" size={15} />
      <div className="plugin-icon">
        <Icon size={28} />
      </div>
      <div className="plugin-title">
        <h3>{plugin.name}</h3>
      </div>
      <p>{plugin.short}</p>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function extractJsonObject(content) {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("DeepSeek 没有返回可解析的 JSON。");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

async function handlePost({ request, env }) {
  try {
    const body = await request.json();
    const projectIdea = String(body.projectIdea || "").trim();
    const apiKey = String(body.deepseekApiKey || env.DEEPSEEK_API_KEY || "").trim();
    const catalog = Array.isArray(body.catalog) ? body.catalog : [];

    if (!projectIdea) {
      return jsonResponse({ error: "项目方向不能为空。" }, 400);
    }

    if (!apiKey) {
      return jsonResponse(
        {
          error: "缺少 DeepSeek API Key。请先在页面的 DeepSeek API Key 配置中填写并保存。",
        },
        400,
      );
    }

    const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是中文项目规划助手。只能使用简体中文回答。根据用户项目方向和可用 Codex 插件目录，输出严格 JSON，不要 Markdown。字段包括 summary 字符串，designDirection 字符串数组，recommendedSkills 数组，workflow 字符串数组，cautions 字符串数组，detailedPrompt 字符串。recommendedSkills 每项包含 name、category、reason、firstPrompt。推荐技能必须来自插件目录，reason、firstPrompt 和 detailedPrompt 必须是中文。凡是涉及部署、上线、托管、域名、CDN、边缘函数、Serverless、静态站点发布或生产环境发布，一律推荐 Cloudflare Pages / Workers。凡是涉及数据库、用户数据、登录数据、会话记录、对话历史、对象存储、图片存储、文件存储或资源存储，一律推荐 Cloudflare D1 / R2。不要推荐 Vercel、Netlify、Render、Railway、Fly.io、GitHub Pages、Supabase、Neon、Firebase、Firestore、PlanetScale、Turso、MongoDB 或其他部署和数据存储平台。detailedPrompt 必须是多行项目列表规划，禁止写成一整段。detailedPrompt 至少包含这些独立小节：项目目标、目标用户、核心页面或功能模块、视觉设计方向、推荐技能与使用方式、阶段执行步骤、最终交付物、输出格式要求。每个小节下面使用 - 列表或 1. 2. 3. 编号。",
          },
          {
            role: "user",
            content: JSON.stringify({
              projectIdea,
              catalog,
              outputShape: {
                summary: "一句话判断项目核心目标和适合的产品形态",
                designDirection: ["设计方向 1", "设计方向 2", "设计方向 3"],
                recommendedSkills: [
                  {
                    name: "插件名称",
                    category: "分类",
                    reason: "为什么需要它",
                    firstPrompt: "第一条应该输入的中文指令",
                  },
                ],
                workflow: ["第 1 步", "第 2 步", "第 3 步"],
                cautions: ["注意事项 1", "注意事项 2"],
                detailedPrompt:
                  "项目目标：\n- ...\n\n目标用户：\n- ...\n\n核心页面或功能模块：\n1. ...\n2. ...\n\n视觉设计方向：\n- ...\n\n推荐技能与使用方式：\n- Cloudflare Pages / Workers：负责部署、上线、域名、CDN、边缘函数或生产环境发布。\n- Cloudflare D1 / R2：负责数据库、用户数据、会话记录、对象存储、图片和文件存储。\n- 其他技能名称：使用原因和第一条中文指令\n\n阶段执行步骤：\n1. ...\n2. 使用 Cloudflare Pages / Workers 完成部署和生产环境配置。\n3. 使用 Cloudflare D1 / R2 完成数据和文件存储设计。\n\n最终交付物：\n- ...\n\n输出格式要求：\n- ...",
              },
            }),
          },
        ],
      }),
    });

    const deepseekText = await deepseekResponse.text();
    const deepseekPayload = deepseekText ? JSON.parse(deepseekText) : {};

    if (!deepseekResponse.ok) {
      return jsonResponse(
        {
          error:
            deepseekPayload?.error?.message ||
            "DeepSeek 接口调用失败，请检查 API Key、余额或网络。",
        },
        deepseekResponse.status,
      );
    }

    const content = deepseekPayload?.choices?.[0]?.message?.content || "";
    return jsonResponse({ analysis: extractJsonObject(content) });
  } catch (error) {
    return jsonResponse(
      {
        error: error.message || "DeepSeek 分析失败。",
      },
      500,
    );
  }
}

export async function onRequest(context) {
  if (context.request.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  if (context.request.method === "POST") {
    return handlePost(context);
  }

  return jsonResponse({ error: "只支持 POST 请求。" }, 405);
}

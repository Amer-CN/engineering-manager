/**
 * Auto-Effort Smart Hook — UserPromptSubmit (Dual-Model)
 *
 * 根据 ANTHROPIC_BASE_URL 自动选择分类模型：
 *   xiaomimimo.com → MiMo-v2.5（轻量快速）
 *   deepseek.com   → DeepSeek flash（原逻辑）
 *   其他           → 关键词兜底
 *
 * 输出 JSON 设置 thinking.budget_tokens：
 *   low → 1024   medium → 2048   high → 4096
 *
 * 日志文件：~/.claude/effort-log.jsonl
 */

const { Anthropic } = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");
const os = require("os");

const BUDGET_MAP = { low: 1024, medium: 2048, high: 4096 };
const LOG_FILE = path.join(os.homedir(), ".claude", "effort-log.jsonl");

function logClassification(prompt, effort, method, provider) {
  try {
    const entry = {
      ts: new Date().toISOString(),
      effort,
      method,
      provider,
      prompt: prompt.replace(/\n/g, " ").slice(0, 120),
    };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {}
}

// ── Provider detection ──
function detectProvider() {
  const baseURL = (process.env.ANTHROPIC_BASE_URL || "").toLowerCase();
  if (baseURL.includes("xiaomimimo")) return "mimo";
  if (baseURL.includes("deepseek")) return "deepseek";
  return "unknown";
}

// ── Model selection per provider ──
function getClassifyModel(provider) {
  switch (provider) {
    case "mimo":
      return "mimo-v2.5";
    case "deepseek":
      return process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "deepseek-v4-flash";
    default:
      return process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL || "claude-3-5-haiku-20241022";
  }
}

// ── Timeout per provider (MiMo may need more time) ──
function getTimeout(provider) {
  return provider === "mimo" ? 5000 : 3000;
}

// ── Classification prompt ──
const CLASSIFY_SYSTEM = `Classify user requests by complexity. Output ONLY JSON: {"effort":"low"} | {"effort":"medium"} | {"effort":"high"}

LOW — Cosmetic/syntactic only, zero behavior change:
- Rename, reformat, fix typos, add/remove comments, console.log, whitespace, import order, single-line style tweaks (color, border, spacing, alignment)
- Pure text/label changes with no logic impact

MEDIUM — Any real work that isn't architecture-level:
- Bug fixes of any size (including "fix X not showing" "fix X crashes")
- Adding/removing a feature, component, field, button, endpoint, IPC handler, hook
- Changing behavior: validation timing, animation params, event handling, error display, data flow within a single module
- Dependency upgrades with breaking-change checks
- Code exploration, debugging, understanding: "what does X do" "why is Y broken" "how does Z work" "look at this error"
- Contextual follow-ups to ongoing work: "still broken" "try again" "test it" "what about X"
- Writing tests, adding validation, wiring CRUD, UI layout changes, filter/search/pagination

HIGH — Deep/cross-cutting work:
- Architecture design, large-scale refactoring, system redesign, technology migration
- Performance profiling, memory leak diagnosis, concurrency/race condition analysis
- Bugs involving concurrency, race conditions, memory leaks, or data corruption
- Security audits, vulnerability assessment, permission bypass analysis
- Designing new subsystems: plugin system, sync engine, permission model, database layer

KEY RULES:
- If it changes BEHAVIOR (not just appearance), it's at least MEDIUM
- If it FIXES a bug, it's at least MEDIUM — but concurrency/race condition/memory bugs are HIGH
- If it ASKS a question about code/behavior, it's MEDIUM
- Data migration scripts that don't change architecture are MEDIUM, not HIGH
- Site-wide text/CSS/value replacement with no logic change is LOW
- Only pure formatting/renaming/typo/style is LOW
- Only system-level design/audit/optimization is HIGH`;

// ── Keyword fallback ──
const HIGH_KW = [
  "重构", "架构", "排查", "内存泄漏", "并发", "竞态", "死锁",
  "race condition", "memory leak", "architecture", "refactor",
  "deadlock", "性能优化", "安全审计", "security audit", "optimize",
  "算法", "algorithm", "设计模式", "design pattern", "系统设计",
  "大规模", "分布式", "distributed", "漏洞", "vulnerability",
  "逆向", "reverse engineer", "协议分析", "exploit",
];

const LOW_KW = [
  "格式化", "format", "注释", "comment", "typo", "拼写", "spelling",
  "rename", "重命名", "trivial", "缩进", "indent", "console.log",
  "加个日志", "修个", "小问题", "minor", "改个名字", "换个名字",
  "调整一下", "微调", "tweak", "cosmetic", "whitespace", "空白",
  "空行", "换行", "newline", "lint", "eslint", "prettier",
  "加个空格", "删除一行", "去掉",
];

function classifyByKeywords(text) {
  const lower = text.toLowerCase();
  for (const kw of HIGH_KW) {
    if (lower.includes(kw.toLowerCase())) return "high";
  }
  for (const kw of LOW_KW) {
    if (lower.includes(kw.toLowerCase())) return "low";
  }
  return "medium";
}

// ── Extract the last user message from the request payload ──
function extractLastUserMessage(request) {
  const messages = request?.messages;
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg?.role !== "user") continue;
    const content = msg.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .filter((b) => b?.type === "text")
        .map((b) => b.text)
        .join("\n");
    }
  }
  return "";
}

// ── AI classifier (adaptive timeout) ──
async function classifyWithAI(text, apiKey, provider) {
  if (!text || text.length < 4) return null;

  const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const client = new Anthropic({ apiKey, baseURL });
  const truncated = text.length > 2000 ? text.slice(0, 2000) : text;

  const timeoutMs = getTimeout(provider);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("classify_timeout")), timeoutMs)
  );

  const model = getClassifyModel(provider);
  const apiCall = client.messages.create({
    model,
    max_tokens: 50,
    system: CLASSIFY_SYSTEM,
    messages: [{ role: "user", content: truncated }],
  });

  try {
    const response = await Promise.race([apiCall, timeout]);
    const body = response.content?.[0]?.text || "";
    const m = body.match(/\{"effort"\s*:\s*"(low|medium|high)"\}/);
    if (m) return m[1];
    if (body.includes("high")) return "high";
    if (body.includes("low")) return "low";
    if (body.includes("medium")) return "medium";
    return null;
  } catch {
    return null;
  }
}

// ── Read stdin with a 5-second safety timeout ──
function readStdin() {
  return new Promise((resolve) => {
    const chunks = [];
    const timer = setTimeout(() => resolve(""), 5000);
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    process.stdin.on("error", () => {
      clearTimeout(timer);
      resolve("");
    });
  });
}

// ── Main ──
async function main() {
  const stdin = await readStdin();
  if (!stdin.trim()) {
    console.log("{}");
    return;
  }

  let request;
  try {
    request = JSON.parse(stdin);
  } catch {
    console.log("{}");
    return;
  }

  const userText = extractLastUserMessage(request);
  const provider = detectProvider();

  let effort = "medium";
  let method = "default";
  if (userText) {
    const apiKey = process.env.ANTHROPIC_AUTH_TOKEN;
    if (apiKey) {
      const aiResult = await classifyWithAI(userText, apiKey, provider);
      if (aiResult) {
        effort = aiResult;
        method = "ai";
      } else {
        effort = classifyByKeywords(userText);
        method = "keyword";
      }
    } else {
      effort = classifyByKeywords(userText);
      method = "keyword";
    }
  }

  logClassification(userText, effort, method, provider);

  console.log(
    JSON.stringify({
      thinking: { type: "enabled", budget_tokens: BUDGET_MAP[effort] },
    })
  );
}

main().catch(() => console.log("{}"));

// .llm-matrix/gates/scripts/gate3-bridge-orphan.mjs (v4)
// 门禁3：Bridge 孤儿方法 — [DEAD] 可删 / [MISROUTED] 路径写错 / [UNWIRED] 待接线
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const dead = [];
const misrouted = [];
const unwired = [];

// M: 按行解析 tauriAPI 对象，方法名 + 其自身块内的第一个 apiClient 路由
const bridgePath = join(ROOT, 'src/services/tauri-bridge.ts');
const bridgeLines = readFileSync(bridgePath, 'utf-8').split('\n');
const M = [];

let currentMethod = null;
for (let i = 0; i < bridgeLines.length; i++) {
  const line = bridgeLines[i];
  const defMatch = line.match(/^\s+(\w+):\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/);
  if (defMatch) {
    if (currentMethod) M.push(currentMethod);
    currentMethod = { name: defMatch[1], route: null, line: i + 1 };
    const inlineMatch = line.match(/apiClient\.(?:get|post|put|del)[^(]*\(['"`]([^'"`]+)['"`]/);
    if (inlineMatch) currentMethod.route = inlineMatch[1];
    continue;
  }
  if (currentMethod && !currentMethod.route) {
    const apiMatch = line.match(/apiClient\.(?:get|post|put|del)[^(]*\(['"`]([^'"`]+)['"`]/);
    if (apiMatch) currentMethod.route = apiMatch[1];
  }
  if (line.trim().startsWith('};') || line.trim() === '}') {
    if (currentMethod) M.push(currentMethod);
    currentMethod = null;
  }
}
if (currentMethod) M.push(currentMethod);
const MwithRoute = M.filter(m => m.route);

// R: 后端全部注册路由
const endpointsDir = join(ROOT, 'EngineeringManager.Api/Endpoints');
const R = [];
const routePatterns = ['MapGet','MapPost','MapPut','MapDelete','MapPatch'];
for (const file of readdirSync(endpointsDir).filter(f => f.endsWith('.cs'))) {
  const content = readFileSync(join(endpointsDir, file), 'utf-8');
  for (const pattern of routePatterns) {
    const matches = content.matchAll(new RegExp(`${pattern}\\("([^"]+)"`, 'g'));
    for (const match of matches) {
      R.push({ route: match[1], file, method: pattern.replace('Map','').toUpperCase() });
    }
  }
}

// U: 前端调用次数（排除 tauri-bridge.ts 自身定义 + api-adapter mock 桩 + 类型声明）
const U = {};
const Ucalls = {}; // 调用位置
const srcDir = join(ROOT, 'src');
const EXCLUDE_FILES = ['tauri-bridge.ts', 'api-adapter.ts', 'electron.d.ts'];
function walkDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('__tests__')) {
      walkDir(p);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (EXCLUDE_FILES.includes(entry.name)) continue;
      const content = readFileSync(p, 'utf-8');
      const lines = content.split('\n');
      for (const method of MwithRoute) {
        // 只统计调用形态：api.getProjects( 或 .methodName(
        const re = new RegExp(`\\.${method.name}\\s*\\(`, 'g');
        let m;
        while ((m = re.exec(content)) !== null) {
          const lineNo = content.slice(0, m.index).split('\n').length;
          const line = lines[lineNo - 1].trim();
          // 排除 import / 类型声明 / 注释 / mock 桩定义
          if (line.startsWith('import') || line.startsWith('*') || line.startsWith('//') || line.includes('electron.d.ts')) continue;
          if (line.includes('async () =>') || line.includes('=> ({ success')) continue; // mock 桩
          U[method.name] = (U[method.name] || 0) + 1;
          if (!Ucalls[method.name]) Ucalls[method.name] = [];
          Ucalls[method.name].push(`${p.replace(ROOT + '/', '')}:${lineNo}`);
        }
      }
    }
  }
}
walkDir(srcDir);

// 规范化路由
function normalizeRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, '{*}').replace(/\{[^}]+\}/g, '{*}').replace(/\/\//g, '/').replace(/\/+$/, '');
}
function segments(route) {
  return normalizeRoute(route).split('/').filter(Boolean);
}

const RSet = new Set();
for (const r of R) RSet.add(normalizeRoute(r.route));

// 判定
for (const method of MwithRoute) {
  const normRoute = normalizeRoute(method.route);
  if (RSet.has(normRoute)) {
    // 路由存在：看调用次数 → UNWIRED
    const calls = U[method.name] || 0;
    if (calls === 0) {
      unwired.push({ name: method.name, route: method.route, reason: '后端路由健在但前端零调用（功能未接线）' });
    }
    continue;
  }
  // 路由不存在：查 MISROUTED（共享最后 1-2 个 segment 或 HTTP 方法 + 相近资源名）
  const bridgeSegs = segments(method.route);
  const bridgeMethod = guessHttpMethod(method, bridgePath);
  const candidates = [];
  for (const r of R) {
    const rSegs = segments(r.route);
    // 共享最后 1-2 个 segment
    const sharedLast = countSharedLastSegments(bridgeSegs, rSegs);
    if (sharedLast >= 1 && bridgeMethod === r.method) {
      candidates.push({ route: r.route, file: r.file, sharedLast });
    }
  }
  if (candidates.length > 0) {
    // 取共享最多者
    candidates.sort((a, b) => b.sharedLast - a.sharedLast);
    misrouted.push({
      name: method.name, route: method.route, calls: U[method.name] || 0,
      candidates: candidates.slice(0, 3).map(c => `${c.route} (${c.file})`)
    });
  } else {
    dead.push({ name: method.name, route: method.route, calls: U[method.name] || 0, reason: '后端无相关端点' });
  }
}

function guessHttpMethod(method, bridgePath) {
  const content = readFileSync(bridgePath, 'utf-8');
  const idx = content.indexOf(method.name);
  const slice = content.slice(idx, idx + 400);
  if (/apiClient\.(get|post|put|del)/.test(slice)) {
    const m = slice.match(/apiClient\.(get|post|put|del)/);
    return m[1].toUpperCase();
  }
  return 'GET';
}
function countSharedLastSegments(a, b) {
  let count = 0;
  let i = a.length - 1, j = b.length - 1;
  while (i >= 0 && j >= 0) {
    if (a[i] === '{*}' || b[j] === '{*}') { i--; j--; continue; } // 通配符不算共享
    if (a[i] === b[j]) { count++; i--; j--; }
    else break;
  }
  return count;
}

console.log(`\n=== 门禁3：Bridge 孤儿方法 ===`);
console.log(`bridge 方法总数: ${M.length}（含 ${M.length - MwithRoute.length} 个无 API 路由的本地函数）`);
console.log(`后端路由数: ${R.length}`);
console.log(`[DEAD] ${dead.length} 条（后端无相关端点，可安全删除）`);
for (const d of dead) console.log(`  DEAD: "${d.name}" → "${d.route}" (调用 ${d.calls} 次)`);
console.log(`[MISROUTED] ${misrouted.length} 条（路径写错，后端有语义等价端点）`);
for (const m2 of misrouted) {
  console.log(`  MISROUTED: "${m2.name}" → "${m2.route}" (调用 ${m2.calls} 次)`);
  for (const c of m2.candidates) console.log(`    候选: ${c}`);
}
console.log(`[UNWIRED] ${unwired.length} 条（后端路由健在，前端零调用，禁止删除）`);
for (const u of unwired) console.log(`  UNWIRED: "${u.name}" → "${u.route}"`);
process.exit(0); // 报告型，不阻断
// 扫描 STUB 端点：已注册但方法体无 db 调用 / 只返回硬编码零值
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const endpointsDir = join(ROOT, 'EngineeringManager.Api/Endpoints');
const stubs = [];

for (const file of readdirSync(endpointsDir).filter(f => f.endsWith('.cs'))) {
  const content = readFileSync(join(endpointsDir, file), 'utf-8');
  const lines = content.split('\n');

  // 找 MapGet/MapPost/MapPut/MapDelete 注册
  const routeRE = /Map(Get|Post|Put|Delete|Patch)\("([^"]+)"/;
  for (let i = 0; i < lines.length; i++) {
    const rm = lines[i].match(routeRE);
    if (!rm) continue;
    const method = rm[1].toUpperCase();
    const route = rm[2];
    const startLine = i;

    // 找端点方法体（到下一个 MapXxx 或 Endpoint 注册函数结束）
    let body = '';
    let depth = 0;
    let started = false;
    let endLine = Math.min(i + 60, lines.length);
    for (let j = i; j < endLine; j++) {
      const line = lines[j];
      body += line + '\n';
      for (const ch of line) {
        if (ch === '{') { depth++; started = true; }
        if (ch === '}') {
          depth--;
          if (started && depth === 0) { endLine = j; break; }
        }
      }
      if (started && depth === 0) break;
      // 下一个路由注册点终止
      if (j > i && routeRE.test(line) && depth === 0) { endLine = j; break; }
    }
    body = lines.slice(startLine, endLine + 1).join('\n');
    const clean = body.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const hasDbCall = /db\.(Execute|Query|ExecuteScalar|QueryAsync|ExecuteAsync)/.test(clean);
    const hasFsCall = /(Directory|File)\./.test(clean); // 文件系统逻辑不算 STUB
    const hasHardcodedZero = /return\s+Common\.Ok\(new\s*\{\s*[^}]*\b(count|created|updated|saved|deleted)\s*=\s*0\b/.test(clean) 
      || /return\s+Common\.Ok\(new\s*\{\s*[^}]*=\s*0\s*\}/.test(clean);
    const returnsEmptyArray = /return\s+Common\.Ok\((Array\.Empty<object>\(\)|new\s*\[\s*\]|new List<[^>]+>\(\))\)/.test(clean);

    if (!hasDbCall && !hasFsCall && (hasHardcodedZero || returnsEmptyArray || /return\s+Common\.Ok\(new\s*\{\s*count\s*=\s*0\s*\}\)/.test(clean))) {
      stubs.push({ file, line: startLine + 1, method, route });
    }
  }
}

// 去重
const seen = new Set();
const uniqueStubs = stubs.filter(s => {
  const k = `${s.file}:${s.route}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

// 前端调用情况
const bridgePath = join(ROOT, 'src/services/tauri-bridge.ts');
const bridgeContent = existsSync(bridgePath) ? readFileSync(bridgePath, 'utf-8') : '';
const srcDir = join(ROOT, 'src');
const frontendCalls = {}; // route -> [file:line]

function walkDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('__tests__')) walkDir(p);
    else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      if (['tauri-bridge.ts', 'api-adapter.ts', 'electron.d.ts'].includes(entry.name)) continue;
      const content = readFileSync(p, 'utf-8');
      const lines = content.split('\n');
      for (const stub of uniqueStubs) {
        // 找 bridge 方法名 → 再找前端调用
        const bridgeLines = bridgeContent.split('\n');
        for (let bi = 0; bi < bridgeLines.length; bi++) {
          const bm = bridgeLines[bi].match(/^\s+(\w+):\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)/);
          if (!bm) continue;
          // 检查该方法是否请求 stub.route
          let block = '';
          for (let bj = bi + 1; bj < Math.min(bi + 5, bridgeLines.length); bj++) {
            block += bridgeLines[bj] + '\n';
            if (bridgeLines[bj].match(/^\s+\w+:\s*(?:async\s*)?\(/)) break; // 下一个方法
          }
          if (!block.includes(stub.route)) continue;
          const methodName = bm[1];
          const re = new RegExp(`\\.${methodName}\\s*\\(`, 'g');
          let m;
          while ((m = re.exec(content)) !== null) {
            const lineNo = content.slice(0, m.index).split('\n').length;
            const line = lines[lineNo - 1].trim();
            if (line.startsWith('import') || line.startsWith('*') || line.startsWith('//')) continue;
            if (!frontendCalls[stub.route]) frontendCalls[stub.route] = [];
            frontendCalls[stub.route].push(`${p.replace(ROOT + '/', '')}:${lineNo}`);
          }
          break;
        }
      }
    }
  }
}
walkDir(srcDir);

// 排序：前端有调用的排最前
const withCalls = uniqueStubs.filter(s => (frontendCalls[s.route] || []).length > 0);
const withoutCalls = uniqueStubs.filter(s => !(frontendCalls[s.route] || []).length);
const sorted = [...withCalls, ...withoutCalls];

let md = `# STUB 端点清单\n\n生成时间: ${new Date().toISOString()}\n总数: ${sorted.length} 条（前端有调用 ${withCalls.length} 条）\n\n`;
md += `> STUB = 端点已注册但方法体无 db 调用，或只返回硬编码零值。前端有调用的 STUB 意味着用户在用假功能，返回 HTTP 200 + 成功结构，无人察觉。\n\n`;

md += `| 路由 | 方法 | file:line | 前端调用 |\n|------|------|----------|---------|\n`;
for (const s of sorted) {
  const calls = (frontendCalls[s.route] || []);
  md += `| \`${s.route}\` | ${s.method} | \`${s.file}:${s.line}\` | ${calls.length > 0 ? calls.join('<br>') : '无' } |\n`;
}

// 详细
md += `\n## 前端有调用的 STUB（用户在用假功能）\n\n`;
for (const s of withCalls) {
  md += `### ${s.route}\n\n`;
  for (const c of (frontendCalls[s.route] || [])) md += `- 调用点: \`${c}\`\n`;
  md += '\n';
}

md += `## 其余 STUB（未接线）\n\n`;
for (const s of withoutCalls) {
  md += `- \`${s.route}\` (${s.file}:${s.line})\n`;
}

import { writeFileSync, mkdirSync } from 'fs';
mkdirSync(join(ROOT, '.llm-matrix/findings'), { recursive: true });
writeFileSync(join(ROOT, '.llm-matrix/findings/STUB-ENDPOINTS.md'), md);

console.log(`STUB 总数: ${sorted.length}`);
console.log(`前端有调用: ${withCalls.length}`);
for (const s of withCalls) console.log(`  ${s.route} ← ${(frontendCalls[s.route] || []).join(', ')}`);
// 精确扫描：foreach (var dto in records) 但循环体内 dto 完全未使用（参数缺失必崩）
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'EngineeringManager.Api/Endpoints');
const results = [];

for (const file of readdirSync(dir).filter(f => f.endsWith('.cs'))) {
  const content = readFileSync(join(dir, file), 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const foreachMatch = lines[i].match(/foreach\s*\(\s*(?:var|dynamic)\s+(\w+)\s+in\s+(\w+)\)/);
    if (!foreachMatch) continue;
    const varName = foreachMatch[1];
    const listName = foreachMatch[2];

    // 找循环体范围（遇到下一个 } 且缩进 <= foreach 缩进）
    const baseIndent = lines[i].match(/^\s*/)[0].length;
    let end = i + 1;
    let depth = 0;
    let bodyStart = -1;
    for (let j = i + 1; j < Math.min(i + 40, lines.length); j++) {
      const line = lines[j];
      if (bodyStart === -1 && line.includes('{')) { bodyStart = j; depth = 1; continue; }
      if (bodyStart === -1 && !line.trim().startsWith('//')) { bodyStart = j; break; } // 无花括号单语句
      if (bodyStart !== -1) {
        for (const ch of line) {
          if (ch === '{') depth++;
          if (ch === '}') {
            depth--;
            if (depth === 0) { end = j; break; }
          }
        }
        if (depth === 0 && end !== i + 1) break;
        if (depth === 0) { end = j; break; }
      }
    }
    if (end === i + 1) end = Math.min(i + 15, lines.length);

    // 收集循环体
    const body = lines.slice(i, end + 1).join('\n');
    // dto 使用次数（排除声明本身和注释）
    const cleanBody = body.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
    const uses = (cleanBody.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
    const hasDbCall = /db\.(Execute|Query|ExecuteScalar)/.test(cleanBody);

    if (hasDbCall && uses <= 1) { // 仅声明处出现 = 未使用
      const sqlLine = body.split('\n').find(l => /db\.(Execute|Query)/.test(l))?.trim().slice(0, 100) || '';
      results.push({ file, line: i + 1, varName, listName, uses, sqlLine });
    }
  }
}

console.log(`foreach + dto 未使用 + db 调用: ${results.length} 处`);
for (const r of results) {
  console.log(`  ${r.file}:${r.line} | dto "${r.varName}" 使用 ${r.uses} 次（仅声明）| ${r.sqlLine}`);
}
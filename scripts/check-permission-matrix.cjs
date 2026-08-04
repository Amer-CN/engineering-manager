/**
 * 工程管家 权限矩阵一致性检查（原 .llm-matrix/gates/scripts/gate1-permission-matrix.mjs，v4）
 *
 * R1 注释过滤 / R2 camelCase 资源 / R3 多调用形式 / R4 双向哨兵（A/B/C 提取数量下限，不得绕过）
 * 历史豁免：已知权限缺口（待修复，见 findings/PERMISSION-GAPS.md）——仅按权限码全等匹配（文件/行号只作线索），仍打印
 */

const { readFileSync, readdirSync } = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

// ── 历史豁免：已知权限缺口（待修复）──
// 这 4 个权限码前端在用、后端 roles 表默认授予缺失 → can() 恒 false → 功能失效（详见 findings/PERMISSION-GAPS.md）。
// 仅按权限码全等豁免；新出现的 B−C 一律照旧阻断。
// 线索（门禁行号与源文件真实行号一致）：
//   projects:export    → src/components/features/projects/ProjectFilters.tsx:61
//   contracts:export   → src/components/ContractPage.tsx:111
//   inventory:delete   → src/hooks/useInventoryPage.ts:75
//   settlement:approve → src/components/features/settlement/SettlementProjectActions.tsx:116
const LEGACY_EXEMPT = [
  { perm: 'projects:export' },
  { perm: 'contracts:export' },
  { perm: 'inventory:delete' },
  { perm: 'settlement:approve' },
];

// 绝对路径 → 相对路径（正斜杠），用于豁免匹配与展示
const toRel = (p) => String(p).split('\\').join('/').replace(/^.*?\/src\//, 'src/');

// ── R1: 剥离注释（// 行注释、/* */ 块注释、JSX {/* */}）──
function stripComments(src) {
  // 先剥 JSX 块注释 {/* ... */}（避免 /* 与 */ 误配对）
  // 用等长空格替换但保留换行：多行块注释若被压成一行，后续行号会整体前移（曾致 ProjectFilters.tsx 真实 61 报成 59）
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  // 再剥 // 行注释（仅清内容，保留空行，行号不变）
  out = out.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');
  return out;
}

// A: permissions.ts 定义的资源（R2: [A-Za-z_]+ 支持 costLedger）
const permTs = stripComments(readFileSync(path.join(ROOT, 'src/types/permissions.ts'), 'utf-8'));
const A = new Set();
const aMatch = permTs.matchAll(/^\s*\| '([A-Za-z_]+)'/gm);
for (const m of aMatch) A.add(m[1]);
const actions = ['create','read','update','delete','export','import','approve'];
const AAll = new Set();
for (const r of A) {
  for (const a of actions) AAll.add(`${r}:${a}`);
}

// C: Common.cs GetDefaultPermissions 所有角色授予的并集（失败哨兵见 R4）
const commonCs = readFileSync(path.join(ROOT, 'EngineeringManager.Api/Common.cs'), 'utf-8');
const C = new Set();
const match = commonCs.match(/GetDefaultPermissions[\s\S]*?\{([\s\S]*?)\n\s*\};/);
if (match) {
  const body = match[1];
  const permMatches = body.matchAll(/"([a-zA-Z_:]+)"/g);
  for (const m of permMatches) C.add(m[1]);
}

// B: 前端权限调用（R3: 多形式覆盖）
// 形式: can('x') / can("x") / can(`x`) / hasPermission / hasAnyPermission / hasAllPermissions
//       RequirePermission("x") / permission="x" / permission='x'
const B = new Set();
const Bdetails = [];
const dynamicPerms = []; // 反引号内含 ${} 的动态权限

function findLine(content, idx) {
  return content.slice(0, idx).split('\n').length;
}

const srcDir = path.join(ROOT, 'src');
function walkDir(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('node_modules') && !entry.name.startsWith('__tests__')) {
      walkDir(p);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      const content = stripComments(readFileSync(p, 'utf-8'));
      const lines = content.split('\n');

      // 1) can('x') / can("x") / can(`x`)
      let re = /can\s*\(\s*(['"`])([a-zA-Z_:]+)\1\s*\)/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        B.add(m[2]);
        Bdetails.push({ file: p, line: findLine(content, m.index), perm: m[2], form: 'can' });
      }
      // 2) 反引号模板含 ${} → 动态权限
      re = /can\s*\(\s*`([^`]*\$\{[^`]*`)/g;
      while ((m = re.exec(content)) !== null) {
        dynamicPerms.push({ file: p, line: findLine(content, m.index), expr: m[1] });
      }
      // 3) hasPermission('x') / hasAnyPermission('x') / hasAllPermissions('x')
      re = /has(?:Any|All)?Permissions?\s*\(\s*(['"`])([a-zA-Z_:]+)\1\s*\)/g;
      while ((m = re.exec(content)) !== null) {
        B.add(m[2]);
        Bdetails.push({ file: p, line: findLine(content, m.index), perm: m[2], form: m[0].slice(0, m[0].indexOf('(')) });
      }
      // 4) RequirePermission("x") 或 permission="x"
      re = /(?:RequirePermission|permission)\s*[=(]\s*(['"`])([a-zA-Z_:]+)\1/g;
      while ((m = re.exec(content)) !== null) {
        B.add(m[2]);
        Bdetails.push({ file: p, line: findLine(content, m.index), perm: m[2], form: 'RequirePermission/permission' });
      }
      // 5) hasPermission 数组形式: hasPermission(['a','b']) / hasAnyPermission(['a','b'])
      re = /has(?:Any|All)?Permissions?\s*\(\s*\[([^\]]+)\]/g;
      while ((m = re.exec(content)) !== null) {
        const items = m[1].matchAll(/['"`]([a-zA-Z_:]+)['"`]/g);
        for (const it of items) {
          B.add(it[1]);
          Bdetails.push({ file: p, line: findLine(content, m.index), perm: it[1], form: 'array' });
        }
      }
    }
  }
}
walkDir(srcDir);

// ── R4: 双向哨兵 ──
let sentinelFail = false;
if (C.size === 0 || C.size < 30) {
  console.error('❌ 后端权限提取器失效，GetDefaultPermissions 结构可能已变更（C 提取 < 30 条）');
  sentinelFail = true;
}
if (B.size === 0 || B.size < 5) {
  console.error('❌ 前端权限提取器失效，调用形式可能已变更（B 提取 < 5 条）');
  sentinelFail = true;
}
if (A.size === 0) {
  console.error('❌ permissions.ts 定义提取为空');
  sentinelFail = true;
}

// 判定：B−C 违反项先按 LEGACY_EXEMPT 权限码全等分流，豁免项计入 knownGaps 仍打印
const violations = [];
const knownGaps = [];
for (const p of B) {
  if (!C.has(p)) {
    const detail = Bdetails.find(d => d.perm === p);
    const relFile = detail ? toRel(detail.file) : '?';
    const line = detail ? detail.line : -1;
    const ex = LEGACY_EXEMPT.find(e => e.perm === p);
    if (ex) {
      knownGaps.push({ type: '已知缺口（待修复）', perm: p, file: relFile, line, form: detail ? detail.form : '?' });
    } else {
      violations.push({ type: 'B-C', perm: p, file: relFile, line, form: detail ? detail.form : '?' });
    }
  }
}
for (const p of B) {
  const [res] = p.split(':');
  if (!A.has(res)) {
    violations.push({ type: 'B-A', perm: p, detail: `资源 "${res}" 未在 PermissionResource 中定义` });
  }
}

console.log(`\n=== 门禁1：权限矩阵一致性 ===`);
console.log(`A(permissions.ts 资源数): ${A.size}`);
console.log(`B(前端实际调用): ${B.size}`);
console.log(`C(后端授予权限): ${C.size}`);
console.log(`动态权限(需人工确认): ${dynamicPerms.length} 条`);
for (const d of dynamicPerms) {
  const rel = d.file.replace(ROOT + '/', '');
  console.log(`  动态: ${rel}:${d.line} can(\`${d.expr.slice(0, 60)}\``);
}
console.log(`违反: ${violations.length}`);
for (const v of violations) {
  if (v.file) console.log(`  ${v.type}: ${v.perm} @ ${v.file}:${v.line} (${v.form})`);
  else console.log(`  ${v.type}: ${v.perm} (${v.detail})`);
}
console.log(`已知缺口（待修复）: ${knownGaps.length} 条`);
for (const v of knownGaps) {
  console.log(`  已知缺口: ${v.perm} @ ${v.file}:${v.line} (${v.form})`);
}

if (sentinelFail) {
  console.error('\n❌ 哨兵触发：提取器疑似失效，拒绝通过（即使违反为 0）');
  process.exit(1);
}
process.exit(violations.length > 0 ? 1 : 0);

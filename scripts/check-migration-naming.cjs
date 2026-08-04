/**
 * 工程管家 迁移文件命名规范检查（原 .llm-matrix/gates/scripts/gate2-migration-naming.mjs，v3）
 *
 * 阻断：重复数字前缀 / 命名格式不符；警告：编号跳号（不影响退出码）
 * 历史豁免：已在已部署库 schema_versions 留痕的迁移文件，不可重命名（仍打印，不静默跳过）
 */

const { readdirSync } = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const scriptsDir = path.join(ROOT, 'EngineeringManager.Api/Migrations/Scripts')

// ── 历史豁免（不可修复）──
// 以下文件已在已部署数据库的 schema_versions 表中留痕，重命名会破坏迁移历史，绝对不能改名。
// 仅豁免以下已存在文件；新增文件一律按规则阻断。
// 精确文件名全等匹配，不使用前缀或正则。
const LEGACY_EXEMPT = [
  '011_AddCreatedByToInvoicesAndPaymentRecords.sql',
  '011_AddPiiEncryptionColumns.sql',
  '032_AddAgentConversationArchive.sql',
  '032_DropExpensesTable.sql',
  '007b_AddProjectMembersCreatedAt.sql',
];
const LEGACY_EXEMPT_SET = new Set(LEGACY_EXEMPT);

const files = readdirSync(scriptsDir).filter(f => f.endsWith('.sql'));
const blockers = []; // 阻断（exit 1）
const warnings = []; // 警告（不影响退出码）

// 阻断：同一数字前缀出现多个文件（仅 \d{3}_ 形式，007b 不算撞号）
const prefixMap = {};
for (const f of files) {
  const m = f.match(/^(\d{3})_/);
  if (m) {
    if (!prefixMap[m[1]]) prefixMap[m[1]] = [];
    prefixMap[m[1]].push(f);
  }
}
for (const [prefix, names] of Object.entries(prefixMap)) {
  if (names.length > 1) {
    blockers.push({ type: '重复前缀', prefix, files: names, detail: `前缀 ${prefix} 出现 ${names.length} 次` });
  }
}

// 阻断：文件名不符合 ^\d{3}_[A-Za-z].*\.sql$
const namingRE = /^\d{3}_[A-Za-z].*\.sql$/;
for (const f of files) {
  if (!namingRE.test(f)) {
    blockers.push({ type: '命名格式', file: f, detail: `文件名 "${f}" 不符合 ^\\d{3}_[A-Za-z].*\\.sql$` });
  }
}

// 警告：编号序列有跳号（不影响迁移执行顺序）
const numbers = Object.keys(prefixMap).map(Number).sort((a, b) => a - b);
let expected = 1;
for (const n of numbers) {
  while (expected < n) {
    warnings.push({ type: '跳号', prefix: String(expected).padStart(3, '0'), detail: `缺少编号 ${String(expected).padStart(3, '0')}` });
    expected++;
  }
  expected = n + 1;
}

// 判定：剔除历史豁免（精确文件名全等匹配），豁免项不计入阻断但仍逐文件打印
const realBlockers = [];
const legacyExempt = [];
for (const b of blockers) {
  const filesInvolved = b.files || [b.file];
  if (filesInvolved.every(f => LEGACY_EXEMPT_SET.has(f))) {
    for (const f of filesInvolved) legacyExempt.push({ file: f, detail: b.detail });
  } else {
    realBlockers.push(b);
  }
}

console.log(`\n=== 门禁2：迁移编号规范 ===`);
console.log(`迁移文件数: ${files.length}`);
console.log(`[阻断] ${realBlockers.length} 条`);
for (const v of realBlockers) {
  if (v.files) console.log(`  阻断: ${v.detail} (${v.files.join(', ')})`);
  else console.log(`  阻断: ${v.detail}`);
}
console.log(`[历史豁免（不可修复）] ${legacyExempt.length} 条`);
for (const v of legacyExempt) {
  console.log(`  历史豁免（不可修复）: ${v.file} (${v.detail})`);
}
console.log(`[警告] ${warnings.length} 条`);
for (const v of warnings) {
  console.log(`  警告: ${v.detail}`);
}
process.exit(realBlockers.length > 0 ? 1 : 0); // 仅阻断项影响退出码

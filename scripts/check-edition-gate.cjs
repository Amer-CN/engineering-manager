#!/usr/bin/env node
/**
 * check-edition-gate.cjs — M-EDITION1 X8.5 门禁
 *
 * 规则：除 EditionFeatures.cs 和 editionStore.ts 自身外，
 * 全库出现 IsPersonal / IsEnterprise / useIsPersonal / useIsEnterprise 直接判断即 HARD FAIL。
 *
 * 用法：node scripts/check-edition-gate.cjs
 * 退出码：0=通过，1=违规
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 允许包含这些模式的文件（映射表自身）
const ALLOWED_FILES = [
  'EditionFeatures.cs',
  'editionStore.ts',
  'check-edition-gate.cjs',  // 本脚本自身
];

// 禁止的模式
const FORBIDDEN_PATTERNS = [
  /ApiConfig\.IsPersonal/,
  /ApiConfig\.IsEnterprise/,
  /useIsPersonal/,
  /useIsEnterprise/,
];

// 扫描范围
const SCAN_DIRS = [
  'EngineeringManager.Api',
  'EngineeringManager.Tests',
  'src',
];

const SKIP_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git']);
const SCAN_EXTS = new Set(['.cs', '.ts', '.tsx']);

/** 纯 fs 递归收集文件，不走 shell */
function collectFiles(dir) {
  const results = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return results; }
  for (const ent of entries) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      results.push(...collectFiles(full));
    } else if (SCAN_EXTS.has(path.extname(ent.name))) {
      results.push(full);
    }
  }
  return results;
}

let violations = [];

for (const dir of SCAN_DIRS) {
  const files = collectFiles(path.join(ROOT, dir));
  for (const file of files) {
    const basename = path.basename(file);
    if (ALLOWED_FILES.some(a => basename === a)) continue;

    let content;
    try { content = fs.readFileSync(file, 'utf-8'); } catch { continue; }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const pat of FORBIDDEN_PATTERNS) {
        if (pat.test(lines[i])) {
          const rel = path.relative(ROOT, file);
          violations.push(`${rel}:${i + 1}  ${lines[i].trim()}`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('❌ HARD FAIL: edition 门禁违规（禁止直接使用 IsPersonal/IsEnterprise/useIsPersonal）');
  console.error('   业务代码必须通过 EditionFeatures.Has(key)（后端）或 useHasFeature(key)（前端）判断能力。');
  console.error('');
  violations.forEach(v => console.error('  ' + v));
  console.error(`\n共 ${violations.length} 处违规。`);
  process.exit(1);
} else {
  console.log('✅ edition 门禁通过：无 IsPersonal/IsEnterprise 直接判断泄漏。');
  process.exit(0);
}

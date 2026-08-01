#!/usr/bin/env node
/**
 * check-edition-gate.cjs — M-EDITION1 X8.5 门禁
 *
 * 规则：除豁免文件外，全库出现 IsPersonal / IsEnterprise / useIsPersonal / useIsEnterprise
 * 直接判断即 HARD FAIL。
 *
 * 用法：node scripts/check-edition-gate.cjs
 * 退出码：0=通过，1=违规
 *
 * 扫描范围：EngineeringManager.Api, EngineeringManager.Tests, src, scripts, e2e
 * 豁免：EditionFeatures.cs, editionStore.ts, check-edition-gate.cjs（按相对路径精确匹配）
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 豁免文件（相对路径精确匹配，不按 basename）
const ALLOWED_FILES = [
  'EngineeringManager.Api/EditionFeatures.cs',
  'src/store/editionStore.ts',
  'scripts/check-edition-gate.cjs',
  'scripts/__tests__/check-edition-gate.test.cjs',
];

// 禁止的模式（含不带 ApiConfig. 前缀的裸形式）
const FORBIDDEN_PATTERNS = [
  /ApiConfig\.IsPersonal/,
  /ApiConfig\.IsEnterprise/,
  /useIsPersonal/,
  /useIsEnterprise/,
  /\bIsPersonal\b/,
  /\bIsEnterprise\b/,
  /\bisPersonal\b/,
  /\bisEnterprise\b/,
];

// 扫描范围
const SCAN_DIRS = [
  'EngineeringManager.Api',
  'EngineeringManager.Tests',
  'src',
  'scripts',
  'e2e',
];

const SKIP_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git']);
const SCAN_EXTS = new Set(['.cs', '.ts', '.tsx', '.cjs', '.mjs']);

/** 纯 fs 递归收集文件 */
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
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    // 相对路径精确匹配豁免
    if (ALLOWED_FILES.includes(rel)) continue;

    let content;
    try { content = fs.readFileSync(file, 'utf-8'); } catch { continue; }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      for (const pat of FORBIDDEN_PATTERNS) {
        if (pat.test(lines[i])) {
          violations.push(`${rel}:${i + 1}  ${lines[i].trim()}`);
        }
      }
    }
  }
}

if (violations.length > 0) {
  console.error('HARD FAIL: edition gate violations (IsPersonal/IsEnterprise/useIsPersonal/isPersonal)');
  console.error('Business code must use EditionFeatures.Has(key) (backend) or useHasFeature(key) (frontend).');
  console.error('');
  violations.forEach(v => console.error('  ' + v));
  console.error(`\nTotal: ${violations.length} violation(s).`);
  process.exit(1);
} else {
  console.log('edition gate passed: no IsPersonal/IsEnterprise leaks.');
  process.exit(0);
}

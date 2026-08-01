#!/usr/bin/env node
/**
 * check-feature-keys.cjs — 前后端能力键一致性检查
 *
 * 解析后端 EditionFeatures.cs 的 AllFeatureKeys 常量定义
 * 与前端 src/constants/editionFeatures.ts 的 EDITION_FEATURE_KEYS 值，
 * 集合不等则 exit 1。
 *
 * 保证方向：后端多前端少 → 红；前端多后端少 → 红。
 * 接进 npm run check 链路，CI 中自动执行。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// 解析后端：从 EditionFeatures.cs 提取 AllFeatureKeys 的常量值
function parseBackendKeys() {
  const file = path.join(ROOT, 'EngineeringManager.Api', 'EditionFeatures.cs');
  const content = fs.readFileSync(file, 'utf-8');

  // 找到 AllFeatureKeys 的定义区域（ImmutableArray.Create(...)）
  const createMatch = content.match(/AllFeatureKeys\s*=\s*[\s\S]*?ImmutableArray\.Create\(\s*([\s\S]*?)\);/);
  if (!createMatch) {
    console.error('FAIL: cannot find AllFeatureKeys definition in EditionFeatures.cs');
    process.exit(1);
  }

  // 提取常量名（如 UserManagement, RoleManagement 等）
  const constNames = createMatch[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('//'));

  // 从常量定义中取实际字符串值
  const keys = new Set();
  for (const name of constNames) {
    const re = new RegExp(`public\\s+const\\s+string\\s+${name}\\s*=\\s*"([^"]+)"`);
    const m = content.match(re);
    if (m) {
      keys.add(m[1]);
    } else {
      console.error(`FAIL: cannot find const string ${name} value in EditionFeatures.cs`);
      process.exit(1);
    }
  }
  return keys;
}

// 解析前端：从 editionFeatures.ts 的 EDITION_FEATURE_KEYS 对象块内提取值
function parseFrontendKeys() {
  const file = path.join(ROOT, 'src', 'constants', 'editionFeatures.ts');
  const content = fs.readFileSync(file, 'utf-8');

  // 21.2: 先定位 EDITION_FEATURE_KEYS = { ... } 块，只在块内提取
  const blockMatch = content.match(/EDITION_FEATURE_KEYS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/);
  if (!blockMatch) {
    console.error('FAIL: cannot find EDITION_FEATURE_KEYS block in editionFeatures.ts');
    process.exit(1);
  }
  const block = blockMatch[1];

  // 在块内提取值（兼容单引号/双引号/反引号）
  const keys = new Set();
  const re = /:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    keys.add(m[1]);
  }

  if (keys.size === 0) {
    console.error('FAIL: cannot extract any keys from EDITION_FEATURE_KEYS block');
    process.exit(1);
  }
  return keys;
}

// 比较
const backend = parseBackendKeys();
const frontend = parseFrontendKeys();

const onlyBackend = [...backend].filter(k => !frontend.has(k));
const onlyFrontend = [...frontend].filter(k => !backend.has(k));

if (onlyBackend.length > 0 || onlyFrontend.length > 0) {
  console.error('HARD FAIL: frontend-backend feature key mismatch');
  if (onlyBackend.length > 0) {
    console.error(`  Backend has but frontend missing: ${onlyBackend.join(', ')}`);
  }
  if (onlyFrontend.length > 0) {
    console.error(`  Frontend has but backend missing: ${onlyFrontend.join(', ')}`);
  }
  console.error(`  Backend keys (${backend.size}): ${[...backend].sort().join(', ')}`);
  console.error(`  Frontend keys (${frontend.size}): ${[...frontend].sort().join(', ')}`);
  process.exit(1);
}

console.log(`feature-keys check passed: ${backend.size} keys in sync (backend == frontend)`);
process.exit(0);

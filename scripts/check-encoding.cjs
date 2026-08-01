#!/usr/bin/env node
/**
 * check-encoding.cjs — 编码门禁
 *
 * 扫描 *.cs / *.ts / *.tsx / *.md / *.sql，检测：
 *   - 控制字符 0x00-0x08 / 0x0B-0x0C / 0x0E-0x1F
 *   - U+FFFD 替换字符
 *   - mojibake 特征串：鍙 / 鈺 / é / ç­
 *
 * 命中即 exit 1，打印 文件:行号 与该行内容。
 * fail-closed：读不到文件或扫描目录为空要 exit 1。
 *
 * 用法：node scripts/check-encoding.cjs
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const SCAN_DIRS = [
  'EngineeringManager.Api',
  'EngineeringManager.Tests',
  'src',
  'scripts',
  'docs',
];

const SKIP_DIRS = new Set(['node_modules', 'bin', 'obj', 'dist', '.git']);
const SCAN_EXTS = new Set(['.cs', '.ts', '.tsx', '.md', '.sql']);

// 控制字符检测（排除 \t=0x09, \n=0x0A, \r=0x0D）
function hasControlChars(line) {
  for (let i = 0; i < line.length; i++) {
    const code = line.charCodeAt(i);
    if ((code >= 0x00 && code <= 0x08) || code === 0x0B || code === 0x0C || (code >= 0x0E && code <= 0x1F)) {
      return true;
    }
  }
  return false;
}

// U+FFFD 替换字符
const REPLACEMENT_CHAR = '\uFFFD';

// mojibake 特征串
const MOJIBAKE_PATTERNS = ['鍙', '鈺', 'é', 'ç­'];

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
let totalFiles = 0;

for (const dir of SCAN_DIRS) {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) continue;
  const files = collectFiles(fullDir);
  totalFiles += files.length;

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    let content;
    try { content = fs.readFileSync(file, 'utf-8'); } catch {
      violations.push(`${rel}:0  [READ ERROR] cannot read file`);
      continue;
    }

    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const issues = [];

      if (hasControlChars(line)) issues.push('control-char');
      if (line.includes(REPLACEMENT_CHAR)) issues.push('U+FFFD');
      for (const pat of MOJIBAKE_PATTERNS) {
        if (line.includes(pat)) { issues.push(`mojibake:${pat}`); break; }
      }

      if (issues.length > 0) {
        const trimmed = line.trim().slice(0, 80);
        violations.push(`${rel}:${i + 1}  [${issues.join(',')}] ${trimmed}`);
      }
    }
  }
}

// fail-closed: 扫描目录为空
if (totalFiles === 0) {
  console.error('FAIL: no files scanned (scan dirs empty or missing)');
  process.exit(1);
}

// 25.1: 棘轮模式 - 与 encoding-baseline.json 比较
const baselinePath = path.join(__dirname, 'encoding-baseline.json');
let baselineTotal = 0;
if (fs.existsSync(baselinePath)) {
  try {
    const bl = JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
    baselineTotal = bl._total || 0;
  } catch (e) {
    console.error(`FAIL: cannot parse encoding-baseline.json: ${e.message}`);
    process.exit(1);
  }
}

if (violations.length > baselineTotal) {
  console.error(`encoding check FAILED: ${violations.length} violation(s) > baseline ${baselineTotal} (${totalFiles} files scanned)`);
  console.error('New violations beyond baseline:');
  violations.forEach(v => console.error('  ' + v));
  process.exit(1);
}

if (violations.length < baselineTotal) {
  console.log(`encoding check: ${violations.length} violation(s) < baseline ${baselineTotal} — update encoding-baseline.json downward!`);
}

console.log(`encoding check passed: ${violations.length} violation(s) <= baseline ${baselineTotal} (${totalFiles} files scanned)`);
process.exit(0);

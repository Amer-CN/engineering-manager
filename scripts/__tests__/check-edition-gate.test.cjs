#!/usr/bin/env node
/**
 * check-edition-gate.test.cjs — 门禁用效性外部测试
 *
 * 流程：
 * 1. 往真实被扫描的源文件追加一行违规代码
 * 2. child_process 执行 node scripts/check-edition-gate.cjs
 * 3. 断言退出码 === 1 且 stderr 含该文件路径
 * 4. finally 还原文件
 * 5. 再跑一次，断言退出码 === 0
 *
 * 用法：node scripts/__tests__/check-edition-gate.test.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(ROOT, 'scripts', 'check-edition-gate.cjs');
// 选一个真实被扫描的文件（在 SCAN_DIRS 内，不在 ALLOWED_FILES 内）
const TARGET = path.join(ROOT, 'EngineeringManager.Api', 'Common.cs');

function runGate() {
  try {
    execSync(`node "${GATE}"`, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    return { code: 0, output: '' };
  } catch (e) {
    return { code: e.status, output: (e.stderr || '') + (e.stdout || '') };
  }
}

// 保存原始内容
const original = fs.readFileSync(TARGET, 'utf-8');

try {
  // Step 1: 追加违规行
  fs.appendFileSync(TARGET, '\n// TEST_VIOLATION: bool x = ApiConfig.IsPersonal;\n');

  // Step 2+3: 门禁必须失败
  const result1 = runGate();
  if (result1.code !== 1) {
    console.error(`FAIL: expected exit 1 after planting violation, got ${result1.code}`);
    process.exit(1);
  }
  if (!result1.output.includes('Common.cs')) {
    console.error('FAIL: stderr does not mention Common.cs');
    process.exit(1);
  }
  console.log('PASS: gate detects planted violation (exit 1, mentions file)');

} finally {
  // Step 4: 还原
  fs.writeFileSync(TARGET, original);
}

// Step 5: 还原后门禁必须通过
const result2 = runGate();
if (result2.code !== 0) {
  console.error(`FAIL: expected exit 0 after restore, got ${result2.code}`);
  console.error(result2.output);
  process.exit(1);
}
console.log('PASS: gate passes after restore (exit 0)');
console.log('ALL GATE TESTS PASSED');

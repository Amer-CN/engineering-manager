#!/usr/bin/env node
/**
 * check-edition-gate.test.cjs — 门禁用效性外部测试
 *
 * 流程：
 * 1. 在 src/ 下创建临时探针文件（扫描范围内，不参与 dotnet build）
 * 2. child_process 执行 node scripts/check-edition-gate.cjs
 * 3. 断言退出码 === 1 且输出含探针文件路径
 * 4. finally 删除探针文件（无论成功失败）
 * 5. 再跑一次，断言退出码 === 0
 *
 * 用法：node scripts/__tests__/check-edition-gate.test.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const GATE = path.join(ROOT, 'scripts', 'check-edition-gate.cjs');
// 临时探针：在 src/ 下（SCAN_DIRS 内），不在 ALLOWED_FILES 内，不参与 dotnet build
const PROBE = path.join(ROOT, 'src', '__gate_probe.tmp.ts');

function runGate() {
  try {
    const stdout = execSync(`node "${GATE}"`, { cwd: ROOT, encoding: 'utf-8', stdio: 'pipe' });
    return { code: 0, output: stdout };
  } catch (e) {
    return { code: e.status, output: (e.stderr || '') + (e.stdout || '') };
  }
}

// 18.1(a): 不在 try 内 process.exit，先存结果，finally 清理后统一退出
let failure = null;

try {
  // Step 1: 创建探针文件（含违规代码）
  fs.writeFileSync(PROBE, 'export const x = ApiConfig.IsPersonal;\n');

  // Step 2+3: 门禁必须失败
  const result1 = runGate();
  if (result1.code !== 1) {
    failure = `FAIL: expected exit 1 after planting violation, got ${result1.code}`;
  } else if (!result1.output.includes('__gate_probe.tmp.ts')) {
    failure = `FAIL: output does not mention probe file. Output: ${result1.output.slice(0, 200)}`;
  } else {
    console.log('PASS: gate detects planted violation (exit 1, mentions probe)');
  }

} finally {
  // Step 4: 无论成功失败，删除探针
  try { fs.unlinkSync(PROBE); } catch {}
}

// 失败则退出（探针已清理）
if (failure) {
  console.error(failure);
  process.exit(1);
}

// Step 5: 探针删除后门禁必须通过
const result2 = runGate();
if (result2.code !== 0) {
  console.error(`FAIL: expected exit 0 after probe removal, got ${result2.code}`);
  console.error(result2.output.slice(0, 300));
  process.exit(1);
}
console.log('PASS: gate passes after probe removal (exit 0)');
console.log('ALL GATE TESTS PASSED');

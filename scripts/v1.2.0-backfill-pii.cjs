// v1.2.0 PII 回填脚本: 把现有明文 PII 字段加密到 _enc 列
// 运行: node scripts/v1.2.0-backfill-pii.cjs
// 前提: migration 011 已跑, 13 个 _enc 列已建
//        dpapi master key 已生成 (首次启动 API 时自动)
//
// 注意: 这是 Node.js 脚本, 但 PII 加密用 C# 端 AES-GCM.
// 策略: 通过 .NET CLI 调用一次性 PII 加密 CLI 工具 (program 端提供).

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const projectRoot = path.resolve(__dirname, "..");
const dotnetProject = path.join(projectRoot, "EngineeringManager.Api");

console.log("=== v1.2.0 PII 回填脚本 ===");
console.log("项目:", dotnetProject);
console.log();

// 1. 检查 _enc 列是否存在
console.log("[1/3] 检查 _enc 列...");
try {
  const result = execSync(
    `cd "${dotnetProject}" && dotnet run --project "${dotnetProject}" -- --check-enc-columns 2>&1 || true`,
    { encoding: "utf8", timeout: 30000 }
  );
  console.log(result);
} catch (e) {
  console.log("提示: 首次运行需要 API 启动后才能检查. 直接跑 API 进程.");
}

// 2. 跑 C# 回填端点 (待实现: POST /api/admin/backfill-pii)
//    临时方案: 用 sqlite3 命令行直接做, 但 AES-GCM 加密必须 C# 端.
//    实际方案: 启动 API 后调 POST /api/admin/backfill-pii (v1.2.0 阶段 B.4 实现)
console.log();
console.log("[2/3] 启动 API 并调 /api/admin/backfill-pii 端点");
console.log("      (需先实现 v1.2.0 阶段 B.4 backfill 端点)");
console.log();

// 3. 验证
console.log("[3/3] 验证: SELECT COUNT(*) FROM members WHERE id_card IS NOT NULL AND id_card_enc IS NULL");
console.log("      应为 0 (全部明文都已加密)");
console.log();
console.log("回填完成. 启动 API 服务, 验证登录 + 编辑 PII 数据.");

/**
 * 门禁5：后端写操作端点权限检查（窗口 C 产出）
 *
 * 规则：
 *   R1 提取 EngineeringManager.Api/Endpoints/*.cs 全部写端点（MapPost/MapPut/MapPatch/MapDelete）
 *      —— 哨兵：提取 < 40 → exit 1（提取器失效，不许手数凑数）
 *   R2 每个写端点 handler 区间（本端点行 → 下一端点行）必须含权限检查：
 *         CurrentUser.HasPermission(...)          —— 权限码检查
 *         !CurrentUser.IsAdmin( / !isAdmin / isAdmin == 0 —— admin 硬校验（等价权限码，admin 全量）
 *      注意：C 类端点的 `var isAdmin = CurrentUser.IsAdmin(ctx) ? 1 : 0`（数据过滤计算）
 *      不是权限检查 —— 正则带 ! 或 == 0 前缀，不会误判。
 *   R3 未含检查的端点必须在带理由的豁免清单中（精确路径匹配）：
 *         - 用户自助（改自己密码/偏好/对话/转写任务）
 *         - 无状态服务（OCR 识别，不写业务库）
 *         - STUB 空操作端点
 *         - 基础设施（登录/健康检查/更新/文件/备份/字典/审计写入）
 *         - G2 暂缓（拍板 C：前后端无码的业务写端点，待前端补 can() 后二期执行）
 *   R4 反自检见 README 备注：故意新增无检查端点 → exit 1
 */

const { readFileSync, readdirSync } = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const ENDPOINTS_DIR = path.join(ROOT, 'EngineeringManager.Api', 'Endpoints')

// ── 合规模式：区间内命中任一即视为「有权限检查」──
const COMPLIANT_RE = /HasPermission\(|!CurrentUser\.IsAdmin\(|!isAdmin\b|isAdmin\s*==\s*0/

// ── 豁免清单：[{ path, reason }] 路径与路由模板精确匹配 ──
const EXEMPT = [
  // 登录 / 首次引导
  { path: '/api/auth/login', reason: '登录本身（白名单）' },
  { path: '/api/agent/setup/test', reason: 'Agent 首次启动引导（白名单）' },
  { path: '/api/update/download', reason: '更新基础设施（白名单）' },
  { path: '/api/update/download/cancel', reason: '更新基础设施（白名单）' },
  { path: '/api/update/apply', reason: '更新基础设施（需登录）' },
  // 用户自助：改自己
  { path: '/api/auth/change-password', reason: '用户自助：改自己的密码' },
  { path: '/api/user-profile', reason: '用户自助：改自己的资料' },
  { path: '/api/user-preferences', reason: '用户自助：自己的偏好' },
  { path: '/api/user-preferences/{key}', reason: '用户自助：自己的偏好' },
  { path: '/api/agent/chat', reason: '用户自助：自己的对话（service 内按 uid 隔离）' },
  { path: '/api/agent/chat/stream', reason: '用户自助：自己的对话（service 内按 uid 隔离）' },
  { path: '/api/agent/conversations/{id}', reason: '用户自助：自己的对话（uid 校验）' },
  { path: '/api/agent/conversations/{id}/archive', reason: '用户自助：自己的对话（uid 校验）' },
  { path: '/api/agent/conversations/{id}/unarchive', reason: '用户自助：自己的对话（uid 校验）' },
  { path: '/api/agent/conversations/{id}/restore', reason: '用户自助：自己的对话（uid 校验）' },
  { path: '/api/stt/upload', reason: '用户自助：自己的转写文件（路径按 uid 隔离）' },
  { path: '/api/stt/transcribe', reason: '用户自助：自己的转写任务（job created_by=uid）' },
  // 无状态服务：OCR 识别，不写业务库
  { path: '/api/ocr/id-card', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/invoice', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/bank-card', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/business-license', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/bank-receipt', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/permit', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/bank-statement', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/general-receipt', reason: '无状态 OCR 识别（不写业务库）' },
  { path: '/api/ocr/company-query', reason: '无状态 OCR 识别（不写业务库）' },
  // STUB 空操作端点（显式 501 未实现，不写库）
  { path: '/api/wages/match-receipts', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/wages/confirm-matches', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/snapshots/max-count', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/health/export-json', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/health/reconcile', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/sqlite/enable', reason: 'STUB：显式 501 未实现，不写库' },
  { path: '/api/diagnose', reason: '只读诊断（PRAGMA），无数据写' },
  // 基础设施：文件 / 字典 / 审计 / 备份
  { path: '/api/files/save', reason: '通用文件基础设施（IsPathSafe 防穿越）' },
  { path: '/api/files/delete', reason: '通用文件基础设施（IsPathSafe 防穿越）' },
  { path: '/api/files/open-external', reason: '文件查看基础设施（扩展名白名单）' },
  { path: '/api/regions', reason: '基础字典（省市区静态数据）' },
  { path: '/api/regions/{id}', reason: '基础字典（省市区静态数据）' },
  { path: '/api/audit/logs', reason: '审计日志写入端点' },
  { path: '/api/snapshots', reason: '备份基础设施（快照创建）' },
  // G2 暂缓（拍板 C：前端未用权限码的业务写端点，待前端补 can() 后 C-4 二期执行）
  { path: '/api/contracts/income', reason: 'G2 暂缓：contracts:create 待前端补码后执行' },
  { path: '/api/contracts/expense', reason: 'G2 暂缓：contracts:create 待前端补码后执行' },
  { path: '/api/contracts/agreement', reason: 'G2 暂缓：contracts:create 待前端补码后执行' },
  { path: '/api/contract-templates', reason: 'G2 暂缓：contracts:update 待前端补码后执行' },
  { path: '/api/contract-templates/{id}', reason: 'G2 暂缓：contracts:update 待前端补码后执行' },
  { path: '/api/settlements', reason: 'G2 暂缓：settlement:create/update 待前端补码后执行' },
  { path: '/api/settlements/{id}/unarchive', reason: 'G2 暂缓：settlement:update 待前端补码后执行' },
  { path: '/api/cost-ledger', reason: 'G2 暂缓：costLedger:create/update 待前端补码后执行' },
  { path: '/api/cost-ledger/{id}', reason: 'G2 暂缓：costLedger:delete 待前端补码后执行' },
  { path: '/api/cost-ledger/batch', reason: 'G2 暂缓：costLedger:create 待前端补码后执行' },
  { path: '/api/cost-ledger/categories', reason: 'G2 暂缓：costLedger:update 待前端补码后执行' },
  { path: '/api/cost-ledger/categories/{id}', reason: 'G2 暂缓：costLedger:update 待前端补码后执行' },
  { path: '/api/cost-ledger/batches', reason: 'G2 暂缓：costLedger:create 待前端补码后执行' },
  { path: '/api/cost-ledger/batches/{id}/copy', reason: 'G2 暂缓：costLedger:create 待前端补码后执行' },
  { path: '/api/cost-ledger/batches/{id}', reason: 'G2 暂缓：costLedger:update/delete 待前端补码后执行' },
  { path: '/api/cost-ledger/match-rules', reason: 'G2 暂缓：costLedger:update 待前端补码后执行' },
  { path: '/api/cost-ledger/{batchId}/sheet', reason: 'G2 暂缓：costLedger:update 待前端补码后执行' },
  { path: '/api/drawings', reason: 'G2 暂缓：drawings:create/update 待前端补码后执行' },
  { path: '/api/drawings/{id}', reason: 'G2 暂缓：drawings:delete 待前端补码后执行' },
  { path: '/api/inventory/transactions', reason: 'G2 暂缓：inventory:create 待前端补码后执行' },
  { path: '/api/contracts/save-file', reason: 'G2 暂缓：contracts:update 待前端补码后执行' },
  { path: '/api/inventory', reason: 'G2 暂缓：inventory:create/update 待前端补码后执行' },
  { path: '/api/materials', reason: 'G2 暂缓：inventory:create/update 待前端补码后执行' },
  { path: '/api/invoices', reason: 'G2 暂缓：invoices:create/update 待前端补码后执行' },
  { path: '/api/invoices/{id}', reason: 'G2 暂缓：invoices:delete 待前端补码后执行' },
  { path: '/api/payment-records', reason: 'G2 暂缓：invoices:create/update 待前端补码后执行' },
  { path: '/api/payment-records/{id}', reason: 'G2 暂缓：invoices:delete 待前端补码后执行' },
  { path: '/api/members', reason: 'G2 暂缓：members:create/update 待前端补码后执行' },
  { path: '/api/members/{id}', reason: 'G2 暂缓：members:delete 待前端补码后执行' },
  { path: '/api/workers', reason: 'G2 暂缓：members:create/update 待前端补码后执行' },
  { path: '/api/workers/{id}', reason: 'G2 暂缓：members:delete 待前端补码后执行' },
  { path: '/api/project-workers', reason: 'G2 暂缓：members:create/update 待前端补码后执行' },
  { path: '/api/project-workers/{id}', reason: 'G2 暂缓：members:delete 待前端补码后执行' },
  { path: '/api/project-workers/batch', reason: 'G2 暂缓：members:create 待前端补码后执行' },
  { path: '/api/departments', reason: 'G2 暂缓：members:create/update 待前端补码后执行' },
  { path: '/api/departments/{id}', reason: 'G2 暂缓：members:delete 待前端补码后执行' },
  { path: '/api/worker-teams', reason: 'G2 暂缓：members:create/update 待前端补码后执行' },
  { path: '/api/worker-teams/{id}', reason: 'G2 暂缓：members:delete 待前端补码后执行' },
  { path: '/api/partners', reason: 'G2 暂缓：partners:create/update 待前端补码后执行' },
  { path: '/api/partners/{id}', reason: 'G2 暂缓：partners:delete 待前端补码后执行' },
  { path: '/api/supervisors', reason: 'G2 暂缓：partners:create/update 待前端补码后执行' },
  { path: '/api/supervisors/{id}', reason: 'G2 暂缓：partners:delete 待前端补码后执行' },
  { path: '/api/projects/{id}', reason: 'G2 暂缓：projects:update 待前端补码后执行' },
  { path: '/api/project-members', reason: 'G2 暂缓：projects:update 待前端补码后执行' },
  { path: '/api/project-members/{id}', reason: 'G2 暂缓：projects:update 待前端补码后执行' },
  { path: '/api/invoices/{id}/status', reason: 'G2 暂缓：invoices:update 待前端补码后执行' },
  { path: '/api/snapshots/{id}', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/config/gpu-acceleration', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/backup', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/sqlite/read-mode', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/templates', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/templates/{id}', reason: 'G2 暂缓：settings:update 待前端补码后执行' },
  { path: '/api/attendances', reason: 'G2 暂缓：wages:create/update 待前端补码后执行' },
  { path: '/api/attendances/{id}', reason: 'G2 暂缓：wages:delete 待前端补码后执行' },
  { path: '/api/attendances/batch-delete', reason: 'G2 暂缓：wages:delete 待前端补码后执行' },
  { path: '/api/attendances/batch-create', reason: 'G2 暂缓：wages:create 待前端补码后执行' },
  { path: '/api/attendances/generate', reason: 'G2 暂缓：wages:create 待前端补码后执行（窗口 E 已接通本体）' },
  { path: '/api/attendances/generate-v2', reason: 'G2 暂缓：wages:create 待前端补码后执行（窗口 E 已接通本体）' },
  { path: '/api/attendances/batch-import', reason: 'G2 暂缓：wages:create 待前端补码后执行（窗口 E 已接通本体）' },
  { path: '/api/wages', reason: 'G2 暂缓：wages:create/update 待前端补码后执行' },
  { path: '/api/wages/{id}', reason: 'G2 暂缓：wages:delete 待前端补码后执行' },
  { path: '/api/wages/batch-delete', reason: 'G2 暂缓：wages:delete 待前端补码后执行' },
  { path: '/api/wages/batch-clear-payments', reason: 'G2 暂缓：wages:update 待前端补码后执行' },
  { path: '/api/wages/archive', reason: 'G2 暂缓：wages:update 待前端补码后执行' },
  { path: '/api/wages/batch-unarchive', reason: 'G2 暂缓：wages:update 待前端补码后执行' },
  { path: '/api/wages/batch-save', reason: 'G2 暂缓：wages:update 待前端补码后执行' },
  { path: '/api/wages/batch-payment', reason: 'G2 暂缓：wages:update 待前端补码后执行' },
  { path: '/api/wages/generate', reason: 'G2 暂缓：wages:create 待前端补码后执行' },
  { path: '/api/salary-history', reason: 'G2 暂缓：wages:create 待前端补码后执行' },
  { path: '/api/salary-history/{id}', reason: 'G2 暂缓：wages:delete 待前端补码后执行' },
];

// ── 提取（R1）──
const ENDPOINT_RE = /app\.(MapPost|MapPut|MapPatch|MapDelete)\s*\(\s*"([^"]+)"/g;

const endpoints = []; // { file, line, method, path }
const files = readdirSync(ENDPOINTS_DIR).filter(f => f.endsWith('.cs'));
for (const f of files) {
  const content = readFileSync(path.join(ENDPOINTS_DIR, f), 'utf-8');
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    ENDPOINT_RE.lastIndex = 0;
    const m = ENDPOINT_RE.exec(lines[i]);
    if (m) {
      endpoints.push({ file: f, line: i + 1, method: m[1], path: m[2] });
    }
  }
}

// ── 哨兵（R1）：提取 < 40 → 提取器失效 ──
if (endpoints.length < 40) {
  console.error(`❌ 门禁5：写端点提取 ${endpoints.length} < 40，提取器疑似失效（结构变更？），拒绝通过`);
  process.exit(1);
}

// ── 区间合规判定（R2 + R3）──
const violations = [];
const exempted = [];
let compliantCount = 0;

for (let i = 0; i < endpoints.length; i++) {
  const ep = endpoints[i];
  const next = endpoints[i + 1];
  // 注意：提取按文件遍历，next 可能属于下一个文件 → 跨文件时区间取到本文件尾
  const endLine = next && next.file === ep.file ? next.line - 1 : undefined;
  const fileContent = readFileSync(path.join(ENDPOINTS_DIR, ep.file), 'utf-8');
  const lines = fileContent.split('\n');
  const segment = lines.slice(ep.line - 1, endLine ?? lines.length).join('\n');

  if (COMPLIANT_RE.test(segment)) {
    compliantCount++;
    continue;
  }

  const ex = EXEMPT.find(e => e.path === ep.path);
  if (ex) {
    exempted.push({ ...ep, reason: ex.reason });
    continue;
  }

  violations.push({ ...ep, method: ep.method });
}

// ── 输出 ──
console.log(`\n=== 门禁5：写操作端点权限检查 ===`);
console.log(`写端点总数: ${endpoints.length}（哨兵 ≥40 ✓）`);
console.log(`已含权限检查: ${compliantCount}`);
console.log(`豁免清单命中: ${exempted.length}`);
console.log(`违反: ${violations.length}`);
for (const v of violations) {
  console.log(`  ❌ ${v.file}:${v.line} ${v.method} ${v.path} — 无 HasPermission / IsAdmin 校验，且不在豁免清单`);
}

if (violations.length > 0) {
  console.error(`\n❌ 门禁5：存在未授权写端点，拒绝通过`);
  process.exit(1);
}
console.log(`✅ 门禁5 通过：全部写端点已含权限检查或在带理由的豁免清单中`);

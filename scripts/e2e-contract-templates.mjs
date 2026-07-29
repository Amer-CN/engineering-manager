/**
 * 合同模板 CRUD 全链路 E2E（真实 API，用完即删数据）
 *
 * 历史：此链路的临时版本在 v0.85.0 前夜挖出 bug #9（POST DTO 漂移 500）/
 * #10（PUT dynamic dto 缺参必 500 + 越权洞）/ #11（打印正文恒空），
 * 审查意见要求入库作为常驻回归网（scripts/ 下随红绿灯手动跑）。
 *
 * 断言覆盖：
 *   1. 登录取 token
 *   2. POST 创建（富文本标记 + 变量 + <script> 注入探针）→ 返回 id
 *   3. GET 列表含新记录，content/variables 双向映射完整
 *   4. PUT 编辑落库 + version 字段递增（版本号计数）
 *   5. PUT 不存在的 id → 404（403/404 区分语义，v0.85.x 新增）
 *   6. DELETE 清理 → 再 GET 确认归零
 *   7. DELETE 不存在的 id → 404
 *
 * 用法（需后端已启动，如 dotnet run -- --api-only）：
 *   node scripts/e2e-contract-templates.mjs [BASE_URL]
 * 默认 BASE_URL=http://localhost:5048；凭据 admin/admin123（本地开发库）
 */

const BASE = process.argv[2] || 'http://localhost:5048'
let failed = 0

function ok(cond, label) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failed++
}

async function main() {
  // 1. 登录
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
  const login = await loginRes.json()
  const token = login?.data?.token
  ok(!!token, '登录取得 token')
  if (!token) { console.error('登录失败，中止'); process.exit(1) }
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  // 2. POST 创建（富文本 + 变量 + 注入探针）——注意：直连 API 用后端 DTO 形状（content + variables 为 JSON 串），
  // 前端形状（description + variables 数组）由 tauri-bridge 映射，不在本脚本路径上
  const name = `E2E回归-${Date.now()}`
  const createRes = await fetch(`${BASE}/api/contract-templates`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      name, type: 'income',
      content: '## 一、合同价款\n总价**{{金额}}**元，*按进度付款*。<script>alert(1)</script>',
      variables: JSON.stringify([{ key: '金额', label: '合同金额', defaultValue: '壹万' }]),
    }),
  })
  const created = await createRes.json()
  const id = created?.data
  ok(createRes.status === 200 && typeof id === 'number', `POST 创建成功 id=${id}（bug#9 回归：DTO 双向映射）`)

  // 3. GET 列表验证（后端原始行：content 列 + variables JSON 串）
  const listRes = await fetch(`${BASE}/api/contract-templates`, { headers: H })
  const list = (await listRes.json())?.data || []
  const mine = list.find(t => t.id === id)
  ok(!!mine, 'GET 列表含新记录')
  ok(mine?.content?.includes('{{金额}}'), 'content 列保留富文本与变量占位')
  const vars = typeof mine?.variables === 'string' ? JSON.parse(mine.variables) : mine?.variables
  ok(Array.isArray(vars) && vars[0]?.key === '金额', 'variables JSON 串可解析且字段完整')

  // 4. PUT 编辑 + version 递增
  const putRes = await fetch(`${BASE}/api/contract-templates`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ id, name: name + '-改', type: 'income', content: '正文已改', variables: '[]' }),
  })
  ok(putRes.status === 200, 'PUT 编辑成功（bug#10 回归：强类型 DTO 补参）')
  const after = ((await (await fetch(`${BASE}/api/contract-templates`, { headers: H })).json())?.data || []).find(t => t.id === id)
  ok(after?.name === name + '-改', 'PUT 改名落库')
  ok((after?.version ?? 0) >= 2, `version 递增至 ${after?.version}（版本号计数）`)

  // 5. PUT 不存在的 id → 404（403/404 区分语义）
  const put404 = await fetch(`${BASE}/api/contract-templates`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ id: 99999999, name: 'x', type: 'income', content: 'x', variables: '[]' }),
  })
  ok(put404.status === 404, `PUT 不存在 id 返回 404（实际 ${put404.status}）`)

  // 6. DELETE 清理 + 归零
  const delRes = await fetch(`${BASE}/api/contract-templates/${id}`, { method: 'DELETE', headers: H })
  ok(delRes.status === 200, 'DELETE 清理成功')
  const finalList = ((await (await fetch(`${BASE}/api/contract-templates`, { headers: H })).json())?.data || [])
  ok(!finalList.some(t => t.id === id), 'GET 确认记录已归零（无测试数据残留）')

  // 7. DELETE 不存在的 id → 404
  const del404 = await fetch(`${BASE}/api/contract-templates/99999999`, { method: 'DELETE', headers: H })
  ok(del404.status === 404, `DELETE 不存在 id 返回 404（实际 ${del404.status}）`)

  console.log(failed === 0 ? '\nE2E PASSED（全部断言通过）' : `\nE2E FAILED（${failed} 项断言失败）`)
  // 成功路径自然退出（Windows Node 在 pending handle 上强制 exit 会触发 libuv 断言噪音）
  if (failed > 0) process.exitCode = 1
}

main().catch(e => { console.error('E2E 异常：', e.message); process.exitCode = 1 })

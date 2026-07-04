# 工程管家 - 端到端冒烟测试

> **版本**：v0.71.0 起
> **用途**：每次 release 前 / 周一回归 / 任何 sprint 收尾后跑一遍
> **预计时长**：15 分钟（手测）+ 5 分钟（自动）= 20 分钟

---

## 0. 环境检查（5 分钟）

```bash
# 1. 编译 0 错误
cd "E:\测试\EngineeringManager.Api" && dotnet build 2>&1 | Select-String -Pattern "错误|Build succeeded|Build FAILED"

# 2. 单元测试全过
cd "E:\测试\EngineeringManager.Tests" && dotnet test 2>&1 | Select-String -Pattern "通过:|失败:|总计:"

# 3. 前端构建无 HARD FAIL
cd "E:\测试" && npm run check 2>&1 | Select-String -Pattern "HARD FAIL|passed|failed"

# 4. 前端构建成功
cd "E:\测试" && npx vite build 2>&1 | Select-String -Pattern "error|success|✓|✗"
```

**通过标准**：
- 后端 0 错误 0 警告
- 后端单元测试全部通过
- 前端 check 0 HARD FAIL
- vite build 11-12 秒成功

---

## 1. 启动应用（1 分钟）

```bash
# 双击 工程管家.bat 或
cd "E:\测试\EngineeringManager.Api" && dotnet run
```

**检查**：
- [ ] WinForms 窗口弹出
- [ ] WebView2 加载完成（看到登录页）
- [ ] 后台 console 无 error（看 stdout）

---

## 2. 登录（1 分钟）

**测试账号**（按角色验证）：

> ⚠️ 测试账号密码请勿写入仓库文档；从本地 seed 数据或管理员设置获取。

| 账号 | 密码 | 角色 | 验证项 |
|------|------|------|--------|
| `admin` | `<初始密码>` (首次需改) | admin | 看到全部侧边栏 + 全部数据 |
| `manager` | `<密码>` | manager | 看到项目/合同/工人（无系统设置） |
| `accountant` | `<密码>` | accountant | 看到财务/发票/合同（无人员管理） |
| `worker` | `<密码>` | worker | 只看 dashboard + 项目（只读） |

**v0.71.0 老库升级特殊处理**：
- 老用户从 v0.70.0 升级后，password_hash 为空 → 登录返回"账户需要重置密码"
- admin 用 DB 工具 (DB Browser for SQLite) 直接 UPDATE users SET password_hash='xxx' WHERE id='1'
- 或 `/api/auth/reset-password` 端点（admin 调）

**通过标准**：
- [ ] 登录成功 + 跳转主页
- [ ] admin 看到 11 个侧边栏
- [ ] 退出后重新打开免登录

---

## 3. CRUD 流程（5 分钟，每个模块跑 1 个）

### 3.1 工人模块
1. **创建**：`/labor` → 新增工人 → 姓名、身份证、手机、银行卡 → 保存
2. **列表**：`/labor` → 列表里看到新工人（**PII 脱敏：身份证/手机/银行卡中间 ****）
3. **编辑**：点击编辑 → 改手机号 → 保存
4. **删除**：点击删除 → 确认

**通过标准**：
- [ ] 列表里身份证/手机/银行卡已脱敏（中间 `****`）
- [ ] 详情页（点开编辑）有完整 PII
- [ ] 删除后列表不再显示

### 3.2 合同模块
1. **创建**：`/contracts` → 新增合同 → 项目、对方、金额 → 保存
2. **详情**：点击合同 → 看到完整内容
3. **删除**：删除该合同

**通过标准**：
- [ ] 列表显示金额、对方
- [ ] 删除后刷新不显示

### 3.3 财务模块
1. **新增凭证**：`/cost-ledger` → 选项目 + 方向 + 类别 + 金额 → 保存
2. **查看汇总**：`/cost-ledger/summary` → 看到统计更新

**通过标准**：
- [ ] 列表正确显示
- [ ] 汇总数据同步更新

### 3.4 项目模块
1. **创建项目**：`/projects` → 新增 → 名称/地址/预算 → 保存
2. **详情**：点开项目 → 切换 6 个 Tab（成员/合同/凭证/发票/工资/工人）
3. **删除**：删除项目

**通过标准**：
- [ ] 6 Tab 全部正常加载
- [ ] 删除后无残留

### 3.5 跨用户权限（admin 切换 worker）
1. 用 `admin` 创建合同 A
2. 退出，用 `worker` 登录
3. `/contracts` 看合同 A（应**看不到** — 越权防护）
4. 退出，用 `admin` 登录
5. `/contracts` 看合同 A（**应能看到**）

**通过标准**：
- [ ] worker 看不到其他人的合同
- [ ] admin 可见

---

## 4. 数据隔离（3 分钟）

### 4.1 备份恢复
1. 设置 → 备份到桌面（`/api/backup`）
2. 关闭应用
3. 重启应用
4. 设置 → 恢复（`/api/restore`）
5. 验证数据是否回到备份点

**通过标准**：
- [ ] 备份文件出现在桌面（`工程管家-备份-*.db`）
- [ ] 恢复后数据回到备份前状态

### 4.2 SQLite 导出
1. 设置 → SQLite → 启用
2. SQLite → 迁移（JSON → SQLite）
3. 查看数据

**通过标准**：
- [ ] 迁移完成提示
- [ ] 数据在 engineering.db 可访问

---

## 5. 端点安全（2 分钟）

### 5.1 未登录访问
```bash
# 不带 JWT 访问，应该 401
curl http://localhost:5048/api/members
curl http://localhost:5048/api/contracts/income
```

**通过标准**：
- [ ] 全部返回 401 / `{"error":"..."}`

### 5.2 跨用户 DELETE 防护
1. 用 `worker` 登录
2. 尝试 DELETE admin 的合同（API 工具或直接 curl）

**通过标准**：
- [ ] 返回 403 Forbid

### 5.3 跨用户访问防护
1. 用 `worker` 登录
2. 尝试访问 admin 创建的合同（GET /api/contracts/income）

**通过标准**：
- [ ] admin 合同不可见（越权防护）

---

## 6. 日志审计（1 分钟）

1. 用户管理 → 操作日志
2. 看到刚才所有操作的日志

**通过标准**：
- [ ] 登录/CRUD/退出 都有日志
- [ ] 包含 user_id / timestamp / action

---

## 7. 性能（可选，2 分钟）

- [ ] 主页加载 < 2 秒
- [ ] 大列表（>100 行）滚动无卡顿
- [ ] Excel 导出（如果有） < 5 秒

---

## 通过标准总览

| 类别 | 标准 | 状态 |
|------|------|------|
| 编译 | 0 错误 0 警告 | ☐ |
| 单元测试 | 全部通过 | ☐ |
| 前端 check | 0 HARD FAIL | ☐ |
| 前端 build | 11-12 秒 | ☐ |
| 启动 | 窗口弹出 + WebView2 加载 | ☐ |
| 登录 | 4 角色全 OK | ☐ |
| CRUD | 5 模块全过 | ☐ |
| 数据隔离 | 备份恢复 OK | ☐ |
| 安全 | 未登录 401 + 跨用户 403 | ☐ |
| 审计 | 日志完整 | ☐ |

---

## 失败处理

如任何一项不通过：
1. 截图 + 日志 → 提交 issue
2. 标记本次 release 为 **WIP**
3. 不要 git tag v0.71.0

---

*本文档与 AGENTS.md 保持同步。如模块有变化（如新增费用模块），更新对应小节。*

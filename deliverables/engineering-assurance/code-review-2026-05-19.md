# 代码审查报告：工程管家 v2.12.0

**审查日期**: 2026-05-19  
**审查范围**: Electron + React + TypeScript + Vite 桌面应用  
**审查人**: Cody（代码审查师）

---

## 概要

本报告对工程管家 v2.12.0 进行了全面的只读代码审查，覆盖 4 个主要域：electron/ 层（数据库+IPC）、src/components/ UI层、src/hooks+services+types、以及构建+配置。共发现 **严重问题 4 个**，**高优先级问题 8 个**，**中优先级问题 12 个**，**低优先级建议 6 个**。

---

## 🔴 严重问题

### S1: contextBridge 暴露的 API 缺乏权限校验

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `electron/preload.ts` | 全文 | preload.ts 中暴露了 70+ 个 IPC API，但这些 API 缺乏统一的权限校验中间件。任何已登录用户可以调用 `deleteUser`、`createUser`、`deleteProject` 等敏感操作。 | 🔴 Critical |
| `electron/preload.ts` | 17-19 | `createUser` 和 `deleteUser` 直接暴露给渲染进程，无权限校验。 | 🔴 Critical |

**影响评估**: 恶意用户可以通过调用这些 API 执行未授权操作，如删除任意用户、修改项目数据等。

**建议修复方式**:
```typescript
// 在每个敏感 handler 中添加权限检查
ipcMain.handle('auth:createUser', async (event, userData) => {
  const currentUser = getCurrentUser(event)
  if (!hasPermission(currentUser, 'users:create')) {
    return { success: false, error: '权限不足' }
  }
  // ... 原有逻辑
})
```

---

### S2: 硬编码默认密码写入文件

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `electron/database.ts` | 320, 404-427 | `DEFAULT_ADMIN_PASSWORD = 'admin123'` 硬编码在源码中，并且初始密码被写入 `admin-initial-password.txt` 文件。 | 🔴 Critical |

**影响评估**: 
1. 所有安装的应用程序都有相同的默认管理员密码
2. 密码以明文形式存储在文件中，违反安全最佳实践
3. 攻击者可以轻松获取管理员权限

**建议修复方式**:
```typescript
// 使用安全的随机密码生成
function createDefaultAdmin(): User {
  const password = crypto.randomBytes(16).toString('base64')
  const { hash, salt } = hashPassword(password)
  // 不写入文件，而是要求首次登录时强制修改密码
  return {
    id: 'admin-' + Date.now(),
    username: 'admin',
    passwordHash: hash,
    passwordSalt: salt,
    mustChangePassword: true, // 强制首次登录修改密码
    // ...
  }
}
```

---

### S3: webSecurity 关闭导致安全风险

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `electron/main.ts` | 87 | `webSecurity: false` 完全禁用了 Electron 的 Web 安全策略。 | 🔴 Critical |
| `electron/main.ts` | 67-75 | `Access-Control-Allow-Origin: *` 允许所有来源的跨域请求。 | 🔴 Critical |

**影响评估**:
1. 允许任意网站对应用进行 XSS 攻击
2. 恶意网站可以读取应用程序的数据
3. 使 CORS 策略完全无效

**建议修复方式**:
```typescript
// 只对百度 API 域名解除 CORS，不关闭整体 webSecurity
mainWindow.webPreferences = {
  // ...
  webSecurity: true, // 保持开启
}

// 在 session 中仅对必要的域名设置 CORS
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  if (details.url.includes('aip.baidubce.com') || details.url.includes('baidu.com')) {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['https://aip.baidubce.com'],
      }
    })
  } else {
    callback({ responseHeaders: details.responseHeaders })
  }
})
```

---

### S4: 银行回单解析中的命令注入风险

| 文件 | 行号 | 问题 | 严重度 |
|------|------|------|--------|
| `electron/ipc-handlers/wage-calc.ts` | 152, 288-289 | Python 脚本路径直接使用用户提供的文件名写入磁盘，可能存在路径遍历。 | 🔴 Critical |

**影响评估**: 恶意用户可能通过构造特殊文件名进行路径遍历攻击，例如 `../../etc/passwd`。

**建议修复方式**:
```typescript
// 验证和清理文件名
function sanitizeFileName(fileName: string): string {
  // 移除路径分隔符和特殊字符
  const sanitized = fileName.replace(/[<>:"|?*\x00-\x1f]/g, '').substring(0, 100)
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    throw new Error('Invalid file name')
  }
  return sanitized
}

const scriptPath = path.join(targetDir, `_extract_${Date.now()}.py`)
fs.writeFileSync(scriptPath, PYTHON_EXTRACT_SCRIPT, 'utf-8')
```

---

## 🟠 高优先级问题

### H1: 原子写入存在竞态窗口

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/database.ts` | 483-500 | `saveDatabase()` 使用 `fs.writeFileSync` + `fs.renameSync` 实现原子写入，但在写入和重命名之间存在时间窗口，可能导致数据丢失。 | 性能/正确性 |

**影响评估**: 如果系统在这段时间内崩溃，会丢失自上次保存以来的所有数据。

**建议修复方式**:
```typescript
// 使用 fsync 确保数据写入磁盘后再重命名
export function saveDatabase() {
  try {
    createSnapshot()
    const dbPath = getDbPath()
    const tmpPath = dbPath + '.tmp'
    
    // 写入临时文件
    fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf8')
    
    // 确保写入完成
    const fd = fs.openSync(tmpPath, 'r+')
    fs.fsyncSync(fd)
    fs.closeSync(fd)
    
    // 原子重命名
    fs.renameSync(tmpPath, dbPath)
    // ...
  }
}
```

---

### H2: O(n*m) 复杂度导致发票列表性能问题

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/ipc-handlers/invoices.ts` | 21-62 | `getAll` handler 中，对每个发票都执行 `db.paymentRecords.filter()` 和 `db.invoices.find()`，复杂度为 O(n*m)。 | 性能 |

**影响评估**: 当发票数量为 1000 条，收款记录为 5000 条时，需要执行 500 万次比较操作。

**建议修复方式**:
```typescript
// 预构建索引
const invoiceIndex = new Map(db.invoices.map(inv => [inv.id, inv]))
const paymentIndex = new Map<number, any[]>()
for (const record of db.paymentRecords) {
  for (const detail of record.invoiceDetails || []) {
    if (!paymentIndex.has(detail.invoiceId)) {
      paymentIndex.set(detail.invoiceId, [])
    }
    paymentIndex.get(detail.invoiceId)!.push(detail)
  }
}

// O(1) 查找
const relatedPayments = paymentIndex.get(i.id) || []
```

---

### H3: TypeScript strict 模式关闭导致 202 个 `as any`

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `tsconfig.json` | 15 | `"strict": false` 导致类型检查失效。 | 可维护性 |
| 全项目 | - | 约 202 处使用 `as any` 进行类型断言。 | 可维护性 |

**影响评估**:
1. 运行时错误难以在编译期发现
2. 重构时容易引入隐藏的 bug
3. 新开发者难以理解代码意图

**建议修复方式**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

---

### H4: 数据库批量删除缺乏确认机制

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/ipc-handlers/invoices.ts` | 104-113 | `delete` handler 直接删除发票，没有软删除或回收站机制。 | 正确性 |

**影响评估**: 误删数据无法恢复。

**建议修复方式**:
```typescript
// 添加软删除
ipcMain.handle('db:invoices:delete', (_, id) => {
  const index = db.invoices.findIndex((i: any) => i.id === id)
  if (index !== -1) {
    db.invoices[index].deletedAt = new Date().toISOString()
    db.invoices[index].deletedBy = getCurrentUserId()
    saveDatabase()
  }
})
```

---

### H5: 缺乏输入验证

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/ipc-handlers/invoices.ts` | 70-86 | `create` handler 未验证 `invoice.amount` 是否为有效数字。 | 正确性 |
| `electron/ipc-handlers/cost-ledger.ts` | 50-81 | `batchCreate` 未验证 `entries` 是否为数组。 | 正确性 |

**影响评估**: 恶意或错误数据可能破坏数据库完整性。

**建议修复方式**:
```typescript
ipcMain.handle('db:invoices:create', (_, invoice) => {
  // 输入验证
  if (typeof invoice.amount !== 'number' || invoice.amount < 0) {
    return { success: false, error: '无效的发票金额' }
  }
  if (!invoice.invoiceNo || typeof invoice.invoiceNo !== 'string') {
    return { success: false, error: '发票号码不能为空' }
  }
  // ...
})
```

---

### H6: globalShortcut 冲突风险

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|--------|
| `electron/main.ts` | 107-112 | 全局快捷键 `Ctrl+Shift+I` 可能与其他应用冲突。 | 可维护性 |

**建议修复方式**:
```typescript
// 在 settings 中让用户自定义快捷键
// 或使用更少冲突的组合
globalShortcut.register('CommandOrControl+Shift+E', () => {
  mainWindow?.webContents.toggleDevTools()
})
```

---

### H7: 大型 UI 组件缺乏状态管理抽象

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `src/components/features/costLedger/CostLedgerImportModal.tsx` | 907行 | 907行的巨型组件，所有状态都在组件内部管理，props drilling 严重。 | 可维护性 |

**影响评估**:
1. 代码难以理解和维护
2. 状态逻辑难以复用
3. 性能优化困难

**建议修复方式**:
- 将组件拆分为多个子组件
- 使用 React Context 或 Zustand 管理共享状态
- 提取自定义 hooks 如 `useImportWizard`, `useColumnMapping` 等

---

### H8: 审计日志存储在 localStorage

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|--------|
| `src/utils/audit.ts` | 74-113 | 审计日志存储在前端的 localStorage，大小限制 5-10MB。 | 正确性 |

**影响评估**:
1. 恶意用户可以清空自己的审计记录
2. 存储空间有限，历史记录不完整
3. 无法保证审计日志的完整性

**建议修复方式**:
- 仅依赖后端 IPC 存储审计日志
- 从 localStorage 中移除审计日志存储
- 在后端实现审计日志的查询和导出 API

---

## 🟡 中优先级问题

### M1: 缺乏错误边界处理

| 文件 | 问题 | 类别 |
|------|------|------|
| `src/components/features/costLedger/CostLedgerImportModal.tsx` | 组件渲染错误会导致整个应用崩溃 | 可维护性 |

---

### M2: 硬编码日期处理

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/ipc-handlers/cost-ledger.ts` | 28-30 | `isNaN` 检测失败时使用 `replace` 容错，可能产生错误的日期。 | 正确性 |

---

### M3: OCR 凭证密钥存储在客户端

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `src/services/ocr.ts` | 72-79 | 百度 OCR 的 apiKey 和 secretKey 存储在客户端配置中。 | 安全性 |

---

### M4: 重复的 MONTHS 常量定义

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `src/components/features/wages/WageDetailTab.tsx` | 39, 91 | `MONTHS` 常量被定义两次。 | 可维护性 |

---

### M5: 缺少加载状态指示

| 文件 | 问题 | 类别 |
|------|------|------|
| `src/components/features/hr/StaffPayroll.tsx` | 部分操作缺少 loading 状态反馈 | 用户体验 |

---

### M6: 打印功能使用 `window.open`

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `src/components/features/wages/WageDetailTab.tsx` | 520 | 打印功能使用 `window.open`，可能被浏览器拦截。 | 用户体验 |

---

### M7: 缺乏批量操作的进度反馈

| 文件 | 问题 | 类别 |
|------|------|------|
| `electron/ipc-handlers/cost-ledger.ts` | 88-121 | `batchCreate` 批量导入时缺乏进度回调。 | 用户体验 |

---

### M8: 缺少 TypeScript 类型定义

| 文件 | 问题 | 类别 |
|------|------|------|
| `electron/ipc-handlers/wage-calc.ts` | `generateProjectWages` 返回类型 | 推断为 `any`，应声明明确返回类型 |

---

### M9: 数据库迁移未版本控制

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/database.ts` | 679-837 | `migrateDatabase` 函数随代码演进会越来越复杂，难以追踪。 | 可维护性 |

---

### M10: 快照清理未考虑磁盘空间

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/database.ts` | 220-243 | `cleanOldSnapshots` 只按数量清理，不考虑磁盘空间。 | 性能 |

---

### M11: 密码哈希迭代次数可能不足

| 文件 | 行号 | 问题 | 类别 |
|------|------|------|------|
| `electron/database.ts` | 387 | PBKDF2 迭代次数 210000 对于现代攻击可能不足。 | 安全性 |

---

### M12: 缺少数据库连接池/事务

| 文件 | 问题 | 类别 |
|------|------|------|
| 全项目 | JSON 文件数据库没有事务支持，并发写入可能损坏数据。 | 正确性 |

---

## 🟢 低优先级建议

### L1: 建议添加国际化支持

| 文件 | 问题 |
|------|------|
| 全项目 | 所有中文硬编码在代码中，难以支持多语言。 |

---

### L2: 建议使用环境变量管理配置

| 文件 | 问题 |
|------|------|
| `electron/database.ts` | `defaultDataPath` 硬编码，应支持环境变量覆盖。 |

---

### L3: 建议添加更多单元测试

| 文件 | 问题 |
|------|------|
| 全项目 | 缺少自动化测试覆盖。 |

---

### L4: 建议统一日期格式化工具

| 文件 | 问题 |
|------|------|
| 全项目 | 不同文件使用不同的日期格式化逻辑。 |

---

### L5: 建议优化 chunk splitting

| 文件 | 行号 | 问题 |
|------|------|------|
| `vite.config.ts` | 54-60 | chunk 分割可以进一步优化，例如将 xlsx 拆分为读取器和写入器。 |

---

### L6: 建议添加 API 限流

| 文件 | 问题 |
|------|------|
| `electron/preload.ts` | 缺乏 API 调用频率限制，可能被滥用。 |

---

## 做得好的地方

1. **原子写入实现**: `saveDatabase()` 使用临时文件 + rename 模式实现原子写入，设计合理
2. **快照系统**: 保留了最多 200 个数据库快照，支持回滚，设计完善
3. **工厂模式**: `contracts.ts` 使用工厂函数消除重复代码，设计良好
4. **数据迁移**: 数据库迁移逻辑完整，包含错误处理和回退机制
5. **UI 组件拆分**: 使用 motion (framer-motion) 提供流畅动画，用户体验良好
6. **类型定义**: `electron.d.ts` 提供了较完整的 TypeScript 类型定义
7. **审计日志**: 实现了基础的审计日志系统
8. **Vite 构建配置**: chunk 分割策略合理，便于代码分割

---

## 结论

**整体评级**: 🟠 需要关注

该应用在架构设计和功能实现上较为完善，但存在以下必须修复的安全和稳定性问题：

1. **必须立即修复**: S1-S4（权限校验、默认密码、webSecurity、命令注入）
2. **强烈建议修复**: H1-H8（性能问题、类型安全、输入验证等）
3. **建议修复**: M1-M12, L1-L6

建议优先处理 4 个严重问题，确保应用在生产环境中的安全性和稳定性。同时，建议逐步启用 TypeScript strict 模式以提升代码质量。

---

**审查签名**: Cody（代码审查师）  
**审查日期**: 2026-05-19

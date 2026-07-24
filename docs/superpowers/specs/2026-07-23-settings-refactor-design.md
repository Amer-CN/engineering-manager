# 设置页重构设计方案

> 状态：已定稿待评审 · 日期：2026-07-23 · 作者：AI 执行者（CatPaw）
> 决策已与用户逐条确认（架构 A / 快照搬迁 / 新增改密码端点 / 延后两项 / 头号亮点=设置内搜索）

## 一、背景与问题

设置功能最初只有寥寥几项，集成在单页即可。随着迭代，[Settings.tsx](../../src/components/Settings.tsx) 已累积 **8 个功能块**塞进一个两列网格，导致两个明确问题：

1. **乱**：从"AI 助手"到"PII 加密密钥"到"数据库引擎"混在一页，无分类、无层次。
2. **卡**：进入设置的瞬间，8 个子模块**全部同时挂载**，并发打出 6～8 个后端请求（`getLlmProviderConfig` / `getPiiKeys` / `ocrGetStats` / SQLite 状态 / 数据健康检查 / 数据路径 / OCR 配置 / 更新检查），同时渲染巨大 DOM 树 + framer-motion 整页动画。这是卡顿主因。

## 二、目标与非目标

### 目标
- 将设置页重构为**页内左侧分类导航 + 右侧当前面板**结构。
- **按需挂载**：只加载当前选中面板的数据，根治卡顿。
- 补齐真实缺口：**用户自助修改密码**（当前完全缺失）。
- 将**数据回滚（快照）**从 admin-only 的用户管理迁移到设置"数据与存储"。
- 头号亮点：**设置内搜索**——正面解决"乱"。
- 视觉基线：药丸式导航 + 左侧激活指示条 + framer-motion 面板切换，呼应现有侧边栏设计语言。

### 非目标 / 明确延后（YAGNI，但确认后续会做）
- **列表每页条数全局默认**：需改动所有 DataTable，收益低风险高，延后。
- **修改自己的显示名**：需额外端点，价值一般，延后。
- **状态感知导航徽章**、**Ctrl+, 唤起 + 键盘导航**：本次不做（用户明确只选搜索）。

## 三、架构：页内左侧分类导航

```
┌─────────────────────────────────────────────────────────┐
│  系统设置                          [🔍 搜索设置...      ]  │  ← 头部：标题 + 搜索框
├──────────────┬──────────────────────────────────────────┤
│ 🔍 搜索结果   │                                          │
│ ─────────────│                                          │
│ 👤 个人账户   │        （当前选中分类的面板内容）          │
│ 🎨 外观      │                                          │
│ 🤖 AI 能力   │         ← 只挂载这一个面板                │
│ 💾 数据与存储 │                                          │
│ 🔔 通知与偏好 │                                          │
│ ℹ️  关于与帮助 │                                          │
└──────────────┴──────────────────────────────────────────┘
```

- **左栏**：窄列（约 `w-56`），图标 + 标签 + 描述副标题的药丸导航；激活项左侧竖条指示 + 高亮底色。
- **右栏**：`PageContainer` 内渲染**当前分类面板**。面板切换用 `AnimatePresence mode="wait"` + opacity/位移微动画（spring stiffness≤200）。
- **状态**：`activeCategory` 用 `useState` 管理；可选用 `localStorage` 记住上次停留的分类。

### 治卡顿的关键实现
当前 [Settings.tsx](../../src/components/Settings.tsx) 在**顶层**调用 `useDataPath` / `useOCRConfig` / `useSqliteSettings`，即使懒渲染面板，这些 hook 仍会在进页面时触发。因此必须：

1. **数据 hook 下沉到各自面板内部**：
   - `useOCRConfig` → 移入 AI 能力面板（OCR 子区）
   - `useSqliteSettings` → 移入数据与存储面板（数据库引擎子区）
   - `useDataPath` → DataPathSection 已自带，仅需去掉顶层的 loading 门控
   - `AiProviderSection` / `SettingsPiiKeySection` / `SettingsOcrSection` 的 `useEffect` 请求已在组件内，天然随面板挂载才触发
2. **条件渲染面板**：`{activeCategory === 'x' && <XPanel/>}`，未选中的面板不挂载 → 其接口不触发。
3. 进设置默认落在**个人账户**（零重请求：只读用户信息来自已登录态）。

> 效果：进设置从"并发 6～8 请求"降到"当前面板 0～2 请求"。

## 四、分类结构（6 类）

| 分类 | 图标 | 内容 | 组件来源 | 权限 |
|------|------|------|---------|------|
| **个人账户** | User | 我的信息 · 修改密码 · PII 脱敏显示 · 自动锁屏超时 | 新建 + 复用 useMask | 全部用户 |
| **外观** | Palette | 主题 · 字号 · 行悬停 · 导出字体 | 复用 AppearanceSection | 全部用户 |
| **AI 能力** | Bot | AI 助手(大模型) · AI 智能识别(OCR) | 复用 AiProviderSection + SettingsOcrSection | 全部用户 |
| **数据与存储** | Database | 数据路径 · 数据库引擎 · 备份与恢复(快照) · PII 加密密钥 | 复用 + 搬迁 SnapshotsTab | 见下 |
| **通知与偏好** | Bell | 默认起始页 · Toast 停留时长 | 新建，走 user-preferences | 全部用户 |
| **关于与帮助** | Info | 版本/更新 · 快捷键参考 · 更新日志 | 复用 AboutSection + 新建 | 全部用户 |

### 各分类明细

#### 1. 个人账户（新建 `AccountSection`）
- **我的信息**：用户名 / 显示名 / 角色（只读展示，来自 `useAuth().currentUser`）。
- **修改密码**：旧密码 + 新密码 + 确认新密码三字段，调用**新增后端端点**（见五）。前端校验：新密码≥6 位、两次一致。
- **PII 脱敏显示**：镜像 [StatusBar](../../src/components/StatusBar.tsx#L94) 已有的 `useMask().toggleMask`（同一状态源，零后端）。
- **自动锁屏超时**：下拉选择（关闭 / 5 / 10 / 30 分钟）→ 存 `user-preference` key `auto_lock_minutes`；App 层加空闲计时器，到时调用 `useAuth().lock()`。

#### 2. 外观
- 直接复用现有 [AppearanceSection](../../src/components/features/settings/AppearanceSection.tsx)，无逻辑改动。

#### 3. AI 能力（新建容器 `AiCapabilitySection`，内含两子区）
- **AI 助手**：复用 [AiProviderSection](../../src/components/features/settings/AiProviderSection.tsx)（已自包含 hook）。
- **AI 智能识别**：复用 [SettingsOcrSection](../../src/components/SettingsOcrSection.tsx)，将 `useOCRConfig` 从 Settings 顶层移入本面板。

#### 4. 数据与存储（新建容器 `DataStorageSection`）
- **数据存储路径**：复用 [DataPathSection](../../src/components/features/settings/DataPathSection.tsx)（全部用户）。
- **数据库引擎**：复用 [SettingsSqliteSection](../../src/components/SettingsSqliteSection.tsx)，`useSqliteSettings` 移入本面板（全部用户，维持现状可见性）。
- **备份与恢复**：将 [SnapshotsTab](../../src/components/SnapshotsTab.tsx) 搬来（**admin 面板级门控**，非 admin 不显示此子区）。
- **PII 加密密钥**：复用 [SettingsPiiKeySection](../../src/components/features/settings/SettingsPiiKeySection.tsx)（**admin 面板级门控**）。

> **权限决策**：`备份与恢复` 和 `PII 加密密钥` 因破坏性/安全敏感做 admin 门控（快照原本就在 admin-only 的用户管理里）。`数据路径` 与 `数据库引擎` **维持现状对 `settings:read` 可见**，避免隐藏现有功能。门控用 `usePermission().isAdmin()`。

#### 5. 通知与偏好（新建 `PreferencesSection`）
- **默认起始页**：下拉选择业务页面 → 存 `user-preference` key `default_start_page`；[App.tsx](../../src/App.tsx#L174) 初始化 `currentPage` 时读取（无值则 `dashboard`）。
- **Toast 停留时长**：短 / 正常 / 长 → 存 `user-preference` key `toast_duration`；`toastStore` 读取默认时长。

#### 6. 关于与帮助（容器 `AboutHelpSection`）
- **关于**：复用 [AboutSection](../../src/components/features/settings/AboutSection.tsx)（版本 / 更新 / 更新日志）。
- **快捷键参考**：新建静态列表组件，列出 `Ctrl+B`(折叠侧边栏) / `Ctrl+L`(锁屏) / `F11`(全屏) / `Esc`(退出全屏) / `G+字母`(页面导航) 等。

## 五、头号特性：设置内搜索

### 交互
- 头部搜索框，输入即时过滤。
- 有输入时，左栏顶部出现"🔍 搜索结果"区，列出所有命中的**设置项**（按分类分组）。
- 点击某命中项 → 切到其所在分类面板 + 滚动到该控件 + 短暂高亮环（`ring` 动画 ~1.2s 后淡出）。
- 清空搜索 → 恢复正常分类导航。

### 实现
- 建立**静态设置项注册表** `settingsSearchIndex`（纯前端常量，位置建议 `src/constants/settingsIndex.ts`）：
  ```ts
  interface SettingItem {
    id: string          // 锚点 id，如 'change-password'
    label: string       // 显示名，如 '修改密码'
    keywords: string[]  // 搜索关键词，如 ['密码','password','改密码']
    category: SettingCategory  // 所属分类
  }
  ```
- 搜索用简单包含匹配（label + keywords，忽略大小写），命中项返回其 category + id。
- 各面板的对应控件外层加 `id={item.id}` + `data-setting-anchor`，供滚动定位与高亮。
- 纯前端，**不涉及后端**。

## 六、后端改动：新增自助改密码端点

现有 [`POST /api/auth/reset-password`](../../EngineeringManager.Api/Endpoints/AuthEndpoints.cs#L60) 是 **admin 重置他人密码**（强制 `isAdmin` + 不校验旧密码），**不可复用**。新增：

```
POST /api/auth/change-password
Body: { oldPassword: string, newPassword: string }
```
- **鉴权**：仅需已登录（任意角色）；目标用户 = JWT `uid`（`CurrentUser.GetUserId(ctx)`），**不要求 admin**。
- **逻辑**：
  1. 取当前用户 → 校验 `oldPassword`（`Common.HashPassword` + `CryptographicOperations.FixedTimeEquals`，遵循 P1-5）。
  2. 校验 `newPassword` 非空且 ≥6 位。
  3. 生成新 salt + hash（version=2, 210k 迭代），`UPDATE users SET password_hash, password_salt, password_hash_version=2, is_default_password=0 WHERE id=@uid`（遵循"写 password_hash 必同置 is_default_password=0"不变量）。
  4. 写审计日志（user_id 取自 JWT，遵循 P1-4）。
- **限流**：套用现有 `write` 限流（30 次/秒/IP）。
- **错误**：用 `ex.SanitizedMessage()`，不回显内部细节（遵循 P1-3）。
- **前端接线**：`tauri-bridge.ts` 加 `changeOwnPassword(old, new)`；`api-adapter` / `electron.d.ts` 补类型。
- **顺带**：修正 [App.tsx](../../src/App.tsx#L328) 默认密码提示文案为"请在【设置 → 个人账户】中自行修改"。

## 七、用户管理页清理

- 从 [Users.tsx](../../src/components/Users.tsx) 移除 `snapshots` tab（import、tab 定义、渲染分支三处）。
- 用户管理保留：用户列表 / 角色权限 / 项目授权 / 操作日志。语义收敛为"管理员后台"。

## 八、数据持久化

- 所有偏好走已有 [`/api/user-preferences`](../../EngineeringManager.Api/Endpoints/UserPreferencesEndpoints.cs)（`getUserPreference` / `putUserPreference`，`tauri-bridge` 已具备）。
- 新增偏好键：`auto_lock_minutes` / `default_start_page` / `toast_duration`。
- 分类停留位置可用 `localStorage`（非敏感、无需多设备同步）。

## 九、测试计划

### 后端（EngineeringManager.Tests）
- `change-password`：旧密码正确→成功且 `is_default_password=0`；旧密码错误→失败；新密码 <6 位→失败；未登录→401；非 admin 也能改自己→成功。
- 回归：`reset-password` admin 语义不变。

### 前端（vitest）
- 设置搜索：关键词命中正确分类/项；清空恢复。
- 个人账户：改密码表单校验（两次不一致、<6 位）。
- 数据与存储：非 admin 不渲染"备份与恢复"和"PII 密钥"子区；admin 渲染。
- 按需挂载：切换分类时只挂载目标面板（可断言未选中面板的请求未触发）。
- 复用组件回归：外观 / OCR / SQLite / About 既有测试通过。

### 红绿灯（release 前）
- 后端 build + test、前端 `npm run check`、`vite build`、`tsc --noEmit`、vitest 全绿。

## 十、风险与假设

- **假设**：`toastStore` 可接受可配置默认时长（若不支持则加一个 store 字段，改动极小）。
- **风险**：数据 hook 下沉需确保原有 props 传递链正确改写，避免遗漏导致面板拿不到数据 → 测试覆盖"按需挂载"用例兜底。
- **风险**：搜索的滚动定位依赖各控件挂 `id` → 注册表与实际 id 需一一对应，加一个开发期校验（缺 id 时 console.warn）。
- **兼容**：迁移快照后，老用户习惯从"用户管理→数据回滚"进入 → 可在用户管理页对应位置留一句"已移至 设置→数据与存储→备份与恢复"提示（可选）。

## 十一、改动文件清单（预估）

**新建**
- `src/components/features/settings/AccountSection.tsx`（个人账户）
- `src/components/features/settings/PreferencesSection.tsx`（通知与偏好）
- `src/components/features/settings/ShortcutsReference.tsx`（快捷键参考）
- `src/components/features/settings/SettingsSearch.tsx`（搜索框 + 结果）
- `src/components/features/settings/SettingsNav.tsx`（左侧导航）
- `src/constants/settingsIndex.ts`（搜索注册表）

**改动**
- `src/components/Settings.tsx`（重构为导航+面板容器，hook 下沉）
- `src/components/Users.tsx`（移除快照 tab）
- `src/App.tsx`（默认起始页读取、自动锁屏计时器、提示文案）
- `src/services/tauri-bridge.ts` / `api-adapter` / `src/types/electron.d.ts`（改密码接口）
- `src/store/toastStore`（可配置时长，若需要）
- `EngineeringManager.Api/Endpoints/AuthEndpoints.cs`（change-password 端点）

**复用（挪位不改逻辑）**
- AppearanceSection / AiProviderSection / SettingsOcrSection / DataPathSection / SettingsSqliteSection / SettingsPiiKeySection / AboutSection / SnapshotsTab

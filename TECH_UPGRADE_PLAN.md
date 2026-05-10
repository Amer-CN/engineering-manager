# 工程管家 - 技术提升实施方案

## 概述

本方案旨在提升团队技术水平，规范化代码结构，提高代码可维护性和可扩展性。

---

## 第一阶段：TypeScript 类型安全强化

### 目标
消除代码中的 `any` 类型，实现严格类型检查

### 具体任务

#### 1.1 完善类型定义文件
**文件**: `src/types/electron.ts`

```typescript
// 现状: 部分类型缺失，很多地方用 any
// 目标: 完整类型定义

// 新增类型
interface AppConfig {
  dataPath: string
  theme?: 'light' | 'dark' | 'system'
  language?: 'zh-CN' | 'en'
}

interface Database {
  projects: Project[]
  members: Member[]
  tasks: Task[]
  materials: Material[]
  expenses: Expense[]
  drawings: Drawing[]
  partners: Partner[]
  // ... 其他表
}

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
```

#### 1.2 严格化 TypeScript 配置
**文件**: `tsconfig.json`

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

#### 1.3 类型守卫函数
```typescript
// src/types/guards.ts
export function isProject(obj: unknown): obj is Project {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'name' in obj
}

export function isMember(obj: unknown): obj is Member {
  return typeof obj === 'object' && obj !== null && 'name' in obj
}
```

### 预期产出
- 完整的类型定义文件
- 消除所有 `any` 类型
- 编译时错误检测

---

## 第二阶段：抽取公共 Hooks

### 目标
提取重复逻辑为可复用 Hooks，减少代码冗余

### 具体任务

#### 2.1 数据加载 Hook - useApi
**文件**: `src/hooks/useApi.ts`

```typescript
// 功能: 统一 API 调用和数据加载
// 支持: 加载状态、错误处理、刷新机制

interface UseApiOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

export function useApi<T>(
  apiFn: () => Promise<T>,
  options?: UseApiOptions<T>
) {
  // 返回: data, loading, error, refresh
}
```

#### 2.2 CRUD 操作 Hook - useCrud
**文件**: `src/hooks/useCrud.ts`

```typescript
// 功能: 通用增删改查
// 支持: 列表、详情、创建、更新、删除

export function useCrud<T extends { id: number }>(config: {
  fetchAll: () => Promise<T[]>
  fetchOne: (id: number) => Promise<T>
  create: (data: Omit<T, 'id'>) => Promise<T>
  update: (data: T) => Promise<T>
  remove: (id: number) => Promise<void>
}) {
  // 返回: { items, item, loading, error, create, update, remove, refresh }
}
```

#### 2.3 模态框 Hook - useModal
**文件**: `src/hooks/useModal.ts`

```typescript
// 功能: 模态框状态管理

export function useModal<T = unknown>() {
  // 返回: { isOpen, data, open, openWith, close }
}
```

#### 2.4 表单处理 Hook - useForm
**文件**: `src/hooks/useForm.ts`

```typescript
// 功能: 表单状态和验证

interface UseFormOptions<T> {
  initialValues: T
  validate?: (values: T) => Record<string, string>
  onSubmit?: (values: T) => Promise<void>
}

export function useForm<T>(options: UseFormOptions<T>) {
  // 返回: { values, errors, touched, handleChange, handleBlur, handleSubmit, reset }
}
```

#### 2.5 本地数据 Hook - useLocalData
**文件**: `src/hooks/useLocalData.ts`

```typescript
// 功能: electron IPC 数据交互封装

export function useLocalData<T>(key: string) {
  // 返回: { data, loading, create, update, delete, refresh }
}
```

### Hooks 目录结构
```
src/hooks/
├── index.ts              # 统一导出
├── useApi.ts            # API 调用
├── useCrud.ts           # CRUD 操作
├── useModal.ts          # 模态框
├── useForm.ts           # 表单处理
├── useDebounce.ts       # 防抖
├── useLocalStorage.ts   # 本地存储
└── usePagination.ts     # 分页
```

### 预期产出
- 7+ 个可复用 Hooks
- 组件代码量减少 30-40%
- 统一的数据处理模式

---

## 第三阶段：抽取公共组件

### 目标
建立统一 UI 组件库，保证视觉一致性

### 具体任务

#### 3.1 基础组件

**Table 组件** - `src/components/ui/Table.tsx`
- 支持: 列配置、排序、分页、选择
- 属性: columns, data, pagination, onSort, onSelect

**Modal 组件** - `src/components/ui/Modal.tsx`
- 支持: 标题、内容、footer、尺寸、动画
- 属性: isOpen, onClose, title, size, children

**Form 组件** - `src/components/ui/Form.tsx`
- 支持: 输入框、下拉框、日期选择、验证
- 子组件: Form.Item, Form.Input, Form.Select, Form.DatePicker

**Button 组件** - `src/components/ui/Button.tsx`
- 变体: primary, secondary, danger, ghost
- 尺寸: sm, md, lg
- 状态: loading, disabled

#### 3.2 业务组件

**DataTable 组件** - 带 CRUD 操作的表格
```typescript
interface DataTableProps<T> {
  columns: Column<T>[]
  api: CrudApi<T>
  searchFields?: string[]
}
```

**PageHeader 组件** - 页面标题栏
```typescript
interface PageHeaderProps {
  title: string
  icon?: string
  actions?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}
```

### 组件目录结构
```
src/components/
├── ui/                    # 基础 UI 组件
│   ├── index.ts          # 统一导出
│   ├── Button.tsx
│   ├── Modal.tsx
│   ├── Table.tsx
│   ├── Form.tsx
│   ├── Select.tsx
│   ├── Input.tsx
│   ├── DatePicker.tsx
│   ├── Badge.tsx
│   └── Card.tsx
├── business/              # 业务组件
│   ├── DataTable.tsx
│   ├── PageHeader.tsx
│   ├── SearchBar.tsx
│   ├── EmptyState.tsx
│   └── ConfirmDialog.tsx
└── layout/                # 布局组件
    ├── Sidebar.tsx
    ├── Header.tsx
    └── PageLayout.tsx
```

### 预期产出
- 10+ 基础 UI 组件
- 5+ 业务组件
- 统一的视觉规范

---

## 第四阶段：Electron 主进程重构

### 目标
拆分过大的 main.ts，实现模块化

### 具体任务

#### 4.1 目录结构调整
```
electron/
├── main.ts              # 入口 (~100行)
├── ipc/                 # IPC 处理器
│   ├── index.ts         # 统一注册
│   ├── projects.ts
│   ├── members.ts
│   ├── contracts.ts
│   ├── expenses.ts
│   └── ...
├── database/            # 数据层
│   ├── store.ts         # 数据存储
│   └── migrations.ts    # 数据迁移
├── windows/             # 窗口管理
│   └── windowManager.ts
├── utils/              # 工具函数
│   ├── logger.ts
│   ├── path.ts
│   └── file.ts
└── config.ts            # 配置管理
```

#### 4.2 IPC 处理器示例
**文件**: `electron/ipc/projects.ts`

```typescript
import { ipcMain } from 'electron'
import { store } from '../database/store'

export function registerProjectHandlers() {
  ipcMain.handle('db:projects:getAll', async () => {
    return store.projects
  })

  ipcMain.handle('db:projects:create', async (_, project) => {
    const newProject = { ...project, id: Date.now(), createdAt: new Date().toISOString() }
    store.projects.push(newProject)
    return newProject
  })

  // ... 其他方法
}
```

#### 4.3 统一 IPC 入口
**文件**: `electron/ipc/index.ts`

```typescript
import { registerProjectHandlers } from './projects'
import { registerMemberHandlers } from './members'
import { registerContractHandlers } from './contracts'
// ...

export function registerAllIpcHandlers() {
  registerProjectHandlers()
  registerMemberHandlers()
  registerContractHandlers()
  // ...
}
```

### 预期产出
- main.ts 从 ~1870 行减少到 ~100 行
- 每个 IPC 模块独立维护
- 便于测试和扩展

---

## 第五阶段：状态管理引入（可选）

### 目标
引入轻量级状态管理，解决跨组件数据共享

### 方案选择

| 方案 | 体积 | 复杂度 | 适用场景 |
|------|------|--------|----------|
| Zustand | ~1KB | 低 | 本项目（推荐） |
| Jotai | ~3KB | 低 | 原子化状态 |
| Redux Toolkit | ~10KB | 中 | 复杂应用 |

### 具体任务

#### 5.1 Zustand Store 设计

**文件**: `src/store/index.ts`

```typescript
import { create } from 'zustand'

// 项目状态
interface ProjectStore {
  projects: Project[]
  selectedProject: Project | null
  loading: boolean
  setProjects: (projects: Project[]) => void
  selectProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (project: Project) => void
  removeProject: (id: number) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  selectedProject: null,
  loading: false,
  setProjects: (projects) => set({ projects }),
  selectProject: (project) => set({ selectedProject: project }),
  // ...
}))
```

### 预期产出
- 统一的状态管理
- 简化组件间数据传递
- 支持持久化

---

## 实施顺序

```
┌─────────────────────────────────────────────────────────────┐
│  第一阶段 → 第二阶段 → 第三阶段 → 第四阶段 → 第五阶段       │
│  TypeScript  → Hooks    → 组件     → Electron → 状态管理    │
│  类型强化     抽取       抽取       重构      引入           │
└─────────────────────────────────────────────────────────────┘
```

### 推荐顺序理由
1. **TypeScript 先行** - 为后续重构提供类型保障
2. **Hooks 其次** - 减少重复代码，快速见效
3. **组件第三** - 统一 UI，保证一致性
4. **Electron 重构** - 复杂度高，最后处理
5. **状态管理** - 可选，根据需求决定

---

## 风险评估

| 阶段 | 风险 | 影响 | 缓解措施 |
|------|------|------|----------|
| 第一阶段 | 编译错误多 | 中 | 分批修改，设置过渡期 |
| 第二阶段 | Hook 设计不合理 | 低 | 参考成熟方案 |
| 第三阶段 | UI 不一致 | 低 | 保留原有组件做对比 |
| 第四阶段 | IPC 通信问题 | 高 | 充分测试 |
| 第五阶段 | 状态同步问题 | 中 | 保留部分 localStorage |

---

## 验收标准

- [ ] TypeScript 编译零错误
- [ ] 组件代码量减少 30%+
- [ ] 所有页面使用统一组件库
- [ ] Electron main.ts < 200 行
- [ ] 新功能开发效率提升 20%+

---

## 文档产出

- [ ] `docs/hooks-guide.md` - Hooks 使用指南
- [ ] `docs/components-guide.md` - 组件使用文档
- [ ] `docs/architecture.md` - 架构设计文档

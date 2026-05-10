# 模块边界设计规范

> ⚠️ **本文档描述目标架构（规划）**，当前项目实际架构请参考 `MEMORY.md`。
> 部分目录（如 `electron/ipc/handlers/`、`src/services/api/`）尚未实现，以实际代码为准。

> 版本: 1.0.0
> 更新时间: 2026-04-30
> 维护者: 软件架构师

---

## 1. 设计原则

| 原则 | 说明 |
|------|------|
| **单一职责** | 每个模块只负责一件事 |
| **高内聚** | 相关功能放在一起 |
| **低耦合** | 模块之间依赖最小化 |
| **可测试** | 每个模块可独立测试 |

---

## 2. 目录结构规范

```
src/
├── components/                    # React 组件
│   ├── ui/                        # 🔵 UI 基础组件 (原子)
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.css
│   │   │   └── index.ts
│   │   ├── Input/
│   │   ├── Modal/
│   │   ├── Table/
│   │   ├── Card/
│   │   ├── Badge/
│   │   ├── Select/
│   │   ├── DatePicker/
│   │   ├── FileUpload/
│   │   └── index.ts
│   │
│   ├── business/                  # 🟢 业务组件 (分子)
│   │   ├── ProjectCard/
│   │   ├── MemberRow/
│   │   ├── TaskItem/
│   │   ├── ContractStatusBadge/
│   │   ├── StatCard/
│   │   ├── FormSection/
│   │   └── index.ts
│   │
│   └── features/                  # 🟠 功能组件 (有机体)
│       ├── projects/
│       │   ├── ProjectList.tsx
│       │   ├── ProjectForm.tsx
│       │   ├── ProjectDetail.tsx
│       │   ├── ProjectFilters.tsx
│       │   └── index.ts
│       │
│       ├── members/
│       │   ├── MemberList.tsx
│       │   ├── MemberForm.tsx
│       │   ├── MemberDetail.tsx
│       │   └── index.ts
│       │
│       ├── contracts/
│       │   ├── ContractList.tsx
│       │   ├── ContractForm.tsx
│       │   ├── ContractDetail.tsx
│       │   └── index.ts
│       │
│       └── ...
│
├── hooks/                         # 🔶 自定义 Hooks
│   ├── useProjects.ts            # 项目管理
│   ├── useMembers.ts             # 人员管理
│   ├── useTasks.ts              # 任务管理
│   ├── useContracts.ts          # 合同管理
│   ├── usePagination.ts         # 分页逻辑
│   ├── useFilters.ts            # 筛选逻辑
│   ├── useModal.ts              # 弹窗状态
│   ├── useForm.ts               # 表单状态
│   ├── useAsync.ts              # 异步操作
│   └── index.ts
│
├── services/                      # 🔷 API 服务层
│   ├── api/                       # API 调用封装
│   │   ├── client.ts             # API 客户端
│   │   ├── project.api.ts
│   │   ├── member.api.ts
│   │   ├── task.api.ts
│   │   ├── contract.api.ts
│   │   └── index.ts
│   │
│   └── storage/                  # 本地存储
│       └── localStorage.ts
│
├── types/                         # 🔶 类型定义
│   ├── domain/                    # 领域模型
│   │   ├── Project.ts
│   │   ├── Member.ts
│   │   ├── Task.ts
│   │   ├── Contract.ts
│   │   └── index.ts
│   │
│   ├── api/                      # API 类型
│   │   ├── requests.ts
│   │   ├── responses.ts
│   │   └── index.ts
│   │
│   ├── common/                   # 公共类型
│   │   ├── Result.ts
│   │   ├── Error.ts
│   │   ├── Guards.ts
│   │   └── index.ts
│   │
│   └── electron.d.ts             # Electron API 类型
│
├── utils/                         # 🔶 工具函数
│   ├── formatters.ts             # 格式化函数
│   ├── validators.ts            # 校验函数
│   ├── constants.ts              # 常量定义
│   └── index.ts
│
└── layouts/                       # 🔷 布局组件
    ├── MainLayout.tsx
    ├── Sidebar.tsx
    ├── Header.tsx
    └── index.ts
```

---

## 3. 组件拆分标准

### 3.1 拆分阈值

| 指标 | 警告 | 需拆分 |
|------|------|--------|
| 单文件行数 | > 200 | > 300 |
| Props 数量 | > 10 | > 15 |
| useState 数量 | > 8 | > 12 |
| useEffect 数量 | > 5 | > 8 |

### 3.2 组件层级

```
┌─────────────────────────────────────────────────────────────┐
│                      组件层级图                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   🔵 UI 组件 (原子)                                          │
│   ├── 职责: 基础展示，无业务逻辑                              │
│   ├── 示例: Button, Input, Modal, Table                      │
│   └── 特点: 纯函数，可复用性最高                              │
│                                                             │
│   🟢 业务组件 (分子)                                         │
│   ├── 职责: 组合 UI 组件，展示单一业务实体                     │
│   ├── 示例: ProjectCard, MemberRow                          │
│   └── 特点: 接收数据，有简单交互                               │
│                                                             │
│   🟠 功能组件 (有机体)                                       │
│   ├── 职责: 完整业务功能，组合多个业务组件                      │
│   ├── 示例: ProjectList, ProjectForm                        │
│   └── 特点: 包含数据获取、状态管理                            │
│                                                             │
│   🟣 页面组件 (生物体)                                       │
│   ├── 职责: 路由页面，组合功能组件                            │
│   ├── 示例: ProjectsPage, MembersPage                       │
│   └── 特点: 连接路由，管理布局                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. 组件命名规范

### 4.1 文件命名

| 组件类型 | 命名规范 | 示例 |
|----------|----------|------|
| UI 组件 | PascalCase | `Button.tsx`, `DataTable.tsx` |
| 业务组件 | PascalCase | `ProjectCard.tsx`, `StatCard.tsx` |
| 功能组件 | PascalCase | `ProjectList.tsx`, `MemberForm.tsx` |
| 页面组件 | PascalCase + Page | `ProjectsPage.tsx`, `DashboardPage.tsx` |
| Hooks | camelCase + use | `useProjects.ts`, `usePagination.ts` |
| 工具函数 | camelCase | `formatters.ts`, `validators.ts` |

### 4.2 组件命名

```typescript
// ✅ 推荐命名
export function Button() { }
export function ProjectCard() { }
export function ProjectList() { }
export function ProjectsPage() { }

// ❌ 避免命名
export function button() { }
export function Project() { }  // 容易与类型混淆
export function List() { }      // 太通用
```

---

## 5. IPC 模块划分 (Electron)

### 5.1 Electron 目录结构

```
electron/
├── main.ts                        # 入口 (~100行)
│
├── ipc/                           # IPC 处理层
│   ├── index.ts                  # 统一注册 (~50行)
│   │
│   ├── handlers/                 # 处理器
│   │   ├── project.handler.ts
│   │   ├── member.handler.ts
│   │   ├── task.handler.ts
│   │   ├── contract.handler.ts
│   │   ├── invoice.handler.ts
│   │   ├── settlement.handler.ts
│   │   ├── inventory.handler.ts
│   │   ├── wage.handler.ts
│   │   └── index.ts
│   │
│   └── validators/               # 参数校验
│       ├── project.validator.ts
│       ├── member.validator.ts
│       └── index.ts
│
├── domain/                        # 领域层
│   ├── entities/
│   │   ├── Project.ts
│   │   ├── Member.ts
│   │   ├── Task.ts
│   │   ├── Contract.ts
│   │   └── index.ts
│   │
│   ├── repositories/             # 仓储接口
│   │   ├── IProjectRepository.ts
│   │   ├── IMemberRepository.ts
│   │   └── index.ts
│   │
│   └── services/                 # 领域服务
│       ├── ProjectService.ts
│       └── index.ts
│
├── infrastructure/                # 基础设施层
│   ├── storage/
│   │   ├── DataStore.ts         # JSON 数据存储
│   │   ├── FileStore.ts         # 文件存储
│   │   └── index.ts
│   │
│   ├── database/
│   │   ├── Database.ts          # SQLite 数据库
│   │   └── migrations/
│   │       ├── 001_initial.sql
│   │       └── index.ts
│   │
│   └── config/
│       └── AppConfig.ts
│
├── windows/
│   ├── WindowManager.ts          # 窗口管理
│   └── index.ts
│
└── utils/
    ├── logger.ts                 # 日志工具
    ├── path.ts                   # 路径工具
    └── index.ts
```

### 5.2 IPC 路由注册规范

```typescript
// electron/ipc/index.ts

import { ipcMain } from 'electron'
import { ProjectHandler } from './handlers/project.handler'
import { MemberHandler } from './handlers/member.handler'

export function registerIpcHandlers() {
  const projectHandler = new ProjectHandler()
  const memberHandler = new MemberHandler()

  // 项目路由
  ipcMain.handle('projects:getAll', (_, filters) => 
    projectHandler.getAll(filters)
  )
  ipcMain.handle('projects:getById', (_, id) => 
    projectHandler.getById(id)
  )
  ipcMain.handle('projects:create', (_, data) => 
    projectHandler.create(data)
  )
  ipcMain.handle('projects:update', (_, id, data) => 
    projectHandler.update(id, data)
  )
  ipcMain.handle('projects:delete', (_, id) => 
    projectHandler.delete(id)
  )

  // 成员路由
  ipcMain.handle('members:getAll', (_, filters) => 
    memberHandler.getAll(filters)
  )
  // ...
}
```

### 5.3 Handler 实现规范

```typescript
// electron/ipc/handlers/project.handler.ts

import log from 'electron-log'
import { handleError, Result } from '@/types/common'
import { Project } from '@/domain/entities/Project'

export class ProjectHandler {
  
  async getAll(filters?: ProjectFilters): Promise<Result<Project[]>> {
    try {
      const projects = await this.projectRepository.findWithFilters(filters)
      return { success: true, data: projects }
    } catch (error) {
      log.error('获取项目列表失败:', error)
      return { success: false, error: handleError(error).message }
    }
  }

  async create(data: CreateProjectDTO): Promise<Result<{ id: string }>> {
    try {
      // 1. 参数校验
      const validation = this.validate(data)
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') }
      }

      // 2. 创建实体
      const project = Project.create(data)

      // 3. 保存
      await this.projectRepository.save(project)

      // 4. 记录日志
      log.info(`项目创建成功: ${project.id}`)

      return { success: true, data: { id: project.id } }
    } catch (error) {
      log.error('创建项目失败:', error)
      return { success: false, error: handleError(error).message }
    }
  }

  private validate(data: CreateProjectDTO): ValidationResult {
    const errors: string[] = []
    
    if (!data.name || data.name.trim() === '') {
      errors.push('项目名称不能为空')
    }
    
    if (data.budget < 0) {
      errors.push('预算不能为负数')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}
```

---

## 6. 模块间依赖规则

```
┌─────────────────────────────────────────────────────────────┐
│                    依赖方向示意图                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────┐                                            │
│    │  layouts │ ←─────────────── 依赖                       │
│    └────┬─────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │ features │ ←─────────────── 依赖                       │
│    └────┬─────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │ business │ ←─────────────── 依赖                       │
│    └────┬─────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │    ui    │ ←─────────────── 依赖                       │
│    └──────────┘                                            │
│                                                             │
│    ┌──────────┐                                            │
│    │  hooks   │ ←─────────────── 依赖                       │
│    └────┬─────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │ services │ ←─────────────── 依赖                       │
│    └──────────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │  types   │ ←─────────────── 依赖                       │
│    └──────────┘                                            │
│         │                                                  │
│         ↓                                                  │
│    ┌──────────┐                                            │
│    │  utils   │ ←─────────────── 无依赖                     │
│    └──────────┘                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘

依赖规则：
✅ ui → (无依赖)
✅ business → ui, types
✅ features → business, hooks, types
✅ hooks → services, types
✅ services → types
❌ 禁止反向依赖
❌ 禁止跨层依赖 (如 features 直接依赖 ui)
```

---

## 7. 实施检查清单

### 7.1 目录结构检查

- [ ] `src/components/ui/` 目录已创建
- [ ] `src/components/business/` 目录已创建
- [ ] `src/components/features/` 目录已创建
- [ ] `src/hooks/` 目录已创建
- [ ] `src/services/` 目录已创建
- [ ] `src/types/domain/` 目录已创建
- [ ] `src/types/common/` 目录已创建

### 7.2 组件拆分检查

- [ ] `Projects.tsx` (1080行) 已拆分
- [ ] `Members.tsx` (680行) 已拆分
- [ ] 其他超大组件已拆分

### 7.3 IPC 模块化检查

- [ ] `electron/main.ts` 行数 ≤ 150
- [ ] IPC handlers 已拆分
- [ ] 数据存储已分离

---

*文档版本: 1.0.0*

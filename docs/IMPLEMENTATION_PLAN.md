# 架构重构实施任务清单

> 版本: 1.0.0
> 更新时间: 2026-04-30
> 负责人: 软件架构师

---

## 📊 任务概览

| 类别 | 架构师实施 | 开发工程师实施 | 合计 |
|------|-----------|---------------|------|
| ✅ 已完成 | 2 | - | 2 |
| 🟢 可立即实施 | 5 | - | 5 |
| 🔵 需开发工程师 | - | 8 | 8 |
| **总计** | **7** | **8** | **15** |

---

## ✅ 已完成项 (架构师实施)

### 1. 创建类型守卫函数库 ✅

- **文件**: `src/types/guards.ts`
- **内容**:
  - 基础类型守卫 (isString, isNumber, isBoolean, isDateString)
  - 实体类型守卫 (isProject, isMember, isTask, etc.)
  - 数组类型守卫 (isProjectArray, isMemberArray, etc.)
  - Result 类型守卫 (isSuccess, isFailure)
- **状态**: ✅ 已完成

### 2. 创建公共类型定义 ✅

- **文件**: 
  - `src/types/common/Result.ts`
  - `src/types/common/Error.ts`
  - `src/types/common/index.ts`
- **内容**:
  - Result 类型 (成功/失败结果)
  - VoidResult 类型
  - PaginatedResult 类型
  - AppError 类
  - ErrorCode 枚举
  - handleError 函数
  - tryCatch / tryCatchAsync 辅助函数
- **状态**: ✅ 已完成

---

## 🟢 可立即实施项 (架构师实施)

### 3. 创建规范文档 🟢

- **文件**:
  - `docs/TYPE_AUDIT.md` - 类型审核报告
  - `docs/MODULE_DESIGN.md` - 模块边界设计规范
  - `docs/CODE_CONVENTIONS.md` - 代码规范手册
  - `docs/HOOKS_API.md` - Hooks API 设计规范
- **状态**: ✅ 已完成

### 4. 创建类型入口文件 🟢

- **文件**: `src/types/index.ts`
- **内容**:
  - 统一导出所有类型
  - 类型别名定义 (EntityId, DateString, Nullable, Optional)
- **状态**: ✅ 已完成

### 5. 创建标准 Hooks 模板 🟢

- **文件**: `src/hooks/useProjects.ts` (示例)
- **内容**:
  - 标准返回值接口定义
  - useProjects Hook 实现模板
  - usePagination Hook
  - useFilters Hook
  - useModal Hook
  - useAsync Hook
- **状态**: ✅ 已完成 (模板)

### 6. 创建 IPC 模块化模板 🟢

- **文档**: `docs/MODULE_DESIGN.md` 第 5 节
- **内容**:
  - Electron 目录结构
  - IPC 路由注册规范
  - Handler 实现规范
- **状态**: ✅ 已完成 (设计文档)

### 7. 创建组件拆分模板 🟢

- **文档**: `docs/MODULE_DESIGN.md` 第 3 节
- **内容**:
  - 组件拆分标准
  - 目录结构设计
  - 组件层级定义
- **状态**: ✅ 已完成 (设计文档)

---

## 🔵 待开发工程师实施项

### 8. 消除 DashboardStats 类型 (高优先级)

- **文件**: `src/types/electron.d.ts`
- **问题**: 当前已修复 (`recentProjects: Project[]`, `recentTasks: Task[]`)
- **验证**: 运行 TypeScript 编译确认无错误

```bash
npm run type-check
# 或
npx tsc --noEmit
```

---

### 9. 重构超大组件 (高优先级)

#### 9.1 Projects.tsx (1080 行)

| 任务 | 描述 | 预估时间 |
|------|------|----------|
| 拆分 ProjectList | 提取列表展示组件 | 2h |
| 拆分 ProjectForm | 提取表单组件 | 2h |
| 拆分 ProjectFilters | 提取筛选组件 | 1h |
| 拆分 ProjectDetail | 提取详情组件 | 2h |
| 合并 useProjects | 提取业务逻辑到 Hook | 1h |

#### 9.2 Members.tsx (680 行)

| 任务 | 描述 | 预估时间 |
|------|------|----------|
| 拆分 MemberList | 提取列表展示组件 | 1.5h |
| 拆分 MemberForm | 提取表单组件 | 2h |
| 拆分 WorkerSection | 提取农民工模块 | 1.5h |
| 合并 useMembers | 提取业务逻辑到 Hook | 1h |

---

### 10. 重构 Electron Main 进程 (高优先级)

- **文件**: `electron/main.ts` (1870 行)
- **目标**: 拆分为多个模块

| 任务 | 描述 | 预估时间 |
|------|------|----------|
| 创建 ipc/index.ts | 统一 IPC 注册 | 1h |
| 创建 handlers/project.handler.ts | 项目处理器 | 2h |
| 创建 handlers/member.handler.ts | 人员处理器 | 2h |
| 创建 handlers/contract.handler.ts | 合同处理器 | 2h |
| 创建 storage/DataStore.ts | 数据存储分离 | 2h |
| 精简 main.ts | 保留入口逻辑 (< 150行) | 1h |

---

### 11. 统一错误处理模式 (中优先级)

- **目标**: 所有组件使用 handleError 函数

```typescript
// ❌ 当前模式 (如有)
} catch (error: any) {
  showToast(error.message)
}

// ✅ 目标模式
} catch (error: unknown) {
  const appError = handleError(error)
  showToast(appError.getUserMessage())
}
```

**需检查文件**:
- `src/components/Dashboard.tsx`
- `src/components/Projects.tsx`
- `src/components/Members.tsx`
- `src/components/Contracts.tsx`

---

### 12. 创建自定义 Hooks (中优先级)

- **文件**: 需在 `src/hooks/` 目录创建

| Hook | 文件 | 用途 |
|------|------|------|
| useMembers | `useMembers.ts` | 人员管理状态和操作 |
| useTasks | `useTasks.ts` | 任务管理状态和操作 |
| useContracts | `useContracts.ts` | 合同管理状态和操作 |
| useInvoices | `useInvoices.ts` | 发票管理状态和操作 |
| useForm | `useForm.ts` | 表单状态管理 |

---

### 13. 创建 API 服务层 (中优先级)

- **文件**: 需在 `src/services/` 目录创建

| 文件 | 用途 |
|------|------|
| `api/client.ts` | API 客户端封装 |
| `api/project.api.ts` | 项目 API 封装 |
| `api/member.api.ts` | 人员 API 封装 |
| `api/contract.api.ts` | 合同 API 封装 |

---

### 14. 配置路径别名 (低优先级)

- **文件**: `tsconfig.json`, `vite.config.ts`
- **目标**: 配置 `@/` 路径别名

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}

// vite.config.ts
import path from 'path'
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

---

### 15. 添加代码检查 (低优先级)

- **建议配置**:
  - ESLint 配置
  - Prettier 配置
  - lint-staged (提交前检查)
  - Husky (Git hooks)

```bash
# 推荐安装
npm install -D eslint @typescript-eslint/eslint-plugin
npm install -D prettier lint-staged husky
```

---

## 📅 实施时间表

```
Week 1-2: 组件拆分
├── 拆分 Projects.tsx
├── 拆分 Members.tsx
└── 创建基础 Hooks

Week 3-4: Electron 重构
├── 创建 IPC 模块结构
├── 拆分 handlers
├── 精简 main.ts
└── 数据存储分离

Week 5-6: 完善基础设施
├── 创建 API 服务层
├── 统一错误处理
├── 配置路径别名
└── 添加代码检查
```

---

## 🎯 下一步行动

### 开发工程师任务

1. **立即**: 阅读规范文档
   - [ ] `docs/CODE_CONVENTIONS.md`
   - [ ] `docs/MODULE_DESIGN.md`
   - [ ] `docs/HOOKS_API.md`

2. **本周**: 组件拆分
   - [ ] 拆分 Projects.tsx
   - [ ] 拆分 Members.tsx
   - [ ] 使用新的 Hooks 模板

3. **下周**: Electron 重构
   - [ ] 创建 ipc/index.ts
   - [ ] 拆分 handlers
   - [ ] 精简 main.ts

### 架构师后续支持

- [ ] Review 拆分后的组件
- [ ] 提供 Electron 重构代码示例
- [ ] 设计数据库迁移方案
- [ ] 设计测试策略

---

## 📞 联系

如有问题，请在项目中创建 Issue 或联系架构师。

---

*文档版本: 1.0.0*
*最后更新: 2026-04-30*

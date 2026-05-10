# 代码规范手册

> 版本: 1.0.0
> 更新时间: 2026-04-30
> 维护者: 软件架构师

---

## 目录

1. [TypeScript 规范](#1-typescript-规范)
2. [组件编写规范](#2-组件编写规范)
3. [Git 提交规范](#3-git-提交规范)
4. [命名规范速查表](#4-命名规范速查表)

---

## 1. TypeScript 规范

### 1.1 类型定义

#### ✅ 推荐做法

```typescript
// 1. 使用显式类型声明
const name: string = '张三'
const age: number = 25
const isActive: boolean = true

// 2. 使用 interface 定义对象类型
interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
}

// 3. 使用 type 定义联合类型
type Status = 'active' | 'inactive' | 'pending'
type Result<T, E = string> = { success: true; data: T } | { success: false; error: E }

// 4. 函数返回类型必须声明
async function getUser(id: number): Promise<User | null> {
  const response = await api.get(`/users/${id}`)
  return response.data
}

// 5. 箭头函数显式类型
const addNumbers = (a: number, b: number): number => a + b
const formatDate = (date: Date): string => date.toISOString().split('T')[0]
```

#### ❌ 避免做法

```typescript
// 1. 禁止使用 any (特殊情况需加注释说明)
const data: any = response              // ❌
const data: unknown = response           // ✅

// 2. 禁止参数隐式 any
function processData(data) {             // ❌
  // ...
}
function processData(data: unknown) {    // ✅
  // ...
}

// 3. 禁止使用 var
var name = '张三'                        // ❌
const name = '张三'                       // ✅
let count = 0                            // ✅ (需要修改时)
```

### 1.2 泛型使用

```typescript
// ✅ 推荐：使用泛型约束
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key]
}

// ✅ 推荐：泛型接口
interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: string | null
}

// ✅ 推荐：泛型类型
type Nullable<T> = T | null
type Optional<T> = T | undefined
```

### 1.3 导入规则

```typescript
// ✅ 正确的导入顺序
// 1. React / 框架
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. 第三方库
import { Button, Modal } from 'antd'
import { v4 as uuidv4 } from 'uuid'

// 3. 内部模块 (使用路径别名)
import { useProjects } from '@/hooks/useProjects'
import { ProjectCard } from '@/components/business/ProjectCard'

// 4. 类型导入 (使用 type 关键字)
import type { Project, Member } from '@/types/domain'
import type { CreateProjectDTO } from '@/types/api'

// 5. 相对路径导入
import { formatDate } from './utils'
```

### 1.4 错误处理

```typescript
// ✅ 推荐：使用 Result 类型
async function fetchProject(id: number): Promise<Result<Project>> {
  try {
    const data = await api.get(`/projects/${id}`)
    return { success: true, data }
  } catch (error) {
    return { success: false, error: handleError(error).message }
  }
}

// ✅ 推荐：使用 unknown + handleError
try {
  await someOperation()
} catch (error: unknown) {
  const appError = handleError(error)
  showToast(appError.message)
}

// ❌ 避免：直接使用 any
try {
  await someOperation()
} catch (error: any) {          // ❌
  showToast(error.message)
}
```

---

## 2. 组件编写规范

### 2.1 组件结构顺序

```typescript
// ✅ 标准组件结构
export function ComponentName({ prop1, prop2 }: ComponentNameProps) {
  
  // ═══════════════════════════════════════
  // 1. Hooks (状态、副作用) - 按字母顺序
  // ═══════════════════════════════════════
  const [state, setState] = useState<StateType>(initialState)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  
  // ═══════════════════════════════════════
  // 2. Memoized values (记忆化值)
  // ═══════════════════════════════════════
  const memoizedValue = useMemo(() => {
    return computeExpensiveValue(value)
  }, [value])
  
  const callback = useCallback((param: Param) => {
    doSomething(param)
  }, [dependency])
  
  // ═══════════════════════════════════════
  // 3. Effects (副作用)
  // ═══════════════════════════════════════
  useEffect(() => {
    // 副作用逻辑
    loadData()
    
    return () => {
      // 清理逻辑
      cleanup()
    }
  }, [dependency])
  
  // ═══════════════════════════════════════
  // 4. Event handlers (事件处理)
  // ═══════════════════════════════════════
  const handleClick = useCallback((id: number) => {
    onAction(id)
  }, [onAction])
  
  const handleSubmit = useCallback(async (data: FormData) => {
    setLoading(true)
    try {
      await submit(data)
    } finally {
      setLoading(false)
    }
  }, [])
  
  // ═══════════════════════════════════════
  // 5. Render helpers (渲染辅助函数)
  // ═══════════════════════════════════════
  const renderHeader = () => (
    <div className="header">
      <h2>{title}</h2>
    </div>
  )
  
  const renderEmpty = () => (
    <Empty description="暂无数据" />
  )
  
  // ═══════════════════════════════════════
  // 6. Main render (主渲染)
  // ═══════════════════════════════════════
  if (loading) {
    return <Spinner />
  }
  
  return (
    <div className="container">
      {renderHeader()}
      {items.length === 0 ? renderEmpty() : (
        <List data={items} onClick={handleClick} />
      )}
    </div>
  )
}
```

### 2.2 Props 接口命名

```typescript
// ✅ 推荐：ComponentNameProps 格式
interface ProjectCardProps {
  project: Project
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

interface ProjectListProps {
  projects: Project[]
  selectedId?: number
  onSelect: (project: Project) => void
}

interface MemberFormProps {
  member?: Member           // 可选表示编辑模式
  onSubmit: (data: Member) => void
  onCancel: () => void
}

// ❌ 避免：混乱的命名
interface Props { ... }
interface CardProps { ... }
interface ItemProps { ... }
```

### 2.3 条件渲染

```typescript
// ✅ 推荐：三元运算符
{loading ? (
  <Spinner />
) : (
  <DataList data={data} />
)}

// ✅ 推荐：短路求值
{loading && <Spinner />}
{error && <ErrorMessage error={error} />}

// ✅ 推荐：提前返回
if (loading) {
  return <Spinner />
}

if (error) {
  return <ErrorMessage error={error} />
}

return <DataList data={data} />

// ❌ 避免：复杂的条件逻辑
{(() => {
  if (loading) return <Spinner />
  if (error) return <Error />
  if (data.length === 0) return <Empty />
  return <List data={data} />
})()}
```

### 2.4 列表渲染

```typescript
// ✅ 推荐：显式 key，使用解构
{items.map((item) => {
  const { id, name, status } = item
  return (
    <ListItem 
      key={id}
      id={id}
      name={name}
      status={status}
    />
  )
})}

// ❌ 避免：隐式 key
{items.map((item) => (
  <ListItem key={item.id} {...item} />  // 展开整个对象
))}
```

### 2.5 组件导出

```typescript
// ✅ 推荐：命名导出 + 默认导出
export function Button() { }
export function Input() { }

// 入口文件导出
export { Button, Input } from './index'

// ❌ 避免：只有默认导出
export default function Button() { }
```

---

## 3. Git 提交规范

### 3.1 提交格式

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### 3.2 Type 类型

| 类型 | Emoji | 说明 | 示例 |
|------|-------|------|------|
| feat | ✨ | 新功能 | `feat(project): 添加项目筛选` |
| fix | 🐛 | Bug 修复 | `fix(member): 修复删除问题` |
| docs | 📝 | 文档变更 | `docs: 更新 README` |
| style | 💄 | 代码格式 | `style: 格式化代码` |
| refactor | 🔨 | 重构 | `refactor(api): 重构 IPC` |
| perf | ⚡ | 性能优化 | `perf: 优化列表渲染` |
| test | ✅ | 测试 | `test: 添加单元测试` |
| chore | 🔧 | 构建/工具 | `chore: 升级依赖` |
| types | 🎨 | 类型定义 | `types: 完善类型` |

### 3.3 示例

```bash
# ✨ 新功能
git commit -m "feat(project): 添加项目筛选功能"
git commit -m "feat(members): 新增工人调动记录管理"

# 🐛 Bug 修复
git commit -m "fix(member): 修复人员删除后刷新列表问题"
git commit -m "fix(contract): 修复合同状态更新逻辑"

# 📝 文档
git commit -m "docs: 更新组件编写规范"
git commit -m "docs: 添加 API 文档"

# 🔨 重构
git commit -m "refactor(api): 重构 IPC 通信层"
git commit -m "refactor(projects): 拆分超大组件"

# 🎨 类型
git commit -m "types: 完善 DashboardStats 类型定义"
git commit -m "types: 添加类型守卫函数"

# ⚡ 性能
git commit -m "perf: 优化大列表渲染性能"
git commit -m "perf: 添加虚拟滚动"

# ✅ 测试
git commit -m "test: 添加 Project 相关测试"
git commit -m "test: 添加 Hooks 测试"
```

### 3.4 分支命名

```
feature/<feature-name>      # 新功能
bugfix/<bug-description>    # Bug 修复
hotfix/<critical-fix>       # 紧急修复
refactor/<scope>            # 重构
types/<scope>               # 类型优化
docs/<scope>                # 文档更新
```

```bash
# 分支命名示例
git checkout -b feature/project-filter
git checkout -b bugfix/member-refresh
git checkout -b refactor/projects-component
git checkout -b types/dashboard-stats
```

### 3.5 提交检查清单

```bash
# 在提交前检查
npm run lint                    # ESLint 检查
npm run type-check             # TypeScript 类型检查
npm test                       # 运行测试

# 或使用 lint-staged (推荐)
git commit -m "feat: ..."
# 会自动运行 pre-commit hook
```

---

## 4. 命名规范速查表

### 4.1 变量和函数

| 类型 | 规范 | 示例 |
|------|------|------|
| 变量 | camelCase | `userName`, `isLoading` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| 函数 | camelCase + 动词前缀 | `getUserName()`, `handleClick()` |
| 布尔值 | is/has/can/should 前缀 | `isActive`, `hasPermission` |
| 数组 | 复数名词或 xxxList | `users`, `projectList` |
| 对象 | camelCase | `userInfo`, `projectData` |

### 4.2 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件文件 | PascalCase.tsx | `ProjectCard.tsx` |
| Hook 文件 | camelCase.ts | `useProjects.ts` |
| 服务文件 | camelCase.ts | `projectApi.ts` |
| 类型文件 | camelCase.ts | `types/electron.d.ts` |
| 工具文件 | camelCase.ts | `formatters.ts` |

### 4.3 React 相关

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件名 | PascalCase | `function ProjectCard()` |
| Props 接口 | ComponentName + Props | `interface ProjectCardProps` |
| State | useState 变量名 | `const [project, setProject]` |
| Handler | handle + 动作 | `handleSubmit`, `handleChange` |
| 自定义 Hook | use + 功能名 | `useProjects()`, `useModal()` |

### 4.4 常用动词前缀

| 动词 | 用途 | 示例 |
|------|------|------|
| get | 获取数据 | `getProjects`, `getUserById` |
| create | 创建资源 | `createProject`, `createMember` |
| update | 更新资源 | `updateProject`, `updateStatus` |
| delete | 删除资源 | `deleteProject`, `deleteMember` |
| handle | 事件处理 | `handleClick`, `handleSubmit` |
| on | 回调函数 | `onSave`, `onCancel` |
| is/has | 布尔判断 | `isLoading`, `hasError` |
| render | 渲染函数 | `renderHeader`, `renderList` |

---

## 5. 代码审查清单

### 5.1 PR 提交前自检

- [ ] 代码通过 ESLint 检查
- [ ] TypeScript 类型检查通过
- [ ] 所有新增类型已定义
- [ ] 组件遵循命名规范
- [ ] 无 TODO/FIXME 未处理
- [ ] 提交信息符合规范
- [ ] 相关文档已更新（如需要）

### 5.2 代码审查关注点

| 类别 | 检查项 |
|------|--------|
| **类型安全** | 无 `any` 类型、`unknown` 正确处理 |
| **组件设计** | 单一职责、行数适中 |
| **性能** | 无不必要的重渲染、正确的依赖数组 |
| **错误处理** | 错误被捕获、有用户提示 |
| **可维护性** | 代码清晰、有适当注释 |

---

*文档版本: 1.0.0*

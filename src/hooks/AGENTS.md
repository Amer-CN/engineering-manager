# src/hooks/ - React Hooks 域

> 本目录职责：全部自定义 hooks。`data/` 下是 React Query 数据层（服务端状态唯一入口），根层是业务/UI hooks（如 useXxxOCR、useMaskedFn、usePermission）。

## 边界

- **`data/`**：React Query hooks，命名 `useXxx.ts`（如 `useProjects.ts`）。组件不得绕过这里直接 fetch —— 服务端数据一律经 `getAPI()`（tauri-bridge → api-client）
- **OCR hooks**：`useXxxOCR` 系列对接 C# OCR 端点，模式为 表单组件 → useXxxOCR → C# API → 百度 API
- **权限**：`usePermission()` 提供 `can(code)` / `canAll` / `canAny` / `isAdmin()` / `hasRole(roleId)`；权限码格式 `resource:action`
- **PII**：`useMaskedFn` 是 PII 显示的唯一控制点，响应全局 mask toggle（MaskContext 后端同步）

## React Query 数据层规范

- queryKey：`['xxx']` 或 `['xxx', param]`；staleTime 统一 `30_000`
- queryFn 内检查 `res.success`，失败 `throw new Error(res.error)`
- 模板：

```typescript
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const api = await getAPI()
      const res = await api.getProjects()
      if (!res.success) throw new Error(res.error)
      return res.data
    },
    staleTime: 30_000,
  })
}
```

## 风险红线

- hooks 不直接操作 localStorage 做认证/权限状态 —— 走 `AuthContext` / `MaskContext`
- `permissions` 字段可能是字符串或数组，统一 JSON.parse 兼容处理
- 变更 `data/` hooks 的 queryKey 时全局检索失效调用点（invalidateQueries 依赖 key 一致）

## 就近命令

```bash
npx tsc --noEmit --pretty false    # 类型检查（0 error）
npx vitest run                     # 测试（mask / useMaskedFn / api-client 等套件必须全绿）
npx vite build                     # 构建验证
```

## 深链

- React Query 规范原文 + 新页面 Checklist → [docs/CONVENTIONS.md](../../docs/CONVENTIONS.md)
- 权限系统 / OCR 架构 / API 桥接层 → [docs/STACK-AND-ARCHITECTURE.md](../../docs/STACK-AND-ARCHITECTURE.md)
- PII Mask 模块演进史 → [docs/MODULES.md](../../docs/MODULES.md) + [docs/SECURITY-AUDIT.md](../../docs/SECURITY-AUDIT.md)

# R1 Spec: Login.tsx -> useReducer

## 目标
消除 `src/components/Login.tsx` 的 SOFT WARN: `8 个 useState (建议 ≤5，考虑拆分或 useReducer)`

## 现状
- 文件：`src/components/Login.tsx`
- 行数：163 行
- 8 个 useState: username / password / showPw / remember / autoLogin / error / loading / showSettings

## 重构方案
合并为 **1 个 useReducer**,按职责拆 action group:

### State 形状
```ts
interface LoginState {
  username: string
  password: string
  remember: boolean
  autoLogin: boolean
  showPw: boolean
  showSettings: boolean
  loading: boolean
  error: string
}
```

### Action 类型 (union)
```ts
type LoginAction =
  | { type: 'SET_CREDENTIALS'; field: 'username' | 'password'; value: string }
  | { type: 'TOGGLE_REMEMBER'; value: boolean }
  | { type: 'TOGGLE_AUTO_LOGIN'; value: boolean }
  | { type: 'TOGGLE_SHOW_PW' }
  | { type: 'TOGGLE_SETTINGS' }
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS' }
  | { type: 'LOGIN_ERROR'; error: string }
  | { type: 'LOGIN_RESET' }
```

### Reducer 放哪
- 同文件顶部 (保持 Login.tsx 单文件)
- useReducer 替代 useState,dispatch 调用保持稳定 (useCallback 包)

### 关键约束
1. 不改外部行为:所有现有 props / ref / 副作用不变
2. 保留所有 useEffect:localStorage 同步、自动登录、saved.current 读取
3. 保留 useRef:`useRef<{ username: string; password: string }>` 不动
4. 保留所有命名导出 / 默认导出
5. 保留内联样式 (这次只 refactor state)

### 验证清单
- [ ] `npx tsc --noEmit --pretty false` 0 error
- [ ] `npm run check` 0 HARD FAIL,Login.tsx 不再出现 useState 警告
- [ ] 手动登录:输入错误密码 → 显示 error,按钮回到非 loading
- [ ] 手动登录:勾选记住密码 + 自动登录 → 重启后自动登录
- [ ] 手动测试:右上齿轮按钮进入设置页,再点返回能回登录页
- [ ] 眼睛图标切换 showPw 正常

### 不在范围内
- 不拆分文件
- 不改样式
- 不动 LoginSettingsPage 子组件

### Commit message
```
refactor(R1): Login.tsx 8 useState -> useReducer (消除 SOFT WARN)
```

### Reviewer 检查点
1. reducer 是否纯函数 (无副作用)
2. action 类型是否覆盖所有原 setState 调用
3. useEffect 依赖数组是否被破坏
4. dispatch 引用稳定 (避免子组件不必要 re-render)
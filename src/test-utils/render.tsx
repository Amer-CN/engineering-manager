// 共享测试渲染器 — 镜像 App.tsx 的 Provider 树 (QueryClient → Mask → Updater)
// 组件测试用 renderWithProviders 替代裸 render, 避免 "useXxx must be used within XxxProvider"
import { useState, type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MaskProvider } from '@/contexts/MaskContext'
import { UpdaterProvider } from '@/hooks/useUpdater'

/** 测试用 QueryClient: 关闭重试/缓存, 避免异步悬挂与跨用例污染 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  })
}

/** 全量 Provider 包装 (与 App.tsx 一致的层级) */
export function AllProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createTestQueryClient())
  return (
    <QueryClientProvider client={queryClient}>
      <MaskProvider>
        <UpdaterProvider>{children}</UpdaterProvider>
      </MaskProvider>
    </QueryClientProvider>
  )
}

/** 带 Provider 的 render */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

/**
 * 控制 PII 脱敏开关 (MaskProvider 在 useState 初始化时读 localStorage).
 * 断言原文 PII 的用例需在 render 前调用 setMaskEnabled(false).
 */
export function setMaskEnabled(enabled: boolean): void {
  try {
    localStorage.setItem('v120_mask_enabled', enabled ? '1' : '0')
  } catch {
    /* 隐私模式 / SSR fallback */
  }
}

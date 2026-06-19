/**
 * 测试工具库
 * - renderWithProviders: 封装 render，预置常用 providers
 * - 重新导出常用测试工具
 */
import { render, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

/**
 * 自定义 render：可扩展 providers（当前无全局 provider，预留）
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Parameters<typeof render>[1]
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const result = render(ui, options)
  const user = userEvent.setup()
  return { ...result, user }
}

// 重新导出常用测试工具
export { screen, waitFor, within, fireEvent } from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
export { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest'

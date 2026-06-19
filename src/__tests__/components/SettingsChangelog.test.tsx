/**
 * SettingsChangelog.tsx 组件测试
 * Phase 5 Stage 3：零依赖展示组件
 */

import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock Icon（SettingsChangelog 唯一外部依赖）
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => React.createElement('span', { 'data-icon': name, 'data-size': size, className }, `[icon:${name}]`),
}))

const SettingsChangelog = (await import('@/components/SettingsChangelog')).default

describe('SettingsChangelog.tsx', () => {
  test('应显示标题更新日志', () => {
    render(React.createElement(SettingsChangelog, { onClose: vi.fn() }))
    expect(screen.getByText('更新日志')).toBeTruthy()
  })

  test('应显示第一个版本号 v2.12.0', () => {
    render(React.createElement(SettingsChangelog, { onClose: vi.fn() }))
    expect(screen.getByText('v2.12.0')).toBeTruthy()
  })

  test('应显示 v1.0.0 发布日期', () => {
    render(React.createElement(SettingsChangelog, { onClose: vi.fn() }))
    expect(screen.getByText('2026-05-01')).toBeTruthy()
  })

  test('应显示第一条更新条目', () => {
    render(React.createElement(SettingsChangelog, { onClose: vi.fn() }))
    expect(screen.getByText(/支持字符串格式/)).toBeTruthy()
  })

  test('点击关闭按钮应调用 onClose', () => {
    const onClose = vi.fn()
    render(React.createElement(SettingsChangelog, { onClose }))
    // 点击 X 图标按钮
    const closeBtn = screen.getByText('[icon:X]').closest('button')
    if (closeBtn) fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('点击背景遮罩应调用 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(React.createElement(SettingsChangelog, { onClose }))
    // 最外层 div 绑定 onClick={onClose}
    const overlay = container.firstChild as HTMLElement
    fireEvent.click(overlay)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

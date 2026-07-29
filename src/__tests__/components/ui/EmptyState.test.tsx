import { describe, test, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmptyState } from '@/components/ui/EmptyState'

// Icon mock：渲染图标名以便断言
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size }: any) => React.createElement('span', { 'data-testid': `icon-${name}`, 'data-size': size }, name),
}))

describe('EmptyState（s37 空状态库规范）', () => {
  test('渲染标题与描述', () => {
    render(<EmptyState icon="Package" title="暂无物料" description="点击添加您的第一个物料" />)
    expect(screen.getByText('暂无物料')).toBeTruthy()
    expect(screen.getByText('点击添加您的第一个物料')).toBeTruthy()
  })

  test('字符串 icon 渲染为 32px 图标（s37：64px 圆形容器内 32px ink-muted 图标）', () => {
    render(<EmptyState icon="Package" title="暂无物料" />)
    const icon = screen.getByTestId('icon-Package')
    expect(icon.getAttribute('data-size')).toBe('32')
  })

  test('无 icon 时回退默认 FolderOpen 图标', () => {
    render(<EmptyState title="空" />)
    expect(screen.getByTestId('icon-FolderOpen')).toBeTruthy()
  })

  test('支持自定义 ReactNode 图标', () => {
    render(<EmptyState icon={<span data-testid="custom-icon">★</span>} title="空" />)
    expect(screen.getByTestId('custom-icon')).toBeTruthy()
  })

  test('渲染 action 操作区（s37：单主操作意图）', () => {
    const onClick = vi.fn()
    render(<EmptyState icon="Package" title="暂无物料" action={<button onClick={onClick}>添加物料</button>} />)
    fireEvent.click(screen.getByText('添加物料'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('无 description 时不渲染描述段落', () => {
    const { container } = render(<EmptyState icon="Package" title="暂无物料" />)
    expect(container.querySelector('p')).toBeNull()
  })
})

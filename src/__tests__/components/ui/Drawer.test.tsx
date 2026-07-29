import { describe, test, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { Drawer } from '@/components/ui/Drawer'

// ─── framer-motion mock ─────────────────────────────
vi.mock('framer-motion', () => ({
  motion: { div: 'div' as any, aside: 'aside' as any },
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ─── Icon mock ────────────────────────────────
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => React.createElement('span', { 'data-testid': `icon-${name}` }, name),
}))

describe('Drawer', () => {
  test('open 时渲染标题、图标与内容', () => {
    render(
      <Drawer open onClose={() => {}} icon="Receipt" title="发票智能录入">
        <div>表单内容</div>
      </Drawer>,
    )
    expect(screen.getByText('发票智能录入')).toBeTruthy()
    expect(screen.getByTestId('icon-Receipt')).toBeTruthy()
    expect(screen.getByText('表单内容')).toBeTruthy()
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  test('open=false 时不渲染', () => {
    render(
      <Drawer open={false} onClose={() => {}} title="不可见">
        <div>内容</div>
      </Drawer>,
    )
    expect(screen.queryByText('不可见')).toBeNull()
  })

  test('点击关闭按钮调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题">
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('按 Escape 调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题">
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('渲染 footer 插槽', () => {
    render(
      <Drawer open onClose={() => {}} title="标题" footer={<button>保存</button>}>
        <div>内容</div>
      </Drawer>,
    )
    expect(screen.getByText('保存')).toBeTruthy()
  })

  test('打开时锁定背景滚动，关闭后恢复', () => {
    const { unmount } = render(
      <Drawer open onClose={() => {}} title="标题">
        <div>内容</div>
      </Drawer>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  // ─── dirty 误触关闭确认（审查建议：20 表单迁入后误触丢数据面放大） ───

  test('dirty 时按 Escape 弹确认层而非直接关闭', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题" dirty>
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    expect(screen.getByText('放弃修改？')).toBeTruthy()
  })

  test('dirty 确认层点「放弃修改」后才调用 onClose', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题" dirty>
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('放弃修改'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  test('dirty 确认层点「继续编辑」收起确认且不关闭', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题" dirty>
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    fireEvent.click(screen.getByText('继续编辑'))
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  test('dirty=false 时 Escape 直接关闭不弹确认（默认行为不变）', () => {
    const onClose = vi.fn()
    render(
      <Drawer open onClose={onClose} title="标题" dirty={false}>
        <div>内容</div>
      </Drawer>,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })
})

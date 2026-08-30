/**
 * Modal Esc 栈顶判定测试（P4 交互打磨：修复嵌套弹层一次 Esc 连关两层）
 *
 *   · 单个 Modal 打开（ConfirmDialog 单独打开场景）：栈顶即自己，Esc 正常关闭
 *   · 嵌套两层（外层 Modal 内再弹 Modal，如 HistoryModal + 恢复确认）：Esc 只关最后打开的内层
 *   · 内层关闭出栈后：Esc 再按才关外层
 *   · 内层重开后：栈顶仍是内层，Esc 再关内层（入栈/出栈对称）
 */
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Modal } from '@/components/ui/Modal'

function Harness({
  outerOpen,
  innerOpen,
  onOuterClose,
  onInnerClose,
}: {
  outerOpen: boolean
  innerOpen: boolean
  onOuterClose: () => void
  onInnerClose: () => void
}) {
  return (
    <>
      <Modal isOpen={outerOpen} onClose={onOuterClose} title="外层">
        <p>outer-body</p>
      </Modal>
      <Modal isOpen={innerOpen} onClose={onInnerClose} title="内层">
        <p>inner-body</p>
      </Modal>
    </>
  )
}

function pressEscape() {
  fireEvent.keyDown(document, { key: 'Escape' })
}

describe('Modal Esc 栈顶判定', () => {
  it('单个 Modal 打开：栈顶即自己，Esc 正常关闭（ConfirmDialog 单独打开场景）', () => {
    const onOuterClose = vi.fn()
    render(
      <Modal isOpen={true} onClose={onOuterClose} title="仅一层">
        <p>only-body</p>
      </Modal>,
    )
    pressEscape()
    expect(onOuterClose).toHaveBeenCalledTimes(1)
  })

  it('嵌套两层同时打开：Esc 只关最后打开的内层，外层不关', () => {
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    render(
      <Harness outerOpen={true} innerOpen={true} onOuterClose={onOuterClose} onInnerClose={onInnerClose} />,
    )
    pressEscape()
    expect(onInnerClose).toHaveBeenCalledTimes(1)
    expect(onOuterClose).not.toHaveBeenCalled()
  })

  it('内层关闭出栈后：Esc 再按关外层', () => {
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    const { rerender } = render(
      <Harness outerOpen={true} innerOpen={true} onOuterClose={onOuterClose} onInnerClose={onInnerClose} />,
    )
    // 模拟内层经 onClose 回调真实关闭（出栈）
    rerender(
      <Harness outerOpen={true} innerOpen={false} onOuterClose={onOuterClose} onInnerClose={onInnerClose} />,
    )
    pressEscape()
    expect(onOuterClose).toHaveBeenCalledTimes(1)
  })

  it('内层关闭后重开：栈顶回到内层，Esc 再关内层（入栈/出栈对称）', () => {
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    const { rerender } = render(
      <Harness outerOpen={true} innerOpen={false} onOuterClose={onOuterClose} onInnerClose={onInnerClose} />,
    )
    rerender(
      <Harness outerOpen={true} innerOpen={true} onOuterClose={onOuterClose} onInnerClose={onInnerClose} />,
    )
    pressEscape()
    expect(onInnerClose).toHaveBeenCalledTimes(1)
    expect(onOuterClose).not.toHaveBeenCalled()
  })
})

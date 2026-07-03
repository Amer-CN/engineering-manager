import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import AgentComposer from '../AgentComposer'

const recognizeMock = vi.fn(async (_imageBase64: string) => ({ success: true, text: '发票金额 100 元' }))
vi.mock('@/services/agent-client', () => ({
  recognizeReceiptText: (...args: unknown[]) => recognizeMock(args[0] as string),
}))
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, whileHover, whileTap, ...p }: any) => <button {...p}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))
vi.mock('@/components/ui/Icon', () => ({ Icon: ({ name }: { name: string }) => <span>{name}</span> }))
vi.mock('@/components/ui/Tooltip', () => ({ Tooltip: ({ children }: any) => <>{children}</> }))

describe('AgentComposer 附件 OCR', () => {
  it('附件按钮已启用，且存在隐藏 file input', () => {
    const { container } = render(
      <AgentComposer value="" onChange={() => {}} onSend={() => {}} />,
    )
    const uploadBtn = screen.getByLabelText('上传图片') as HTMLButtonElement
    expect(uploadBtn.disabled).toBe(false)
    expect(container.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('选择图片 → 发送时调用 OCR 并把识别文字并入消息', async () => {
    const onSend = vi.fn()
    const { container } = render(
      <AgentComposer value="这是什么？" onChange={() => {}} onSend={onSend} />,
    )
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'receipt.png', { type: 'image/png' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(screen.getByText('receipt.png')).toBeTruthy())

    fireEvent.click(screen.getByLabelText('发送'))

    await waitFor(() => expect(onSend).toHaveBeenCalledTimes(1))
    const arg = String(onSend.mock.calls[0][0])
    expect(arg).toContain('这是什么？')
    expect(arg).toContain('发票金额 100 元')
    expect(recognizeMock).toHaveBeenCalledTimes(1)
  })
})

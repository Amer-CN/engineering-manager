import { useState, useCallback, ReactNode } from 'react'
import { ConfirmDialog } from '../components/ui/ConfirmDialog/ConfirmDialog'

interface ConfirmOptions {
  title?: string
  content: ReactNode
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean
  onConfirm: () => void
}

const INITIAL_STATE: ConfirmState = {
  isOpen: false,
  content: '',
  onConfirm: () => {},
}

/**
 * 声明式确认对话框 Hook
 * 替代原生 confirm()，返回 confirm 函数和 ConfirmDialog JSX
 *
 * @example
 * ```tsx
 * const { confirm, ConfirmDialog } = useConfirm()
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ title: '确认删除', content: '确定要删除吗？', confirmVariant: 'danger' })
 *   if (ok) { // 执行删除 }
 * }
 *
 * return <>{ConfirmDialog}<button onClick={handleDelete}>删除</button></>
 * ```
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(INITIAL_STATE)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true)
          setState(s => ({ ...s, isOpen: false }))
        },
      })
    })
  }, [])

  const handleClose = useCallback(() => {
    setState(s => ({ ...s, isOpen: false }))
  }, [])

  const ConfirmDialogElement = ConfirmDialog({
    isOpen: state.isOpen,
    onClose: handleClose,
    onConfirm: state.onConfirm,
    title: state.title,
    content: state.content,
    confirmText: state.confirmText,
    cancelText: state.cancelText,
    confirmVariant: state.confirmVariant,
  })

  return { confirm, ConfirmDialog: ConfirmDialogElement }
}

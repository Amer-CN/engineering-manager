/**
 * useModal & useConfirm Hooks
 * 
 * 弹窗状态管理 Hooks
 */

import { useState, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// useModal
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * useModal 返回类型
 */
export interface UseModalReturn<T = unknown> {
  isOpen: boolean
  modalData: T | undefined
  open: (data?: T) => void
  close: () => void
  toggle: () => void
}

/**
 * 弹窗 Hook
 * 
 * @param initialData - 可选的初始数据
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const modal = useModal<{ id: number; name: string }>()
 *   
 *   const handleEdit = (item) => {
 *     modal.open(item) // 打开弹窗并传递数据
 *   }
 *   
 *   return (
 *     <>
 *       <button onClick={() => modal.open()}>打开</button>
 *       {modal.isOpen && (
 *         <Modal onClose={modal.close}>
 *           编辑: {modal.modalData?.name}
 *         </Modal>
 *       )}
 *     </>
 *   )
 * }
 * ```
 */
export function useModal<T = unknown>(initialData?: T): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [modalData, setModalData] = useState<T | undefined>(initialData)

  const open = useCallback((data?: T) => {
    setModalData(data)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // 如果需要在关闭时清除数据，可以取消下面的注释
    // setModalData(undefined)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  return {
    isOpen,
    modalData,
    open,
    close,
    toggle,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// useConfirm
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 确认对话框配置
 */
export interface ConfirmConfig {
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * useConfirm 返回类型
 */
export interface UseConfirmReturn {
  isOpen: boolean
  config: ConfirmConfig | null
  confirm: (config: ConfirmConfig) => void
  handleConfirm: () => void
  handleCancel: () => void
  close: () => void
}

/**
 * 确认对话框 Hook
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const confirm = useConfirm()
 *   
 *   const handleDelete = () => {
 *     confirm.confirm({
 *       title: '确认删除',
 *       content: '确定要删除这个项目吗？此操作无法撤销。',
 *       confirmText: '删除',
 *       confirmVariant: 'danger',
 *       onConfirm: () => deleteProject(),
 *     })
 *   }
 *   
 *   return (
 *     <>
 *       <button onClick={handleDelete}>删除</button>
 *       <ConfirmDialog
 *         isOpen={confirm.isOpen}
 *         onConfirm={confirm.handleConfirm}
 *         onCancel={confirm.handleCancel}
 *       >
 *         <p>{confirm.config?.content}</p>
 *       </ConfirmDialog>
 *     </>
 *   )
 * }
 * ```
 */
export function useConfirm(): UseConfirmReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<ConfirmConfig | null>(null)

  const confirm = useCallback((newConfig: ConfirmConfig) => {
    setConfig(newConfig)
    setIsOpen(true)
  }, [])

  const handleConfirm = useCallback(() => {
    config?.onConfirm()
    setIsOpen(false)
    setConfig(null)
  }, [config])

  const handleCancel = useCallback(() => {
    config?.onCancel?.()
    setIsOpen(false)
    setConfig(null)
  }, [config])

  const close = useCallback(() => {
    setIsOpen(false)
    setConfig(null)
  }, [])

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleCancel,
    close,
  }
}

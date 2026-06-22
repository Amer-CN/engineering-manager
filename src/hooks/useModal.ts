/**
 * useModal & useConfirm Hooks
 * 
 * 弹窗状态管理 Hooks
 */

import { useState, useCallback } from 'react'

export type { ConfirmConfig, UseConfirmReturn } from './useModalHelpers'
export { useConfirm } from './useModalHelpers'

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

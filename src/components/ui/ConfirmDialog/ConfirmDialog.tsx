/**
 * ConfirmDialog 组件
 * 
 * 确认对话框组件
 */

import React from 'react'
import { Modal } from '../Modal/Modal'
import { Button } from '../Button/Button'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface ConfirmDialogProps {
  /** 是否打开 */
  isOpen: boolean
  /** 关闭回调 */
  onClose: () => void
  /** 确认回调 */
  onConfirm: () => void
  /** 标题 */
  title?: string
  /** 内容 */
  content?: React.ReactNode
  /** 确认按钮文本 */
  confirmText?: string
  /** 取消按钮文本 */
  cancelText?: string
  /** 确认按钮变体 */
  confirmVariant?: 'primary' | 'danger'
  /** 是否显示取消按钮 */
  showCancel?: boolean
  /** 确认按钮是否加载中 */
  loading?: boolean
  /** 尺寸 */
  size?: 'sm' | 'md'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ConfirmDialog 确认对话框组件
 * 
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   onConfirm={handleConfirm}
 *   title="确认删除"
 *   content="确定要删除这个项目吗？此操作无法撤销。"
 *   confirmText="删除"
 *   confirmVariant="danger"
 * />
 * ```
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '确认',
  content,
  confirmText = '确认',
  cancelText = '取消',
  confirmVariant = 'primary',
  showCancel = true,
  loading = false,
  size = 'sm',
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    // 默认关闭，如果需要保持打开，调用方可以在 onConfirm 中处理
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size={size}
      showOverlay={true}
      closeOnOverlay={!loading}
      footer={
        <>
          {showCancel && (
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      {content && (
        <div className="text-slate-600">
          {content}
        </div>
      )}
    </Modal>
  )
}

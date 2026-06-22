/**
 * useConfirm Hook — extracted from useModal.ts
 */

import { useState, useCallback } from 'react'

export interface ConfirmConfig {
  title: string
  content: string
  confirmText?: string
  cancelText?: string
  confirmVariant?: 'primary' | 'danger'
  onConfirm: () => void
  onCancel?: () => void
}

export interface UseConfirmReturn {
  isOpen: boolean
  config: ConfirmConfig | null
  confirm: (config: ConfirmConfig) => void
  handleConfirm: () => void
  handleCancel: () => void
  close: () => void
}

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

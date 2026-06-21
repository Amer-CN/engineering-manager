import React, { useState, useRef } from 'react'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useIdCardOCR } from '@/hooks/useIdCardOCR'
import {
  type StaffFormData, type WorkerFormData,
  validateImageFile, validateFile, readFileAsBase64,
} from './memberFormTypes'

interface MemberFileHandlerOpts {
  type: 'staff' | 'worker'
  onFileModified?: (field: string) => void
}

export function useMemberFileHandlers({ type, onFileModified }: MemberFileHandlerOpts) {
  const [dragOverField, setDragOverField] = useState<string | null>(null)
  const [ocrResult, setOcrResult] = useState<any>(null)
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()

  const { loading: ocrLoading, ocrMode, processIdCardFile: hookProcessIdCardFile } = useIdCardOCR({
    onOCRResult: (result) => { setOcrResult(result) }
  })

  // 文件上传 Refs
  const staffFrontInputRef = useRef<HTMLInputElement>(null)
  const staffBackInputRef = useRef<HTMLInputElement>(null)
  const staffContractInputRef = useRef<HTMLInputElement>(null)
  const workerFrontInputRef = useRef<HTMLInputElement>(null)
  const workerBackInputRef = useRef<HTMLInputElement>(null)
  const workerContractInputRef = useRef<HTMLInputElement>(null)
  const safetyInputRef = useRef<HTMLInputElement>(null)
  const healthInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  // ============ OCR 识别 ============
  const processIdCardFile = async (
    file: File,
    field: 'idCardFront' | 'idCardBack',
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const base64 = await readFileAsBase64(file)
    setter((prev: any) => ({ ...prev, [field]: base64 }))
    onFileModified?.(field)

    if (field === 'idCardFront') {
      const result = await hookProcessIdCardFile(file)
      if (result && ocrResult) {
        setter((prev: any) => ({
          ...prev,
          [field]: result,
          name: ocrResult.name || prev.name,
          idCard: ocrResult.idCard || prev.idCard,
          gender: ocrResult.gender || prev.gender,
          birthDate: ocrResult.birthDate || prev.birthDate,
          ethnicity: ocrResult.ethnicity || prev.ethnicity,
          idCardAddress: ocrResult.address || prev.idCardAddress
        }))
        setOcrResult(null)
      }
    }
  }

  // ============ 文件上传 ============
  const processUploadFile = async (
    file: File,
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const error = validateFile(file)
    if (error) {
      showToast(error, 'error')
      return
    }

    const base64 = await readFileAsBase64(file)
    const fileType = file.type === 'application/pdf' ? 'pdf' : 'image'

    if (field === 'contractFile') {
      setter((prev: any) => ({ ...prev, contractFile: base64, contractFileType: fileType }))
    } else {
      setter((prev: any) => ({ ...prev, [field]: base64 }))
    }
  }

  // ============ 文件删除 ============
  const handleDeleteFile = async (
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个文件吗？', confirmVariant: 'danger' })
    if (ok) {
      if (field === 'contractFile') {
        setter((prev: any) => ({ ...prev, contractFile: '', contractFileType: '' }))
      } else {
        setter((prev: any) => ({ ...prev, [field]: '' }))
      }
    }
  }

  // ============ 拖拽处理 ============
  const handleDragOver = (e: React.DragEvent, field: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverField(field)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverField(null)
  }

  const handleDrop = async (
    e: React.DragEvent,
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>,
    fallbackSetter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>,
    isIdCard: boolean = false
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverField(null)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const safeSetter = typeof setter === 'function' ? setter : fallbackSetter

    if (isIdCard) {
      const error = validateImageFile(file)
      if (error) {
        showToast(error, 'error')
        return
      }
      await processIdCardFile(file, field as 'idCardFront' | 'idCardBack', safeSetter)
    } else {
      await processUploadFile(file, field, safeSetter)
    }
  }

  // ============ 文件输入变化 ============
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>,
    isIdCard: boolean = false,
    inputRef?: React.RefObject<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (isIdCard) {
      const error = validateImageFile(file)
      if (error) {
        showToast(error, 'error')
        return
      }
      await processIdCardFile(file, field as 'idCardFront' | 'idCardBack', setter)
    } else {
      await processUploadFile(file, field, setter)
    }

    if (inputRef?.current) {
      inputRef.current.value = ''
    } else {
      e.target.value = ''
    }
  }

  return {
    dragOverField, ocrLoading, ocrMode, ConfirmDialog,
    staffFrontInputRef, staffBackInputRef, staffContractInputRef,
    workerFrontInputRef, workerBackInputRef, workerContractInputRef,
    safetyInputRef, healthInputRef, certInputRef,
    processIdCardFile, processUploadFile, handleDeleteFile,
    handleDragOver, handleDragLeave, handleDrop, handleFileChange,
  }
}

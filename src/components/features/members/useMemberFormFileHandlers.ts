import React, { useState } from 'react'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { validateImageFile, validateFile, readFileAsBase64 } from './memberFormTypes'
import type { StaffFormData, WorkerFormData } from './memberFormTypes'

interface UseMemberFormFileHandlersParams {
  type: 'staff' | 'worker'
  onFileModified?: (field: string) => void
  hookProcessIdCardFile: (file: File) => Promise<string | null>
  ocrResult: { name?: string; idCard?: string; gender?: string; birthDate?: string; ethnicity?: string; address?: string } | null
  setOcrResult: React.Dispatch<React.SetStateAction<{ name?: string; idCard?: string; gender?: string; birthDate?: string; ethnicity?: string; address?: string } | null>>
  setStaffFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  setWorkerFormData: React.Dispatch<React.SetStateAction<WorkerFormData>>
}

export function useMemberFormFileHandlers({
  type,
  onFileModified,
  hookProcessIdCardFile,
  ocrResult,
  setOcrResult,
  setStaffFormData,
  setWorkerFormData,
}: UseMemberFormFileHandlersParams) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm } = useConfirm()
  const [dragOverField, setDragOverField] = useState<string | null>(null)

  const processIdCardFile = async (
    file: File,
    field: 'idCardFront' | 'idCardBack',
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const base64 = await readFileAsBase64(file)
    setter((prev: StaffFormData | WorkerFormData) => ({ ...prev, [field]: base64 }))
    onFileModified?.(field)

    if (field === 'idCardFront') {
      const result = await hookProcessIdCardFile(file)
      if (result && ocrResult) {
        setter((prev: StaffFormData | WorkerFormData) => ({
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
      setter((prev: StaffFormData | WorkerFormData) => ({ ...prev, contractFile: base64, contractFileType: fileType }))
    } else {
      setter((prev: StaffFormData | WorkerFormData) => ({ ...prev, [field]: base64 }))
    }
  }

  const handleDeleteFile = async (
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    const ok = await confirm({ title: '确认删除', content: '确定要删除这个文件吗？', confirmVariant: 'danger' })
    if (ok) {
      if (field === 'contractFile') {
        setter((prev: StaffFormData | WorkerFormData) => ({ ...prev, contractFile: '', contractFileType: '' }))
      } else {
        setter((prev: StaffFormData | WorkerFormData) => ({ ...prev, [field]: '' }))
      }
    }
  }

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
    isIdCard: boolean = false
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverField(null)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const safeSetter = typeof setter === 'function' ? setter : (type === 'staff' ? setStaffFormData as React.Dispatch<React.SetStateAction<StaffFormData>> : setWorkerFormData as React.Dispatch<React.SetStateAction<WorkerFormData>>)

    if (isIdCard) {
      const error = validateImageFile(file)
      if (error) {
        showToast(error, 'error')
        return
      }
      await processIdCardFile(file, field as 'idCardFront' | 'idCardBack', safeSetter as React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>)
    } else {
      await processUploadFile(file, field, safeSetter as React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>)
    }
  }

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
    dragOverField,
    processIdCardFile,
    processUploadFile,
    handleDeleteFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileChange,
  }
}

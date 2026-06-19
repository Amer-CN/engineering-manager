// MemberForm 组件

import React, { useState, useEffect, useRef } from 'react'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useIdCardOCR } from '@/hooks/useIdCardOCR'
import StaffForm from './StaffForm'
import WorkerForm from './WorkerForm'
import {
  type StaffFormData, type WorkerFormData, type MemberFormProps,
  defaultStaffFormData, defaultWorkerFormData,
  memberToStaffForm, memberToWorkerForm,
  validateImageFile, validateFile, readFileAsBase64,
} from './memberFormTypes'
import { MemberFormLayout } from './MemberFormLayout'
import { useMemberPasteHandler } from './useMemberPasteHandler'

// MemberForm — 表单容器（逻辑层）
// 类型/常量/Helper → memberFormTypes.ts
// 管理人员表单 UI → StaffForm.tsx
// 农民工表单 UI → WorkerForm.tsx
// 上传控件 → FormUploadWidgets.tsx

// MemberForm 组件
export function MemberForm({
  type,
  editingMember,
  projects,
  workerTeams,
  visible,
  onClose,
  onSubmit,
  onFileModified
}: MemberFormProps) {
  // ============ 状态定义 ============
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const [dragOverField, setDragOverField] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()

  // 使用 useIdCardOCR Hook
  const [ocrResult, setOcrResult] = useState<any>(null)
  const { loading: ocrLoading, ocrMode, processIdCardFile: hookProcessIdCardFile, processUploadFile: hookProcessUploadFile } = useIdCardOCR({
    onOCRResult: (result) => {
      setOcrResult(result)
    }
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

  // ============ 初始化 ============
  useEffect(() => {
  }, [])

  // 初始化表单数据
  useEffect(() => {
    const initForm = async () => {
      if (editingMember) {
        if (type === 'staff') {
          const formData = memberToStaffForm(editingMember)
          const fileFields = [
            { key: 'idCardFront' as keyof StaffFormData, cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
            { key: 'idCardBack' as keyof StaffFormData, cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
            { key: 'contractFile' as keyof StaffFormData, cfg: FILE_CATEGORIES.MEMBER_CONTRACT },
          ]
          for (const { key, cfg } of fileFields) {
            const val = formData[key]
            if (typeof val === 'string' && val && !val.startsWith('data:')) {
              try {
                const url = await readUploadedFile(cfg.category, cfg.subCategory, val as string, null)
                if (url) (formData as any)[key] = url
                else (formData as any)[key] = ''
              } catch {
                (formData as any)[key] = ''
              }
            }
          }
          setStaffFormData(formData)
        } else {
          const formData = memberToWorkerForm(editingMember)
          const workerProjName = editingMember?.projectId ? projects.find(p => p.id === editingMember.projectId)?.name : null
          const fileFields = [
            { key: 'idCardFront' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
            { key: 'idCardBack' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
            { key: 'contractFile' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_CONTRACT },
            { key: 'safetyTrainingFile' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_TRAINING },
            { key: 'healthReportFile' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_HEALTH },
            { key: 'specialCertificateFile' as keyof WorkerFormData, cfg: FILE_CATEGORIES.MEMBER_CERTIFICATE },
          ]
          for (const { key, cfg } of fileFields) {
            const val = formData[key]
            if (typeof val === 'string' && val && !val.startsWith('data:')) {
              try {
                const url = await readUploadedFile(cfg.category, cfg.subCategory, val as string, workerProjName)
                if (url) (formData as any)[key] = url
                else (formData as any)[key] = ''
              } catch {
                (formData as any)[key] = ''
              }
            }
          }
          setWorkerFormData(formData)
        }
      } else {
        if (type === 'staff') {
          setStaffFormData(defaultStaffFormData)
        } else {
          setWorkerFormData(defaultWorkerFormData)
        }
      }
    }
    initForm()
  }, [editingMember, type, visible])


  // ============ OCR 识别 ============
  const processIdCardFile = async (
    file: File,
    field: 'idCardFront' | 'idCardBack',
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    // 先更新图片预览
    const base64 = await readFileAsBase64(file)
    setter((prev: any) => ({ ...prev, [field]: base64 }))
    onFileModified?.(field)

    // 人像面触发OCR识别
    if (field === 'idCardFront') {
      // 使用 useIdCardOCR Hook 的 processIdCardFile
      const result = await hookProcessIdCardFile(file)
      if (result && ocrResult) {
        // 使用 OCR 结果更新表单
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
        setOcrResult(null) // 清除结果
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
    isIdCard: boolean = false
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverField(null)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]
    const safeSetter = typeof setter === 'function' ? setter : (type === 'staff' ? setStaffFormData as any : setWorkerFormData as any)

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

    // 清空input，允许重复选择同一文件
    if (inputRef?.current) {
      inputRef.current.value = ''
    } else {
      e.target.value = ''
    }
  }

  // ============ 表单提交 ============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      if (type === 'staff') {
        // 验证必填字段
        if (!staffFormData.name.trim()) {
          showToast('请输入姓名', 'error')
          return
        }
        if (!staffFormData.role) {
          showToast('请选择职位', 'error')
          return
        }
        await onSubmit(staffFormData)
      } else {
        // 验证必填字段
        if (!workerFormData.name.trim()) {
          showToast('请输入姓名', 'error')
          return
        }
        // 项目/班组/日工资不再强制必填（工人库只存基本信息）
        await onSubmit(workerFormData)
      }
    } finally {
      setSubmitting(false)
    }
  }

  useMemberPasteHandler({ visible, type, staffFormData, workerFormData, setStaffFormData, setWorkerFormData, processIdCardFile, processUploadFile })
  if (!visible) return null

  return (
    <>
    {ConfirmDialog}
    <MemberFormLayout type={type} editingMember={editingMember} ocrMode={ocrMode}
      ocrLoading={ocrLoading} submitting={submitting} onClose={onClose} onSubmit={handleSubmit}>
      {type === 'staff' ? (
        <StaffForm formData={staffFormData} setFormData={setStaffFormData}
          editingMember={editingMember} dragOverField={dragOverField}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onDrop={handleDrop as any} onFileChange={handleFileChange as any}
          onDeleteFile={handleDeleteFile as any}
          refs={{ frontInputRef: staffFrontInputRef, backInputRef: staffBackInputRef, contractInputRef: staffContractInputRef }} />
      ) : (
        <WorkerForm formData={workerFormData} setFormData={setWorkerFormData}
          projects={projects} workerTeams={workerTeams} editingMember={editingMember}
          ocrLoading={ocrLoading} dragOverField={dragOverField}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onDrop={handleDrop as any} onFileChange={handleFileChange as any}
          onDeleteFile={handleDeleteFile as any}
          refs={{ frontInputRef: workerFrontInputRef, backInputRef: workerBackInputRef, contractInputRef: workerContractInputRef, safetyInputRef, healthInputRef, certInputRef }} />
      )}
    </MemberFormLayout>
    </>
  )
}

export default MemberForm

// MemberForm 组件

import React, { useState, useEffect, useRef } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '@/services/ocr'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { useToastStore } from '@/store/toastStore'
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
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMode, setOcrMode] = useState<OCRProvider>('offline')
  const [dragOverField, setDragOverField] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const showToast = useToastStore(state => state.showToast)

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
    const config = getOCRConfig()
    setOcrMode(config.provider)
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
    const base64 = await readFileAsBase64(file)
    
    // 先更新图片预览
    setter((prev: any) => ({ ...prev, [field]: base64 }))
    onFileModified?.(field)

    // 人像面触发OCR识别
    if (field === 'idCardFront') {
      setOcrLoading(true)
      try {
        const result = await recognizeIdCard(base64)
        console.log('[OCR] 识别结果:', JSON.stringify(result, null, 2))

        if (result.success && result.idCard) {
          const { number, gender, birthDate, name, ethnicity, address } = result.idCard
          
          setter((prev: any) => ({
            ...prev,
            [field]: base64,
            name: name || prev.name,
            idCard: number || prev.idCard,
            gender: gender || prev.gender,
            birthDate: birthDate || prev.birthDate,
            ethnicity: ethnicity || prev.ethnicity,
            idCardAddress: address || prev.idCardAddress
          }))

          // 根据识别结果显示提示
          if (result.error) {
            showToast(`身份证识别成功！${result.error}`, 'success')
          } else {
            const filledFields = []
            if (name) filledFields.push('姓名')
            if (number) filledFields.push('身份证号')
            if (gender) filledFields.push('性别')
            if (birthDate) filledFields.push('出生日期')
            if (ethnicity) filledFields.push('民族')
            if (address) filledFields.push('地址')
            showToast(`识别成功！已自动填充${filledFields.join('、')}`, 'success')
          }
        } else {
          showToast(`未能识别到身份证号（${ocrMode === 'baidu' ? '百度OCR' : '离线OCR'}）`, 'error')
        }
      } catch (error: any) {
        const errMsg = error?.message || error?.toString() || '未知错误'
        console.error('[OCR] 识别异常:', error)
        showToast('OCR识别失败: ' + errMsg.substring(0, 50), 'error')
      } finally {
        setOcrLoading(false)
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
  const handleDeleteFile = (
    field: string,
    setter: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>
  ) => {
    if (confirm('确定要删除这个文件吗？')) {
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
  )
}

export default MemberForm

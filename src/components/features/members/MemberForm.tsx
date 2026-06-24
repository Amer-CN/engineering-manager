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
} from './memberFormTypes'
import { MemberFormLayout } from './MemberFormLayout'
import { useMemberPasteHandler } from './useMemberPasteHandler'
import { useMemberFormFileHandlers } from './useMemberFormFileHandlers'

// MemberForm — 表单容器（逻辑层）
// 类型/常量/Helper → memberFormTypes.ts
// 管理人员表单 UI → StaffForm.tsx
// 农民工表单 UI → WorkerForm.tsx
// 上传控件 → FormUploadWidgets.tsx
// 文件处理逻辑 → useMemberFormFileHandlers.ts

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
  const [staffFormData, setStaffFormData] = useState<StaffFormData>(defaultStaffFormData)
  const [workerFormData, setWorkerFormData] = useState<WorkerFormData>(defaultWorkerFormData)
  const [submitting, setSubmitting] = useState(false)
  const showToast = useToastStore(state => state.showToast)
  const { confirm: _confirm, ConfirmDialog } = useConfirm()

  const [ocrResult, setOcrResult] = useState<any>(null)
  const { loading: ocrLoading, ocrMode, processIdCardFile: hookProcessIdCardFile } = useIdCardOCR({
    onOCRResult: (result) => { setOcrResult(result) }
  })

  const {
    dragOverField, processIdCardFile, processUploadFile,
    handleDeleteFile, handleDragOver, handleDragLeave, handleDrop, handleFileChange,
  } = useMemberFormFileHandlers({
    type, onFileModified, hookProcessIdCardFile, ocrResult, setOcrResult,
    setStaffFormData, setWorkerFormData,
  })

  const staffFrontInputRef = useRef<HTMLInputElement>(null)
  const staffBackInputRef = useRef<HTMLInputElement>(null)
  const staffContractInputRef = useRef<HTMLInputElement>(null)
  const workerFrontInputRef = useRef<HTMLInputElement>(null)
  const workerBackInputRef = useRef<HTMLInputElement>(null)
  const workerContractInputRef = useRef<HTMLInputElement>(null)
  const safetyInputRef = useRef<HTMLInputElement>(null)
  const healthInputRef = useRef<HTMLInputElement>(null)
  const certInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
  }, [])

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
                if (url) (formData as unknown as Record<string, unknown>)[key] = url
                else (formData as unknown as Record<string, unknown>)[key] = ''
              } catch {
                (formData as unknown as Record<string, unknown>)[key] = ''
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
                if (url) (formData as unknown as Record<string, unknown>)[key] = url
                else (formData as unknown as Record<string, unknown>)[key] = ''
              } catch {
                (formData as unknown as Record<string, unknown>)[key] = ''
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (type === 'staff') {
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
        if (!workerFormData.name.trim()) {
          showToast('请输入姓名', 'error')
          return
        }
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
          onDrop={handleDrop as (e: React.DragEvent, field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>, isIdCard?: boolean) => void} onFileChange={handleFileChange as (e: React.ChangeEvent<HTMLInputElement>, field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>, isIdCard?: boolean, ref?: React.RefObject<HTMLInputElement>) => Promise<void>}
          onDeleteFile={handleDeleteFile as (field: string, setter: React.Dispatch<React.SetStateAction<StaffFormData>>) => Promise<void>}
          refs={{ frontInputRef: staffFrontInputRef, backInputRef: staffBackInputRef, contractInputRef: staffContractInputRef }} />
      ) : (
        <WorkerForm formData={workerFormData} setFormData={setWorkerFormData}
          projects={projects} workerTeams={workerTeams} editingMember={editingMember}
          ocrLoading={ocrLoading} dragOverField={dragOverField}
          onDragOver={handleDragOver} onDragLeave={handleDragLeave}
          onDrop={handleDrop as (e: React.DragEvent, field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>, isIdCard?: boolean) => void} onFileChange={handleFileChange as (e: React.ChangeEvent<HTMLInputElement>, field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>, isIdCard?: boolean, ref?: React.RefObject<HTMLInputElement>) => Promise<void>}
          onDeleteFile={handleDeleteFile as (field: string, setter: React.Dispatch<React.SetStateAction<WorkerFormData>>) => Promise<void>}
          refs={{ frontInputRef: workerFrontInputRef, backInputRef: workerBackInputRef, contractInputRef: workerContractInputRef, safetyInputRef, healthInputRef, certInputRef }} />
      )}
    </MemberFormLayout>
    </>
  )
}

export default MemberForm


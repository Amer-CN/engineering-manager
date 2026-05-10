// MemberForm 组件

import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Member, WorkerType, MemberType } from '@/types'
import { motion } from 'framer-motion'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '@/services/ocr'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { useToastContext } from '../../../hooks/useToast'
import { Icon } from '../../ui/Icon'
import StaffForm from './StaffForm'
import WorkerForm from './WorkerForm'
import {
  type StaffFormData, type WorkerFormData, type MemberFormProps,
  defaultStaffFormData, defaultWorkerFormData,
  cleanFormData, memberToStaffForm, memberToWorkerForm,
  validateImageFile, validateFile, readFileAsBase64,
} from './memberFormTypes'

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
  const { showToast } = useToastContext()

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

  // 粘贴事件处理
  useEffect(() => {
    if (!visible) return

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            const error = validateImageFile(file)
            if (error) {
              showToast(error, 'error')
              return
            }
            
            if (type === 'staff') {
              if (!staffFormData.idCardFront) {
                await processIdCardFile(file, 'idCardFront', setStaffFormData)
              } else if (!staffFormData.idCardBack) {
                await processIdCardFile(file, 'idCardBack', setStaffFormData)
              }
            } else {
              if (!workerFormData.idCardFront) {
                await processIdCardFile(file, 'idCardFront', setWorkerFormData)
              } else if (!workerFormData.idCardBack) {
                await processIdCardFile(file, 'idCardBack', setWorkerFormData)
              }
            }
            e.preventDefault()
            return
          }
        }

        if (item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) {
            const error = validateFile(file)
            if (error) {
              showToast(error, 'error')
              return
            }
            
            if (type === 'staff' && !staffFormData.contractFile) {
              await processUploadFile(file, 'contractFile', setStaffFormData)
            } else if (type === 'worker' && !workerFormData.contractFile) {
              await processUploadFile(file, 'contractFile', setWorkerFormData)
            }
            e.preventDefault()
            return
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [visible, type, staffFormData.idCardFront, staffFormData.idCardBack, staffFormData.contractFile, workerFormData.idCardFront, workerFormData.idCardBack, workerFormData.contractFile])

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
        if (!workerFormData.projectId) {
          showToast('请选择项目', 'error')
          return
        }
        if (!workerFormData.teamId) {
          showToast('请选择班组', 'error')
          return
        }
        if (!workerFormData.dailyWage) {
          showToast('请输入日工资', 'error')
          return
        }
        await onSubmit(workerFormData)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ============ 渲染 ============
  if (!visible) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        {/* Toast 提示 */}
        
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">
            {editingMember ? `编辑${type === 'staff' ? '管理人员' : '工人'}` : `添加${type === 'staff' ? '管理人员' : '工人'}`}
          </h2>
          <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-700">?</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* 上传提示 */}
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            type === 'staff' ? 'bg-primary-50 text-primary-700' : 'bg-orange-50 text-orange-700'
          }`}>
            <Icon name="Lightbulb" size={16} className="inline-block" /> <strong>提示</strong>上传图片或PDF时，可直接<strong>拖拽文件</strong>到上传区域，或在表单内按 <kbd className={`px-1 py-0.5 rounded text-xs ${
              type === 'staff' ? 'bg-primary-200' : 'bg-orange-200'
            }`}>Ctrl+V</kbd> 粘贴从聊天记录/文件管理器复制的内容
          </div>

          {/* OCR 状态指示器 */}
          <div className="mb-4 flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              ocrMode === 'baidu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {ocrMode === 'baidu' ? <><Icon name="Globe" size={14} className="inline-block" /> 百度OCR</> : <><Icon name="WifiOff" size={14} className="inline-block" /> 离线OCR</>}
            </span>
            {ocrLoading && <span className="text-xs text-primary-600">识别中..</span>}
          </div>

          {/* 管理人员表单 */}
          {type === 'staff' && (
            <StaffForm
              formData={staffFormData}
              setFormData={setStaffFormData}
              editingMember={editingMember}
              dragOverField={dragOverField}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop as any}
              onFileChange={handleFileChange as any}
              onDeleteFile={handleDeleteFile as any}
              refs={{
                frontInputRef: staffFrontInputRef,
                backInputRef: staffBackInputRef,
                contractInputRef: staffContractInputRef
              }}
            />
          )}

          {/* 农民工表单 */}
          {type === 'worker' && (
            <WorkerForm
              formData={workerFormData}
              setFormData={setWorkerFormData}
              projects={projects}
              workerTeams={workerTeams}
              editingMember={editingMember}
              ocrLoading={ocrLoading}
              dragOverField={dragOverField}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop as any}
              onFileChange={handleFileChange as any}
              onDeleteFile={handleDeleteFile as any}
              refs={{
                frontInputRef: workerFrontInputRef,
                backInputRef: workerBackInputRef,
                contractInputRef: workerContractInputRef,
                safetyInputRef,
                healthInputRef,
                certInputRef
              }}
            />
          )}

          {/* 提交按钮 */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 text-white rounded-lg transition-colors ${
                type === 'staff'
                  ? 'bg-primary-600 hover:bg-primary-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {submitting ? '提交中..' : (editingMember ? '保存' : '添加')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

export default MemberForm

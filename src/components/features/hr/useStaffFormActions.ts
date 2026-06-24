import { type StaffFormData } from './StaffFormModal'
import { processFileFields, FILE_CATEGORIES, guessFileExt } from '../../../services/fileService'
import { recognizeIdCard, getOCRConfig } from '../../../services/ocr'
import { logCreate, logUpdate } from '../../../utils/audit'
import { getAPI } from '@/services/api-adapter'

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file) })

interface UseStaffFormActionsParams {
  editing: any
  formData: StaffFormData
  setFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  fileDirty: Set<string>
  setFileDirty: React.Dispatch<React.SetStateAction<Set<string>>>
  setOcrLoading: React.Dispatch<React.SetStateAction<boolean>>
  resetForm: () => void
  loadData: () => Promise<void>
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
}

export function useStaffFormActions({
  editing, formData, setFormData, fileDirty, setFileDirty,
  setOcrLoading, resetForm, loadData, showToast,
}: UseStaffFormActionsParams) {

  const handleFileDrop = async (field: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过10MB', 'error'); return }
    const url = await readFileAsDataURL(file)
    setFormData(prev => ({ ...prev, [field]: url, [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image' }))
    setFileDirty(prev => new Set(prev).add(field))
    if (field === 'idCardFront') {
      const cfg = getOCRConfig()
      if (!cfg.enabled) return
      setOcrLoading(true)
      try {
        const res = await recognizeIdCard(url)
        if (res.success && res.idCard) {
          const d = res.idCard
          setFormData(prev => ({ ...prev,
            name: d.name || prev.name,
            gender: d.gender || prev.gender,
            ethnicity: d.ethnicity || prev.ethnicity,
            birthDate: d.birthDate || prev.birthDate,
            idCard: d.number || prev.idCard,
            idCardAddress: d.address || prev.idCardAddress
          }))
          const filled: string[] = []
          if (d.name) filled.push('姓名')
          if (d.number) filled.push('身份证号')
          if (d.gender) filled.push('性别')
          if (d.birthDate) filled.push('出生日期')
          if (d.ethnicity) filled.push('民族')
          if (d.address) filled.push('地址')
          showToast(filled.length > 0 ? `识别成功！已自动填充：${filled.join('、')}` : '身份证识别成功', 'success')
        } else {
        }
      } catch (err) {
        console.error('[OCR] 识别异常:', err)
        showToast('OCR 识别异常: ' + (err instanceof Error ? err.message : String(err)), 'error')
      }
      setOcrLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showToast('请输入姓名', 'error'); return }
    try {
      let payload: any = {
        ...(editing || {}),
        name: formData.name.trim(), phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        idCard: formData.idCard.trim(), gender: formData.gender,
        ethnicity: formData.ethnicity || undefined,
        birthDate: formData.birthDate || undefined,
        idCardAddress: formData.idCardAddress.trim() || undefined,
        entryDate: formData.entryDate,
        departmentId: formData.departmentId || undefined,
        position: formData.position.trim() || undefined,
        baseSalary: formData.baseSalary || undefined,
        leaveDate: formData.leaveDate || undefined,
        reentryDate: formData.reentryDate || undefined,
        memberType: 'staff', status: (formData.leaveDate && !formData.reentryDate) ? 'left' : 'active',
        idCardFront: formData.idCardFront, idCardBack: formData.idCardBack,
        contractFile: formData.contractFile, contractFileType: formData.contractFileType,
      }
      const fieldConfigs = [
        { field: 'idCardFront' as const, ...FILE_CATEGORIES.MEMBER_ID_CARD,
          getFileName: () => `${formData.name}_身份证人像${guessFileExt(payload.idCardFront)}` },
        { field: 'idCardBack' as const, ...FILE_CATEGORIES.MEMBER_ID_CARD,
          getFileName: () => `${formData.name}_身份证国徽${guessFileExt(payload.idCardBack)}` },
        { field: 'contractFile' as const, ...FILE_CATEGORIES.MEMBER_CONTRACT,
          getFileName: () => `${formData.name}_劳动合同${guessFileExt(payload.contractFile, payload.contractFileType)}` },
      ]
      const dirtyConfigs = fieldConfigs.filter(c => fileDirty.has(c.field))
      payload = await processFileFields(payload, dirtyConfigs as Parameters<typeof processFileFields>[1], null)
      for (const f of ['idCardFront', 'idCardBack', 'contractFile'] as const) {
        if (!fileDirty.has(f)) {
          if (editing?.[f] && editing[f] !== '') payload[f] = editing[f]
          else if (!payload[f]) delete payload[f]
        } else if (!payload[f]) {
          delete payload[f]
        }
      }
      const memberApi = await getAPI()
      const result = editing
        ? await memberApi.updateMember({ ...payload, id: editing.id })
        : await memberApi.createMember(payload)
      if (result.success) {
        const memberId = editing ? editing.id : result.data?.id
        if (memberId && formData.baseSalary && formData.entryDate) {
          const changed = !editing || Number(editing.baseSalary) !== Number(formData.baseSalary)
          if (changed) {
            const salaryApi = await getAPI()
            const historyRes = await salaryApi.getSalaryHistory(memberId)
            if (historyRes.success) {
              const existing = (historyRes.data || []).find((h: any) => h.effectiveDate === formData.entryDate)
              if (existing) await salaryApi.deleteSalaryHistory(existing.id)
              await salaryApi.createSalaryHistory({
                memberId,
                effectiveDate: formData.entryDate,
                baseSalary: Number(formData.baseSalary),
                subsidy: 0,
                subsidyNote: '',
                note: '入职初始薪资',
              })
            }
          }
        }
        showToast(editing ? '人员信息已更新' : '人员已创建', 'success')
        if (editing) logUpdate('members', formData.name, editing.id, { staff: true })
        else logCreate('members', formData.name, (result as { data?: { id?: number } })?.data?.id, { staff: true })
        resetForm(); loadData()
      } else { showToast(result.error || '操作失败', 'error') }
    } catch (e: any) { console.error('[保存失败]', e); showToast(e?.message || '保存失败', 'error') }
  }

  return { handleFileDrop, handleSubmit, readFileAsDataURL }
}

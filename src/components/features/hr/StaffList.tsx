import React, { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { useToastContext } from '../../../hooks/useToast'
import { HR_STATUS_LABELS, HR_STATUS_COLORS } from './config'
import { processFileFields, FILE_CATEGORIES, guessFileExt } from '../../../services/fileService'
import { recognizeIdCard, getOCRConfig } from '../../../services/ocr'
import StaffFormModal, { type StaffFormData } from './StaffFormModal'
import BatchDeptAssignModal from './BatchDeptAssignModal'
import SalaryHistoryModal from './SalaryHistoryModal'

const emptyForm: StaffFormData = {
  name: '', phone: '', email: '', idCard: '', gender: '男', ethnicity: '',
  birthDate: '', idCardAddress: '', departmentId: '',
  position: '', entryDate: '', baseSalary: '', status: 'active',
  idCardFront: '', idCardBack: '', contractFile: '', contractFileType: '',
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file) })

const StaffList: React.FC = () => {
  const { showToast } = useToastContext()
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterDept, setFilterDept] = useState<number | ''>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState<StaffFormData>({ ...emptyForm })
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMode, setOcrMode] = useState(getOCRConfig().provider)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [salaryHistoryMember, setSalaryHistoryMember] = useState<any | null>(null)

  const loadData = useCallback(async () => {
    try {
      const [memRes, deptRes] = await Promise.all([
        window.electronAPI.getMembers(),
        window.electronAPI.getDepartments()
      ])
      if (memRes.success) {
        const staff = (memRes.data || []).filter((m: any) => m.memberType === 'staff' || m.memberType === undefined)
        setMembers(staff)
      }
      if (deptRes.success) setDepartments(deptRes.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const orphans = members.filter((m: any) => !m.departmentId)

  const resetForm = () => {
    setEditing(null)
    setFormData({ ...emptyForm })
    setShowForm(false)
  }

  const openEdit = (m: any) => {
    setEditing(m)
    setFormData({
      name: m.name || '', phone: m.phone || '', email: m.email || '', idCard: m.idCard || '',
      gender: m.gender || '男', ethnicity: m.ethnicity || '', birthDate: m.birthDate || '',
      idCardAddress: m.idCardAddress || '', departmentId: m.departmentId || '',
      position: m.position || '', entryDate: m.entryDate || '', baseSalary: m.baseSalary || '',
      status: m.status || 'active', idCardFront: '', idCardBack: '', contractFile: '', contractFileType: '',
    })
    setShowForm(true)
  }

  const handleFileDrop = async (field: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过10MB', 'error'); return }
    const url = await readFileAsDataURL(file)
    setFormData(prev => ({ ...prev, [field]: url, [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image' }))
    // OCR: only recognize front side (人像面), not back side (国徽面)
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
        }
      } catch { /* OCR fails silently */ }
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
        memberType: 'staff', status: formData.status,
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
      payload = await processFileFields(payload, fieldConfigs as any, null)
      // Preserve existing file references when editing and no new file was uploaded
      for (const f of ['idCardFront', 'idCardBack', 'contractFile'] as const) {
        if (!payload[f]) {
          if (editing?.[f]) payload[f] = editing[f]
          else delete payload[f]
        }
      }
      const result = editing
        ? await window.electronAPI.updateMember({ ...payload, id: editing.id })
        : await window.electronAPI.createMember(payload)
      if (result.success) {
        showToast(editing ? '人员信息已更新' : '人员已创建', 'success')
        resetForm(); loadData()
      } else { showToast(result.error || '操作失败', 'error') }
    } catch (e: any) { showToast(e?.message || '保存失败', 'error') }
  }

  const handleStatusChange = async (member: any, newStatus: string) => {
    await window.electronAPI.updateMember({ ...member, status: newStatus })
    loadData()
    showToast('状态已更新', 'success')
  }

  const filtered = members.filter((m: any) => {
    if (filterDept && m.departmentId !== filterDept) return false
    if (filterStatus && m.status !== filterStatus) return false
    return true
  })

  const getDeptName = (id?: number) => departments.find((d: any) => d.id === id)?.name || '-'

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
  }

  return (
    <div className="space-y-4">
      {orphans.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-amber-800">
            <Icon name="AlertTriangle" size={16} className="inline mr-1.5" />
            检测到 {orphans.length} 名人员尚未分配部门
          </span>
          <button onClick={() => setShowBatchModal(true)}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors">
            批量分配
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm px-5 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">部门</label>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-500">状态</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm">
            <option value="">全部</option>
            <option value="active">在职</option>
            <option value="left">离职</option>
          </select>
        </div>
        <div className="flex-1" />
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <span className="mr-1">+</span> 添加人员
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm py-12">
          <EmptyState icon="Users" title="暂无人员" description="点击上方按钮添加第一位管理人员" />
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">姓名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">部门</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">职位</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">手机</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">状态</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">入职日期</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{m.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{getDeptName(m.departmentId)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.position || '-'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{m.phone || '-'}</td>
                  <td className="px-4 py-3">
                    <select value={m.status || 'active'} onChange={e => handleStatusChange(m, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${HR_STATUS_COLORS[m.status || 'active'] || 'bg-slate-100 text-slate-600'}`}>
                      {Object.entries(HR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{m.entryDate || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEdit(m)} className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">编辑</button>
                      <button onClick={() => setSalaryHistoryMember(m)} className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded-lg" title="薪资历史">薪资</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <StaffFormModal
          editing={editing} formData={formData} departments={departments}
          ocrLoading={ocrLoading} ocrMode={ocrMode} dragOver={dragOver}
          onChange={setFormData} onFileDrop={handleFileDrop} onRemove={resetForm}
          onSubmit={handleSubmit} setDragOver={setDragOver}
        />
      )}

      {showBatchModal && (
        <BatchDeptAssignModal
          orphans={orphans}
          departments={departments}
          onClose={() => setShowBatchModal(false)}
          onDone={() => { setShowBatchModal(false); loadData() }}
        />
      )}

      {salaryHistoryMember && (
        <SalaryHistoryModal
          member={salaryHistoryMember}
          onClose={() => setSalaryHistoryMember(null)}
        />
      )}
    </div>
  )
}

export default StaffList

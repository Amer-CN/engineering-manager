import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useStaffListFilters } from './useStaffListFilters'
import { DataTable, type Column } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'
import Spinner from '../../ui/Spinner'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import { logCreate, logUpdate } from '../../../utils/audit'
import { processFileFields, FILE_CATEGORIES, guessFileExt, readUploadedFile } from '../../../services/fileService'
import { recognizeIdCard, getOCRConfig } from '../../../services/ocr'
import StaffFormModal, { type StaffFormData } from './StaffFormModal'
import BatchDeptAssignModal from './BatchDeptAssignModal'
import SalaryHistoryModal from './SalaryHistoryModal'
import { HR_STATUS_LABELS, HR_STATUS_COLORS } from './config'
import { getAPI } from '@/services/api-adapter'

const emptyForm: StaffFormData = {
  name: '', phone: '', email: '', idCard: '', gender: '男', ethnicity: '',
  birthDate: '', idCardAddress: '', departmentId: '',
  position: '', entryDate: '', baseSalary: '', status: 'active', leaveDate: '', reentryDate: '',
  idCardFront: '', idCardBack: '', contractFile: '', contractFileType: '',
}

const readFileAsDataURL = (file: File): Promise<string> =>
  new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.onerror = reject; r.readAsDataURL(file) })

const StaffList: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { ConfirmDialog } = useConfirm()
  const [members, setMembers] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState<StaffFormData>({ ...emptyForm })
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [fileDirty, setFileDirty] = useState<Set<string>>(new Set())
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMode] = useState(getOCRConfig().provider)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [salaryHistoryMember, setSalaryHistoryMember] = useState<any | null>(null)

  const loadData = useCallback(async () => {
    try {
      const api = await getAPI()
      const [memRes, deptRes] = await Promise.allSettled([
        api.getMembers(),
        api.getDepartments()
      ])
      const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
      const membersData = get(memRes)
      setMembers(membersData.filter((m: any) => m.memberType === 'staff' || m.memberType === undefined))
      setDepartments(get(deptRes))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const orphans = useMemo(() => members.filter((m: any) => !m.departmentId), [members])

  const { filterDept, filterStatus, setFilterDept, setFilterStatus, filtered, getDeptName } =
    useStaffListFilters(members, departments)

  const resetForm = () => {
    setEditing(null)
    setFormData({ ...emptyForm })
    setFileDirty(new Set())
    setShowForm(false)
  }

  const openEdit = async (m: any) => {
    setEditing(m)
    // 从磁盘读取已有文件用于预览
    const [r0, r1, r2] = await Promise.allSettled([
      m.idCardFront ? readUploadedFile(FILE_CATEGORIES.MEMBER_ID_CARD.category, FILE_CATEGORIES.MEMBER_ID_CARD.subCategory, m.idCardFront) : Promise.resolve(''),
      m.idCardBack ? readUploadedFile(FILE_CATEGORIES.MEMBER_ID_CARD.category, FILE_CATEGORIES.MEMBER_ID_CARD.subCategory, m.idCardBack) : Promise.resolve(''),
      m.contractFile ? readUploadedFile(FILE_CATEGORIES.MEMBER_CONTRACT.category, FILE_CATEGORIES.MEMBER_CONTRACT.subCategory, m.contractFile) : Promise.resolve(''),
    ])
    const getFileUrl = (r: PromiseSettledResult<string>) => r.status === 'fulfilled' ? r.value || '' : ''
    const frontUrl = getFileUrl(r0)
    const backUrl = getFileUrl(r1)
    const contractUrl = getFileUrl(r2)
    setFormData({
      name: m.name || '', phone: m.phone || '', email: m.email || '', idCard: m.idCard || '',
      gender: m.gender || '男', ethnicity: m.ethnicity || '', birthDate: m.birthDate || '',
      idCardAddress: m.idCardAddress || '', departmentId: m.departmentId || '',
      position: m.position || '', entryDate: m.entryDate || '', baseSalary: m.baseSalary || '',
      status: m.status || 'active', leaveDate: m.leaveDate || '', reentryDate: m.reentryDate || '',
      idCardFront: frontUrl, idCardBack: backUrl,
      contractFile: contractUrl, contractFileType: m.contractFileType || '',
    })
    setShowForm(true)
  }

  const handleFileDrop = async (field: string, file: File) => {
    if (file.size > 10 * 1024 * 1024) { showToast('文件不能超过10MB', 'error'); return }
    const url = await readFileAsDataURL(file)
    setFormData(prev => ({ ...prev, [field]: url, [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image' }))
    setFileDirty(prev => new Set(prev).add(field))
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
      // 只处理用户新拖入/修改的文件字段，未修改的保留原文件名
      const dirtyConfigs = fieldConfigs.filter(c => fileDirty.has(c.field))
      payload = await processFileFields(payload, dirtyConfigs as any, null)
      // 未修改的文件字段保留原引用，无原引用时删除
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
        // A→B 同步：月基本工资变动时同步到薪资历史（入职初始薪资）
        const memberId = editing ? editing.id : (result as any).data?.id
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
        else logCreate('members', formData.name, (result as any)?.data?.id, { staff: true })
        resetForm(); loadData()
      } else { showToast(result.error || '操作失败', 'error') }
    } catch (e: any) { console.error('[保存失败]', e); showToast(e?.message || '保存失败', 'error') }
  }

  const handleStatusChange = useCallback(async (member: any, newStatus: string) => {
    await (await getAPI()).updateMember({ ...member, status: newStatus })
    loadData()
    showToast('状态已更新', 'success')
  }, [loadData, showToast])

  // ── DataTable 列定义 ──
  const columns: Column<any>[] = [
    { key: 'name', title: '姓名', sortable: true, filterable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (m) => <span className="font-medium text-slate-800">{m.name}</span> },
    { key: 'departmentId', title: '部门',
      filterable: 'select',
      filterOptions: departments.map((d: any) => ({ label: d.name, value: d.id })),
      filterAccessor: (m: any) => getDeptName(m.departmentId),
      render: (m) => <span className="text-slate-600">{getDeptName(m.departmentId)}</span> },
    { key: 'position', title: '职位', render: (m) => <span className="text-slate-600">{m.position || '-'}</span> },
    { key: 'phone', title: '手机', render: (m) => <span className="text-slate-600">{m.phone || '-'}</span> },
    { key: 'status', title: '状态',
      filterable: 'select',
      filterOptions: [{ label: '在职', value: 'active' }, { label: '离职', value: 'left' }],
      filterAccessor: (m: any) => m.status || 'active',
      render: (m) => (
      <select value={m.status || 'active'} onChange={e => handleStatusChange(m, e.target.value)}
        className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${HR_STATUS_COLORS[m.status || 'active'] || 'bg-slate-100 text-slate-600'}`}>
        {Object.entries(HR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    )},
    { key: 'entryDate', title: '入职日期', sortable: true,
      sorter: (a, b) => (a.entryDate || '').localeCompare(b.entryDate || ''),
      render: (m) => <span className="text-slate-500">{m.entryDate || '-'}</span> },
    { key: 'leaveDate', title: '离职日期', render: (m) => <span className="text-slate-500">{m.leaveDate || '-'}</span> },
    { key: 'actions', title: '操作', align: 'center', render: (m) => (
      <div className="flex items-center justify-center gap-1">
        <button onClick={() => openEdit(m)} className="btn btn-ghost btn-sm text-indigo-600">编辑</button>
        <button onClick={() => setSalaryHistoryMember(m)} className="btn btn-ghost btn-sm text-amber-600" title="薪资历史">薪资</button>
        <button onClick={() => { if (confirm("确定要删除 " + m.name + " 吗？")) { if (window.confirm('确定要删除该人员吗？')) { getAPI().then(api => api.deleteMember(m.id)).then(r => { if (r.success) { showToast('已删除', 'success'); loadData() } else { showToast(r.error || '删除失败', 'error') } }) } } }} className="btn btn-ghost btn-sm text-red-500" title="删除">删除</button>
      </div>
    )},
  ]

  if (loading) {
    return <Spinner size="md" text="加载人员数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

      <FilterBar className="mb-6">
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
      </FilterBar>

      <DataTable
        data={filtered}
        columns={columns}
        rowKey="id"
        useHoverScrollbar={true}
        scrollClassName="h-full"
        pagination={false}
        emptyText="暂无人员"
        emptyIcon="Users"
      />

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
      {ConfirmDialog}
    </div>
  )
}

export default StaffList

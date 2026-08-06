import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useStaffListFilters } from './useStaffListFilters'
import { DataTable } from '@/components/DataTable'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'
import Spinner from '../../ui/Spinner'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import { FILE_CATEGORIES, readUploadedFile } from '../../../services/fileService'
import { getOCRConfig } from '../../../services/ocr'
import StaffFormModal, { type StaffFormData } from './StaffFormModal'
import BatchDeptAssignModal from './BatchDeptAssignModal'
import SalaryHistoryModal from './SalaryHistoryModal'
import { MemberDetail } from '../members'
import { useStaffFormActions } from './useStaffFormActions'
import { getStaffListColumns } from './staffListColumns'
import { useMaskedFn } from '@/hooks/useMaskedValue'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import type { Member, Department } from '@/types/electron'

const emptyForm: StaffFormData = {
  name: '', phone: '', email: '', idCard: '', gender: '男', ethnicity: '',
  birthDate: '', idCardAddress: '', departmentId: '',
  position: '', entryDate: '', baseSalary: '', status: 'active', leaveDate: '', reentryDate: '',
  idCardFront: '', idCardBack: '', contractFile: '', contractFileType: '',
}

const StaffList: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { can } = usePermission()
  const { ConfirmDialog } = useConfirm()
  const mask = useMaskedFn()
  const [members, setMembers] = useState<Member[]>([] as Member[])
  const [departments, setDepartments] = useState<Department[]>([] as Department[])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [formData, setFormData] = useState<StaffFormData>({ ...emptyForm })
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [fileDirty, setFileDirty] = useState<Set<string>>(new Set())
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMode] = useState(getOCRConfig().provider)
  const [showBatchModal, setShowBatchModal] = useState(false)
  const [salaryHistoryMember, setSalaryHistoryMember] = useState<Member | null>(null)
  // S23 Stitch: 行点击打开人员档案详情
  const [detailMember, setDetailMember] = useState<Member | null>(null)

  const loadData = useCallback(async () => {
    try {
      const api = await getAPI()
      const [memRes, deptRes] = await Promise.allSettled([
        api.getMembers(),
        api.getDepartments()
      ])
      type ApiResponse<T = unknown> = { success: boolean; data?: T }
      const unwrap = <T,>(r: PromiseSettledResult<ApiResponse<T[]>>): T[] =>
        r.status === 'fulfilled' && r.value?.success ? r.value.data ?? [] : []
      const membersData = unwrap<Member>(memRes)
      setMembers(membersData.filter(m => m.memberType === 'staff' || m.memberType === undefined))
      setDepartments(unwrap<Department>(deptRes))
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const orphans = useMemo(() => members.filter((m: Member) => !m.departmentId), [members])

  const { filterDept, filterStatus, setFilterDept, setFilterStatus, filtered, getDeptName } =
    useStaffListFilters(members, departments)

  // S22 Stitch: global search
  const [searchQuery, setSearchQuery] = useState('')
  const searchFiltered = useMemo(() => {
    if (!searchQuery.trim()) return filtered
    const q = searchQuery.toLowerCase()
    return filtered.filter((m: Member) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.idCard || '').toLowerCase().includes(q) ||
      (m.phone || '').toLowerCase().includes(q)
    )
  }, [filtered, searchQuery])

  const resetForm = () => {
    setEditing(null)
    setFormData({ ...emptyForm })
    setFileDirty(new Set())
    setShowForm(false)
  }

  const openEdit = async (m: Member) => {
    setEditing(m)
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

  const handleStatusChange = useCallback(async (member: Member, newStatus: string) => {
    // G2 B5: 人员状态切换 → members:update
    if (!can('members:update')) { showToast('您没有变更状态的权限', 'error'); return }
    await (await getAPI()).updateMember({ ...member, status: newStatus })
    loadData()
    showToast('状态已更新', 'success')
  }, [loadData, showToast])

  const { handleFileDrop, handleSubmit } = useStaffFormActions({
    editing, formData, setFormData, fileDirty, setFileDirty,
    setOcrLoading, resetForm, loadData, showToast,
  })

  const columns = useMemo(() => getStaffListColumns({
    departments, getDeptName, handleStatusChange,
    openEdit, setSalaryHistoryMember, showToast, loadData, mask,
  }), [departments, getDeptName, handleStatusChange, openEdit, setSalaryHistoryMember, showToast, loadData, mask])

  if (loading) {
    return <Spinner size="md" text="加载人员数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {orphans.length > 0 && (
        <div className="bg-warning-50 border border-warning-200 rounded-lg px-5 py-3 flex items-center justify-between">
          <span className="text-sm text-warning-800">
            <Icon name="AlertTriangle" size={16} className="inline mr-1.5" />
            检测到 {orphans.length} 名人员尚未分配部门
          </span>
          <button onClick={() => setShowBatchModal(true)}
            className="px-4 py-1.5 bg-warning-600 hover:bg-warning-700 text-white text-sm rounded-lg transition-colors">
            批量分配
          </button>
        </div>
      )}

      {/* S22 Stitch: 页头工具栏 — 标题内联 + 胶囊搜索/筛选 + 右侧主操作 */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">人员列表</h2>
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索姓名或工号..."
                className="pl-9 pr-4 h-[34px] w-[240px] border border-[color:var(--border)] rounded-[22px] text-sm bg-[color:var(--card)] text-[color:var(--fg)] placeholder-[color:var(--muted)] focus:border-[color:var(--border-strong)] focus:outline-none transition-colors"
              />
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value ? Number(e.target.value) : '')}
              className="h-[34px] px-4 pr-8 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] text-sm text-[color:var(--fg)] focus:border-[color:var(--border-strong)] focus:outline-none transition-colors">
              <option value="">所有部门</option>
              {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="h-[34px] px-4 pr-8 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--card)] text-sm text-[color:var(--fg)] focus:border-[color:var(--border-strong)] focus:outline-none transition-colors">
              <option value="">所有状态</option>
              <option value="active">在职</option>
              <option value="left">离职</option>
            </select>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm" leftIcon="Plus">
          新增人员
        </Button>
      </div>

      <DataTable
        data={searchFiltered}
        columns={columns}
        rowKey="id"
        onRowClick={(m) => setDetailMember(m)}
        useHoverScrollbar={true}
        scrollClassName="h-full"
        pagination={false}
        emptyText="暂无人员"
        emptyIcon="Users"
        footer={
          <div className="flex items-center px-4 py-2.5 text-xs text-[color:var(--muted)]">
            {searchFiltered.length > 0
              ? `显示 1 - ${searchFiltered.length} 共 ${searchFiltered.length} 条记录`
              : '共 0 条记录'}
          </div>
        }
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

      {detailMember && (
        <MemberDetail
          member={detailMember}
          deptName={getDeptName(detailMember.departmentId)}
          onClose={() => setDetailMember(null)}
          onEdit={() => { const m = detailMember; setDetailMember(null); openEdit(m) }}
        />
      )}
      {ConfirmDialog}
    </div>
  )
}

export default StaffList

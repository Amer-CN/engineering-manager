import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useStaffListFilters } from './useStaffListFilters'
import { DataTable } from '@/components/DataTable'
import FilterBar from '../../ui/FilterBar'
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
import { useStaffFormActions } from './useStaffFormActions'
import { getStaffListColumns } from './staffListColumns'
import { getAPI } from '@/services/api-adapter'
import type { Member, Department } from '@/types/electron'

const emptyForm: StaffFormData = {
  name: '', phone: '', email: '', idCard: '', gender: '男', ethnicity: '',
  birthDate: '', idCardAddress: '', departmentId: '',
  position: '', entryDate: '', baseSalary: '', status: 'active', leaveDate: '', reentryDate: '',
  idCardFront: '', idCardBack: '', contractFile: '', contractFileType: '',
}

const StaffList: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { ConfirmDialog } = useConfirm()
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
    openEdit, setSalaryHistoryMember, showToast, loadData,
  }), [departments, getDeptName, handleStatusChange, openEdit, setSalaryHistoryMember, showToast, loadData])

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
            {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
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

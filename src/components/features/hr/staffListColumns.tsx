import { type Column } from '@/components/DataTable'
import { HR_STATUS_LABELS, HR_STATUS_COLORS } from './config'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'
import type { Member, Department } from '@/types/electron'

type MaskFn = (type: 'idCard' | 'phone' | 'bankAccount' | 'email', value: string | null | undefined) => string

interface StaffListColumnsParams {
  departments: Department[]
  getDeptName: (id: number | undefined) => string
  handleStatusChange: (member: Member, status: string) => void
  openEdit: (m: Member) => void
  setSalaryHistoryMember: (m: Member) => void
  showToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void
  loadData: () => Promise<void>
  mask: MaskFn
}

export function getStaffListColumns({
  departments, getDeptName, handleStatusChange,
  openEdit, setSalaryHistoryMember, showToast, loadData, mask,
}: StaffListColumnsParams): Column<Member>[] {
  return [
    { key: 'name', title: '姓名', sortable: true, filterable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (m) => <span className="font-medium text-slate-800">{m.name}</span> },
    { key: 'departmentId', title: '部门',
      filterable: 'select',
      filterOptions: departments.map((d) => ({ label: d.name, value: String(d.id) })),
      filterAccessor: (m) => getDeptName(m.departmentId),
      render: (m) => <span className="text-slate-600">{getDeptName(m.departmentId)}</span> },
    { key: 'position', title: '职位', render: (m) => <span className="text-slate-600">{m.position || '-'}</span> },
    { key: 'phone', title: '手机', render: (m) => <span className="text-slate-600 font-mono text-xs">{mask('phone', m.phone) || '-'}</span> },
    { key: 'idCard', title: '身份证号', filterable: true, render: (m) => <span className="text-slate-500 font-mono text-xs">{mask('idCard', m.idCard) || '-'}</span> },
    { key: 'status', title: '状态',
      filterable: 'select',
      filterOptions: [{ label: '在职', value: 'active' }, { label: '离职', value: 'left' }],
      filterAccessor: (m) => m.status || 'active',
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
        <Button onClick={() => openEdit(m)}  variant="ghost" size="sm" className="text-indigo-600">编辑</Button>
        <Button onClick={() => setSalaryHistoryMember(m)}  title="薪资历史" variant="ghost" size="sm" className="text-amber-600">薪资</Button>
        <Button onClick={() => { if (confirm("确定要删除 " + m.name + " 吗？")) { if (window.confirm('确定要删除该人员吗？')) { getAPI().then(api => api.deleteMember(m.id)).then(r => { if (r.success) { showToast('已删除', 'success'); loadData() } else { showToast(r.error || '删除失败', 'error') } }) } } }}  title="删除" variant="ghost" size="sm" className="text-red-500">删除</Button>
      </div>
    )},
  ]
}
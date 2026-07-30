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

// S22 Stitch: 离职人员整行淡化
const mutedIfLeft = (m: Member, base: string) =>
  m.status === 'left' ? 'text-[color:var(--muted)]' : base

export function getStaffListColumns({
  departments, getDeptName, handleStatusChange,
  openEdit, setSalaryHistoryMember, showToast, loadData, mask,
}: StaffListColumnsParams): Column<Member>[] {
  return [
    // S22 Stitch: 首列 avatar 首字母圆形头像 + 姓名
    { key: 'name', title: '姓名', sortable: true, filterable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'zh-CN'),
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[color:var(--fg-2)]">
            {(m.name || '?').charAt(0)}
          </div>
          <span className={`font-semibold ${mutedIfLeft(m, 'text-[color:var(--fg)]')}`}>{m.name}</span>
        </div>
      ) },
    { key: 'phone', title: '手机',
      render: (m) => <span className="font-mono text-sm tabular-nums text-[color:var(--muted)]">{mask('phone', m.phone) || '-'}</span> },
    { key: 'departmentId', title: '部门',
      filterable: 'select',
      filterOptions: departments.map((d) => ({ label: d.name, value: String(d.id) })),
      filterAccessor: (m) => getDeptName(m.departmentId),
      render: (m) => <span className={mutedIfLeft(m, 'text-[color:var(--fg-2)]')}>{getDeptName(m.departmentId)}</span> },
    { key: 'position', title: '职位',
      render: (m) => <span className={mutedIfLeft(m, 'text-[color:var(--fg-2)]')}>{m.position || '-'}</span> },
    { key: 'entryDate', title: '入职日期', sortable: true,
      sorter: (a, b) => (a.entryDate || '').localeCompare(b.entryDate || ''),
      render: (m) => <span className={`font-mono text-sm tabular-nums ${mutedIfLeft(m, 'text-[color:var(--fg-2)]')}`}>{m.entryDate || '-'}</span> },
    { key: 'status', title: '状态',
      filterable: 'select',
      filterOptions: [{ label: '在职', value: 'active' }, { label: '离职', value: 'left' }],
      filterAccessor: (m) => m.status || 'active',
      render: (m) => (
      <select value={m.status || 'active'}
        onClick={e => e.stopPropagation()}
        onChange={e => handleStatusChange(m, e.target.value)}
        className={`status-badge px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${HR_STATUS_COLORS[m.status || 'active'] || 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>
        {Object.entries(HR_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    )},
    // S22 Stitch: 操作列右对齐 + hover 显隐
    { key: 'actions', title: '操作', align: 'right', render: (m) => (
      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
        onClick={e => e.stopPropagation()}>
        <Button onClick={() => openEdit(m)}  variant="ghost" size="sm" className="text-[color:var(--accent)]">编辑</Button>
        <Button onClick={() => setSalaryHistoryMember(m)}  title="薪资历史" variant="ghost" size="sm" className="text-warning-600">薪资</Button>
        <Button onClick={() => { if (window.confirm('确定要删除 ' + m.name + ' 吗？')) { getAPI().then(api => api.deleteMember(m.id)).then(r => { if (r.success) { showToast('已删除', 'success'); loadData() } else { showToast(r.error || '删除失败', 'error') } }) } }}  title="删除" variant="ghost" size="sm" className="text-danger-500">删除</Button>
      </div>
    )},
  ]
}

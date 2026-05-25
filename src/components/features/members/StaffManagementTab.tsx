import type { Member } from '@/types'
import { Icon } from '../../ui/Icon'
import { Table, type TableColumn } from '../../ui/Table'

interface StaffManagementTabProps {
  filteredStaff: Member[]
  filterStatus: string
  onFilterStatusChange: (val: string) => void
  onAdd: () => void
  onEdit: (member: Member) => void
  onDelete: (id: number) => void
  onClick: (member: Member) => void
  onStatusChange: (member: Member, status: string) => void
}

const staffTableColumns = (
  onEdit: (m: Member) => void,
  onDelete: (id: number) => void,
  onStatusChange: (m: Member, s: string) => void,
): TableColumn<Member>[] => [
  { key: 'name', title: '姓名', width: 100, render: (v) => <span className="font-medium text-slate-800">{String(v)}</span> },
  { key: 'role', title: '职位', width: 120, render: (v) => <span className="text-slate-600">{String(v || '-')}</span> },
  { key: 'phone', title: '电话', width: 130, render: (v) => <span className="text-slate-600 text-sm">{String(v || '-')}</span> },
  { key: 'idCard', title: '身份证号', width: 170, render: (v) => <span className="text-slate-500 text-xs font-mono">{String(v || '-')}</span> },
  {
    key: 'status', title: '在职状态', width: 110,
    render: (value, record) => {
      const s = String(value || 'active')
      return (
        <select value={s} onChange={(e) => { e.stopPropagation(); onStatusChange(record, e.target.value) }}
          className={`px-2 py-1 text-xs rounded-lg border font-medium cursor-pointer ${
            s === 'active' ? 'bg-green-50 text-green-700 border-green-300' : 'bg-slate-100 text-slate-500 border-slate-300'}`}
          onClick={(e) => e.stopPropagation()}>
          <option value="active">在职</option>
          <option value="left">已离职</option>
        </select>
      )
    },
  },
  { key: 'entryDate', title: '入职时间', width: 110, render: (v) => <span className="text-slate-600 text-sm">{v ? String(v) : '-'}</span> },
  {
    key: 'actions' as keyof Member, title: '操作', width: 110, align: 'center' as const,
    render: (_value, record) => (
      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onEdit(record)} className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded transition-colors">编辑</button>
        <button onClick={() => onDelete(record.id)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">删除</button>
      </div>
    ),
  },
]

export default function StaffManagementTab({ filteredStaff, filterStatus, onFilterStatusChange, onAdd, onEdit, onDelete, onClick, onStatusChange }: StaffManagementTabProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-slate-500">共 {filteredStaff.length} 人</div>
          <select value={filterStatus} onChange={e => onFilterStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg">
            <option value="all">全部状态</option>
            <option value="active">在职</option>
            <option value="left">已离职</option>
          </select>
        </div>
        <button onClick={onAdd}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center text-sm">
          <Icon name="Plus" size={14} className="mr-1" />添加管理人员
        </button>
      </div>

      {filteredStaff.length > 0 ? (
        <Table columns={staffTableColumns(onEdit, onDelete, onStatusChange) as any} data={filteredStaff as any}
          rowKey="id" size="default" hoverable onRowClick={(record) => onClick(record as unknown as Member)} />
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-slate-200">
          <p className="text-slate-400 mb-4">暂无管理人员</p>
          <button onClick={onAdd}
            className="btn btn-primary text-sm px-5 py-2.5">+ 添加管理人员</button>
        </div>
      )}
    </>
  )
}

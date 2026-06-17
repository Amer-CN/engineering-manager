import type { Member } from '@/types'
import { maskIdCard, maskPhone, maskBankAccount } from "@/utils/mask";
import { Icon } from '../../ui/Icon'
import { DataTable, type Column } from '../../DataTable'

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
): Column<Member>[] => [
  {
    key: 'name',
    title: '姓名',
    width: '100px',
    render: item => <span className="font-medium text-slate-800">{item.name}</span>,
  },
  {
    key: 'role',
    title: '职位',
    width: '120px',
    render: item => <span className="text-slate-600">{item.role || '-'}</span>,
  },
  {
    key: 'phone',
    title: '电话',
    width: '130px',
    render: item => <span className="text-slate-600 text-sm">{maskPhone(item.phone) || '-'}</span>,
  },
  {
    key: 'idCard',
    title: '身份证号',
    width: '170px',
    render: item => (
      <span className="text-slate-500 text-xs font-mono">{maskIdCard(item.idCard) || '-'}</span>
    ),
  },
  {
    key: 'status',
    title: '在职状态',
    width: '110px',
    render: item => {
      const s = item.status || 'active'
      return (
        <select
          value={s}
          onChange={e => {
            e.stopPropagation()
            onStatusChange(item, e.target.value)
          }}
          className={`px-2 py-1 text-xs rounded-lg border font-medium cursor-pointer ${
            s === 'active'
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-slate-100 text-slate-500 border-slate-300'
          }`}
          onClick={e => e.stopPropagation()}
        >
          <option value="active">在职</option>
          <option value="left">已离职</option>
        </select>
      )
    },
  },
  {
    key: 'entryDate',
    title: '入职时间',
    width: '110px',
    render: item => (
      <span className="text-slate-600 text-sm">{item.entryDate || '-'}</span>
    ),
  },
  {
    key: 'actions',
    title: '操作',
    width: '110px',
    align: 'center',
    render: item => (
      <div className="flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
        <button onClick={() => onEdit(item)} className="btn btn-ghost btn-sm text-primary-600">
          编辑
        </button>
        <button onClick={() => onDelete(item.id)} className="btn btn-danger btn-sm">
          删除
        </button>
      </div>
    ),
  },
]

export default function StaffManagementTab({
  filteredStaff,
  filterStatus,
  onFilterStatusChange,
  onAdd,
  onEdit,
  onDelete,
  onClick,
  onStatusChange,
}: StaffManagementTabProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="text-slate-500">共 {filteredStaff.length} 人</div>
          <select
            value={filterStatus}
            onChange={e => onFilterStatusChange(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
          >
            <option value="all">全部状态</option>
            <option value="active">在职</option>
            <option value="left">已离职</option>
          </select>
        </div>
        <button
          onClick={onAdd}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center text-sm"
        >
          <Icon name="Plus" size={14} className="mr-1" />
          添加管理人员
        </button>
      </div>

      <DataTable
        data={filteredStaff}
        columns={staffTableColumns(onEdit, onDelete, onStatusChange)}
        rowKey="id"
        pagination={false}
        onRowClick={onClick}
        emptyText="暂无管理人员"
        emptyIcon="User"
        showContainer
      />
    </>
  )
}

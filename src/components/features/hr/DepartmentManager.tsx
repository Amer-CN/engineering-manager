import React, { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { motion } from 'framer-motion'
import FilterBar from '../../ui/FilterBar'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import Spinner from '../../ui/Spinner'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { useDepartments } from '../../../hooks/useDepartments'
import PositionEditor from './PositionEditor'
import { getAPI } from '@/services/api-adapter'
import { Card } from '@/components/ui/Card'

interface DeptRow {
  id: number
  name: string
  memberCount: number
  managerId?: number | null
  positions?: string[]
}

const DepartmentManager: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const { departments, loading, create, update, remove } = useDepartments()
  const [members, setMembers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', managerId: '' as number | '' })
  const [positions, setPositions] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      const res = await (await getAPI()).getMembers()
      if (res.success) setMembers(res.data || [])
    })()
  }, [])

  const getManagerName = (managerId?: number | null) => {
    if (!managerId) return '-'
    const m = members.find((x: any) => x.id === managerId)
    return m ? m.name : `ID:${managerId}`
  }

  const resetForm = () => {
    setEditing(null)
    setFormData({ name: '', managerId: '' })
    setPositions([])
    setShowForm(false)
  }

  const openEdit = (dept: any) => {
    setEditing(dept)
    setFormData({ name: dept.name, managerId: dept.managerId || '' })
    setPositions(dept.positions || [])
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) { showToast('请输入部门名称', 'error'); return }
    const payload = { name: formData.name.trim(), managerId: formData.managerId || undefined, positions }
    const result = editing
      ? await update({ id: editing.id, ...payload })
      : await create(payload)
    if (result.success) {
      showToast(editing ? '部门更新成功' : '部门创建成功', 'success')
      resetForm()
    } else {
      showToast(result.error || '操作失败', 'error')
    }
  }

  const handleDelete = async (dept: any) => {
    const inDept = members.filter((m: any) => m.departmentId === dept.id && (m.memberType === 'staff' || m.memberType === undefined))
    const names = inDept.map((m: any) => m.name).join('、')
    const msg = names
      ? `「${dept.name}」下有 ${inDept.length} 名人员（${names}），请先将他们转移或移除后再删除部门。`
      : `确定要删除「${dept.name}」吗？`
    if (names) { showToast(msg, 'error'); return }
    const ok = await confirm({ title: '确认删除', content: msg, confirmVariant: 'danger' })
    if (!ok) return
    const result = await remove(dept.id)
    if (result.success) {
      showToast('部门已删除', 'success')
    } else {
      showToast(result.error || '删除失败', 'error')
    }
  }

  const columns: Column<DeptRow>[] = [
    { key: 'name', title: '部门名称', render: (item) => <span className="font-medium text-slate-800">{item.name}</span> },
    { key: 'memberCount', title: '人数', render: (item) => <span className="text-sm text-slate-600">{item.memberCount} 人</span> },
    { key: 'managerId', title: '负责人', render: (item) => <span className="text-sm text-slate-600">{getManagerName(item.managerId)}</span> },
    { key: 'actions', title: '操作', align: 'center', render: (item) => (
      <div className="flex items-center justify-center gap-2">
        <Button onClick={() => openEdit(item)}  variant="ghost" size="sm" className="btn text-primary-600">编辑</Button>
        <Button onClick={() => handleDelete(item)}  variant="danger" size="sm" className="btn">删除</Button>
      </div>
    )},
  ]

  if (loading) {
    return <Spinner size="md" text="加载部门数据..." />
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {ConfirmDialog}
      <FilterBar className="mb-6">
        <h2 className="text-lg font-semibold text-slate-800">部门列表</h2>
        <div className="flex-1" />
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <span className="mr-1">+</span> 新建部门
        </Button>
      </FilterBar>

      {departments.length === 0 ? (
        <Card bordered={false} className="flex-1 py-12">
          <EmptyState icon="Building2" title="暂无部门" description="点击上方按钮创建第一个部门" />
        </Card>
      ) : (
        <DataTable
          data={departments as DeptRow[]}
          columns={columns}
          rowKey="id"
          pagination={false}
          useHoverScrollbar={true}
          scrollClassName="h-full"
          emptyText="暂无部门"
          emptyIcon="Building2"
        />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">{editing ? '编辑部门' : '新建部门'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">部门名称 *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">负责人</label>
                <select value={formData.managerId} onChange={e => setFormData({ ...formData, managerId: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option value="">暂不指定</option>
                  {members.filter((m: any) => m.memberType === 'staff' || m.memberType === undefined).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <PositionEditor positions={positions} onChange={setPositions} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={resetForm}  variant="secondary" className="btn">取消</Button>
                <Button type="submit"  variant="primary" className="px-5 py-2 btn">{editing ? '保存' : '创建'}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default DepartmentManager

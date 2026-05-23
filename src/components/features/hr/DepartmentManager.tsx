import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../../ui/Button'
import { EmptyState } from '../../ui/EmptyState'
import { useToastStore } from '@/store/toastStore'
import { useDepartments } from '../../../hooks/useDepartments'
import PositionEditor from './PositionEditor'

const DepartmentManager: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { departments, loading, create, update, remove } = useDepartments()
  const [members, setMembers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', managerId: '' as number | '' })
  const [positions, setPositions] = useState<string[]>([])

  useEffect(() => {
    (async () => {
      const res = await window.electronAPI.getMembers()
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
    if (!confirm(msg)) return
    const result = await remove(dept.id)
    if (result.success) {
      showToast('部门已删除', 'success')
    } else {
      showToast(result.error || '删除失败', 'error')
    }
  }

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">部门列表</h2>
        <Button onClick={() => { resetForm(); setShowForm(true) }} size="sm">
          <span className="mr-1">+</span> 新建部门
        </Button>
      </div>

      {departments.length === 0 ? (
        <div className="py-12">
          <EmptyState icon="Building2" title="暂无部门" description="点击上方按钮创建第一个部门" />
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">部门名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">人数</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">负责人</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {departments.map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{dept.name}</td>
                <td className="px-6 py-3 text-sm text-slate-600">{dept.memberCount} 人</td>
                <td className="px-6 py-3 text-sm text-slate-600">{getManagerName(dept.managerId)}</td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEdit(dept)} className="px-3 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg">编辑</button>
                    <button onClick={() => handleDelete(dept)} className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">负责人</label>
                <select value={formData.managerId} onChange={e => setFormData({ ...formData, managerId: e.target.value ? Number(e.target.value) : '' })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">暂不指定</option>
                  {members.filter((m: any) => m.memberType === 'staff' || m.memberType === undefined).map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <PositionEditor positions={positions} onChange={setPositions} />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetForm} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
                <button type="submit" className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">{editing ? '保存' : '创建'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default DepartmentManager

import { useState, useCallback, useEffect } from 'react'
import { Department } from '../types/electron'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from './usePermission'

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const { can } = usePermission()

  const load = useCallback(async () => {
    try {
      const result = await (await getAPI()).getDepartments()
      if (result.success && result.data) setDepartments(result.data)
    } catch (e) {
      console.error('Failed to load departments:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (data: { name: string; managerId?: number; positions?: string[] }) => {
    // G2 B5: 部门新建 → members:create
    if (!can('members:create')) return { success: false, error: '您没有新建部门的权限' }
    const result = await (await getAPI()).createDepartment(data)
    if (result.success) await load()
    return result
  }

  const update = async (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => {
    // G2 B5: 部门编辑 → members:update
    if (!can('members:update')) return { success: false, error: '您没有编辑部门的权限' }
    const result = await (await getAPI()).updateDepartment(data)
    if (result.success) await load()
    return result
  }

  const remove = async (id: number) => {
    // G2 B5: 部门删除 → members:delete
    if (!can('members:delete')) return { success: false, error: '您没有删除部门的权限' }
    const result = await (await getAPI()).deleteDepartment(id)
    if (result.success) await load()
    return result
  }

  return { departments, loading, load, create, update, remove }
}

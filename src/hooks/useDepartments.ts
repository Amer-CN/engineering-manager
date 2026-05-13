import { useState, useCallback, useEffect } from 'react'
import { Department } from '../types/electron'

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const result = await window.electronAPI.getDepartments()
      if (result.success && result.data) setDepartments(result.data)
    } catch (e) {
      console.error('Failed to load departments:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const create = async (data: { name: string; managerId?: number; positions?: string[] }) => {
    const result = await window.electronAPI.createDepartment(data)
    if (result.success) await load()
    return result
  }

  const update = async (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => {
    const result = await window.electronAPI.updateDepartment(data)
    if (result.success) await load()
    return result
  }

  const remove = async (id: number) => {
    const result = await window.electronAPI.deleteDepartment(id)
    if (result.success) await load()
    return result
  }

  return { departments, loading, load, create, update, remove }
}

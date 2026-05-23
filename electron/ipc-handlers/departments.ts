/**
 * 部门管理 IPC 处理器（双写模式）
 */

import { ipcMain } from 'electron'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, useSqliteWrite, departmentQueries } from '../sqlite/queries'

ipcMain.handle('db:departments:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // SQLite 优先
  if (useSqliteRead()) {
    const data = departmentQueries.listDepartments()
    if (data) return { success: true, data }
    // SQLite 读取失败，fallthrough 到 JSON
  }

  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  // JSON 回退
  const depts = [...db.departments].sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const enriched = depts.map((d: any) => ({
    ...d,
    memberCount: db.members.filter((m: any) => m.departmentId === d.id && m.memberType === 'staff').length
  }))
  return { success: true, data: enriched }
})

ipcMain.handle('db:departments:create', (_, data: { name: string; managerId?: number; positions?: string[] }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!data.name?.trim()) return { success: false, error: '部门名称不能为空' }

  // SQLite 重名检查
  if (useSqliteRead()) {
    const exists = departmentQueries.existsByName(data.name.trim())
    if (exists === true) return { success: false, error: '部门名称已存在' }
  } else {
    const exists = db.departments.some((d: any) => d.name === data.name.trim())
    if (exists) return { success: false, error: '部门名称已存在' }
  }

  const id = Date.now()
  const dept = {
    id,
    name: data.name.trim(),
    managerId: data.managerId || null,
    positions: data.positions || [],
    createdAt: new Date().toISOString()
  }

  // JSON 写入
  db.departments.push(dept)
  saveDatabase()

  // SQLite 双写
  if (useSqliteWrite()) {
    departmentQueries.createDepartment(dept)
  }

  return { success: true, data: { id } }
})

ipcMain.handle('db:departments:update', (_, data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  const index = db.departments.findIndex((d: any) => d.id === data.id)
  if (index === -1) return { success: false, error: '部门不存在' }

  if (data.name !== undefined) {
    // SQLite 重名检查
    if (useSqliteRead()) {
      const dup = departmentQueries.existsByName(data.name.trim(), data.id)
      if (dup === true) return { success: false, error: '部门名称已存在' }
    } else {
      const dup = db.departments.find((d: any) => d.name === data.name.trim() && d.id !== data.id)
      if (dup) return { success: false, error: '部门名称已存在' }
    }
    db.departments[index].name = data.name.trim()
  }
  if (data.managerId !== undefined) {
    db.departments[index].managerId = data.managerId
  }
  if (data.positions !== undefined) {
    db.departments[index].positions = data.positions
  }
  saveDatabase()

  // SQLite 双写
  if (useSqliteWrite()) {
    const changes: Record<string, any> = {}
    if (data.name !== undefined) changes.name = data.name.trim()
    if (data.managerId !== undefined) changes.managerId = data.managerId
    if (data.positions !== undefined) changes.positions = data.positions
    departmentQueries.updateDepartment(data.id, changes)
  }

  return { success: true }
})

ipcMain.handle('db:departments:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }

  // 检查是否有成员
  let hasMembers = false
  if (useSqliteRead()) {
    const count = departmentQueries.countStaffMembers(id)
    hasMembers = count !== null ? count > 0 : db.members.some((m: any) => m.departmentId === id && m.memberType === 'staff')
  } else {
    hasMembers = db.members.some((m: any) => m.departmentId === id && m.memberType === 'staff')
  }

  if (hasMembers) return { success: false, error: '该部门下还有人员，请先移除或转移人员' }

  // JSON 删除
  db.departments = db.departments.filter((d: any) => d.id !== id)
  saveDatabase()

  // SQLite 双写
  if (useSqliteWrite()) {
    departmentQueries.deleteDepartment(id)
  }

  return { success: true }
})

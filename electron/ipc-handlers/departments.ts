/**
 * 部门管理 IPC 处理器
 */

import { ipcMain } from 'electron'
import { db, dbReady, saveDatabase } from '../database'

ipcMain.handle('db:departments:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  const depts = [...db.departments].sort((a: any, b: any) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  // Attach computed memberCount
  const enriched = depts.map((d: any) => ({
    ...d,
    memberCount: db.members.filter((m: any) => m.departmentId === d.id && m.memberType === 'staff').length
  }))
  return { success: true, data: enriched }
})

ipcMain.handle('db:departments:create', (_, data: { name: string; managerId?: number; positions?: string[] }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!data.name?.trim()) return { success: false, error: '部门名称不能为空' }
  const exists = db.departments.some((d: any) => d.name === data.name.trim())
  if (exists) return { success: false, error: '部门名称已存在' }
  const id = Date.now()
  const dept = { id, name: data.name.trim(), managerId: data.managerId || null,
    positions: data.positions || [], createdAt: new Date().toISOString() }
  db.departments.push(dept)
  saveDatabase()
  return { success: true, data: { id } }
})

ipcMain.handle('db:departments:update', (_, data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  const index = db.departments.findIndex((d: any) => d.id === data.id)
  if (index === -1) return { success: false, error: '部门不存在' }
  if (data.name !== undefined) {
    const dup = db.departments.find((d: any) => d.name === data.name.trim() && d.id !== data.id)
    if (dup) return { success: false, error: '部门名称已存在' }
    db.departments[index].name = data.name.trim()
  }
  if (data.managerId !== undefined) {
    db.departments[index].managerId = data.managerId
  }
  if (data.positions !== undefined) {
    db.departments[index].positions = data.positions
  }
  saveDatabase()
  return { success: true }
})

ipcMain.handle('db:departments:delete', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  const hasMembers = db.members.some((m: any) => m.departmentId === id && m.memberType === 'staff')
  if (hasMembers) return { success: false, error: '该部门下还有人员，请先移除或转移人员' }
  db.departments = db.departments.filter((d: any) => d.id !== id)
  saveDatabase()
  return { success: true }
})

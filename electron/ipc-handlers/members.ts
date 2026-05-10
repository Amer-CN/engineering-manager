/**
 * 成员 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 成员 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:members:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  return { success: true, data: db.members.sort((a: any, b: any) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:members:create', (_, member) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newMember = { ...member, id, createdAt: new Date().toISOString() }
    db.members.push(newMember)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:members:update', (_, member) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.members.findIndex((m: any) => m.id === member.id)
    if (index !== -1) {
      db.members[index] = { ...db.members[index], ...member }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:members:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.members = db.members.filter((m: any) => m.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete member:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 农民工班组 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workerTeams:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  const teams = db.workerTeams.map((t: any) => {
    const project = db.projects.find((p: any) => p.id === t.projectId)
    const leader = db.members.find((m: any) => m.id === t.leaderId)
    return {
      ...t,
      projectName: project?.name || '',
      leaderName: leader?.name || ''
    }
  })
  return { success: true, data: teams.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:workerTeams:create', (_, team) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查同名班组是否存在
    const exists = db.workerTeams.find((t: any) =>
      t.name === team.name && t.projectId === team.projectId
    )
    if (exists) {
      return { success: false, error: '该项目下已存在同名班组' }
    }
    const id = Date.now()
    const newTeam = {
      ...team,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.workerTeams.push(newTeam)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create team:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workerTeams:update', (_, team) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.workerTeams.findIndex((t: any) => t.id === team.id)
    if (index !== -1) {
      db.workerTeams[index] = { ...db.workerTeams[index], ...team, updatedAt: new Date().toISOString() }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update team:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workerTeams:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查是否有工人属于该班组
    const workersInTeam = db.members.filter((m: any) =>
      m.memberType === 'worker' && m.teamId === id
    )
    if (workersInTeam.length > 0) {
      return { success: false, error: `该班组下有 ${workersInTeam.length} 名工人，无法删除` }
    }
    db.workerTeams = db.workerTeams.filter((t: any) => t.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete team:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 工人调动记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workerTransferRecords:getAll', (_, workerId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  let records = db.workerTransferRecords
  if (workerId) {
    records = records.filter((r: any) => r.workerId === workerId)
  }
  return { success: true, data: records.sort((a: any, b: any) =>
    new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()
  )}
})

ipcMain.handle('db:workerTransferRecords:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString()
    }
    db.workerTransferRecords.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create transfer record:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 项目成员关联
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:projectMembers:getAll', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.projectMembers) db.projectMembers = []
  const records = db.projectMembers
    .filter((pm: any) => pm.projectId === projectId)
    .map((pm: any) => {
      const member = db.members.find((m: any) => m.id === pm.memberId)
      return { ...pm, member: member || null }
    })
    .sort((a: any, b: any) =>
      new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    )
  return { success: true, data: records }
})

ipcMain.handle('db:projectMembers:add', (_, projectId: number, memberId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectMembers) db.projectMembers = []
    const exists = db.projectMembers.find((pm: any) =>
      pm.projectId === projectId && pm.memberId === memberId
    )
    if (exists) {
      return { success: false, error: '该成员已在项目中' }
    }
    const id = Date.now()
    db.projectMembers.push({
      id,
      projectId,
      memberId,
      joinedAt: new Date().toISOString()
    })
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to add project member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectMembers:remove', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectMembers) db.projectMembers = []
    db.projectMembers = db.projectMembers.filter((pm: any) => pm.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to remove project member:', error)
    return { success: false, error: error.message }
  }
})

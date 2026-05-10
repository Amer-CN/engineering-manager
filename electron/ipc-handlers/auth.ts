/**
 * 认证 IPC 处理器
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, saveDatabase, verifyPassword, hashPassword, User } from '../database'
import { getRoleName, getRolePermissions } from './roles'

// ═══════════════════════════════════════════════════════════════════════════════
// 用户服务
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 登录
 */
ipcMain.handle('auth:login', async (_, username: string, password: string) => {
  try {
    const user = db.users.find(u => u.username === username)

    if (!user) {
      return { success: false, error: '用户名或密码错误' }
    }

    if (user.status !== 'active') {
      return { success: false, error: '账户已被禁用' }
    }

    // Check account lockout
    if (user.lockedUntil) {
      const lockExpiry = new Date(user.lockedUntil).getTime()
      if (Date.now() < lockExpiry) {
        const remainingMin = Math.ceil((lockExpiry - Date.now()) / 60000)
        return { success: false, error: `账户已被锁定，请在 ${remainingMin} 分钟后重试` }
      }
      // Lock expired, reset
      user.failedLoginAttempts = 0
      user.lockedUntil = null
    }

    const isValid = verifyPassword(password, user.passwordHash, user.passwordSalt, user.passwordHashVersion || 1)

    if (!isValid) {
      // Track failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString()
        saveDatabase()
        return { success: false, error: '密码错误次数过多，账户已锁定 15 分钟' }
      }
      saveDatabase()
      const remaining = 5 - user.failedLoginAttempts
      return { success: false, error: `用户名或密码错误，还剩 ${remaining} 次尝试机会` }
    }

    // Reset failed attempts on success
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastLoginAt = new Date().toISOString()

    // Auto-upgrade password hash if using old version
    if (!user.passwordHashVersion || user.passwordHashVersion < 2) {
      const { hash, salt } = hashPassword(password)
      user.passwordHash = hash
      user.passwordSalt = salt
      user.passwordHashVersion = 2
      log.info('Password hash upgraded for user:', user.username)
    }

    saveDatabase()

    // 返回用户信息（不包含密码）
    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        roleId: user.roleId,
        roleName: getRoleName(user.roleId),
        permissions: getRolePermissions(user.roleId),
        mustChangePassword: user.mustChangePassword || false
      }
    }
  } catch (error: any) {
    log.error('Login failed:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 获取当前用户信息
 */
ipcMain.handle('auth:getCurrentUser', async (_, userId: string) => {
  try {
    const user = db.users.find(u => u.id === userId)
    
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    
    return {
      success: true,
      data: {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        roleId: user.roleId,
        roleName: getRoleName(user.roleId),
        permissions: getRolePermissions(user.roleId)
      }
    }
  } catch (error: any) {
    log.error('Get user failed:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 获取所有用户
 */
ipcMain.handle('auth:getAllUsers', async () => {
  try {
    const users = db.users.map(u => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      roleId: u.roleId,
      status: u.status,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt
    }))
    return { success: true, data: users }
  } catch (error: any) {
    log.error('Get users failed:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 创建用户
 */
ipcMain.handle('auth:createUser', async (_, userData: { username: string; password: string; displayName: string; roleId: string }) => {
  try {
    // 检查用户名是否已存在
    if (db.users.some(u => u.username === userData.username)) {
      return { success: false, error: 'Username already exists' }
    }
    
    const { hash, salt } = hashPassword(userData.password)
    const newUser: User = {
      id: 'user-' + Date.now(),
      username: userData.username,
      passwordHash: hash,
      passwordSalt: salt,
      roleId: userData.roleId as any,
      status: 'active',
      displayName: userData.displayName,
      createdAt: new Date().toISOString(),
      lastLoginAt: null
    }
    
    db.users.push(newUser)
    saveDatabase()
    
    return {
      success: true,
      data: {
        id: newUser.id,
        username: newUser.username,
        displayName: newUser.displayName,
        roleId: newUser.roleId
      }
    }
  } catch (error: any) {
    log.error('Create user failed:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 更新用户
 */
ipcMain.handle('auth:updateUser', async (_, userId: string, updates: { displayName?: string; roleId?: string; status?: string; password?: string }) => {
  try {
    const userIndex = db.users.findIndex(u => u.id === userId)
    
    if (userIndex === -1) {
      return { success: false, error: 'User not found' }
    }
    
    const user = db.users[userIndex]
    
    if (updates.displayName) user.displayName = updates.displayName
    if (updates.roleId) user.roleId = updates.roleId as any
    if (updates.status) user.status = updates.status as any
    if (updates.password) {
      const { hash, salt } = hashPassword(updates.password)
      user.passwordHash = hash
      user.passwordSalt = salt
    }
    
    saveDatabase()
    
    return { success: true }
  } catch (error: any) {
    log.error('Update user failed:', error)
    return { success: false, error: error.message }
  }
})

/**
 * 删除用户
 */
ipcMain.handle('auth:deleteUser', async (_, userId: string) => {
  try {
    // 不允许删除最后一个管理员
    const adminCount = db.users.filter(u => u.roleId === 'admin').length
    const user = db.users.find(u => u.id === userId)
    
    if (user?.roleId === 'admin' && adminCount <= 1) {
      return { success: false, error: 'Cannot delete the last admin user' }
    }
    
    db.users = db.users.filter(u => u.id !== userId)
    saveDatabase()
    
    return { success: true }
  } catch (error: any) {
    log.error('Delete user failed:', error)
    return { success: false, error: error.message }
  }
})


log.info('Auth IPC handlers registered')
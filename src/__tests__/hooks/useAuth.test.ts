// @ts-nocheck
/**
 * useAuth Hook 测试
 * 测试认证状态管理（Zustand store re-export）
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock dependencies before import
vi.mock('@/types/permissions', () => ({
  setCurrentUser: vi.fn(),
}))
vi.mock('@/utils/audit', () => ({
  setCurrentAuditUser: vi.fn(),
  logAudit: vi.fn(),
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('初始状态为未认证', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentUser).toBeNull()
    expect(result.current.isLocked).toBe(false)
  })

  it('login 设置认证状态', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    const userData = {
      userId: '1',
      username: 'admin',
      displayName: '管理员',
      roleId: 'admin',
      roleName: '管理员',
      permissions: ['all'],
    }
    act(() => { result.current.login(userData) })
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentUser).toEqual(userData)
  })

  it('login 写入 localStorage', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    const userData = {
      userId: '1',
      username: 'admin',
      displayName: '管理员',
      roleId: 'admin',
      roleName: '管理员',
      permissions: ['all'],
    }
    act(() => { result.current.login(userData) })
    const stored = localStorage.getItem('engineering_auth')
    expect(stored).toBeTruthy()
    expect(JSON.parse(stored!).username).toBe('admin')
  })

  it('logout 清除认证状态', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    const userData = {
      userId: '1',
      username: 'admin',
      displayName: '管理员',
      roleId: 'admin',
      roleName: '管理员',
      permissions: ['all'],
    }
    act(() => { result.current.login(userData) })
    act(() => { result.current.logout() })
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.currentUser).toBeNull()
    expect(localStorage.getItem('engineering_auth')).toBeNull()
  })

  it('lock 锁定屏幕', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.lock() })
    expect(result.current.isLocked).toBe(true)
  })

  it('unlock 成功解锁', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const ea = window.electronAPI as Record<string, any>
    ea.login = vi.fn().mockResolvedValue({ success: true })
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.lock() })
    expect(result.current.isLocked).toBe(true)
    let unlocked = false
    await act(async () => {
      unlocked = await result.current.unlock('admin', 'admin123')
    })
    expect(unlocked).toBe(true)
    expect(result.current.isLocked).toBe(false)
  })

  it('unlock 失败保持锁定', async () => {
    const { useAuth } = await import('@/hooks/useAuth')
    const ea = window.electronAPI as Record<string, any>
    ea.login = vi.fn().mockResolvedValue({ success: false })
    const { result } = renderHook(() => useAuth())
    act(() => { result.current.lock() })
    let unlocked = true
    await act(async () => {
      unlocked = await result.current.unlock('admin', 'wrong')
    })
    expect(unlocked).toBe(false)
    expect(result.current.isLocked).toBe(true)
  })

  it('从 localStorage 恢复登录状态', async () => {
    const userData = {
      userId: '1',
      username: 'admin',
      displayName: '管理员',
      roleId: 'admin',
      roleName: '管理员',
      permissions: ['all'],
    }
    localStorage.setItem('engineering_auth', JSON.stringify(userData))
    // Dynamic import to trigger fresh store creation
    vi.resetModules()
    const { useAuth } = await import('@/hooks/useAuth')
    const { result } = renderHook(() => useAuth())
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.currentUser?.username).toBe('admin')
  })
})

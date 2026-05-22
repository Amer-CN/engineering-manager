import { useState, useEffect, useCallback } from 'react'
import type { SqliteStatus, ReadMode } from '../types/electron'

interface MigrationResult {
  success: boolean
  migratedTables: number
  totalRows: number
  verificationPassed: boolean
  errors: string[]
  warnings: string[]
  duration: number
  message?: string
}

interface Message {
  type: 'success' | 'error' | 'info' | 'warning'
  text: string
}

export function useSqliteSettings() {
  const [status, setStatus] = useState<SqliteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [enabling, setEnabling] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)

  const refreshStatus = useCallback(async () => {
    try {
      const result = await window.electronAPI.getSqliteStatus()
      setStatus(result)
    } catch {
      setStatus(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleEnable = useCallback(async () => {
    if (!window.electronAPI?.enableSqlite) {
      setMessage({ type: 'error', text: 'SQLite 功能不可用' })
      return
    }
    setEnabling(true)
    setMessage(null)
    try {
      const result = await window.electronAPI.enableSqlite()
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        await refreshStatus()
      } else {
        setMessage({ type: 'error', text: result.message || '启用 SQLite 失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `启用失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setEnabling(false)
    }
  }, [refreshStatus])

  const handleMigrate = useCallback(async (force = false) => {
    if (!window.electronAPI?.migrateToSqlite) {
      setMessage({ type: 'error', text: 'SQLite 迁移功能不可用' })
      return
    }
    setMigrating(true)
    setMessage(null)
    try {
      const result: MigrationResult = await window.electronAPI.migrateToSqlite(force)
      if (result.success) {
        const lines = [
          `迁移完成：${result.migratedTables} 张表，${result.totalRows} 行数据`,
          `耗时 ${(result.duration / 1000).toFixed(1)} 秒`,
          result.verificationPassed ? '✅ 数据校验通过' : '⚠️ 数据校验未通过',
        ]
        if (result.warnings.length > 0) {
          lines.push(`⚠️ ${result.warnings.length} 个警告`)
        }
        setMessage({ type: result.verificationPassed ? 'success' : 'warning', text: lines.join(' | ') })
        await refreshStatus()
      } else {
        const detail = result.errors.length > 0 ? `：${result.errors.slice(0, 3).join('; ')}` : ''
        setMessage({ type: 'error', text: `迁移失败${detail}` })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `迁移失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setMigrating(false)
    }
  }, [refreshStatus])

  const handleSetReadMode = useCallback(async (mode: ReadMode) => {
    if (!window.electronAPI?.setSqliteReadMode) {
      setMessage({ type: 'error', text: '读取模式切换功能不可用' })
      return
    }
    setSwitching(true)
    setMessage(null)
    try {
      const result = await window.electronAPI.setSqliteReadMode(mode)
      if (result.success) {
        const modeLabels: Record<ReadMode, string> = {
          'dual': '双写模式',
          'sqlite-primary': 'SQLite 优先',
          'json-only': '仅 JSON',
        }
        setMessage({ type: 'success', text: `已切换到${modeLabels[mode]}` })
        await refreshStatus()
      } else {
        setMessage({ type: 'error', text: result.error || '切换读取模式失败' })
      }
    } catch (e) {
      setMessage({ type: 'error', text: `切换失败: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSwitching(false)
    }
  }, [refreshStatus])

  // 强制重新迁移（用于迁移脚本更新后需重新迁移的场景）
  const handleRemigrate = useCallback(() => handleMigrate(true), [handleMigrate])

  return {
    status,
    loading,
    enabling,
    migrating,
    switching,
    message,
    setMessage,
    refreshStatus,
    handleEnable,
    handleMigrate,
    handleRemigrate,
    handleSetReadMode,
  }
}

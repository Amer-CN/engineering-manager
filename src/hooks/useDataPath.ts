import { useState, useEffect, useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'

export function useDataPath(refresh?: () => void) {
  const [dataPath, setDataPath] = useState('')
  const [defaultPath, setDefaultPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const { can } = usePermission()

  const loadConfig = useCallback(async () => {
    try {
      const result = await (await getAPI()).getConfig()
      if (result.success && result.data) {
        setDataPath(result.data.dataPath)
        setDefaultPath(result.data.defaultPath)
      }
    } catch (error) {
      console.error('加载配置失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const handleChangeDataPath = useCallback(async () => {
    // R8-P1: 数据路径迁移属敏感操作 → settings:update
    if (!can('settings:update')) {
      setMessage({ type: 'error', text: '您没有修改数据路径的权限' })
      return
    }
    setMessage(null)
    try {
      const api = await getAPI()
      const result = await api.setDataPath('__select_folder__')

      // 检查是否取消了选择
      if (result.success && (result as { cancelled?: boolean }).cancelled) {
        return
      }

      if (result.success) {
        // 显示迁移中状态
        setMigrating(true)
        // 等待一下让后端完成迁移
        await new Promise(resolve => setTimeout(resolve, 1000))

        const pathResult = await api.getDataPath()
        if (pathResult.success) {
          setDataPath(pathResult.data)
        }
        setMessage({ type: 'success', text: '数据路径已更新，重启应用后生效' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [refresh, can])

  const handleResetToDefault = useCallback(async () => {
    // R8-P1: 数据路径迁移属敏感操作 → settings:update
    if (!can('settings:update')) {
      setMessage({ type: 'error', text: '您没有修改数据路径的权限' })
      return
    }
    setMigrating(true); setMessage(null)
    try {
      const api = await getAPI()
      const result = await api.setDataPath(defaultPath)
      if (result.success) {
        const pathResult = await api.getDataPath()
        if (pathResult.success) {
          setDataPath(pathResult.data)
        }
        setMessage({ type: 'success', text: '已恢复为默认路径，重启应用后生效' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.error || result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [defaultPath, refresh, can])

  return { dataPath, defaultPath, loading, migrating, message, handleChangeDataPath, handleResetToDefault }
}

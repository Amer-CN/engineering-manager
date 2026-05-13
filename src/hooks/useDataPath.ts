import { useState, useEffect, useCallback } from 'react'

export function useDataPath(refresh?: () => void) {
  const [dataPath, setDataPath] = useState('')
  const [defaultPath, setDefaultPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadConfig = useCallback(async () => {
    try {
      const result = await window.electronAPI.getConfig()
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
    setMigrating(true); setMessage(null)
    try {
      const result = await window.electronAPI.setDataPath('__select_folder__')
      if (result.success) {
        setDataPath(await window.electronAPI.getDataPath())
        setMessage({ type: 'success', text: result.message || '数据路径已更新' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [refresh])

  const handleResetToDefault = useCallback(async () => {
    if (!confirm('确定要将数据路径恢复为默认位置吗？\n数据将被复制到新位置。')) return
    setMigrating(true); setMessage(null)
    try {
      const result = await window.electronAPI.setDataPath(defaultPath)
      if (result.success) {
        setDataPath(await window.electronAPI.getDataPath())
        setMessage({ type: 'success', text: '已恢复为默认路径' })
        refresh?.()
      } else {
        setMessage({ type: 'error', text: result.message || '修改失败' })
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || '修改失败' })
    } finally {
      setMigrating(false)
    }
  }, [defaultPath, refresh])

  return { dataPath, defaultPath, loading, migrating, message, handleChangeDataPath, handleResetToDefault }
}

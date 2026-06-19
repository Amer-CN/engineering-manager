import { useState, useEffect, useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'

/** 检测是否在 Tauri 环境 */
const isTauri = typeof window !== 'undefined' && ((window as any).__TAURI__ !== undefined || (window as any).__TAURI_INTERNALS__ !== undefined)

export function useDataPath(refresh?: () => void) {
  const [dataPath, setDataPath] = useState('')
  const [defaultPath, setDefaultPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [migrating, setMigrating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
    setMessage(null)
    try {
      let selectedPath: string | null = null

      if (isTauri) {
        // Tauri: 用前端 dialog 插件打开文件夹选择
        const { open } = await import('@tauri-apps/plugin-dialog')
        selectedPath = await open({ directory: true, title: '选择数据存储位置' })
        if (!selectedPath) return
      }

      const api = await getAPI()
      // Tauri: 传实际路径; C#: 传 '__select_folder__' 让后端打开对话框
      const result = await api.setDataPath(selectedPath || '__select_folder__')

      // 检查是否取消了选择
      if (result.success && (result as any).cancelled) {
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
  }, [refresh])

  const handleResetToDefault = useCallback(async () => {
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
  }, [defaultPath, refresh])

  return { dataPath, defaultPath, loading, migrating, message, handleChangeDataPath, handleResetToDefault }
}

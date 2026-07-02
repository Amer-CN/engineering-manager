import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { getAPI } from '@/services/api-adapter'

interface Props {
  onBack: () => void
}

const LoginSettingsPage: React.FC<Props> = ({ onBack }) => {
  const [dataPath, setDataPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const api = await getAPI()
        const res = await api.getConfig?.()
        if (res?.success && res.data?.dataPath) {
          setDataPath(res.data.dataPath)
        }
      } catch (err) { console.warn('[LoginSettings] 获取配置失败:', err) }
    })()
  }, [])

  const handleSelectFolder = useCallback(async () => {
    setMessage(null)
    try {
      const api = await getAPI()
      const res = await api.setDataPath?.('__select_folder__')
      if (!res?.success) {
        setMessage({ type: 'error', text: res?.error || '选择文件夹失败' })
        return
      }
      if (res.data?.cancelled) return
      // 刷新配置
      const cfg = await api.getConfig?.()
      if (cfg?.success && cfg.data?.dataPath) {
        setDataPath(cfg.data.dataPath)
      }
    } catch (err) {
      console.warn('[LoginSettings] 选择文件夹失败:', err)
      setMessage({ type: 'error', text: '选择文件夹失败' })
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (!dataPath.trim()) return
    setSaving(true)
    setMessage(null)
    try {
      const api = await getAPI()
      const res = await api.setDataPath?.(dataPath.trim())
      if (!res?.success) {
        setMessage({ type: 'error', text: res?.error || '保存路径失败' })
        setSaving(false)
        return
      }
      setMessage({ type: 'success', text: '路径已保存，需关闭并重新打开软件后生效。' })
    } catch (err) {
      console.warn('[LoginSettings] 保存路径失败:', err)
      setMessage({ type: 'error', text: '保存路径失败，请重试' })
    }
    setSaving(false)
  }, [dataPath])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      padding: '12px 16px', boxSizing: 'border-box',
    }}>
      {/* 标题栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <motion.button
          onClick={onBack}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--muted)', display: 'flex', borderRadius: 4 }}
        >
          <Icon name="ArrowLeft" size={16} />
        </motion.button>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)' }}>设置</span>
      </div>

      {/* 数据存储路径 */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, color: 'var(--fg-2)', marginBottom: 4 }}>数据存储路径</label>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text" value={dataPath}
            onChange={e => { setDataPath(e.target.value); setMessage(null) }}
            placeholder="选择数据存储位置…"
            style={{
              flex: 1, padding: '6px 8px', fontSize: 11, borderRadius: 6, outline: 'none',
              background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--fg)',
              fontFamily: 'monospace',
            }}
          />
          <motion.button
            onClick={handleSelectFolder}
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            style={{
              padding: '6px 10px', fontSize: 11, borderRadius: 6, border: 'none',
              cursor: 'pointer', background: 'var(--panel-2)', color: 'var(--fg)',
              display: 'flex', alignItems: 'center',
            }}
          >
            <Icon name="FolderOpen" size={14} />
          </motion.button>
        </div>
      </div>

      {/* 提示 */}
      <div style={{
        fontSize: 10, color: 'var(--muted-2)', lineHeight: 1.5, marginBottom: 8,
      }}>
        数据存储路径包含所有工程数据（数据库、上传文件等），
        更换路径后原有数据不会自动迁移。
      </div>

      {/* 操作反馈消息 */}
      {message && (
        <div style={{
          fontSize: 11, padding: '6px 8px', borderRadius: 6, marginBottom: 8,
          background: message.type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)',
          color: message.type === 'success' ? 'var(--success)' : 'var(--danger)',
          lineHeight: 1.5,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* 保存按钮 */}
      <motion.button
        onClick={handleSave}
        disabled={saving || !dataPath.trim()}
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        style={{
          width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600, borderRadius: 8,
          border: 'none', cursor: saving ? 'wait' : 'pointer',
          background: 'var(--accent)', color: 'var(--bg)',
          opacity: saving || !dataPath.trim() ? 0.6 : 1,
        }}
      >
        {saving ? '保存中…' : '保存'}
      </motion.button>
    </div>
  )
}

export default LoginSettingsPage

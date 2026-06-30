import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Props {
  defaultPath: string
  onNext: (dataPath: string) => void
  onBack: () => void
}

export default function DataPathStep({ defaultPath, onNext, onBack }: Props) {
  const [path, setPath] = useState(defaultPath)

  // 监听 C# 回传的数据路径选择
  useEffect(() => {
    // @ts-ignore
    const wv = window.chrome?.webview
    if (!wv) return
    const handler = (e: any) => {
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data
        if (data?.type === 'selectedDataPath') {
          setPath(data.path)
        }
      } catch {}
    }
    wv.addEventListener('message', handler)
    return () => wv.removeEventListener('message', handler)
  }, [])

  const browse = () => {
    // @ts-ignore — C# postMessage 桥接
    window.chrome?.webview?.postMessage(JSON.stringify({ action: 'browseDataPath' }))
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '48px 36px 24px',
      position: 'relative',
      zIndex: 1,
    }}>
      {/* 标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--fg)', marginBottom: 4 }}>
          选择数据存储位置
        </h2>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
          项目数据、数据库将存储在此目录。安装后可在设置中修改。
        </p>
      </motion.div>

      {/* 路径输入卡片 */}
      <motion.div
        className="card"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 25 }}
        style={{ marginBottom: 16 }}
      >
        <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 8 }}>
          数据存储路径
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 13 }}
          />
          <motion.button
            className="btn btn-ghost"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={browse}
          >
            浏览
          </motion.button>
        </div>
      </motion.div>

      {/* 说明 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: 24, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}
      >
        <p>• 数据库文件（engineering.db）和上传的附件将存储在此目录</p>
        <p>• 此目录不会被卸载程序删除，请选择安全的位置</p>
        <p>• 建议使用非系统盘（如 D:\工程管家数据）</p>
      </motion.div>

      {/* 按钮区 */}
      <div style={{ marginTop: 'auto', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <motion.button
          className="btn btn-ghost"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onBack}
        >
          上一步
        </motion.button>
        <motion.button
          className="btn btn-primary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          whileHover={{ scale: 1.03, boxShadow: '0 0 20px var(--accent-soft)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNext(path)}
        >
          开始安装
        </motion.button>
      </div>
    </div>
  )
}

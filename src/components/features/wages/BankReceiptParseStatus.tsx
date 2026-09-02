import { motion } from 'framer-motion'
import type { BatchParseResult } from '@/types'

type ParseStatus = 'idle' | 'parsing' | 'completed' | 'error'

interface BankReceiptParseStatusProps {
  status: ParseStatus
  progress: { current: number; total: number }
  parseResult: BatchParseResult | null
  error: string | null
}

export default function BankReceiptParseStatus({
  status,
  progress,
  parseResult,
  error,
}: BankReceiptParseStatusProps) {
  if (status === 'idle') return null

  return (
    <>
      {/* 解析进度 */}
      {status === 'parsing' && (
        <div className="bg-[color:var(--panel-2)] rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[color:var(--fg)]">
              正在解析... ({progress.current}/{progress.total})
            </span>
            <span className="text-sm text-[color:var(--fg-2)]">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-[color:var(--border-strong)] rounded-full h-2">
            <motion.div
              className="bg-[color:var(--accent)] h-2 rounded-full"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress.current / progress.total }}
              style={{ transformOrigin: 'left', width: '100%' }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* 解析结果摘要 */}
      {status === 'completed' && parseResult && (
        <div className="bg-success-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-success-900 mb-2">解析完成</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-[color:var(--card)] rounded p-3">
              <p className="text-[color:var(--fg-2)]">成功解析</p>
              <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-success-600">{parseResult.successCount}</p>
            </div>
            <div className="bg-[color:var(--card)] rounded p-3">
              <p className="text-[color:var(--fg-2)]">失败</p>
              <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-danger-600">{parseResult.failCount}</p>
            </div>
            <div className="bg-[color:var(--card)] rounded p-3">
              <p className="text-[color:var(--fg-2)]">匹配项</p>
              <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">{parseResult.matches.length}</p>
            </div>
          </div>

          {parseResult.failedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-danger-900 mb-2">失败文件：</h4>
              <ul className="list-disc list-inside text-sm text-danger-700">
                {parseResult.failedFiles.map((f, i) => (
                  <li key={i}>
                    {f.path} - {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 错误信息 */}
      {status === 'error' && error && (
        <div className="bg-danger-50 rounded-lg p-4">
          <p className="text-sm text-danger-800">{error}</p>
        </div>
      )}
    </>
  )
}

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
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              正在解析... ({progress.current}/{progress.total})
            </span>
            <span className="text-sm text-blue-700">
              {Math.round((progress.current / progress.total) * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <motion.div
              className="bg-primary-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      )}

      {/* 解析结果摘要 */}
      {status === 'completed' && parseResult && (
        <div className="bg-green-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-green-900 mb-2">解析完成</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-white rounded p-3">
              <p className="text-slate-600">成功解析</p>
              <p className="text-2xl font-bold text-green-600">{parseResult.successCount}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-slate-600">失败</p>
              <p className="text-2xl font-bold text-red-600">{parseResult.failCount}</p>
            </div>
            <div className="bg-white rounded p-3">
              <p className="text-slate-600">匹配项</p>
              <p className="text-2xl font-bold text-blue-600">{parseResult.matches.length}</p>
            </div>
          </div>

          {parseResult.failedFiles.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-red-900 mb-2">失败文件：</h4>
              <ul className="list-disc list-inside text-sm text-red-700">
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
        <div className="bg-red-50 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
    </>
  )
}

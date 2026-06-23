import { Icon } from '@/components/ui/Icon'
import { Button } from '../../ui/Button'

interface ReencryptStatus {
  status: string
  targetKeyId: number
  totalRows: number
  processedRows: number
  failedRows: number
  currentTable: string | null
  currentColumn: string | null
  startedAt: string | null
  completedAt: string | null
  lastError: string | null
}

interface PiiReencryptSectionProps {
  reencryptStatus: ReencryptStatus | null
  progressPct: number
  reencrypting: boolean
  handleReencrypt: () => void
}

export type { ReencryptStatus }

export function PiiReencryptSection({ reencryptStatus, progressPct, reencrypting, handleReencrypt }: PiiReencryptSectionProps) {
  return (
    <div className="border-t border-slate-200 pt-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-3">
        <Icon name="Database" size={16} /> 重新加密历史数据
      </h3>
      <p className="text-xs text-slate-500 mb-3">
        轮换 key 后, 旧密文仍可解密但用旧 key 加密。点击下方按钮用当前 active key 重新加密所有 PII 字段。
      </p>

      {reencryptStatus && reencryptStatus.status !== 'idle' && (
        <div className="bg-slate-50 rounded-lg p-3 mb-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-600">
              {reencryptStatus.status === 'running' ? '进行中...' :
               reencryptStatus.status === 'completed' ? '已完成' :
               reencryptStatus.status === 'completed_with_errors' ? '完成 (有失败)' : reencryptStatus.status}
            </span>
            <span className="font-mono text-slate-800">{progressPct}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${reencryptStatus.status === 'completed' ? 'bg-success-500' : reencryptStatus.status === 'completed_with_errors' ? 'bg-warning-500' : 'bg-primary-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-slate-500">
            <div>已处理: {reencryptStatus.processedRows}/{reencryptStatus.totalRows}</div>
            <div>失败: {reencryptStatus.failedRows}</div>
            <div>当前: {reencryptStatus.currentTable}.{reencryptStatus.currentColumn}</div>
          </div>
          {reencryptStatus.lastError && (
            <div className="text-xs text-danger-600 mt-1">最近错误: {reencryptStatus.lastError}</div>
          )}
        </div>
      )}

      <Button
        onClick={handleReencrypt}
        disabled={reencrypting}
        
       variant="secondary" className="btn">
        {reencrypting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-transparent" />
            re-encrypt 进行中...
          </>
        ) : (
          <>
            <Icon name="RefreshCcw" size={16} /> 立即 re-encrypt PII
          </>
        )}
      </Button>
    </div>
  )
}

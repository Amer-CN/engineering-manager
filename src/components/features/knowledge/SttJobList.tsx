/**
 * SttJobList — 转写任务列表
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { sttClient, type SttJobSummary } from '@/services/stt-client'

interface SttJobListProps {
  refreshTrigger: number
  onSelectJob: (jobId: number) => void
  selectedJobId?: number
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'gray' | 'primary' | 'success' | 'danger' | 'warning' }> = {
  pending: { label: '等待处理', variant: 'gray' },
  running: { label: '正在转写', variant: 'primary' },
  processing: { label: '正在转写', variant: 'primary' },
  completed: { label: '已完成', variant: 'success' },
  failed: { label: '失败', variant: 'danger' },
}

function formatTime(sec?: number): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

const SttJobList: React.FC<SttJobListProps> = ({ refreshTrigger, onSelectJob, selectedJobId }) => {
  const [jobs, setJobs] = useState<SttJobSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const size = 10

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    const res = await sttClient.getSttJobs(page, size)
    setLoading(false)
    if (res.success && res.data) {
      setJobs(res.data.data || [])
      setTotal(res.data.total || 0)
    }
  }, [page])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs, refreshTrigger])

  return (
    <Card title="历史任务" padding="md" shadow="sm">
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--muted)] py-8 justify-center">
          <Icon name="Loader2" size={16} className="animate-spin" />
          <span>加载中...</span>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon="FileText"
          title="暂无转写任务"
          description="上传音频文件开始创建任务"
        />
      ) : (
        <>
          <div className="space-y-2">
            {jobs.map(job => {
              const cfg = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending
              return (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => onSelectJob(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedJobId === job.id
                      ? 'bg-[color:var(--accent-soft)] border-[color:var(--accent)]'
                      : 'bg-[color:var(--card)] border-[color:var(--border)] hover:bg-[color:var(--panel-2)]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[color:var(--fg-2)] truncate">
                          {job.sourceFile || `任务 #${job.id}`}
                        </span>
                        <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[color:var(--muted)] font-mono tabular-nums">
                        <span>#{job.id}</span>
                        {job.isMultiSpeaker && <span>多人</span>}
                        {job.durationSec ? <span>音频 {formatTime(job.durationSec)}</span> : null}
                        {job.elapsedSec ? <span>耗时 {formatTime(job.elapsedSec)}</span> : null}
                        {job.progress != null && job.progress > 0 && job.status !== 'completed' && (
                          <span>{job.progress}%</span>
                        )}
                        <span>{job.createdAt}</span>
                      </div>
                      {job.error && (
                        <p className="text-xs text-danger-500 mt-1 truncate">{job.error}</p>
                      )}
                    </div>
                    <Icon name="ChevronRight" size={16} className="text-[color:var(--muted)] flex-shrink-0" />
                  </div>
                </button>
              )
            })}
          </div>
          {total > size && (
            <div className="mt-4 flex justify-center">
              <Pagination
                current={page}
                total={Math.ceil(total / size)}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default SttJobList

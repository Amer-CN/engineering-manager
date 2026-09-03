/**
 * SttJobList — 转写任务列表
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pagination } from '@/components/ui/Pagination'
import { useToastContext } from '@/hooks/useToast'
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
  cancelled: { label: '已取消', variant: 'gray' },
}

function formatTime(sec?: number): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}m ${s}s`
}

const SttJobList: React.FC<SttJobListProps> = ({ refreshTrigger, onSelectJob, selectedJobId }) => {
  const { showToast } = useToastContext()
  const [jobs, setJobs] = useState<SttJobSummary[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)
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

  // 行内操作：取消 / 重试 / 删除（阻止冒泡，避免触发行点击进详情）
  const handleCancelJob = useCallback(async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation()
    setActingId(jobId)
    const res = await sttClient.cancelSttJob(jobId)
    setActingId(null)
    if (res.success) {
      showToast('已取消转写任务', 'success')
      fetchJobs()
    } else {
      showToast(res.error || '取消失败', 'error')
    }
  }, [showToast, fetchJobs])

  const handleRetryJob = useCallback(async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation()
    setActingId(jobId)
    const res = await sttClient.retrySttJob(jobId)
    setActingId(null)
    if (res.success) {
      showToast('任务已重新排队', 'success')
      fetchJobs()
    } else {
      showToast(res.error || '重试失败', 'error')
    }
  }, [showToast, fetchJobs])

  const handleDeleteJob = useCallback(async (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation()
    setActingId(jobId)
    const res = await sttClient.deleteSttJob(jobId)
    setActingId(null)
    if (res.success) {
      showToast('已删除转写任务', 'success')
      fetchJobs()
    } else {
      showToast(res.error || '删除失败', 'error')
    }
  }, [showToast, fetchJobs])

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
                <div
                  key={job.id}
                  onClick={() => onSelectJob(job.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
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
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {job.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon="Ban"
                          loading={actingId === job.id}
                          disabled={actingId !== null}
                          onClick={(e) => handleCancelJob(e, job.id)}
                        >
                          取消
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <>
                          <Button
                            variant="ghost"
                            size="xs"
                            leftIcon="RotateCcw"
                            loading={actingId === job.id}
                            disabled={actingId !== null}
                            onClick={(e) => handleRetryJob(e, job.id)}
                          >
                            重试
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            leftIcon="Trash2"
                            className="text-danger-500 hover:text-danger-600"
                            loading={actingId === job.id}
                            disabled={actingId !== null}
                            onClick={(e) => handleDeleteJob(e, job.id)}
                          >
                            删除
                          </Button>
                        </>
                      )}
                      {(job.status === 'completed' || job.status === 'cancelled') && (
                        <Button
                          variant="ghost"
                          size="xs"
                          leftIcon="Trash2"
                          className="text-danger-500 hover:text-danger-600"
                          loading={actingId === job.id}
                          disabled={actingId !== null}
                          onClick={(e) => handleDeleteJob(e, job.id)}
                        >
                          删除
                        </Button>
                      )}
                      <Icon name="ChevronRight" size={16} className="text-[color:var(--muted)] flex-shrink-0" />
                    </div>
                  </div>
                </div>
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

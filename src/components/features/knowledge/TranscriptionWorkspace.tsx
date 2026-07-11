import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useToastContext } from '@/hooks/useToast'
import { useMask } from '@/contexts/MaskContext'
import { sttClient, type SttCapability, type SttJobDetail, type SttSegment } from '@/services/stt-client'
import AudioUploadCard from './AudioUploadCard'
import SttJobList from './SttJobList'
import TranscriptEditor from './TranscriptEditor'

const ACCEPTED_EXTS = '.wav,.mp3,.m4a,.aac,.flac,.ogg,.wma,.amr,.opus'
const MAX_SIZE = 500 * 1024 * 1024

type RecordingType = 'single' | 'dual' | 'multi'

interface TranscriptionWorkspaceProps {
  onIngested?: (docId?: number) => void
}

const TranscriptionWorkspace: React.FC<TranscriptionWorkspaceProps> = ({ onIngested }) => {
  const { showToast } = useToastContext()
  const { masked } = useMask()

  const [capability, setCapability] = useState<SttCapability | null>(null)
  const [capLoading, setCapLoading] = useState(true)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedPath, setUploadedPath] = useState<string | null>(null)

  const [recordingType, setRecordingType] = useState<RecordingType>('dual')
  const [numSpeakers, setNumSpeakers] = useState<number>(2)
  const [hotwords, setHotwords] = useState('')

  const [creating, setCreating] = useState(false)
  const [currentJob, setCurrentJob] = useState<SttJobDetail | null>(null)
  const [jobLoading, setJobLoading] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 能力检测
  useEffect(() => {
    let cancelled = false
    setCapLoading(true)
    sttClient.getSttStatus().then(res => {
      if (cancelled) return
      if (res.success && res.data) {
        setCapability(res.data)
      } else {
        setCapability(null)
      }
      setCapLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // 轮询任务
  const pollJob = useCallback(async (jobId: number) => {
    const res = await sttClient.getSttJob(jobId)
    if (res.success && res.data) {
      setCurrentJob(res.data)
      if (res.data.status === 'completed' || res.data.status === 'failed') {
        if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
        setRefreshTrigger(t => t + 1)
      }
    }
  }, [])

  const startPolling = useCallback((jobId: number) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => pollJob(jobId), 1000)
  }, [pollJob])

  // 卸载时清理轮询
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // 文件选择
  const handleFileSelect = useCallback((file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const validExts = ACCEPTED_EXTS.split(',')
    if (!validExts.includes(ext)) {
      showToast(`不支持的格式 ${ext}，支持: ${ACCEPTED_EXTS}`, 'error')
      return
    }
    if (file.size > MAX_SIZE) {
      showToast(`文件过大 (${Math.round(file.size / 1024 / 1024)}MB)，上限 500MB`, 'error')
      return
    }
    if (file.size === 0) {
      showToast('文件为空', 'error')
      return
    }
    setSelectedFile(file)
    setUploadedPath(null)
    setUploadProgress(0)
  }, [showToast])

  // 上传
  const handleUpload = useCallback(async () => {
    if (!selectedFile) return
    setUploading(true)
    setUploadProgress(0)
    const res = await sttClient.uploadSttAudio(selectedFile, (percent) => {
      setUploadProgress(percent)
    })
    setUploading(false)
    if (res.success && res.data) {
      setUploadedPath(res.data.filePath)
      showToast('上传成功', 'success')
    } else {
      showToast(res.error || '上传失败', 'error')
    }
  }, [selectedFile, showToast])

  // 创建转写任务
  const handleCreateJob = useCallback(async () => {
    if (!uploadedPath) {
      showToast('请先上传音频', 'error')
      return
    }
    if (capability && !capability.canTranscribe) {
      showToast('本地转写不可用', 'error')
      return
    }
    setCreating(true)
    const isMulti = recordingType !== 'single'
    const ns = recordingType === 'dual' ? 2 : (recordingType === 'multi' ? numSpeakers : undefined)
    const res = await sttClient.createSttJob({
      filePath: uploadedPath,
      isMultiSpeaker: isMulti,
      numSpeakers: ns,
      context: hotwords.trim() || undefined,
    })
    setCreating(false)
    if (res.success && res.data) {
      showToast('转写任务已创建', 'success')
      // 进入任务详情并开始轮询
      setJobLoading(true)
      const detailRes = await sttClient.getSttJob(res.data.jobId)
      setJobLoading(false)
      if (detailRes.success && detailRes.data) {
        setCurrentJob(detailRes.data)
        startPolling(res.data.jobId)
      }
      setRefreshTrigger(t => t + 1)
      // 清理上传状态
      setSelectedFile(null)
      setUploadedPath(null)
      setUploadProgress(0)
    } else {
      showToast(res.error || '创建任务失败', 'error')
    }
  }, [uploadedPath, capability, recordingType, numSpeakers, hotwords, showToast, startPolling])

  // 选择已有任务
  const handleSelectJob = useCallback(async (jobId: number) => {
    setJobLoading(true)
    const res = await sttClient.getSttJob(jobId)
    setJobLoading(false)
    if (res.success && res.data) {
      setCurrentJob(res.data)
      if (res.data.status === 'pending' || res.data.status === 'running' || res.data.status === 'processing') {
        startPolling(jobId)
      }
    } else {
      showToast(res.error || '获取任务详情失败', 'error')
    }
  }, [showToast, startPolling])

  // 入库
  const handleIngest = useCallback(async (correctedText: string, segments: SttSegment[], title: string, projectId?: number, occurredAt?: string) => {
    if (!currentJob) return
    const res = await sttClient.ingestSttJob(currentJob.id, {
      text: correctedText,
      segments: segments.length > 0 ? segments : undefined,
      title,
      projectId,
      occurredAt,
    })
    if (res.success && res.data) {
      if (res.data.idempotent) {
        showToast(`该转写已入库，已返回原文档 (ID: ${res.data.documentId})`, 'info')
      } else {
        showToast(`入库成功，文档 ID: ${res.data.documentId}`, 'success')
      }
      if (!res.data.hasEmbeddings) {
        showToast('已建立关键词索引，语义索引当前不可用', 'info')
      }
      onIngested?.(res.data.documentId)
    } else {
      showToast(res.error || '入库失败', 'error')
    }
  }, [currentJob, showToast, onIngested])

  const canTranscribe = capability?.canTranscribe ?? false
  const canDiarize = capability?.canDiarize ?? false

  return (
    <div className="space-y-6">
      {/* 能力检测 */}
      {capLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Icon name="Loader2" size={16} className="animate-spin" />
          <span>检测转写能力...</span>
        </div>
      ) : !canTranscribe ? (
        <Card padding="md" className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <Icon name="AlertTriangle" size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">语音转写当前不可用</p>
              <p className="text-xs text-amber-700 mt-1">
                {capability?.unavailableReason || '需要独立显卡和 ASR 模型'}
              </p>
              <p className="text-xs text-amber-600 mt-1">云端转写尚未启用</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="sm" className="bg-emerald-50 border-emerald-200">
          <div className="flex items-center gap-2 text-sm">
            <Icon name="CheckCircle" size={16} className="text-emerald-500" />
            <span className="text-emerald-800 font-medium">Qwen3-ASR-1.7B 本地模型已就绪</span>
            {!canDiarize && (
              <Badge variant="warning" size="sm">说话人分离模型未就绪</Badge>
            )}
          </div>
        </Card>
      )}

      {/* 上传区域 + 参数 */}
      {canTranscribe && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AudioUploadCard
            selectedFile={selectedFile}
            uploading={uploading}
            uploadProgress={uploadProgress}
            uploadedPath={uploadedPath}
            accept={ACCEPTED_EXTS}
            disabled={creating}
            onFileSelect={handleFileSelect}
            onUpload={handleUpload}
            onClear={() => { setSelectedFile(null); setUploadedPath(null); setUploadProgress(0) }}
          />

          <Card title="转写参数" padding="md" shadow="sm">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">录音类型</label>
                <div className="flex gap-2">
                  {([
                    { value: 'single', label: '单人录音' },
                    { value: 'dual', label: '双人通话' },
                    { value: 'multi', label: '多人会议' },
                  ] as const).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setRecordingType(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                        recordingType === opt.value
                          ? 'bg-primary-50 border-primary-300 text-primary-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {recordingType === 'multi' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-2 block">说话人数量（可选，留空自动估计）</label>
                  <Input
                    type="number"
                    min={2}
                    max={10}
                    value={numSpeakers || ''}
                    onChange={(e) => setNumSpeakers(e.target.value ? parseInt(e.target.value) : 0)}
                    placeholder="自动估计"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-slate-600 mb-2 block">热词 / 上下文（可选）</label>
                <Input
                  value={hotwords}
                  onChange={(e) => setHotwords(e.target.value)}
                  placeholder="人名、项目名、工程术语，用逗号分隔"
                />
                <p className="text-xs text-slate-400 mt-1">用于提升专有名词识别准确率</p>
              </div>

              <Button
                variant="primary"
                size="md"
                block
                loading={creating}
                disabled={!uploadedPath || creating}
                onClick={handleCreateJob}
                leftIcon="Sparkles"
              >
                {uploadedPath ? '创建转写任务' : '请先上传音频'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 当前任务进度 / 结果 */}
      {currentJob && (
        <Card title="转写结果" padding="md" shadow="sm"
          extra={
            <Button variant="ghost" size="xs" onClick={() => { setCurrentJob(null); if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }}>
              <Icon name="X" size={14} />
            </Button>
          }
        >
          {jobLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Icon name="Loader2" size={16} className="animate-spin" />
              <span>加载中...</span>
            </div>
          ) : (
            <>
              {/* 进度 */}
              {(currentJob.status === 'pending' || currentJob.status === 'running' || currentJob.status === 'processing') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                      {currentJob.status === 'pending' ? '等待处理' : '正在转写'}
                    </span>
                    <span className="text-slate-400 text-xs">
                      {currentJob.elapsedSec ? `已耗时 ${currentJob.elapsedSec}s` : ''}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${currentJob.progress || 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-400 text-right">{currentJob.progress || 0}%</div>
                </div>
              )}

              {/* 失败 */}
              {currentJob.status === 'failed' && (
                <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">
                  <Icon name="XCircle" size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">转写失败</p>
                    {currentJob.error && <p className="text-xs mt-1">{currentJob.error}</p>}
                  </div>
                </div>
              )}

              {/* 完成 - 编辑器 */}
              {currentJob.status === 'completed' && (
                <TranscriptEditor
                  job={currentJob}
                  masked={masked}
                  onIngest={handleIngest}
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* 任务列表 */}
      <SttJobList
        refreshTrigger={refreshTrigger}
        onSelectJob={handleSelectJob}
        selectedJobId={currentJob?.id}
      />
    </div>
  )
}

export default TranscriptionWorkspace

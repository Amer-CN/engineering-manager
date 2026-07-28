/**
 * AudioInputCard — 音频输入卡（上传 / 录音 二合一）
 *
 * 统一入口：分段切换「上传文件 / 现场录音」，两者都通过 onFileSelect 交给上层。
 * 上层收到文件后立即自动上传，本卡展示上传进度 / 就绪状态。
 * 不再需要单独的「开始上传」按钮，简化操作链路。
 */

import React, { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import AudioRecorder from './AudioRecorder'

type InputMode = 'upload' | 'record'

interface AudioInputCardProps {
  selectedFile: File | null
  uploading: boolean
  uploadProgress: number
  uploadedPath: string | null
  accept: string
  disabled?: boolean
  /** 选择文件或录音完成时触发（上层负责自动上传） */
  onFileSelect: (file: File) => void
  onClear: () => void
  /** 取消正在进行的上传 */
  onCancelUpload?: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const AudioInputCard: React.FC<AudioInputCardProps> = ({
  selectedFile, uploading, uploadProgress, uploadedPath, accept, disabled,
  onFileSelect, onClear, onCancelUpload,
}) => {
  const [mode, setMode] = useState<InputMode>('upload')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFileSelect(files[0])
  }, [disabled, onFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) onFileSelect(files[0])
    e.target.value = '' // 允许重复选择同一文件
  }, [onFileSelect])

  // ── 已选文件 / 已上传：展示状态 ──
  const hasFile = !!selectedFile || !!uploadedPath
  if (hasFile) {
    return (
      <Card title="音频" padding="md" shadow="sm">
        {uploadedPath ? (
          <div className="flex items-center gap-3 p-3 bg-success-50 rounded-lg">
            <Icon name="CheckCircle" size={20} className="text-success-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success-700">音频已就绪</p>
              <p className="text-xs text-success-600 truncate">{selectedFile?.name || '音频文件'}</p>
            </div>
            <Button variant="danger" size="xs" onClick={onClear} leftIcon="Trash2">
              删除
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-[color:var(--panel-2)] rounded-lg">
              <Icon name="FileText" size={20} className="text-[color:var(--muted)] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[color:var(--fg-2)] truncate">{selectedFile?.name}</p>
                {selectedFile && <p className="text-xs text-[color:var(--muted)]">{formatSize(selectedFile.size)}</p>}
              </div>
              {!uploading && (
                <Button variant="ghost" size="xs" onClick={onClear} leftIcon="X">
                  移除
                </Button>
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-[color:var(--muted)]">
                <span>{uploading ? '上传中...' : '准备中...'}</span>
                <div className="flex items-center gap-2">
                  {uploading && onCancelUpload && (
                    <button
                      type="button"
                      onClick={onCancelUpload}
                      className="text-danger-500 hover:text-danger-600 font-medium transition-colors"
                    >
                      取消上传
                    </button>
                  )}
                  <span>{uploadProgress}%</span>
                </div>
              </div>
              <div className="h-2 bg-[color:var(--panel-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[color:var(--accent)] rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </Card>
    )
  }

  // ── 未选文件：切换 上传 / 录音 ──
  return (
    <Card title="音频" padding="md" shadow="sm">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
        aria-label="选择音频文件"
      />

      {/* 分段切换 */}
      <div className="flex gap-1 p-1 mb-4 bg-[color:var(--panel-2)] rounded-lg">
        {([
          { value: 'upload', label: '上传文件', icon: 'Upload' },
          { value: 'record', label: '现场录音', icon: 'Mic' },
        ] as const).map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-sm rounded-md transition-colors ${
              mode === opt.value
                ? 'bg-[color:var(--card)] text-[color:var(--accent)] shadow-sm font-medium'
                : 'text-[color:var(--muted)] hover:text-[color:var(--fg-2)]'
            }`}
          >
            <Icon name={opt.icon} size={15} />
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'upload' ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-10 px-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
              : 'border-[color:var(--border)] hover:border-[color:var(--border)] hover:bg-[color:var(--panel-2)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Icon name="Upload" size={32} className="text-[color:var(--muted)] mx-auto mb-2" />
          <p className="text-sm text-[color:var(--fg-2)] font-medium">拖拽音频文件到此处</p>
          <p className="text-xs text-[color:var(--muted)] mt-1">或点击选择文件</p>
          <p className="text-xs text-[color:var(--muted)] mt-2">支持 {accept} · 最大 500MB</p>
        </div>
      ) : (
        <AudioRecorder disabled={disabled} onRecorded={onFileSelect} />
      )}
    </Card>
  )
}

export default AudioInputCard

/**
 * AudioUploadCard — 音频上传区域
 *
 * 支持拖拽和点击选择。
 * 禁止使用 FileReader.readAsDataURL 读取大音频。
 */

import React, { useState, useCallback, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

interface AudioUploadCardProps {
  selectedFile: File | null
  uploading: boolean
  uploadProgress: number
  uploadedPath: string | null
  accept: string
  disabled?: boolean
  onFileSelect: (file: File) => void
  onUpload: () => void
  onClear: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const AudioUploadCard: React.FC<AudioUploadCardProps> = ({
  selectedFile, uploading, uploadProgress, uploadedPath, accept, disabled,
  onFileSelect, onUpload, onClear,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    onFileSelect(files[0])
  }, [disabled, onFileSelect])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    onFileSelect(files[0])
    // reset so same file can be selected again
    e.target.value = ''
  }, [onFileSelect])

  return (
    <Card title="上传音频" padding="md" shadow="sm">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {!selectedFile && !uploadedPath && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-10 px-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-primary-400 bg-primary-50'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Icon name="Upload" size={32} className="text-slate-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">拖拽音频文件到此处</p>
          <p className="text-xs text-slate-400 mt-1">或点击选择文件</p>
          <p className="text-xs text-slate-400 mt-2">
            支持 {accept} · 最大 500MB
          </p>
        </div>
      )}

      {selectedFile && !uploadedPath && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Icon name="FileText" size={20} className="text-slate-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{selectedFile.name}</p>
              <p className="text-xs text-slate-400">{formatSize(selectedFile.size)}</p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="xs" onClick={onClear} iconOnly>
                <Icon name="X" size={14} />
              </Button>
            )}
          </div>

          {uploading ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>上传中...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={onUpload} leftIcon="Upload" block>
                开始上传
              </Button>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                重新选择
              </Button>
            </div>
          )}
        </div>
      )}

      {uploadedPath && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
          <Icon name="CheckCircle" size={20} className="text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">上传成功</p>
            <p className="text-xs text-emerald-600 truncate">{selectedFile?.name || '音频文件'}</p>
          </div>
          <Button variant="ghost" size="xs" onClick={onClear} iconOnly>
            <Icon name="X" size={14} />
          </Button>
        </div>
      )}
    </Card>
  )
}

export default AudioUploadCard

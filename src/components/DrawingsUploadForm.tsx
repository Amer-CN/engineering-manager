/**
 * 图纸上传表单组件
 * 包含文件选择、拖拽上传、文件列表预览
 */
import { useState } from 'react'
import { Icon } from './ui/Icon'

interface DrawingUploadProps {
  files: File[]
  uploading: boolean
  uploadProgress: { current: number; total: number }
  editingMode: boolean
  onFilesAdd: (files: File[]) => void
  onFileRemove: (index: number) => void
}

export function DrawingUploadForm({
  files, uploading, uploadProgress, editingMode,
  onFilesAdd, onFileRemove,
}: DrawingUploadProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleFilesAdd = (newFiles: FileList | File[]) => {
    onFilesAdd(Array.from(newFiles))
  }

  return (
    <div>
      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-1 mb-2 max-h-36 overflow-y-auto">
          {files.map((f, i) => (
            <div key={i} className="flex items-center justify-between border border-[color:var(--border)] rounded px-3 py-1.5 bg-[color:var(--panel-2)]">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="FileText" size={14} className="text-[color:var(--accent)] shrink-0" />
                <span className="text-sm text-[color:var(--fg-2)] truncate">{f.name}</span>
                <span className="text-xs text-[color:var(--muted)] shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button type="button" onClick={() => onFileRemove(i)}
                className="text-xs text-danger-500 hover:text-danger-700 px-2 py-0.5 rounded shrink-0 ml-2">移除</button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {uploading ? (
        <div className="border-2 border-[color:var(--accent)] rounded-lg p-4 text-center bg-[color:var(--accent-soft)]">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-[color:var(--accent)] border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-[color:var(--accent)] font-medium">正在上传...</p>
          <p className="text-xs text-[color:var(--muted)]">{uploadProgress.current} / {uploadProgress.total}</p>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false)
            if (e.dataTransfer.files.length > 0) handleFilesAdd(e.dataTransfer.files)
          }}
          onClick={() => {
            const inp = document.createElement('input')
            inp.type = 'file'; inp.multiple = true
            inp.accept = '.jpg,.jpeg,.png,.pdf,.dwg,.dxf'
            inp.onchange = () => { if (inp.files && inp.files.length > 0) handleFilesAdd(inp.files) }
            inp.click()
          }}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)]'
          }`}
        >
          <Icon name="Upload" size={20} className="mx-auto mb-1 text-[color:var(--muted)]" />
          <p className="text-sm text-[color:var(--muted)]">点击选择 / 拖拽上传（支持多选）</p>
          <p className="text-xs text-[color:var(--muted)] mt-1">支持 JPG、PNG、PDF、DWG、DXF 格式</p>
        </div>
      )}
    </div>
  )
}

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
            <div key={i} className="flex items-center justify-between border border-slate-200 rounded px-3 py-1.5 bg-slate-50">
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="FileText" size={14} className="text-primary-500 shrink-0" />
                <span className="text-sm text-slate-700 truncate">{f.name}</span>
                <span className="text-xs text-slate-400 shrink-0">({(f.size / 1024).toFixed(1)} KB)</span>
              </div>
              <button type="button" onClick={() => onFileRemove(i)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded shrink-0 ml-2">移除</button>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {uploading ? (
        <div className="border-2 border-primary-300 rounded-lg p-4 text-center bg-primary-50">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-primary-600 font-medium">正在上传...</p>
          <p className="text-xs text-primary-400">{uploadProgress.current} / {uploadProgress.total}</p>
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
            dragOver ? 'border-primary-400 bg-primary-50' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <Icon name="Upload" size={20} className="mx-auto mb-1 text-slate-400" />
          <p className="text-sm text-slate-500">点击选择 / 拖拽上传（支持多选）</p>
          <p className="text-xs text-slate-400 mt-1">支持 JPG、PNG、PDF、DWG、DXF 格式</p>
        </div>
      )}
    </div>
  )
}

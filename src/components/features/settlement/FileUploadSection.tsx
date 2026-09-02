import React, { useRef } from 'react'
import { Icon } from '../../ui/Icon'

export interface FileUploadItem {
  url: string
  name: string
  type: 'pdf' | 'image' | 'excel'
}

interface FileUploadSectionProps {
  files: FileUploadItem[]
  onFilesChange: (files: FileUploadItem[]) => void
}

const processFiles = (
  fileList: FileList | File[],
  currentFiles: FileUploadItem[],
  onFilesChange: (files: FileUploadItem[]) => void
) => {
  const newFiles = Array.from(fileList)
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.xlsx']

  newFiles.forEach(file => {
    const fname = file.name.toLowerCase()
    if (!allowed.includes(file.type) && !allowedExts.some(e => fname.endsWith(e))) return
    if (file.size > 30 * 1024 * 1024) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      let ft: 'pdf' | 'image' | 'excel' = 'image'
      if (fname.endsWith('.pdf') || file.type === 'application/pdf') ft = 'pdf'
      else if (fname.endsWith('.xlsx') || file.type.includes('sheet')) ft = 'excel'
      onFilesChange([...currentFiles, { url: base64, name: file.name, type: ft }])
    }
    reader.readAsDataURL(file)
  })
}

export const FileUploadSection: React.FC<FileUploadSectionProps> = ({ files, onFilesChange }) => {
  const [dragOverFile, setDragOverFile] = React.useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(false) }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOverFile(false)
    if (e.dataTransfer.files.length > 0) processFiles(e.dataTransfer.files, files, onFilesChange)
  }
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files, files, onFilesChange)
      e.target.value = ''
    }
  }
  const handleRemoveFile = (index: number) => onFilesChange(files.filter((_, i) => i !== index))

  return (
    <div className="mb-6">
      <label className="label">结算凭证</label>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.xlsx"
        onChange={handleFileChange} className="hidden" multiple />
      {files.length > 0 && (
        <div className="space-y-2 mb-3">
          {files.map((f, i) => (
            <div key={i} className="border border-[color:var(--border)] rounded-lg p-3 bg-[color:var(--panel-2)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-[color:var(--accent-soft)] flex items-center justify-center">
                  {f.type === 'pdf' ? <Icon name="File" size={16} className="text-[color:var(--accent)]" /> :
                   f.type === 'excel' ? <Icon name="LayoutDashboard" size={16} className="text-[color:var(--accent)]" /> :
                   <Icon name="Image" size={16} className="text-[color:var(--accent)]" />}
                </div>
                <span className="text-sm text-[color:var(--fg-2)] truncate max-w-[300px]">{f.name}</span>
                <span className="text-xs text-[color:var(--muted)]">{f.type === 'pdf' ? 'PDF' : f.type === 'excel' ? 'Excel' : '图片'}</span>
              </div>
              <button type="button" onClick={() => handleRemoveFile(i)}
                className="text-[color:var(--danger)] hover:opacity-70 text-sm">删除</button>
            </div>
          ))}
        </div>
      )}
      <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
        dragOverFile ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border-strong)] hover:border-[color:var(--accent)] hover:bg-[color:var(--panel-2)]'
      }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
        <Icon name="Paperclip" size={28} className="text-[color:var(--border-strong)] mb-1 mx-auto" />
        <p className="text-sm font-medium text-[color:var(--fg-2)]">上传结算凭证（支持多文件）</p>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">点击或拖拽上传，JPG/PNG/PDF/XLSX，每文件最大 30MB</p>
      </div>
    </div>
  )
}

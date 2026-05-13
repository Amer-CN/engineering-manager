import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon'
import { FilePreviewModal, FilePreviewData } from './FilePreviewModal'

interface Props {
  fileUrl: string
  fileType: 'pdf' | 'image' | ''
  typeLabel: string
  onFileChange: (dataUrl: string, fileType: 'pdf' | 'image') => void
  onFileRemove: () => void
}

export const PaymentFileUpload: React.FC<Props> = ({ fileUrl, fileType, typeLabel, onFileChange, onFileRemove }) => {
  const [dragOverFile, setDragOverFile] = useState(false)
  const [previewFile, setPreviewFile] = useState<FilePreviewData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith('image/') || item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) { e.preventDefault(); processFile(file); return }
        }
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  const processFile = (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowed.includes(file.type)) { alert('只能上传 JPG、PNG、WebP 或 PDF 格式的文件'); return }
    if (file.size > 10 * 1024 * 1024) { alert('文件大小不能超过 10MB'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      onFileChange(base64, file.type === 'application/pdf' ? 'pdf' : 'image')
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(true) }
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(false) }
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOverFile(false); if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]) }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) { processFile(f); e.target.value = '' } }

  return (
    <>
      <div>
        <label className="label">上传{typeLabel}凭证</label>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={handleFileInput} className="hidden" />
        {fileUrl ? (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
                  {fileType === 'pdf' ? <Icon name="FileText" size={20} /> : <Icon name="Image" size={20} />}
                </div>
                <div><p className="text-sm font-medium text-slate-700">{fileType === 'pdf' ? 'PDF文件' : '图片文件'}</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setPreviewFile({ data: fileUrl, type: fileType === 'pdf' ? 'pdf' : 'image', title: '凭证预览' })} className="px-3 py-1.5 text-xs text-amber-600 hover:bg-amber-50 rounded-lg">预览</button>
                <button type="button" onClick={onFileRemove} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">删除</button>
              </div>
            </div>
          </div>
        ) : (
          <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragOverFile ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400 hover:bg-slate-50'}`}
            onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
            <div className="text-slate-400">
              <div className="text-3xl mb-2"><Icon name="Paperclip" size={32} /></div>
              <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
              <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB</p>
            </div>
          </div>
        )}
      </div>
      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </>
  )
}

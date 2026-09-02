import React, { useState, useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon'
import { FilePreviewModal, FilePreviewData } from './FilePreviewModal'
import { useToastStore } from '@/store/toastStore'
import { Button } from '../../ui/Button'

interface Props {
  fileUrl: string
  fileType: 'pdf' | 'image' | ''
  typeLabel: string
  onFileChange: (dataUrl: string, fileType: 'pdf' | 'image') => void
  onFileRemove: () => void
}

export const PaymentFileUpload: React.FC<Props> = ({ fileUrl, fileType, typeLabel, onFileChange, onFileRemove }) => {
  const showToast = useToastStore(state => state.showToast)
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
  if (!allowed.includes(file.type)) { showToast('只能上传 JPG、PNG、WebP 或 PDF 格式的文件', 'error'); return }
  if (file.size > 10 * 1024 * 1024) { showToast('文件大小不能超过 10MB', 'error'); return }
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
  <div className="rounded-lg p-4" style={{ border: '1px solid var(--border)', background: 'var(--panel-2)' }}>
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
  {fileType === 'pdf' ? <Icon name="FileText" size={20} /> : <Icon name="Image" size={20} />}
  </div>
  <div><p className="text-sm font-medium" style={{ color: 'var(--fg-2)' }}>{fileType === 'pdf' ? 'PDF文件' : '图片文件'}</p></div>
  </div>
  <div className="flex items-center gap-2">
  <button type="button" onClick={() => setPreviewFile({ data: fileUrl, type: fileType === 'pdf' ? 'pdf' : 'image', title: '凭证预览' })} className="px-3 py-1.5 text-xs rounded-lg text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]">预览</button>
  <Button type="button" onClick={onFileRemove}  variant="danger" size="sm">删除</Button>
  </div>
  </div>
  </div>
  ) : (
  <div className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-[border-color,background-color]"
  style={dragOverFile ? { borderColor: 'var(--accent)', background: 'var(--accent-soft)' } : { borderColor: 'var(--border-strong)' }}
  onClick={() => fileInputRef.current?.click()} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
  <div style={{ color: 'var(--muted)' }}>
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

import React from 'react'
import { Icon } from '../../ui/Icon'
import { Button } from '../../ui/Button'

interface FileDropZoneProps {
  label: string
  iconName: string
  file: string
  fileType: string
  fileLabel: string
  dragOver: boolean
  inputRef: React.RefObject<HTMLInputElement>
  onFileSelect: (file: File) => void
  onRemove: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onClickUpload: () => void
  multiple?: boolean
  onAddMore?: () => void
  iconBgClass?: string
  onPreview?: () => void
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  label, iconName, file, fileType, fileLabel, dragOver, inputRef,
  onFileSelect, onRemove, onDragOver, onDragLeave, onDrop, onClickUpload,
  multiple, onAddMore, iconBgClass, onPreview,
}) => (
  <div>
  <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">{label}</label>
  <input
  ref={inputRef}
  type="file"
  accept="image/jpeg,image/png,image/webp,application/pdf"
  onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
  className="hidden"
  />
  {file ? (
  <div className="border border-[color:var(--border)] rounded-lg p-4 bg-[color:var(--panel-2)]">
  <div className="flex items-center justify-between">
  <div className="flex items-center gap-3">
  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${iconBgClass || 'bg-[color:var(--panel-2)]'}`}>
  <Icon name={iconName} size={20} />
  </div>
  <div>
  <p className="text-sm font-medium text-[color:var(--fg-2)]">{fileLabel}</p>
  <p className="text-xs text-[color:var(--muted)]">{fileType === 'pdf' ? 'PDF文件' : '图片文件'}</p>
  </div>
  </div>
  <div className="flex items-center gap-2">
  {multiple && onAddMore && (
  <Button type="button" onClick={onAddMore}  variant="ghost" size="sm" className="text-[color:var(--accent)]">继续添加</Button>
  )}
  {onPreview && (
  <Button type="button" onClick={onPreview}  variant="ghost" size="sm" className="text-[color:var(--accent)]">预览</Button>
  )}
  <Button type="button" onClick={onRemove}  variant="danger" size="sm">删除</Button>
  </div>
  </div>
  </div>
  ) : (
  <div
  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragOver ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)] hover:border-[color:var(--accent)] hover:bg-[color:var(--panel-2)]'}`}
  onClick={onClickUpload}
  onDragOver={onDragOver}
  onDragLeave={onDragLeave}
  onDrop={onDrop}
  >
  <div className="text-[color:var(--muted)]">
  <div className="text-3xl mb-2"><Icon name={iconName} size={32} /></div>
  <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
  <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB</p>
  </div>
  </div>
  )}
  </div>
)

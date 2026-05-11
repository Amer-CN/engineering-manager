import React from 'react'
import { Icon } from '../../ui/Icon'

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
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">{label}</label>
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,application/pdf"
      onChange={e => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = '' }}
      className="hidden"
    />
    {file ? (
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${iconBgClass || 'bg-blue-100'}`}>
              <Icon name={iconName} size={20} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{fileLabel}</p>
              <p className="text-xs text-slate-400">{fileType === 'pdf' ? 'PDF文件' : '图片文件'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {multiple && onAddMore && (
              <button type="button" onClick={onAddMore} className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">继续添加</button>
            )}
            {onPreview && (
              <button type="button" onClick={onPreview} className="px-3 py-1.5 text-xs text-primary-600 hover:bg-primary-50 rounded-lg">预览</button>
            )}
            <button type="button" onClick={onRemove} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors">删除</button>
          </div>
        </div>
      </div>
    ) : (
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}
        onClick={onClickUpload}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className="text-slate-400">
          <div className="text-3xl mb-2"><Icon name={iconName} size={32} /></div>
          <p className="text-sm font-medium">点击上传 / 拖拽上传 / Ctrl+V 粘贴</p>
          <p className="text-xs mt-1">支持 JPG、PNG、WebP、PDF 格式，最大 10MB</p>
        </div>
      </div>
    )}
  </div>
)

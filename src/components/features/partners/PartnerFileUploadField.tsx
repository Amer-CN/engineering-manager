import React from 'react'
import { Icon } from '../../ui/Icon'

interface Props {
  label: string
  desc: string
  files: string
  filesType: string
  dragOver: boolean
  inputRef: React.RefObject<HTMLInputElement>
  accept?: string
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onClick: () => void
  onRemove: (index: number) => void
}

export const PartnerFileUploadField: React.FC<Props> = ({
  label, desc, files, filesType, dragOver, inputRef, accept, onDragOver, onDragLeave, onDrop, onClick, onRemove,
}) => {
  const fileList = files ? files.split('|||') : []
  const typeList = filesType ? filesType.split('|||') : []

  return (
    <div>
      <label className="label">{label}</label>
      <input ref={inputRef} type="file" accept={accept || 'image/jpeg,image/png,image/webp,application/pdf'} onChange={() => {}} className="hidden" />
      {fileList.length > 0 && fileList[0] && (
        <div className="space-y-2 mb-3">
          {fileList.map((f, i) => {
            const ft = typeList[i] || 'image'
            return (
              <div key={i} className="border border-[color:var(--border)] rounded-lg p-3 bg-[color:var(--panel-2)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-[color:var(--accent-soft)] flex items-center justify-center">
                    {ft === 'pdf' ? <Icon name="File" size={16} className="text-[color:var(--accent)]" /> : <Icon name="Image" size={16} className="text-[color:var(--accent)]" />}
                  </div>
                  <span className="text-sm text-[color:var(--fg-2)] truncate max-w-[300px]">{ft === 'pdf' ? `PDF文件 #${i+1}` : `图片文件 #${i+1}`}</span>
                  <span className="text-xs text-[color:var(--muted)]">{ft === 'pdf' ? 'PDF' : '图片'}</span>
                </div>
                <button type="button" onClick={() => onRemove(i)} className="text-danger-400 hover:text-danger-600 text-sm">删除</button>
              </div>
            )
          })}
        </div>
      )}
      <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${dragOver ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]' : 'border-[color:var(--border)] hover:border-[color:var(--accent)] hover:bg-[color:var(--panel-2)]'}`}
        onClick={onClick} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <Icon name="Paperclip" size={28} className="text-[color:var(--border-strong)] mb-1 mx-auto" />
        <p className="text-sm font-medium text-[color:var(--fg-2)]">{desc}</p>
        <p className="text-xs text-[color:var(--muted)] mt-0.5">点击或拖拽上传，JPG/PNG/PDF，每文件最大 10MB，支持 Ctrl+V 粘贴</p>
      </div>
    </div>
  )
}

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
              <div key={i} className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary-100 flex items-center justify-center">
                    {ft === 'pdf' ? <Icon name="File" size={16} className="text-primary-600" /> : <Icon name="Image" size={16} className="text-primary-600" />}
                  </div>
                  <span className="text-sm text-slate-700 truncate max-w-[300px]">{ft === 'pdf' ? `PDF文件 #${i+1}` : `图片文件 #${i+1}`}</span>
                  <span className="text-xs text-slate-400">{ft === 'pdf' ? 'PDF' : '图片'}</span>
                </div>
                <button type="button" onClick={() => onRemove(i)} className="text-red-400 hover:text-red-600 text-sm">删除</button>
              </div>
            )
          })}
        </div>
      )}
      <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all ${dragOver ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}
        onClick={onClick} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        <Icon name="Paperclip" size={28} className="text-slate-300 mb-1 mx-auto" />
        <p className="text-sm font-medium text-slate-600">{desc}</p>
        <p className="text-xs text-slate-400 mt-0.5">点击或拖拽上传，JPG/PNG/PDF，每文件最大 10MB，支持 Ctrl+V 粘贴</p>
      </div>
    </div>
  )
}

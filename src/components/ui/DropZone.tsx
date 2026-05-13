import React from 'react'
import { Icon } from './Icon'

interface DropZoneProps {
  label: string
  preview?: string
  onFile: (f: File) => void
  onRemove: () => void
  dragOver: string | null
  setDragOver: (v: string | null) => void
  acceptPdf?: boolean
}

export const DropZone: React.FC<DropZoneProps> = ({
  label, preview, onFile, onRemove, dragOver, setDragOver, acceptPdf,
}) => {
  const isOver = dragOver === label
  const accept = acceptPdf ? 'image/jpeg,image/png,image/webp,application/pdf' : 'image/jpeg,image/png,image/webp'

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = accept
    inp.onchange = () => { const f = inp.files?.[0]; if (f) onFile(f) }
    inp.click()
  }

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(label) }}
      onDragLeave={() => setDragOver(null)}
      onDrop={e => { e.preventDefault(); setDragOver(null); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={openPicker}
      className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${isOver ? 'border-indigo-400 bg-indigo-50' : 'border-slate-300 hover:border-slate-400'}`}
    >
      {preview ? (
        <div className="relative group">
          {preview.startsWith('data:') && preview.includes('image') ? (
            <img src={preview} alt={label} className="max-h-24 mx-auto rounded" />
          ) : (
            <div className="flex items-center gap-2 justify-center text-sm text-indigo-600">
              <Icon name="FileText" size={16} /><span>已上传文件</span>
            </div>
          )}
          <button type="button" onClick={e => { e.stopPropagation(); onRemove() }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">x</button>
        </div>
      ) : (
        <div className="text-sm text-slate-400">
          <Icon name="Upload" size={20} className="mx-auto mb-1" />
          <span>{label}</span>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { Icon } from '../../ui/Icon'

interface IdCardUploadAreaProps {
  label: string; image: string; field: string; dragOverField: string | null
  onDragOver: (e: React.DragEvent, field: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, field: string, setter: any, isIdCard?: boolean) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>, field: string, setter: any, isIdCard?: boolean, ref?: React.RefObject<HTMLInputElement>) => void
  onDelete: () => void; inputRef: React.RefObject<HTMLInputElement>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function IdCardUploadArea({ label, image, field, dragOverField, onDragOver, onDragLeave, onDrop, onDelete, inputRef, onInputChange }: IdCardUploadAreaProps) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all relative ${
        image ? 'border-green-500 bg-green-50' : dragOverField === field ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}
        onClick={() => image ? onDelete() : inputRef.current?.click()}
        onDragOver={(e) => onDragOver(e, field)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, field, null, true)}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onInputChange} className="hidden" onClick={(e) => e.stopPropagation()} />
        {image ? (
          <div className="relative group">
            <img src={image} alt={label} className="max-h-20 mx-auto rounded" />
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-white text-xs">点击删除</span>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-xs"><div className="text-lg mb-1"><Icon name="Camera" size={24} /></div>点击/拖拽/粘贴</div>
        )}
      </div>
    </div>
  )
}

interface FileUploadAreaProps {
  file: string; fileType: string; field: string; dragOverField: string | null
  onDragOver: (e: React.DragEvent, field: string) => void; onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, field: string, setter: any, isIdCard?: boolean) => void
  onDelete: () => void; inputRef: React.RefObject<HTMLInputElement>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string
}

export function FileUploadArea({ file, fileType, field, dragOverField, onDragOver, onDragLeave, onDrop, onDelete, inputRef, onInputChange, placeholder = '点击上传、拖拽文件或 Ctrl+V 粘贴' }: FileUploadAreaProps) {
  return (
    <div className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all relative ${
      file ? 'border-green-500 bg-green-50' : dragOverField === field ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}
      onClick={() => file ? onDelete() : inputRef.current?.click()}
      onDragOver={(e) => onDragOver(e, field)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, field, null)}>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onInputChange} className="hidden" onClick={(e) => e.stopPropagation()} />
      {file ? (
        <div className="relative group">
          <span className="text-green-600">{fileType === 'pdf' ? 'PDF已上传' : '图片已上传'}</span>
          <div className="mt-1"><span className="text-xs text-slate-500 group-hover:text-red-500 transition-colors">点击删除</span></div>
        </div>
      ) : (
        <div className="text-slate-400 text-xs"><div className="text-lg mb-1"><Icon name="Paperclip" size={24} /></div>{placeholder}<div className="text-[10px] mt-1">支持 JPG、PNG、WebP、PDF</div></div>
      )}
    </div>
  )
}

interface SmallFileUploadProps {
  label: string; file: string; field: string; dragOverField: string | null
  onDragOver: (e: React.DragEvent, field: string) => void; onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, field: string, setter: any, isIdCard?: boolean) => void
  onDelete: () => void; inputRef: React.RefObject<HTMLInputElement>
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function SmallFileUpload({ label, file, field, dragOverField, onDragOver, onDragLeave, onDrop, onDelete, inputRef, onInputChange }: SmallFileUploadProps) {
  return (
    <div>
      <label className="block text-xs text-slate-600 mb-1">{label}</label>
      <div className={`border-2 border-dashed rounded-lg p-2 text-center cursor-pointer transition-all relative ${
        file ? 'border-green-500 bg-green-50' : dragOverField === field ? 'border-primary-500 bg-primary-50' : 'border-slate-300 hover:border-primary-400'}`}
        onClick={() => file ? onDelete() : inputRef.current?.click()}
        onDragOver={(e) => onDragOver(e, field)} onDragLeave={onDragLeave} onDrop={(e) => onDrop(e, field, null)}>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onInputChange} className="hidden" onClick={(e) => e.stopPropagation()} />
        {file ? (
          <div className="relative group">
            <span className="text-green-600 text-xs">已上传</span>
            <span className="block text-[10px] text-slate-400 group-hover:text-red-500 transition-colors">点击删除</span>
          </div>
        ) : (<span className="text-slate-400 text-xs">点击/拖拽/粘贴</span>)}
      </div>
    </div>
  )
}

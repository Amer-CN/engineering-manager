// DrawingsGallery.tsx — S26 图纸画廊网格（Stitch Bedrock）
// 缩略图卡片：等比预览 + 图纸名 + 类别 chip + 项目 + 上传日期，hover 轻抬起
// 图片类型异步加载缩略图；PDF/DWG 等用大图标占位

import { useState, useEffect } from 'react'
import { Icon } from '../../ui/Icon'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { categoryIcons, normalizeDrawingCategory } from '../../drawingsConstants'
import type { Drawing } from '../../../types/electron'

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp)$/i

export function isImageDrawing(d: Drawing): boolean {
  return IMAGE_EXT.test(d.filePath || '')
}

/** 单卡缩略图（图片类型懒加载 dataURL） */
function Thumb({ drawing, projectName }: { drawing: Drawing; projectName: string }) {
  const [url, setUrl] = useState<string>('')
  const isImage = isImageDrawing(drawing)

  useEffect(() => {
    if (!isImage) return
    let cancelled = false
    readUploadedFile(FILE_CATEGORIES.DRAWING_FILE.category, FILE_CATEGORIES.DRAWING_FILE.subCategory, drawing.filePath, projectName)
      .then(u => { if (!cancelled) setUrl(u) })
      .catch(() => { /* 占位兜底 */ })
    return () => { cancelled = true }
  }, [drawing.filePath, projectName, isImage])

  if (isImage && url) {
    return <img src={url} alt={drawing.name} className="w-full h-full object-cover" loading="lazy" />
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[color:var(--muted)]">
      <Icon name={categoryIcons[normalizeDrawingCategory(drawing.category)] || 'FileText'} size={36} />
      <span className="text-xs font-mono uppercase">{(drawing.filePath || '').split('.').pop() || 'FILE'}</span>
    </div>
  )
}

export interface DrawingsGalleryProps {
  drawings: Drawing[]
  getProjectName: (projectId: number) => string
  onOpen: (drawing: Drawing) => void
  onEdit: (drawing: Drawing) => void
  onDelete: (id: number) => void
}

export function DrawingsGallery({ drawings, getProjectName, onOpen, onEdit, onDelete }: DrawingsGalleryProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {drawings.map(d => (
        <div
          key={d.id}
          onClick={() => onOpen(d)}
          className="group bg-[color:var(--card)] border border-[color:var(--border)] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5 hover:border-[color:var(--border-strong)]"
        >
          {/* 等比缩略图区 */}
          <div className="aspect-[4/3] bg-[color:var(--panel-2)] border-b border-[color:var(--border)] overflow-hidden">
            <Thumb drawing={d} projectName={getProjectName(d.projectId)} />
          </div>
          {/* 信息区 */}
          <div className="p-3.5">
            <p className="text-sm font-semibold text-[color:var(--fg)] truncate">{d.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
              <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-[color:var(--panel-2)] text-[color:var(--fg-2)] shrink-0">
                {normalizeDrawingCategory(d.category)}
              </span>
              <span className="text-xs text-[color:var(--muted)] truncate">{getProjectName(d.projectId)}</span>
            </div>
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-xs font-mono tabular-nums text-[color:var(--muted)]">
                {new Date(d.createdAt).toLocaleDateString('zh-CN')}
              </span>
              {/* hover 显隐操作 */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <button onClick={() => onEdit(d)} className="p-1 rounded text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--panel-2)]" title="编辑">
                  <Icon name="Edit3" size={14} />
                </button>
                <button onClick={() => onDelete(d.id)} className="p-1 rounded text-[color:var(--muted)] hover:text-danger-500 hover:bg-[color:var(--panel-2)]" title="删除">
                  <Icon name="Trash2" size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default DrawingsGallery

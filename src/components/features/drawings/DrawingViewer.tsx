// DrawingViewer.tsx — S27 图纸查看器（Lightbox，Stitch Bedrock）
// 深色 Graphite 背景专注看图：中央大图缩放（+/-/适应）、顶部图纸名+下载+关闭、
// 右侧可折叠信息栏（项目/类别/部位/备注/上传日期）。Esc 关闭。

import { useState, useEffect, useCallback } from 'react'
import { Icon } from '../../ui/Icon'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { isImageDrawing } from './DrawingsGallery'
import type { Drawing } from '../../../types/electron'

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]

export interface DrawingViewerProps {
  drawing: Drawing
  projectName: string
  onClose: () => void
}

export function DrawingViewer({ drawing, projectName, onClose }: DrawingViewerProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [zoomIdx, setZoomIdx] = useState(2) // 1x
  const [infoOpen, setInfoOpen] = useState(true)
  const isImage = isImageDrawing(drawing)
  const isPdf = /\.pdf$/i.test(drawing.filePath || '')

  useEffect(() => {
    let cancelled = false
    readUploadedFile(FILE_CATEGORIES.DRAWING_FILE.category, FILE_CATEGORIES.DRAWING_FILE.subCategory, drawing.filePath, projectName)
      .then(u => { if (!cancelled) { setUrl(u); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [drawing.filePath, projectName])

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onEsc)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onEsc); document.body.style.overflow = '' }
  }, [onClose])

  const zoom = ZOOM_STEPS[zoomIdx]
  const zoomIn = useCallback(() => setZoomIdx(i => Math.min(ZOOM_STEPS.length - 1, i + 1)), [])
  const zoomOut = useCallback(() => setZoomIdx(i => Math.max(0, i - 1)), [])
  const zoomFit = useCallback(() => setZoomIdx(2), [])

  const download = useCallback(() => {
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = drawing.filePath || drawing.name
    a.click()
  }, [url, drawing])

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col" style={{ background: 'oklch(20.5% 0.003 75 / 0.97)' }} role="dialog" aria-label="图纸查看器">
      {/* 顶栏：图纸名 + 操作 */}
      <div className="flex items-center gap-3 px-4 h-12 shrink-0" style={{ borderBottom: '1px solid oklch(100% 0 0 / 0.08)' }}>
        <span className="shrink-0" style={{ color: 'oklch(80% 0.005 85)' }}><Icon name="Ruler" size={16} /></span>
        <span className="text-sm font-semibold truncate" style={{ color: 'oklch(92% 0.005 85)' }}>{drawing.name}</span>
        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: 'oklch(70% 0.005 85)', background: 'oklch(100% 0 0 / 0.08)' }}>
          {(drawing.filePath || '').split('.').pop()?.toUpperCase() || 'FILE'}
        </span>
        <div className="flex-1" />
        {isImage && (
          <div className="flex items-center gap-1 mr-2">
            <button onClick={zoomOut} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[oklch(100%_0_0_/_0.1)]" style={{ color: 'oklch(80% 0.005 85)' }} title="缩小" aria-label="缩小">
              <Icon name="Minus" size={16} />
            </button>
            <button onClick={zoomFit} className="h-8 px-2 rounded-lg text-xs font-mono tabular-nums transition-colors hover:bg-[oklch(100%_0_0_/_0.1)]" style={{ color: 'oklch(80% 0.005 85)' }} title="适应">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[oklch(100%_0_0_/_0.1)]" style={{ color: 'oklch(80% 0.005 85)' }} title="放大" aria-label="放大">
              <Icon name="Plus" size={16} />
            </button>
          </div>
        )}
        <button onClick={download} disabled={!url} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[oklch(100%_0_0_/_0.1)] disabled:opacity-40" style={{ color: 'oklch(80% 0.005 85)' }} title="下载" aria-label="下载">
          <Icon name="Download" size={16} />
        </button>
        <button onClick={() => setInfoOpen(v => !v)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[oklch(100%_0_0_/_0.1)]" style={{ color: infoOpen ? 'oklch(95% 0.005 85)' : 'oklch(80% 0.005 85)' }} title="信息栏" aria-label="信息栏">
          <Icon name="Info" size={16} />
        </button>
        <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[oklch(100%_0_0_/_0.1)]" style={{ color: 'oklch(80% 0.005 85)' }} title="关闭 (Esc)" aria-label="关闭">
          <Icon name="X" size={18} />
        </button>
      </div>

      {/* 主体：看图区 + 右侧信息栏 */}
      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-auto flex items-center justify-center p-6">
          {loading ? (
            <span className="text-sm" style={{ color: 'oklch(70% 0.005 85)' }}>加载中...</span>
          ) : !url ? (
            <span className="text-sm" style={{ color: 'oklch(70% 0.005 85)' }}>文件不存在或已损坏</span>
          ) : isImage ? (
            <img
              src={url}
              alt={drawing.name}
              className="transition-transform duration-200 select-none"
              style={{ transform: `scale(${zoom})`, maxWidth: zoom <= 1 ? '100%' : 'none', maxHeight: zoom <= 1 ? '100%' : 'none' }}
              draggable={false}
            />
          ) : isPdf ? (
            <embed src={url} type="application/pdf" className="w-full h-full rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-3" style={{ color: 'oklch(70% 0.005 85)' }}>
              <Icon name="FileText" size={48} />
              <p className="text-sm">该格式不支持在线预览</p>
              <button onClick={download} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ background: 'oklch(100% 0 0 / 0.1)', color: 'oklch(92% 0.005 85)' }}>
                下载查看
              </button>
            </div>
          )}
        </div>

        {/* 右侧可折叠信息栏 */}
        {infoOpen && (
          <aside className="w-[280px] shrink-0 overflow-y-auto p-5" style={{ borderLeft: '1px solid oklch(100% 0 0 / 0.08)' }}>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'oklch(70% 0.005 85)' }}>图纸信息</h4>
            <div className="flex flex-col gap-3.5 text-sm">
              {[
                ['所属项目', projectName],
                ['图纸类型', drawing.category || '其他'],
                ['部位', drawing.position || '-'],
                ['上传日期', new Date(drawing.createdAt).toLocaleDateString('zh-CN')],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs mb-0.5" style={{ color: 'oklch(60% 0.005 85)' }}>{label}</p>
                  <p style={{ color: 'oklch(90% 0.005 85)' }}>{value}</p>
                </div>
              ))}
              {drawing.remarks && (
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'oklch(60% 0.005 85)' }}>备注</p>
                  <p className="whitespace-pre-wrap" style={{ color: 'oklch(90% 0.005 85)' }}>{drawing.remarks}</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}

export default DrawingViewer

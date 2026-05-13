import { useState } from 'react'
import { readUploadedFile, FILE_CATEGORIES } from '@/services/fileService'

interface FileUploaderProps {
  files: string[]
  onChange: (files: string[]) => void
  projectName?: string
}

const IMG_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i

export function FileUploader({ files, onChange, projectName }: FileUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewLabel, setPreviewLabel] = useState('')

  const handleAdd = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      const newFiles = Array.from(input.files || []).map(f => f.name)
      onChange([...files, ...newFiles.filter(n => !files.includes(n))])
    }
    input.click()
  }

  const handlePreview = async (fileName: string) => {
    if (IMG_EXTS.test(fileName)) {
      try {
        const url = await readUploadedFile(
          FILE_CATEGORIES.COST_LEDGER_FILE.category,
          FILE_CATEGORIES.COST_LEDGER_FILE.subCategory,
          fileName,
          projectName,
        )
        if (url) {
          setPreviewUrl(url)
          setPreviewLabel(fileName)
        }
      } catch { /* ignore read errors */ }
    } else {
      // 非图片文件用系统默认程序打开
      const api = (window as any).electronAPI
      if (api?.openExternalFile) {
        api.openExternalFile({
          category: FILE_CATEGORIES.COST_LEDGER_FILE.category,
          subCategory: FILE_CATEGORIES.COST_LEDGER_FILE.subCategory,
          fileName,
          projectName,
        })
      }
    }
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span className="flex-1 truncate">{f}</span>
              <button
                type="button"
                onClick={() => handlePreview(f)}
                className="text-blue-400 hover:text-blue-600"
                title={IMG_EXTS.test(f) ? '预览' : '打开'}
              >
                {IMG_EXTS.test(f) ? '预览' : '打开'}
              </button>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
      >
        + 上传凭证（可选）
      </button>

      {/* 图片预览弹窗 */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
          onClick={() => { setPreviewUrl(null); setPreviewLabel('') }}
        >
          <div
            className="max-h-[90vh] max-w-[90vw] rounded-xl bg-white p-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 truncate max-w-[70vw]">{previewLabel}</span>
              <button
                onClick={() => { setPreviewUrl(null); setPreviewLabel('') }}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <img
              src={previewUrl}
              alt={previewLabel}
              className="max-h-[75vh] max-w-[85vw] rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}

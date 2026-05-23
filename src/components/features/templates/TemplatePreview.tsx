import { useState, useEffect } from 'react'
import { Template } from '../../../types/electron'
import { Icon } from '../../ui/Icon'

interface TemplatePreviewProps {
  template: Template
  onClose: () => void
}

export default function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const [htmlContent, setHtmlContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPreview()
  }, [template])

  const loadPreview = async () => {
    setLoading(true)
    setError('')
    try {
      if (template.fileType === 'docx') {
        // 调用主进程用 mammoth 转换 docx → HTML
        const result = await window.electronAPI.convertTemplateDocxToHtml(template.storedFileName)
        if (result.success && result.data) {
          setHtmlContent(result.data)
        } else {
          setHtmlContent(`<div style="text-align:center;padding:40px;"><p style="color:#94a3b8;margin-bottom:12px;">Word 文档转换失败，请下载查看</p></div>`)
        }
      } else {
        // 非 docx：读取文件并提供下载链接
        const result = await window.electronAPI.readFile({
          category: 'templates',
          subCategory: 'files',
          fileName: template.storedFileName,
          projectName: null,
        })
        if (result.success && result.data) {
          const { dataUrl } = result.data
          setHtmlContent(`<div style="text-align:center;padding:40px;"><p style="color:#64748b;margin-bottom:12px;">Excel 模板无法在线预览</p><a href="${dataUrl}" download="${template.fileName}" style="display:inline-block;padding:8px 16px;background:#6366f1;color:#fff;border-radius:8px;text-decoration:none;">下载查看</a></div>`)
        } else {
          setError(result.error || '文件读取失败')
        }
      }
    } catch (e: any) {
      console.error('Template preview failed:', e)
      setError(e.message || '预览失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{template.name}</h2>
            <p className="text-xs text-slate-400">{template.fileName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="X" size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-16 text-slate-400">
              <Icon name="AlertCircle" size={32} className="mx-auto mb-3 text-amber-400" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg p-6 bg-white" dangerouslySetInnerHTML={{ __html: htmlContent }} />
          )}
        </div>
      </div>
    </div>
  )
}

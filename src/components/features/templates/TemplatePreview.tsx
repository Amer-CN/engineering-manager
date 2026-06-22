import { useState, useEffect } from 'react'
import { Template } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { getAPI } from '@/services/api-adapter'

const COLORS = {
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  primary: '#6366f1',
  white: '#fff',
} as const

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
        const result = await (await getAPI()).convertTemplateDocxToHtml(template.storedFileName)
        if (result.success && result.data) {
          setHtmlContent(result.data)
        } else {
          setHtmlContent(`<div style="text-align:center;padding:40px;"><p style="color:${COLORS.textMuted};margin-bottom:12px;">Word 文档转换失败，请下载查看</p></div>`)
        }
      } else {
        // 非 docx：读取文件并提供下载链接
        const result = await (await getAPI()).readFile({
          category: 'templates',
          subCategory: 'files',
          fileName: template.storedFileName,
          projectName: null,
        })
        if (result.success && result.data) {
          const { dataUrl } = result.data
          setHtmlContent(`<div style="text-align:center;padding:40px;"><p style="color:${COLORS.textSubtle};margin-bottom:12px;">Excel 模板无法在线预览</p><a href="${dataUrl}" download="${template.fileName}" style="display:inline-block;padding:8px 16px;background:${COLORS.primary};color:${COLORS.white};border-radius:8px;text-decoration:none;">下载查看</a></div>`)
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
    <Modal isOpen onClose={onClose} title={template.name} size="full">
      <p className="text-xs text-slate-400 mb-4">{template.fileName}</p>
      <div>
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
    </Modal>
  )
}

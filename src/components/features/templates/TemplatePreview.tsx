import { useState, useEffect } from 'react'
import DOMPurify from 'dompurify'
import { Template } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { getAPI } from '@/services/api-adapter'
import { COLORS } from './templatesColors'

interface TemplatePreviewProps {
  template: Template
  onClose: () => void
}

export default function TemplatePreview({ template, onClose }: TemplatePreviewProps) {
  const [htmlContent, setHtmlContent] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPreview()
  }, [template])

  const loadPreview = async () => {
    setLoading(true)
    setError('')
    try {
      // docx/xlsx 均无在线预览：读取文件并提供下载链接
      const result = await (await getAPI()).readFile({
        category: 'templates',
        subCategory: 'files',
        fileName: template.storedFileName,
        projectName: null,
      })
      if (result.success && result.data) {
        const { dataUrl } = result.data
        const tip = template.fileType === 'docx'
          ? 'Word 文档暂不支持在线预览'
          : 'Excel 模板无法在线预览'
        // 下载链接走受控 JSX（DOMPurify 默认策略会剥掉 data: 协议的 href）
        setFileUrl(dataUrl)
        setHtmlContent(`<div style="text-align:center;padding:40px;"><p style="color:${COLORS.textSubtle};margin-bottom:12px;">${tip}</p></div>`)
      } else {
        setError(result.error || '文件读取失败')
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
      <p className="text-xs text-[color:var(--muted)] mb-4">{template.fileName}</p>
      <div>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[color:var(--accent)] border-t-transparent" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-[color:var(--muted)]">
            <Icon name="AlertCircle" size={32} className="mx-auto mb-3 text-warning-400" />
            <p>{error}</p>
          </div>
        ) : (
          <div className="border border-[color:var(--border)] rounded-lg p-6 bg-[color:var(--card)]">
            <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }} />
            {fileUrl && (
              <div style={{ textAlign: 'center' }}>
                <a
                  href={fileUrl}
                  download={template.fileName}
                  style={{ display: 'inline-block', padding: '8px 16px', background: COLORS.primary, color: COLORS.white, borderRadius: 8, textDecoration: 'none' }}
                >
                  下载查看
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

import { useState, useEffect, useRef } from 'react'
import { Template } from '../../../types/electron'
import { Icon } from '../../ui/Icon'
import { useToastStore } from '@/store/toastStore'

interface TemplateGenerateProps {
  template: Template
  onClose: () => void
}

export default function TemplateGenerate({ template, onClose }: TemplateGenerateProps) {
  const showToast = useToastStore(state => state.showToast)
  const [values, setValues] = useState<Record<string, string>>({})
  const [previewHtml, setPreviewHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initialize with default values
    const defaults: Record<string, string> = {}
    for (const v of template.variables) {
      defaults[v.key] = v.defaultValue || ''
    }
    setValues(defaults)
  }, [template])

  useEffect(() => {
    loadAndRender()
  }, [values, template])

  const loadAndRender = async () => {
    if (template.fileType !== 'docx') {
      setPreviewHtml(`<p style="text-align:center;color:#94a3b8;padding:40px;">Excel 模板请下载后填写变量值</p>`)
      return
    }

    setLoading(true)
    try {
      // 调用主进程用 mammoth 转换 docx → HTML
      const result = await window.electronAPI.convertTemplateDocxToHtml(template.storedFileName)
      if (result.success && result.data) {
        let html = result.data
        for (const [key, val] of Object.entries(values)) {
          html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), val || `【${key}】`)
        }
        setPreviewHtml(html)
      } else {
        setPreviewHtml(`<p style="text-align:center;color:#ef4444;padding:40px;">转换模板失败：${result.error || '未知错误'}</p>`)
      }
    } catch (e) {
      console.error('Template render failed:', e)
      setPreviewHtml('<p style="text-align:center;color:#ef4444;padding:40px;">加载模板失败</p>')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${template.name}</title>
<style>body{font-family:SimSun,serif;font-size:14pt;line-height:2;padding:40px 60px;max-width:210mm;margin:0 auto}
h1{text-align:center;font-size:18pt;margin-bottom:24px}
.signature{margin-top:60px;display:flex;justify-content:space-between}
.signature div{width:45%}
.signature p{border-top:1px solid #000;padding-top:4px;text-align:center}
@media print{body{padding:20px 30px}}</style></head><body>${previewHtml}</body></html>`)
    w.document.close()
    setTimeout(() => { w.print() }, 500)
  }

  const handleDownload = async () => {
    if (template.fileType !== 'docx') {
      // Excel — download original
      try {
        const result = await window.electronAPI.readFile({
          category: 'templates',
          subCategory: 'files',
          fileName: template.storedFileName,
          projectName: null,
        })
        if (result.success && result.data) {
          const a = document.createElement('a')
          a.href = result.data.dataUrl
          a.download = template.fileName
          a.click()
        }
      } catch { showToast('下载失败', 'error') }
      return
    }

    // .docx — use docxtemplater to fill variables, preserving all Word formatting
    setLoading(true)
    try {
      const result = await window.electronAPI.fillTemplateDocx(template.storedFileName, values)
      if (result.success && result.data) {
        const a = document.createElement('a')
        a.href = result.data.dataUrl
        a.download = template.name + '.docx'
        a.click()
        showToast('Word 文档已生成并下载', 'success')
      } else {
        showToast(result.error || '生成失败', 'error')
      }
    } catch {
      showToast('生成文档失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const setValue = (key: string, value: string) => {
    setValues(p => ({ ...p, [key]: value }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex" onClick={e => e.stopPropagation()}>
        {/* Left: variables form */}
        <div className="w-80 flex-shrink-0 border-r border-slate-100 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">{template.name}</h3>
            <p className="text-xs text-slate-400">填写变量值</p>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            {template.variables.length === 0 ? (
              <p className="text-xs text-slate-400">此模板没有定义变量</p>
            ) : (
              template.variables.map(v => (
                <div key={v.key}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {v.label || v.key}
                    {v.required && <span className="text-red-400 ml-0.5">*</span>}
                  </label>
                  {v.type === 'date' ? (
                    <input type="date" value={values[v.key] || ''} onChange={e => setValue(v.key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                  ) : v.type === 'number' ? (
                    <input type="number" value={values[v.key] || ''} onChange={e => setValue(v.key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" />
                  ) : v.type === 'select' && v.options ? (
                    <select value={values[v.key] || ''} onChange={e => setValue(v.key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs">
                      <option value="">-- 请选择 --</option>
                      {v.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={values[v.key] || ''} onChange={e => setValue(v.key, e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-xs" placeholder={v.defaultValue || `输入${v.label || v.key}`} />
                  )}
                </div>
              ))
            )}
          </div>
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-2">
            <button onClick={handlePrint} className="btn btn-ghost text-xs flex items-center gap-1">
              <Icon name="Printer" size={14} /> 打印
            </button>
            <div className="flex-1" />
            <button onClick={onClose} className="btn btn-ghost text-xs">取消</button>
            <button onClick={handleDownload} disabled={loading} className="btn btn-primary text-xs flex items-center gap-1">
              <Icon name="Download" size={14} /> 下载 Word 文档
            </button>
          </div>
        </div>

        {/* Right: preview */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">预览（仅供参考，排版以下载的 Word 文档为准）</span>
          </div>
          <div ref={printRef} className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg p-8 bg-white shadow-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

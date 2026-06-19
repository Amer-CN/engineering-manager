import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

export interface ContractPreviewFile {
  data: string
  previewUrl: string
  type: 'pdf' | 'image' | 'word' | 'excel'
  title: string
  html?: string
}

interface ContractPreviewModalProps {
  previewFile: ContractPreviewFile | null
  onClose: () => void
}

const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({ previewFile, onClose }) => {
  if (!previewFile) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]" onClick={onClose}>
      <motion.div className="bg-white rounded-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-semibold text-slate-800">{previewFile.title}</h3>
          <div className="flex items-center gap-3">
            {previewFile.type !== 'image' && (
              <a href={previewFile.data}
                download={`合同附件.${previewFile.type === 'pdf' ? 'pdf' : previewFile.type === 'word' ? 'docx' : 'xlsx'}`}
                className="btn btn-primary btn-sm">下载文件</a>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Icon name="X" size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-slate-100">
          {previewFile.type === 'pdf' && (
            <iframe src={previewFile.previewUrl || previewFile.data} className="w-full h-full border-0" title={previewFile.title} />
          )}
          {previewFile.type === 'word' && previewFile.html && (
            <iframe srcDoc={previewFile.html} className="w-full h-full border-0 bg-white" title={previewFile.title} />
          )}
          {previewFile.type === 'word' && !previewFile.html && (
            <div className="flex flex-col items-center justify-center text-slate-500 h-full">
              <Icon name="Loader" size={36} className="animate-spin text-slate-300 mb-4" />
              <p className="text-sm">正在转换文档...</p>
            </div>
          )}
          {previewFile.type === 'excel' && (
            <div className="flex flex-col items-center justify-center text-slate-500 h-full">
              <Icon name="LayoutDashboard" size={56} className="text-slate-300 mb-4" />
              <p className="text-lg font-medium mb-2">Excel 表格</p>
              <p className="text-sm">此文件类型不支持在线预览，请下载后使用相应软件打开</p>
            </div>
          )}
          {previewFile.type === 'image' && (
            <img src={previewFile.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default ContractPreviewModal

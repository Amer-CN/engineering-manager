import React from 'react'
import { motion } from 'framer-motion'

export interface FilePreviewData {
  data: string
  type: 'image' | 'pdf'
  title: string
}

export const FilePreviewModal: React.FC<{
  file: FilePreviewData
  onClose: () => void
}> = ({ file, onClose }) => (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]" onClick={onClose}>
    <motion.div className="bg-white dark:bg-slate-800 rounded-2xl w-[95vw] h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">{file.title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">✕</button>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-slate-100">
        {file.type === 'pdf' ? (
          <iframe src={file.data} className="w-full h-full border-0" />
        ) : (
          <img src={file.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
        )}
      </div>
    </motion.div>
  </div>
)

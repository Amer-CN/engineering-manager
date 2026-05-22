import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'

interface FileImportDialogProps {
  show: boolean
  title: string
  description?: string
  accept: string       // e.g. '.xlsx,.xls,.csv' or '.pdf'
  acceptText: string   // e.g. 'Excel 表格 (.xlsx, .xls, .csv)' or 'PDF 回单 (.pdf)'
  onFile: (file: File) => void
  onClose: () => void
  parsing?: boolean
}

export const FileImportDialog: React.FC<FileImportDialogProps> = ({
  show, title, description, accept, acceptText, onFile, onClose, parsing,
}) => {
  const [dragOver, setDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFile = (file: File) => {
    setSelectedFile(file)
  }

  const confirmAndClose = () => {
    if (selectedFile) onFile(selectedFile)
  }

  const openPicker = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = accept
    inp.onchange = () => {
      const f = inp.files?.[0]
      if (f) handleFile(f)
    }
    inp.click()
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]" onClick={onClose}>
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
          {description && (
            <p className="text-sm text-slate-500 mt-1">{description}</p>
          )}
        </div>

        {/* Body */}
        <div className="p-6">
          {selectedFile ? (
            <div className="flex items-center justify-between border border-slate-300 dark:border-slate-600 rounded-lg p-4 bg-slate-50 dark:bg-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Icon name="FileText" size={20} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded transition-colors"
              >
                移除
              </button>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault(); setDragOver(false)
                const f = e.dataTransfer.files[0]
                if (f) handleFile(f)
              }}
              onClick={openPicker}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/10'
                  : 'border-slate-300 dark:border-slate-600 hover:border-primary-400 hover:bg-slate-50 dark:hover:bg-slate-700/30'
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Icon name="Upload" size={36} className="text-slate-400" />
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  拖拽文件到此处，或<span className="text-primary-500">点击选择文件</span>
                </p>
                <p className="text-xs text-slate-400">{acceptText}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={confirmAndClose}
            disabled={!selectedFile || parsing}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {parsing ? '解析中…' : '确认导入'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

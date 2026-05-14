import React from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { OCRProvider } from '@/services/ocr'

interface Props {
  type: 'staff' | 'worker'; editingMember: any; ocrMode: OCRProvider
  ocrLoading: boolean; submitting: boolean
  onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode
}

export const MemberFormLayout: React.FC<Props> = ({ type, editingMember, ocrMode, ocrLoading, submitting, onClose, onSubmit, children }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">{editingMember ? `编辑${type === 'staff' ? '管理人员' : '工人'}` : `添加${type === 'staff' ? '管理人员' : '工人'}`}</h2>
        <button onClick={onClose} className="text-slate-500 dark:text-slate-400 hover:text-slate-700">✕</button>
      </div>
      <form onSubmit={onSubmit} className="p-6">
        <div className={`mb-4 p-3 rounded-lg text-sm ${type === 'staff' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}><Icon name="Lightbulb" size={16} className="inline-block" /> <strong>提示</strong>上传图片或PDF时，可直接<strong>拖拽文件</strong>到上传区域，或按 <kbd className={`px-1 py-0.5 rounded text-xs ${type === 'staff' ? 'bg-primary-200' : 'bg-amber-200'}`}>Ctrl+V</kbd> 粘贴</div>
        <div className="mb-4 flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-full ${ocrMode === 'baidu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{ocrMode === 'baidu' ? <><Icon name="Globe" size={14} className="inline-block" /> 百度OCR</> : <><Icon name="WifiOff" size={14} className="inline-block" /> 离线OCR</>}</span>{ocrLoading && <span className="text-xs text-primary-600">识别中..</span>}</div>
        {children}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200"><button type="button" onClick={onClose} className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" disabled={submitting}>取消</button><button type="submit" disabled={submitting} className={`px-6 py-2 text-white rounded-lg transition-colors ${type === 'staff' ? 'bg-primary-600 hover:bg-primary-700' : 'bg-amber-600 hover:bg-amber-700'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{submitting ? '提交中..' : (editingMember ? '保存' : '添加')}</button></div>
      </form>
    </motion.div>
  </div>
)

import React from 'react'
import { Icon } from '../../ui/Icon'

export function PreviewModal({ data, type, title, onClose }: { data: string; type: 'image' | 'pdf'; title: string; onClose: () => void }) {
  return (<div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100]"><div className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"><div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between"><h2 className="text-xl font-semibold text-slate-800">{title}</h2><button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100"><Icon name="X" size={16} /></button></div><div className="flex-1 overflow-auto p-4 bg-slate-100">{type === 'image' ? <img src={data} alt={title} className="max-w-full h-auto mx-auto rounded-lg shadow-lg" /> : <embed src={data} type="application/pdf" className="w-full h-[70vh] rounded-lg" />}</div></div></div>)
}

export function FilePreviewItem({ label, file, fileType, onPreview }: { label: string; file: string; fileType?: string; onPreview: () => void }) {
  if (!file) return null
  return (<div className="flex items-center gap-2"><span className="text-sm text-slate-600">{label}:</span><button onClick={onPreview} className="text-primary-600 hover:text-primary-700 text-sm underline">{fileType === 'pdf' ? '查看PDF' : '查看图片'}</button></div>)
}

export function InfoItem({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string | number | null; highlight?: boolean }) {
  if (!value) return null
  return (<div className="flex items-start"><span className="text-slate-400 mr-2">{icon}</span><div className="flex-1"><span className="text-sm text-slate-500">{label}: </span><span className={`text-sm ${highlight ? 'text-green-600 font-medium' : 'text-slate-800'}`}>{value}</span></div></div>)
}

export function Tag({ label, variant = 'success' }: { label: string; variant?: 'success' | 'warning' | 'info' | 'danger' }) {
  const v = { success: 'bg-green-100 text-green-700', warning: 'bg-orange-100 text-orange-700', info: 'bg-blue-100 text-blue-700', danger: 'bg-red-100 text-red-700' }
  return <span className={`px-2 py-1 rounded text-xs ${v[variant]}`}>{label}</span>
}

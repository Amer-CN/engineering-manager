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

export function IdCardImages({ idCardFront, idCardBack, fileUrls, onPreview }: {
  idCardFront?: string; idCardBack?: string; fileUrls: Record<string, string>
  onPreview: (data: string, type: 'image' | 'pdf', title: string) => void
}) {
  if (!idCardFront && !idCardBack) return null
  return (
    <div className="mt-4 pt-4 border-t border-slate-100">
      <p className="text-sm text-slate-600 mb-3">身份证图片</p>
      <div className="grid grid-cols-2 gap-4">
        {idCardFront && fileUrls.idCardFront && (
          <div className="text-center"><p className="text-xs text-slate-500 mb-2">人像面</p>
            <div className="border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-primary-400 transition-colors" onClick={() => onPreview(fileUrls.idCardFront!, 'image', '身份证人像面')}>
              <img src={fileUrls.idCardFront} alt="人像面" className="max-h-32 mx-auto rounded" /></div></div>)}
        {idCardBack && fileUrls.idCardBack && (
          <div className="text-center"><p className="text-xs text-slate-500 mb-2">国徽面</p>
            <div className="border border-slate-200 rounded-lg p-2 cursor-pointer hover:border-primary-400 transition-colors" onClick={() => onPreview(fileUrls.idCardBack!, 'image', '身份证国徽面')}>
              <img src={fileUrls.idCardBack} alt="国徽面" className="max-h-32 mx-auto rounded" /></div></div>)}
      </div>
    </div>
  )
}

export function ManagerSalaryCard({ member }: { member: any }) {
  if (member.baseSalary === undefined) return null
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center"><span className="mr-2">💵</span>薪酬信息</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-green-50 rounded-lg p-4"><p className="text-sm text-slate-500">基本工资</p><p className="text-xl font-bold text-green-600">{member.baseSalary?.toLocaleString() || '0'} 元/月</p></div>
        {member.socialSecurityPersonal !== undefined && <div className="bg-blue-50 rounded-lg p-4"><p className="text-sm text-slate-500">社保（个人）</p><p className="text-lg font-medium text-blue-600">{member.socialSecurityPersonal?.toLocaleString() || '0'} 元/月</p></div>}
        {member.socialSecurityCompany !== undefined && <div className="bg-purple-50 rounded-lg p-4"><p className="text-sm text-slate-500">社保（单位）</p><p className="text-lg font-medium text-purple-600">{member.socialSecurityCompany?.toLocaleString() || '0'} 元/月</p></div>}
        {member.housingFund !== undefined && <div className="bg-orange-50 rounded-lg p-4"><p className="text-sm text-slate-500">公积金</p><p className="text-lg font-medium text-orange-600">{member.housingFund?.toLocaleString() || '0'} 元/月</p></div>}
        {member.otherAllowances !== undefined && <div className="bg-slate-50 rounded-lg p-4"><p className="text-sm text-slate-500">其他补贴</p><p className="text-lg font-medium text-slate-600">{member.otherAllowances?.toLocaleString() || '0'} 元/月</p></div>}
      </div>
    </div>
  )
}

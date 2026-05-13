import React from 'react'
import { Settlement as SettlementData } from '../../../types/electron'
import { statusConfig, typeConfig, subTypeConfig } from './config'
import { Icon } from '../../ui/Icon'
import { formatMoney } from '@/utils/format'

interface SettlementListProps {
  settlements: SettlementData[]
  onEdit: (settlement: SettlementData) => void
  onDelete: (id: number) => void
  onProcess: (id: number) => void
  onUnarchive: (id: number) => void
  onPrint: (settlement: SettlementData) => void
  onPreviewFile: (settlement: SettlementData) => void
}

export const SettlementList: React.FC<SettlementListProps> = ({
  settlements,
  onEdit,
  onDelete,
  onProcess,
  onUnarchive,
  onPrint,
  onPreviewFile,
}) => {
  if (settlements.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <Icon name="ClipboardList" size={48} className="text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">暂无结算单</h3>
        <p className="text-slate-500">点击上方按钮创建您的第一份结算单</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">结算名称</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">类别</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">单位</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">结算日期</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">金额</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">状态</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {settlements.map(s => (
            <tr key={s.id} className="table-row-hover">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={s.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>
                    {typeConfig[s.type].icon}
                  </span>
                  <div>
                    <div className="font-medium text-slate-800 text-sm">{s.name}</div>
                    <div className="text-xs text-slate-400">{s.settlementNo}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-slate-600">{(s as any).subType ? subTypeConfig[(s as any).subType]?.label : '-'}</span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{s.partnerName || '-'}</td>
              <td className="px-4 py-3 text-sm text-slate-500">{(s as any).settlementDate || s.periodStart || '-'}</td>
              <td className="px-4 py-3 text-right font-semibold text-slate-800">¥{formatMoney(s.amount)}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[s.status]?.bgColor || 'bg-slate-100'} ${statusConfig[s.status]?.color || 'text-slate-600'}`}>
                  {statusConfig[s.status]?.label || s.status || '草稿'}
                </span>
                {(s as any).warnings && (s as any).warnings.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {(s as any).warnings.map((w: string, i: number) => (
                      <p key={i} className="text-xs text-red-500 max-w-[160px] leading-tight">{w}</p>
                    ))}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-0.5">
                  {((s as any).files?.length > 0 || s.fileUrl) && (
                    <button onClick={() => onPreviewFile(s)} className="p-1.5 text-violet-500 hover:bg-violet-50 rounded" title={`查看凭证 (${(s as any).files?.length || 1}个文件)`}>
                      <Icon name="Eye" size={14} />
                    </button>
                  )}
                  <button onClick={() => onPrint(s)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="打印">
                    <Icon name="Printer" size={14} />
                  </button>
                  {s.status !== 'archived' && (
                    <button onClick={() => onProcess(s.id)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded" title="办理">
                      <Icon name="Check" size={14} />
                    </button>
                  )}
                  {s.status === 'archived' && (
                    <button onClick={() => onUnarchive(s.id)} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded" title="取消归档">
                      <Icon name="Undo" size={14} />
                    </button>
                  )}
                  <button onClick={() => onEdit(s)} className="p-1.5 text-primary-500 hover:bg-primary-50 rounded" title="编辑">
                    <Icon name="Edit3" size={14} />
                  </button>
                  <button onClick={() => onDelete(s.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default SettlementList

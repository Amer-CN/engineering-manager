/**
 * InvoiceFilters.tsx - 发票/收款筛选器组件（通用）
 */

import React from 'react'
import { InvoiceType, InvoiceStatus, Project, Partner } from '@/types/electron'
import { Icon } from '../../ui/Icon'

interface InvoiceFiltersProps {
  filterType: InvoiceType | ''
  filterStatus: InvoiceStatus | ''
  filterProject: number | ''
  filterPaymentType: InvoiceType | ''
  filterPaymentProject: number | ''
  filterDateStart: string
  filterDateEnd: string
  projects: Project[]
  partners: Partner[]
  onFilterTypeChange: (value: InvoiceType | '') => void
  onFilterStatusChange: (value: InvoiceStatus | '') => void
  onFilterProjectChange: (value: number | '') => void
  onFilterPaymentTypeChange: (value: InvoiceType | '') => void
  onFilterPaymentProjectChange: (value: number | '') => void
  onFilterDateStartChange: (value: string) => void
  onFilterDateEndChange: (value: string) => void
  onPrint: () => void
  onExportExcel: () => void
  isPaymentFilter?: boolean
}

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  filterType,
  filterStatus,
  filterProject,
  filterPaymentType,
  filterPaymentProject,
  filterDateStart,
  filterDateEnd,
  projects,
  partners,
  onFilterTypeChange,
  onFilterStatusChange,
  onFilterProjectChange,
  onFilterPaymentTypeChange,
  onFilterPaymentProjectChange,
  onFilterDateStartChange,
  onFilterDateEndChange,
  onPrint,
  onExportExcel,
  isPaymentFilter = false
}) => {
  // 重置所有筛选
  const handleReset = () => {
    onFilterTypeChange('')
    onFilterStatusChange('')
    onFilterProjectChange('')
    onFilterPaymentTypeChange('')
    onFilterPaymentProjectChange('')
    onFilterDateStartChange('')
    onFilterDateEndChange('')
  }

  // 发票模式：是否有激活的筛选
  const hasActiveFilter = filterType || filterStatus || filterProject || filterDateStart || filterDateEnd
  // 收款模式：是否有激活的筛选
  const hasPaymentFilter = filterPaymentType || filterPaymentProject || filterDateStart || filterDateEnd
  const hasFilter = isPaymentFilter ? hasPaymentFilter : hasActiveFilter

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-3 mb-2">
      <div className="flex items-center flex-wrap gap-x-6 gap-y-3">
        {/* 根据模式显示不同的筛选条件 */}
        {isPaymentFilter ? (
          /* 收款模式筛选 */
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">类型:</label>
              <select
                value={filterPaymentType}
                onChange={e => onFilterPaymentTypeChange(e.target.value as InvoiceType | '')}
                className="select text-sm py-1.5"
              >
                <option value="">全部</option>
                <option value="invoice_out">回款</option>
                <option value="invoice_in">付款</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">项目:</label>
              <select
                value={filterPaymentProject}
                onChange={e => onFilterPaymentProjectChange(e.target.value ? Number(e.target.value) : '')}
                className="select text-sm py-1.5"
              >
                <option value="">全部项目</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </>
        ) : (
          <>
            {/* 发票类型 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">发票类型:</label>
              <select
                value={filterType}
                onChange={e => onFilterTypeChange(e.target.value as InvoiceType | '')}
                className="select text-sm py-1.5"
              >
                <option value="">全部</option>
                <option value="invoice_in">收票</option>
                <option value="invoice_out">开票</option>
              </select>
            </div>

            {/* 状态 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">状态:</label>
              <select
                value={filterStatus}
                onChange={e => onFilterStatusChange(e.target.value as InvoiceStatus | '')}
                className="select text-sm py-1.5"
              >
                <option value="">全部</option>
                <option value="issued">{filterType === 'invoice_in' ? '已收票' : '已开具'}</option>
                <option value="partially_paid">{filterType === 'invoice_in' ? '部分付款' : '部分收款'}</option>
                <option value="received">{filterType === 'invoice_in' ? '已付清' : '已收齐'}</option>
                <option value="cancelled">已作废</option>
                <option value="red_flushed">已红冲</option>
              </select>
            </div>

            {/* 项目 */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">项目:</label>
              <select
                value={filterProject}
                onChange={e => onFilterProjectChange(e.target.value ? Number(e.target.value) : '')}
                className="select text-sm py-1.5"
              >
                <option value="">全部项目</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
        
        {/* 日期区间 - 两种模式都显示 */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600 whitespace-nowrap">日期:</label>
          <input
            type="date"
            value={filterDateStart}
            onChange={e => onFilterDateStartChange(e.target.value)}
            className="input text-sm py-1.5 w-32"
            placeholder="开始日期"
          />
          <span className="text-slate-400">至</span>
          <input
            type="date"
            value={filterDateEnd}
            onChange={e => onFilterDateEndChange(e.target.value)}
            className="input text-sm py-1.5 w-32"
            placeholder="结束日期"
          />
        </div>
        
        {/* 重置按钮 */}
        {hasFilter && (
          <button
            onClick={handleReset}
            className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-200 hover:bg-slate-100 px-2 py-1 rounded transition-colors"
          >
            重置筛选
          </button>
        )}

        {/* 分隔线 */}
        <div className="flex-1"></div>

        {/* 操作按钮组 - 两种模式都显示 */}
        <div className="flex items-center gap-2">
          {/* 打印按钮 */}
          <button
            onClick={onPrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
            title="打印列表（可另存为PDF）"
          >
            <Icon name="Printer" size={14} />
            打印
          </button>

          {/* 导出Excel按钮 */}
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-lg transition-colors"
            title="导出为Excel表格"
          >
            <Icon name="Download" size={14} />
            导出Excel
          </button>
        </div>
      </div>
    </div>
  )
}

export default InvoiceFilters

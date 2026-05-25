/**
 * WageDetailTab — 工资明细（合并项目工资表 + 工资发放记录）
 * 作用域切换：当前项目 / 全部项目，一次表格完成计算→发放全流程
 */

import { useState, useEffect, useMemo } from 'react'
import type { Project, WorkerTeam, WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import { DropdownMenu } from '../../ui/DropdownMenu/DropdownMenu'
import { FileImportDialog } from './FileImportDialog'
import { MONTHS } from '@/constants'
import { exportWageDetailToExcel, printWageDetail } from '@/utils/wage-export'
import { WageDetailTable } from './WageDetailTable'

type DetailScope = 'project' | 'all'

interface WageDetailTabProps {
  selectedProject: Project | null
  workerTeams: WorkerTeam[]
  // 数据源
  allWageRecords: WageRecord[]    // 全量
  // 支付编辑
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string) => void
  onSavePayments: () => void
  // 选中
  selectedIds: Set<number>
  toggleSelect: (id: number) => void
  toggleAll: (visibleIds?: number[]) => void
  // 操作
  onGenerateWages: () => void
  onBatchDelete: () => void
  onBatchArchive: () => void
  // 银行回单
  onBankReceiptUpload: (pdfPath: string) => void
  receiptParsing: boolean
  receiptResult: { matched: number; failed: number; skippedArchived?: number; totalItems: number; date: string; receiptPath: string; totalAmount?: number; successAmount?: number; rawTextSnippet?: string } | null
  // 通用
  loading: boolean
  onChangeMonth: (month: string) => void
  onBack: () => void
}

export default function WageDetailTab({
  selectedProject,
  workerTeams,
  allWageRecords,
  paymentEdits, onPaymentChange, onSavePayments,
  selectedIds, toggleSelect, toggleAll,
  onGenerateWages, onBatchDelete, onBatchArchive,
  onBankReceiptUpload, receiptParsing, receiptResult,
  loading, onChangeMonth, onBack,
}: WageDetailTabProps) {
  const [scope, setScope] = useState<DetailScope>('project')
  const [showFileDialog, setShowFileDialog] = useState(false)
  const [showRawText, setShowRawText] = useState(false)

  // 统一的年月筛选（两个模式共用）
  const [filterYear, setFilterYear] = useState<string>('全部')
  const [filterMonth, setFilterMonth] = useState<string>('全部')
  const [filterMemberName, setFilterMemberName] = useState('')
  const [filterTeamName, setFilterTeamName] = useState<string>('全部')

  // 可选年份列表（取有数据的年份 + 前后各 3 年兜底）
  const yearOptions = useMemo(() => {
    const s = new Set<string>()
    for (const w of allWageRecords) s.add(w.yearMonth.slice(0, 4))
    // 如果没有数据，兜底显示近 5 年
    if (s.size === 0) {
      const y = new Date().getFullYear()
      for (let i = y - 4; i <= y; i++) s.add(String(i))
    }
    return Array.from(s).sort()
  }, [allWageRecords])

  // 数据源：两个模式都用 allWageRecords，项目模式加项目过滤
  // 班组列表：取所有班组（全部项目模式）或指定项目下所有班组
  const teamOptions = useMemo(() => {
    if (scope === 'project' && selectedProject) {
      return workerTeams.filter(t => t.projectId === selectedProject.id).map(t => t.name).sort()
    }
    // 全部项目模式：所有项目的班组
    return Array.from(new Set(workerTeams.map(t => t.name))).sort()
  }, [scope, selectedProject, workerTeams])

  const scopeData = allWageRecords.filter(w => {
    if (scope === 'project' && w.projectId !== selectedProject?.id) return false
    if (filterMemberName && !(w.memberName || '').includes(filterMemberName)) return false
    if (filterYear && filterYear !== '全部' && w.yearMonth.slice(0, 4) !== filterYear) return false
    if (filterMonth && filterMonth !== '全部' && w.yearMonth.slice(5, 7) !== filterMonth) return false
    if (filterTeamName !== '全部' && w.teamName !== filterTeamName) return false
    return true
  })

  // 项目模式下，选定具体月份时同步到父级（用于工资生成/考勤切换）
  useEffect(() => {
    if (scope === 'project' && filterYear !== '全部' && filterMonth !== '全部') {
      onChangeMonth(`${filterYear}-${filterMonth}`)
    }
  }, [scope, filterYear, filterMonth])

  const changedCount = paymentEdits.size

  const summaryTotals = useMemo(() => {
    const actual = scopeData.reduce((s, w) => s + (w.actualWage || 0), 0)
    const paid = scopeData.reduce((s, w) => {
      const edit = paymentEdits.get(w.id)
      const paidAmount = edit !== undefined ? edit.paidAmount : (w.paidAmount != null ? String(w.paidAmount) : '0')
      return s + (Number(paidAmount) || 0)
    }, 0)
    return { totalActual: actual, totalPaid: paid, totalDiff: actual - paid }
  }, [scopeData, paymentEdits])

// @ts-ignore TS6133: allSelected is declared but never read
  const allSelected = scopeData.length > 0 && selectedIds.size === scopeData.length

  // ── 文件上传（回单） ──
  const handleReceiptFile = (file: File) => {
    onBankReceiptUpload((file as any).path || file.name)
  }

  // ── 返回 + 标题 ──
// @ts-ignore TS6133: header is declared but never read
  const header = (
    <div className="flex items-center gap-4 mb-4">
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
        <Icon name="ChevronLeft" size={18} />
      </button>
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          {scope === 'project' ? selectedProject?.name : '全部项目'}
        </h1>
      </div>
    </div>
  )

  // ── 作用域切换 + 操作栏 ──
  const toolbar = (
    <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* 作用域切换 */}
        <div className="flex bg-slate-100 rounded-lg p-0.5">
          <button onClick={() => setScope('project')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${scope === 'project' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
            当前项目
          </button>
          <button onClick={() => setScope('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${scope === 'all' ? 'bg-white shadow-sm text-amber-700' : 'text-slate-500 hover:text-slate-700'}`}>
            全部项目
          </button>
        </div>

        {/* 统一筛选：年份 + 月份 + 姓名 */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">年份</label>
          <select value={filterYear}
            onChange={e => { setFilterYear(e.target.value); setFilterMonth('全部') }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部</option>
            {yearOptions.length > 0 ? yearOptions.map(y => <option key={y} value={y}>{y}年</option>)
              : Array.from({ length: 21 }, (_, i) => {
                const y = (new Date().getFullYear() - 10 + i).toString()
                return <option key={y} value={y}>{y}年</option>
              })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">月份</label>
          <select value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m === '全部' ? '全部' : `${m}月`}</option>)}
          </select>
        </div>
        <input type="text" placeholder="搜索姓名..." value={filterMemberName}
          onChange={e => setFilterMemberName(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-primary-500" />
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-600">班组</label>
          <select value={filterTeamName} onChange={e => setFilterTeamName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
            <option value="全部">全部班组</option>
            {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* 记录数 */}
        <span className="text-sm text-slate-500">
          {scopeData.length} 条记录
          {scope === 'project' && scopeData.length === 0 && (
            <span className="text-amber-600 ml-2">（提示：点击"生成工资表"）</span>
          )}
        </span>
      </div>

      {/* 右侧操作按钮组 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 项目模式：生成工资表 */}
        {scope === 'project' && (
          <button onClick={onGenerateWages}
            disabled={loading || filterYear === '全部' || filterMonth === '全部'}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            生成工资表
          </button>
        )}

        {/* 导入回单 */}
        {scope === 'project' && (
          <button onClick={() => setShowFileDialog(true)}
            disabled={receiptParsing || filterYear === '全部' || filterMonth === '全部'}
            className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {receiptParsing ? '解析中…' : '导入回单'}
          </button>
        )}

        {/* 归档（仅项目模式下可用） */}
        {scope === 'project' && (
          <button onClick={onBatchArchive}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            归档{selectedIds.size > 0 ? `选中 (${selectedIds.size})` : '全部'}
          </button>
        )}

        {/* 保存发放 */}
        {changedCount > 0 && (
          <button onClick={onSavePayments} disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            保存发放 ({changedCount})
          </button>
        )}

        {/* 删除选中 */}
        {selectedIds.size > 0 && (
          <button onClick={onBatchDelete}
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
            删除选中 ({selectedIds.size})
          </button>
        )}

        {/* 更多：导出/打印 */}
        <DropdownMenu
          trigger={<button className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">更多 ▾</button>}
          items={[
            { key: 'export', label: '导出Excel', onClick: () => exportWageDetailToExcel(scopeData) },
            { key: 'print', label: '打印', onClick: () => printWageDetail(scopeData, scope === 'project' ? selectedProject?.name || '' : '全部项目') },
          ]}
          align="end"
        />
      </div>
    </div>
  )

  // ── 银行回单解析结果提示 ──
  const receiptBanner = receiptResult && (
    <div className={`mb-4 p-3 rounded-lg text-sm ${receiptResult.failed > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium">{receiptResult.date} 回单解析完成</span>
          <span className="text-green-600">✓ 匹配 {receiptResult.matched} 人</span>
          {receiptResult?.skippedArchived != null && receiptResult?.skippedArchived > 0 && <span className="text-slate-500">⏭ {receiptResult?.skippedArchived} 人已归档</span>}
          {receiptResult.failed > 0 && <span className="text-amber-600">✗ 未匹配 {receiptResult.failed} 人</span>}
          <span className="text-slate-500">共 {receiptResult.totalItems} 笔</span>
          {receiptResult.totalAmount && <span className="font-mono text-slate-600">总额 ¥{receiptResult.totalAmount.toFixed(2)}</span>}
        </div>
        <div className="flex gap-2">
          {receiptResult.rawTextSnippet && (
            <button onClick={() => setShowRawText(!showRawText)}
              className="text-xs text-slate-400 hover:text-slate-600 underline">查看原文</button>
          )}
          <button onClick={() => onSavePayments()}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium">保存发放</button>
        </div>
      </div>
      {showRawText && receiptResult.rawTextSnippet && (
        <pre className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-500 max-h-32 overflow-y-auto">{receiptResult.rawTextSnippet}</pre>
      )}
    </div>
  )

  // ── 空状态 ──
  const emptyState = (
    <div className="text-center py-12 text-slate-400">
      <Icon name="FileText" size={48} className="mx-auto mb-4" />
      <p>暂无工资记录</p>
      {scope === 'project' && (
        <p className="text-sm mt-1">点击"生成工资表"根据考勤数据自动计算</p>
      )}
    </div>
  )

  return (
    <div className="p-4 flex flex-col max-h-[calc(100vh-380px)]">
      {/* 工具栏固定 */}
      <div className="shrink-0">{toolbar}</div>
      {receiptBanner && <div className="shrink-0">{receiptBanner}</div>}
      {/* 表格独立滚动 */}
      <div className="flex-1 overflow-auto min-h-0 mt-3">
        {scopeData.length > 0 ? (
          <WageDetailTable
            scopeData={scopeData}
            selectedIds={selectedIds}
            scope={scope}
            paymentEdits={paymentEdits}
            onToggleSelect={toggleSelect}
            onToggleAll={(ids) => toggleAll(ids)}
            onPaymentChange={onPaymentChange}
          />
        ) : emptyState}
      </div>
      {/* 底部汇总条 */}
      {scopeData.length > 0 && (
        <div className="shrink-0 flex items-center justify-end gap-6 px-4 py-2.5 bg-white border-t border-slate-200 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">应发</span>
            <span className="font-semibold text-slate-800">¥{summaryTotals.totalActual.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">实发</span>
            <span className="font-semibold text-green-700">¥{summaryTotals.totalPaid.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">差额</span>
            <span className={`font-semibold ${summaryTotals.totalDiff >= 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {summaryTotals.totalDiff >= 0 ? '未发' : '多发'}¥{Math.abs(summaryTotals.totalDiff).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* 导入回单弹窗 */}
      <FileImportDialog
        show={showFileDialog}
        title="导入银行回单"
        description="选择 PDF 格式的银行回单文件"
        accept=".pdf"
        acceptText="PDF 回单 (.pdf)"
        onFile={handleReceiptFile}
        onClose={() => setShowFileDialog(false)}
        parsing={receiptParsing}
      />
    </div>
  )
}

// 导出 & 打印逻辑 → src/utils/wage-export.ts

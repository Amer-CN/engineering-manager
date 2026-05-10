import { useState, useEffect } from 'react'
import { formatMoney } from '@/utils/format'
import type { Project, CostLedgerSummary } from '@/types'

interface CostLedgerDashboardProps {
  projects: Project[]
  summaries: Record<number, CostLedgerSummary>
  loading: boolean
  onSelectProject: (projectId: number) => void
  onManageCategories?: () => void
}

export function CostLedgerDashboard({ projects, summaries, loading, onSelectProject, onManageCategories }: CostLedgerDashboardProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-slate-100" />)}
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <p className="text-lg">暂无项目</p>
        <p className="mt-1 text-sm">请先在项目管理中创建项目</p>
      </div>
    )
  }

  const totals = projects.reduce((acc, p) => {
    const s = summaries[p.id]
    if (s) { acc.expense += s.totalExpense; acc.income += s.totalIncome }
    return acc
  }, { expense: 0, income: 0 })

  return (
    <div>
      {/* KPI 概览 */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
          <div className="text-xs text-slate-500">经营支出</div>
          <div className="mt-1 font-mono text-xl font-bold text-red-600">{formatMoney(totals.expense)}</div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="text-xs text-slate-500">资金收入</div>
          <div className="mt-1 font-mono text-xl font-bold text-emerald-600">{formatMoney(totals.income)}</div>
        </div>
        <div className={`rounded-xl border p-4 ${totals.income - totals.expense >= 0 ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
          <div className="text-xs text-slate-500">净{ totals.income - totals.expense >= 0 ? '流入' : '流出'}</div>
          <div className={`mt-1 font-mono text-xl font-bold ${totals.income - totals.expense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatMoney(totals.income - totals.expense)}
          </div>
        </div>
      </div>

      {/* 操作栏 */}
      {onManageCategories && (
        <div className="mb-4">
          <button onClick={onManageCategories}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
            管理分类
          </button>
        </div>
      )}

      {/* 项目卡片网格 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map(project => {
          const s = summaries[project.id]
          return (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <h3 className="font-semibold text-slate-800 truncate">{project.name}</h3>
              {s ? (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">经营支出</span>
                    <span className="font-mono font-medium text-red-600">{formatMoney(s.totalExpense)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">资金收入</span>
                    <span className="font-mono font-medium text-emerald-600">{formatMoney(s.totalIncome)}</span>
                  </div>
                  <div className="border-t border-slate-100 pt-1.5 flex justify-between text-xs">
                    <span className="text-slate-500">净{s.totalIncome - s.totalExpense >= 0 ? '流入' : '流出'}</span>
                    <span className={`font-mono font-semibold ${s.totalIncome - s.totalExpense >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {formatMoney(s.totalIncome - s.totalExpense)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-slate-400">暂无台账数据</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

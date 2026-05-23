/**
 * Contracts.tsx - 合同管理页面（对标 Projects.tsx 模式）
 * 首页 = 合同看板（dashboard），子页面 = 收入合同 / 支出合同
 */

import React, { useState, Suspense } from 'react'

type ContractView = 'dashboard' | 'income' | 'expense' | 'agreement'
type GroupBy = 'project' | 'role' | 'status'

interface ContractsProps {
  refresh?: () => void
}

// 二级懒加载：进入子页面时才加载对应 chunk
const ContractDashboard = React.lazy(() => import('./ContractDashboard'))
const ContractPage = React.lazy(() => import('./ContractPage'))

const Contracts: React.FC<ContractsProps> = ({ refresh }) => {
  const [view, setView] = useState<ContractView>('dashboard')
  const [incomeGroupBy, setIncomeGroupBy] = useState<GroupBy>('project')
  const [expenseGroupBy, setExpenseGroupBy] = useState<GroupBy>('project')
  const [agreementGroupBy, setAgreementGroupBy] = useState<GroupBy>('project')
  const [autoCreate, setAutoCreate] = useState(false)

  const handleNavigate = (target: ContractView, opts?: { createNew?: boolean }) => {
    setView(target)
    setAutoCreate(!!opts?.createNew)
  }

  const handleBack = () => {
    setView('dashboard')
    setAutoCreate(false)
  }

  // 加载占位符
  const fallback = (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse h-32 mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse h-28" />
        ))}
      </div>
    </div>
  )

  if (view === 'dashboard') {
    return (
      <Suspense fallback={fallback}>
        <ContractDashboard refresh={refresh} onNavigate={handleNavigate} />
      </Suspense>
    )
  }

  // Income / Expense / Agreement sub-page
  const type = view as 'income' | 'expense' | 'agreement'
  const groupBy = type === 'income' ? incomeGroupBy : type === 'expense' ? expenseGroupBy : agreementGroupBy
  const setGroupBy = type === 'income' ? setIncomeGroupBy : type === 'expense' ? setExpenseGroupBy : setAgreementGroupBy

  return (
    <Suspense fallback={<div className="p-6 text-slate-400">加载中...</div>}>
      <ContractPage
        refresh={refresh}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        type={type}
        onBack={handleBack}
        autoCreate={autoCreate}
        onAutoCreateHandled={() => setAutoCreate(false)}
      />
    </Suspense>
  )
}

export default Contracts

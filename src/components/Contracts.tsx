/**
 * Contracts.tsx - 合同管理页面（对标 Projects.tsx 模式）
 * 首页 = 合同看板（dashboard），子页面 = 收入合同 / 支出合同
 */

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ContractDashboard from './ContractDashboard'
import ContractPage from './ContractPage'

type ContractView = 'dashboard' | 'income' | 'expense' | 'agreement'
type GroupBy = 'project' | 'role' | 'status'

interface ContractsProps {
  refresh?: () => void
}

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

  if (view === 'dashboard') {
    return <ContractDashboard refresh={refresh} onNavigate={handleNavigate} />
  }

  // Income / Expense / Agreement sub-page
  const type = view as 'income' | 'expense' | 'agreement'
  const groupBy = type === 'income' ? incomeGroupBy : type === 'expense' ? expenseGroupBy : agreementGroupBy
  const setGroupBy = type === 'income' ? setIncomeGroupBy : type === 'expense' ? setExpenseGroupBy : setAgreementGroupBy

  return (
    <ContractPage
      refresh={refresh}
      groupBy={groupBy}
      onGroupByChange={setGroupBy}
      type={type}
      onBack={handleBack}
      autoCreate={autoCreate}
      onAutoCreateHandled={() => setAutoCreate(false)}
    />
  )
}

export default Contracts

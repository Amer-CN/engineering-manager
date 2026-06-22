import { useCallback } from 'react'
import { getAPI } from '../services/api-adapter'
import type { Invoice, PaymentRecord, Project, Partner, IncomeContract, ExpenseContract } from '../types/electron'

export interface UseInvoicePageLoadersDeps {
  setInvoices: (d: Invoice[]) => void
  setPaymentRecords: (d: PaymentRecord[]) => void
  setProjects: (d: Project[]) => void
  setPartners: (d: Partner[]) => void
  setContracts: (updater: (prev: { income: IncomeContract[]; expense: ExpenseContract[] }) => { income: IncomeContract[]; expense: ExpenseContract[] }) => void
  setLoading: (b: boolean) => void
}

export function useInvoicePageLoaders(deps: UseInvoicePageLoadersDeps) {
  const { setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading } = deps

  const loadData = useCallback(async () => {
    const safeLoad = async <T>(loader: () => Promise<{ success: boolean; data?: T }>, setter: (data: T) => void) => {
      try {
        const res = await loader()
        if (res.success && res.data) setter(res.data)
      } catch (err) {
        console.error('加载数据失败:', err)
      }
    }

    await Promise.all([
      safeLoad(async () => (await getAPI()).getInvoices(), setInvoices),
      safeLoad(async () => (await getAPI()).getPaymentRecords(), setPaymentRecords),
      safeLoad(async () => (await getAPI()).getProjects(), setProjects),
      safeLoad(async () => (await getAPI()).getPartners(), setPartners),
      safeLoad(async () => (await getAPI()).getIncomeContracts(), (d: IncomeContract[]) => setContracts(prev => ({ ...prev, income: d || [] }))),
      safeLoad(async () => (await getAPI()).getExpenseContracts(), (d: ExpenseContract[]) => setContracts(prev => ({ ...prev, expense: d || [] }))),
    ])
    setLoading(false)
  }, [setInvoices, setPaymentRecords, setProjects, setPartners, setContracts, setLoading])

  return { loadData }
}
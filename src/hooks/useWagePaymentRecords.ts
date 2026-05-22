/**
 * 工资发放记录 + 欠薪预警 — 数据管理 Hook
 */
import { useState, useEffect, useCallback } from 'react'
import type { OverdueStats, OverdueRecord } from '@/types'

export function useWagePaymentRecords() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<any[]>([])
  const [overdueStats, setOverdueStats] = useState<OverdueStats | null>(null)
  const [overdueList, setOverdueList] = useState<OverdueRecord[]>([])
  const [filters, setFilters] = useState<Record<string, any>>({})

  // 加载工资发放记录
  const loadPaymentRecords = useCallback(async (newFilters?: Record<string, any>) => {
    const f = newFilters || filters
    setLoading(true)
    try {
      const result = await window.electronAPI.getWagePaymentRecords(f)
      if (result.success && result.data) {
        setRecords(result.data)
      }
    } catch (error) {
      console.error('加载工资发放记录失败:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  // 加载欠薪统计
  const loadOverdueStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.getWageOverdueStats()
      if (result.success && result.data) {
        setOverdueStats(result.data)
      }
    } catch (error) {
      console.error('加载欠薪统计失败:', error)
    }
  }, [])

  // 加载欠薪列表
  const loadOverdueList = useCallback(async () => {
    setLoading(true)
    try {
      const result = await window.electronAPI.getWageOverdueList()
      if (result.success && result.data) {
        setOverdueList(result.data)
      }
    } catch (error) {
      console.error('加载欠薪列表失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 筛选变更
  const applyFilters = useCallback((newFilters: Record<string, any>) => {
    setFilters(newFilters)
    loadPaymentRecords(newFilters)
  }, [loadPaymentRecords])

  // 导出 Excel
  const exportToExcel = useCallback(async () => {
    try {
      // 动态导入 xlsx
      const XLSX = await import('xlsx')

      const exportData = records.map(r => ({
        '项目名': r.projectName || '',
        '月份': r.yearMonth || '',
        '工人姓名': r.workerName || '',
        '应发金额': r.actualWage || 0,
        '实发金额': r.paidAmount || 0,
        '发放状态': r.paymentStatus || '',
        '发放日期': r.paidDate || '',
        '逾期天数': r.overdueDays || 0,
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, '工资发放记录')
      
      const fileName = `工资发放记录_${new Date().toISOString().slice(0, 10)}.xlsx`
      XLSX.writeFile(wb, fileName)
    } catch (error) {
      console.error('导出 Excel 失败:', error)
    }
  }, [records])

  // 初始加载
  useEffect(() => {
    loadPaymentRecords()
    loadOverdueStats()
  }, [loadPaymentRecords, loadOverdueStats])

  return {
    loading,
    records,
    overdueStats,
    overdueList,
    filters,
    applyFilters,
    loadPaymentRecords,
    loadOverdueStats,
    loadOverdueList,
    exportToExcel,
  }
}

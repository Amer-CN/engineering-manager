import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { formatMoney } from '@/utils/format'
import { getCategoryLabel } from './config'
import type { CostLedgerBatch, CostLedgerSummary, CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface Props {
  show: boolean
  projectId: number
  batches: CostLedgerBatch[]
  categories?: CostLedgerCategory[] | null
  onClose: () => void
}

export function CostLedgerCompareModal({ show, projectId, batches, categories, onClose }: Props) {
  const [aId, setAId] = useState(batches[0]?.id ?? 0)
  const [bId, setBId] = useState(batches.length > 1 ? batches[1].id : 0)
  const [summaryA, setSummaryA] = useState<CostLedgerSummary | null>(null)
  const [summaryB, setSummaryB] = useState<CostLedgerSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [compared, setCompared] = useState(false)

  const loadCompare = async () => {
    const api = await getAPI()
    if (!api) return
    setLoading(true)
    const [ra, rb] = await Promise.allSettled([
      api.getCostLedgerSummary(projectId, aId),
      api.getCostLedgerSummary(projectId, bId),
    ])
    const getSummary = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data ?? null : null
    setSummaryA(getSummary(ra))
    setSummaryB(getSummary(rb))
    setCompared(true)
    setLoading(false)
  }

  useEffect(() => {
    setCompared(false)
    setSummaryA(null)
    setSummaryB(null)
  }, [aId, bId])

  const allCategories = new Set([
    ...Object.keys(summaryA?.byCategory || {}),
    ...Object.keys(summaryB?.byCategory || {}),
  ])

  return (
    <Modal isOpen={show} onClose={onClose} title="版本对比" size="xl">
      {/* Selector */}
      <div className="flex items-center gap-4 pb-4 border-b border-slate-100 -mx-6 px-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">版本 A</span>
          <select value={aId} onChange={e => setAId(parseInt(e.target.value))}
            className="select text-sm">
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <span className="text-slate-300 text-lg">vs</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">版本 B</span>
          <select value={bId} onChange={e => setBId(parseInt(e.target.value))}
            className="select text-sm">
            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <button onClick={loadCompare} disabled={aId === bId}
          className="btn btn-primary text-sm ml-4 disabled:opacity-40">
          {loading ? '加载中...' : '查看对比'}
        </button>
      </div>

      {/* Compare table */}
      {compared && (
        <div className="pt-4">
          {summaryA && summaryB ? (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="">
                  <th className="px-3 py-2 text-left text-slate-500"></th>
                  <th className="px-3 py-2 text-right text-slate-500">{batches.find(b => b.id === aId)?.name}</th>
                  <th className="px-3 py-2 text-right text-slate-500">{batches.find(b => b.id === bId)?.name}</th>
                  <th className="px-3 py-2 text-right text-slate-500">差额</th>
                </tr>
              </thead>
              <tbody>
                {/* Summary */}
                {[
                  ['总支出', summaryA.totalExpense, summaryB.totalExpense],
                  ['总收入', summaryA.totalIncome, summaryB.totalIncome],
                  ['结余', summaryA.totalIncome - summaryA.totalExpense, summaryB.totalIncome - summaryB.totalExpense],
                ].map(([label, va, vb]) => (
                  <tr key={String(label)} className="border-t border-slate-100 font-medium">
                    <td className="px-3 py-2 text-slate-700">{String(label)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(va as number)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMoney(vb as number)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${(vb as number) - (va as number) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {(vb as number) - (va as number) >= 0 ? '+' : ''}{formatMoney((vb as number) - (va as number))}
                    </td>
                  </tr>
                ))}
                {/* Category breakdown */}
                <tr><td colSpan={4} className="px-3 py-2 text-xs text-slate-400 font-medium pt-4">按分类对比</td></tr>
                {[...allCategories].sort().map(code => {
                  const va = summaryA.byCategory[code] || 0
                  const vb = summaryB.byCategory[code] || 0
                  if (va === 0 && vb === 0) return null
                  return (
                    <tr key={code} className="border-t border-slate-50">
                      <td className="px-3 py-1.5 text-slate-600">{getCategoryLabel(code, categories)}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-500 text-xs">{va > 0 ? formatMoney(va) : '-'}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-slate-500 text-xs">{vb > 0 ? formatMoney(vb) : '-'}</td>
                      <td className={`px-3 py-1.5 text-right font-mono text-xs ${vb - va > 0 ? 'text-red-600' : vb - va < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {vb - va !== 0 ? `${vb - va >= 0 ? '+' : ''}${formatMoney(vb - va)}` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-slate-400 py-8">无法加载汇总数据</p>
          )}
        </div>
      )}
    </Modal>
  )
}

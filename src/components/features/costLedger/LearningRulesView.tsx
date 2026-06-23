import type { CostLedgerMatchRule, CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'

interface Props {
  rules: CostLedgerMatchRule[]
  categories: CostLedgerCategory[]
  confirm: (opts: { title: string; content: string; confirmVariant?: 'primary' | 'danger' }) => Promise<boolean>
  setRules: (rules: CostLedgerMatchRule[]) => void
}

export function LearningRulesView({ rules, categories, confirm, setRules }: Props) {
  const handleDelete = async (i: number) => {
    const api = await getAPI()
    const remaining = rules.filter((_, j) => j !== i)
    const res = await api.saveCostLedgerMatchRules(remaining)
    if (res?.success) setRules(remaining)
  }

  const handleClearAll = async () => {
    const ok = await confirm({ title: '确认清空', content: '确定清空所有学习规则？', confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api.saveCostLedgerMatchRules([])
    if (res?.success) setRules([])
  }

  return (
    <div className="space-y-1">
      {rules.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">暂无学习规则</p>
      ) : (
        <div className="space-y-0.5">
          {rules.map((rule, i) => {
            const cat = categories.find(c => c.code === rule.category && c.direction === rule.direction)
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs hover:bg-slate-50">
                <span className="font-mono text-slate-800 min-w-[80px]">{rule.keyword}</span>
                <span className="text-slate-300">→</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${rule.direction === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {cat?.label || rule.category}
                </span>
                <span className="text-slate-300 ml-auto">命中 {rule.hitCount} 次</span>
                <Button onClick={() => handleDelete(i)}  variant="danger" size="sm" className="btn">✕</Button>
              </div>
            )
          })}
        </div>
      )}
      {rules.length > 0 && (
        <button onClick={handleClearAll}
          className="mt-3 w-full rounded-lg border border-dashed border-red-200 px-3 py-2 text-xs text-red-400 hover:border-red-400 hover:text-red-600 transition-colors"
        >清空所有学习规则</button>
      )}
    </div>
  )
}

import type { CostLedgerMatchRule, CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import { Button } from '../../ui/Button'

interface Props {
  rules: CostLedgerMatchRule[]
  categories: CostLedgerCategory[]
  confirm: (opts: { title: string; content: string; confirmVariant?: 'primary' | 'danger' }) => Promise<boolean>
  setRules: (rules: CostLedgerMatchRule[]) => void
}

export function LearningRulesView({ rules, categories, confirm, setRules }: Props) {
  const { can } = usePermission()
  const handleDelete = async (i: number) => {
    // G2 B9: 学习规则 → costLedger:update
    if (!can('costLedger:update')) return
    const api = await getAPI()
    const remaining = rules.filter((_, j) => j !== i)
    const res = await api.saveCostLedgerMatchRule(remaining)
    if (res?.success) setRules(remaining)
  }

  const handleClearAll = async () => {
    // G2 B9: 学习规则 → costLedger:update
    if (!can('costLedger:update')) return
    const ok = await confirm({ title: '确认清空', content: '确定清空所有学习规则？', confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api.saveCostLedgerMatchRule([])
    if (res?.success) setRules([])
  }

  return (
    <div className="space-y-1">
      {rules.length === 0 ? (
        <p className="py-8 text-center text-sm text-[color:var(--muted)]">暂无学习规则</p>
      ) : (
        <div className="space-y-0.5">
          {rules.map((rule, i) => {
            const cat = categories.find(c => c.code === rule.category && c.direction === rule.direction)
            return (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs hover:bg-[color:var(--panel-2)]">
                <span className="font-mono text-[color:var(--fg)] min-w-[80px]">{rule.keyword}</span>
                <span className="text-[color:var(--border-strong)]">→</span>
                <span className={`rounded px-1.5 py-0.5 font-medium ${rule.direction === 'expense' ? 'bg-danger-50 text-danger-600' : 'bg-success-50 text-success-600'}`}>
                  {cat?.label || rule.category}
                </span>
                <span className="text-[color:var(--border-strong)] ml-auto">命中 {rule.hitCount} 次</span>
                <Button onClick={() => handleDelete(i)}  variant="danger" size="sm">✕</Button>
              </div>
            )
          })}
        </div>
      )}
      {rules.length > 0 && (
        <button onClick={handleClearAll}
          className="mt-3 w-full rounded-lg border border-dashed border-danger-200 px-3 py-2 text-xs text-danger-400 hover:border-danger-400 hover:text-danger-600 transition-colors"
        >清空所有学习规则</button>
      )}
    </div>
  )
}

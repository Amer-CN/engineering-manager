/**
 * 个税试算 Drawer（Wave-T2：前端试算 + 确认落库）
 * 写操作类交互用 Drawer（弹窗语义铁律）；金额一律元（后端 WageTaxRequest 契约），
 * 换算只走后端 MoneyUnit，前端不做 ×100/÷100。
 *
 * 专项扣除 7 分项默认值 = GS02 现行值（元；后端 TaxCalculationService.DefaultExtraMonthly
 * 以分为单位，此处为其 ÷100 的展示值；端点以显式入参为准，此处仅为试算默认值）：
 *   子女教育 2000/月/孩、婴幼儿 2000/月/孩〈来源注国发〔2023〕13号〉、
 *   继续教育学历 400/月≤48 月或取证当年 3600、
 *   大病医疗不可月输（按汇算口径提示，固定传 0）、
 *   房贷 1000/月、租金 1500/1100/800 三档、赡养 3000/月或分摊≤1500。
 */
import { useEffect, useState } from 'react'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import { useToastStore } from '@/store/toastStore'

export interface TaxCalcPerson {
  id: number
  name: string
}

interface TaxCalcDrawerProps {
  open: boolean
  onClose: () => void
  /** staff → memberId；worker → projectWorkerId */
  mode: 'staff' | 'worker'
  people: TaxCalcPerson[]
  defaultYearMonth: string
}

interface TaxCity {
  cityCode: string
  cityName: string
  effectiveYear: string
  status: string
}

type BonusMode = 'auto' | 'separate' | 'combined'

// GS02 现行默认值（元）
const GS02_DEFAULTS = {
  childEdu: '2000',
  infant: '2000',
  contEdu: '400',
  mortgage: '1000',
  rent: '1500',
  elderly: '3000',
} as const

const BONUS_MODES: { value: BonusMode; label: string }[] = [
  { value: 'auto', label: '自动择优' },
  { value: 'separate', label: '单独计税' },
  { value: 'combined', label: '并入综合' },
]

function parseNum(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) ? n : undefined
}

export function TaxCalcDrawer({ open, onClose, mode, people, defaultYearMonth }: TaxCalcDrawerProps) {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)

  const [personId, setPersonId] = useState<string>(() => String(people[0]?.id ?? ''))
  const [yearMonth, setYearMonth] = useState(defaultYearMonth)
  const [cities, setCities] = useState<TaxCity[]>([])
  const [cityCode, setCityCode] = useState('chengdu')
  const [base, setBase] = useState('')
  const [gross, setGross] = useState('')
  const [childEdu, setChildEdu] = useState<string>(GS02_DEFAULTS.childEdu)
  const [infant, setInfant] = useState<string>(GS02_DEFAULTS.infant)
  const [contEdu, setContEdu] = useState<string>(GS02_DEFAULTS.contEdu)
  const [mortgage, setMortgage] = useState<string>(GS02_DEFAULTS.mortgage)
  const [rent, setRent] = useState<string>(GS02_DEFAULTS.rent)
  const [elderly, setElderly] = useState<string>(GS02_DEFAULTS.elderly)
  const [bonus, setBonus] = useState('')
  const [bonusMode, setBonusMode] = useState<BonusMode>('auto')

  const [calculating, setCalculating] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [calcError, setCalcError] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any | null>(null)

  // 打开时拉城市清单（城市下拉数据源自 tax-cities 接口）
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const api = await getAPI() as any
        if (typeof api.getTaxCities !== 'function') {
          if (!cancelled) showToast('当前环境不支持个税试算（需连接后端 API）', 'error')
          return
        }
        const r = await api.getTaxCities()
        if (cancelled) return
        if (r.success && Array.isArray(r.data)) {
          setCities(r.data)
          setCityCode(prev =>
            r.data.some((c: TaxCity) => c.cityCode === prev)
              ? prev
              : (r.data.some((c: TaxCity) => c.cityCode === 'chengdu') ? 'chengdu' : (r.data[0]?.cityCode ?? '')))
        } else if (!r.success) {
          showToast(r.error || '城市清单加载失败', 'error')
        }
      } catch (e) {
        if (!cancelled) showToast(`城市清单加载失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error')
      }
    })()
    return () => { cancelled = true }
  }, [open, showToast])

  const buildPayload = () => {
    const pid = Number(personId)
    const person = mode === 'staff' ? { memberId: pid } : { projectWorkerId: pid }
    return {
      ...person,
      yearMonth,
      cityCode,
      contributionBase: parseNum(base),
      grossMonthly: parseNum(gross),
      childEdu: parseNum(childEdu) ?? 0,
      contEdu: parseNum(contEdu) ?? 0,
      medical: 0, // 大病医疗不可月输，按汇算口径据实，试算固定 0
      mortgage: parseNum(mortgage) ?? 0,
      rent: parseNum(rent) ?? 0,
      elderly: parseNum(elderly) ?? 0,
      infant: parseNum(infant) ?? 0,
      bonus: parseNum(bonus) ?? 0,
      bonusMode,
    }
  }

  const handleCalc = async () => {
    if (!can('wages:read')) { showToast('您没有个税试算的权限', 'error'); return }
    if (!personId) { showToast('请选择人员', 'warning'); return }
    if (!cityCode) { showToast('请选择城市', 'warning'); return }
    setCalculating(true)
    setCalcError('')
    try {
      const api = await getAPI() as any
      if (typeof api.calcTax !== 'function') { setCalcError('当前环境不支持个税试算（需连接后端 API）'); return }
      const r = await api.calcTax(buildPayload())
      if (r.success) setResult(r.data)
      else setCalcError(r.error || '试算失败')
    } catch (e) {
      setCalcError(`试算失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setCalculating(false)
    }
  }

  const handleConfirm = async () => {
    if (!can('wages:update')) { showToast('您没有确认落库的权限', 'error'); return }
    setConfirming(true)
    try {
      const api = await getAPI() as any
      if (typeof api.confirmTax !== 'function') { showToast('当前环境不支持确认落库（需连接后端 API）', 'error'); return }
      const r = await api.confirmTax(buildPayload())
      if (r.success) {
        showToast(`已落库（ledger #${r.data?.ledgerId ?? ''}）`, 'success')
        onClose()
      } else {
        showToast(r.error || '确认落库失败', 'error')
      }
    } catch (e) {
      showToast(`确认落库失败: ${e instanceof Error ? e.message : '未知错误'}`, 'error')
    } finally {
      setConfirming(false)
    }
  }

  const b = result?.bonus
  const fmt = (n: unknown) => (typeof n === 'number' ? `¥${n.toLocaleString()}` : '-')

  return (
    <Drawer open={open} onClose={onClose} icon="Calculator" title="个税试算" dirty={result !== null}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose} variant="secondary" size="sm">取消</Button>
          <Button type="button" onClick={handleCalc} variant="outline" size="sm"
            loading={calculating} disabled={!can('wages:read')}>
            {calculating ? '试算中...' : '试算'}
          </Button>
          <Button type="button" onClick={handleConfirm} variant="primary" size="sm"
            loading={confirming} disabled={!can('wages:update') || result === null}>
            {confirming ? '落库中...' : '确认落库'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 px-6 py-4">
        {/* 人员 / 月份 / 城市 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">人员</label>
            <select value={personId} onChange={e => setPersonId(e.target.value)}
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              {people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">月份</label>
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)}
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">城市</label>
            <select value={cityCode} onChange={e => setCityCode(e.target.value)}
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              {cities.map(c => (
                <option key={c.cityCode} value={c.cityCode}>
                  {c.cityName}（{c.effectiveYear} · {c.status}）
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">社保基数（元）</label>
            <input type="text" inputMode="decimal" value={base} onChange={e => setBase(e.target.value)}
              placeholder="空=自动（成员base_salary/上月实际）"
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">本月收入（元）</label>
          <input type="text" inputMode="decimal" value={gross} onChange={e => setGross(e.target.value)}
            placeholder="空=工资实际和"
            className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
        </div>

        {/* 专项扣除 7 分项（GS02 默认值） */}
        <div>
          <div className="mb-1 text-xs font-medium text-[color:var(--fg-2)]">专项附加扣除（元/月）</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">子女教育/孩</label>
              <input type="text" inputMode="decimal" value={childEdu} onChange={e => setChildEdu(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">婴幼儿照护/孩〈国发〔2023〕13号〉</label>
              <input type="text" inputMode="decimal" value={infant} onChange={e => setInfant(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">继续教育（学历400/月≤48月，取证当年3600）</label>
              <input type="text" inputMode="decimal" value={contEdu} onChange={e => setContEdu(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">房贷利息（1000/月≤240月）</label>
              <input type="text" inputMode="decimal" value={mortgage} onChange={e => setMortgage(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">住房租金（三档）</label>
              <select value={rent} onChange={e => setRent(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
                <option value="1500">1500（直辖市/省会）</option>
                <option value="1100">1100（市辖区户籍过百万）</option>
                <option value="800">800（其他）</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-[color:var(--muted)]">赡养老人（独生3000，分摊≤1500）</label>
              <input type="text" inputMode="decimal" value={elderly} onChange={e => setElderly(e.target.value)}
                className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
            </div>
          </div>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            大病医疗不可按月输入，按汇算口径据实（自付超 15000 部分、80000/年限额），试算按 0 计。
          </p>
        </div>

        {/* 年终奖 + 三态开关 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">年终奖（元）</label>
            <input type="text" inputMode="decimal" value={bonus} onChange={e => setBonus(e.target.value)}
              placeholder="0"
              className="w-full text-sm px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[color:var(--fg-2)]">年终奖方式</label>
            <div className="flex items-center gap-0.5 rounded-lg p-0.5 bg-[color:var(--panel-2)]">
              {BONUS_MODES.map(m => (
                <button key={m.value} type="button" onClick={() => setBonusMode(m.value)}
                  aria-pressed={bonusMode === m.value}
                  className={`flex-1 px-2 py-1 text-xs font-medium rounded-md transition-colors ${bonusMode === m.value ? 'bg-[color:var(--card)] shadow-sm text-[color:var(--fg)]' : 'text-[color:var(--muted)] hover:text-[color:var(--fg-2)]'}`}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 结果区 */}
        {calcError && (
          <div role="alert" className="text-sm text-danger-600 border border-danger-200 rounded-lg px-3 py-2">
            {calcError}
          </div>
        )}
        {result && (
          <div className="space-y-2 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">单独计税</span>
              <span className="font-mono tabular-nums font-medium">{fmt(b?.separateTaxYuan)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">并入综合（差额）</span>
              <span className="font-mono tabular-nums font-medium">{fmt(b?.combinedExtraYuan)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">建议</span>
              <span className="font-medium">{b?.recommended === 'separate' ? '单独计税' : '并入综合'}（省 {fmt(b?.savingYuan)}）</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[color:var(--muted)]">本期预扣</span>
              <span className="font-mono tabular-nums font-medium">{fmt(result.currentWithholdingYuan)}</span>
            </div>
            {result.firstNote && (
              <div className="text-xs text-[color:var(--muted)]">{result.firstNote}</div>
            )}
            {result.calcNote && (
              <p className="text-xs text-[color:var(--muted)] leading-relaxed">{result.calcNote}</p>
            )}
            {b?.lawRef && (
              <p className="text-xs text-[color:var(--muted)] leading-relaxed">{b.lawRef}</p>
            )}
          </div>
        )}
      </div>
    </Drawer>
  )
}

export default TaxCalcDrawer

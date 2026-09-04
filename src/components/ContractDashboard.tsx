import React, { useState, useEffect } from 'react'
import { ContractStats } from '../types/electron'
import { formatMoney } from '../utils/format'
import { formatContractCurrency } from './features/contracts/formatContractCurrency'
import { Icon } from './ui/Icon'
import PageContainer from './ui/PageContainer'
import HeroBanner from './ui/HeroBanner'
import { motion } from 'framer-motion'
import { EditorialBars } from './ui/charts/EditorialBars'
import { SquareHundred } from './ui/charts/SquareHundred'
import { PRESETS } from './ui/charts/colorPresets'
import { staggerContainer, sectionVariant } from '@/constants/animations'
import { getAPI } from '@/services/api-adapter'

// Bedrock 卡面：card 表面 + 1px 发丝边，静止无重阴影
const CARD = 'rounded-xl bg-[color:var(--card)] border border-[color:var(--border)]'
/** Palm SER 前 3（无序类目 2-3 个，类目色钉在固定语义顺序上，0 值过滤不改变归属） */
const PALM_SER: string[] = PRESETS.palm.ser ?? []

interface ContractDashboardProps {
  refresh?: () => void
  onNavigate?: (view: 'income' | 'expense' | 'agreement' | 'templates', opts?: { createNew?: boolean }) => void
}

const ContractDashboard: React.FC<ContractDashboardProps> = ({ refresh, onNavigate }) => {
  const [stats, setStats] = useState<ContractStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [refresh])

  const loadStats = async () => {
    try {
      const result = await (await getAPI()).getContractStats()
      if (result.success && result.data) setStats(result.data)
    } catch (error) {
      console.error('加载统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="rounded-xl animate-pulse h-32 mb-6 bg-[color:var(--panel-2)]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl animate-pulse h-28 bg-[color:var(--panel-2)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl animate-pulse h-80 bg-[color:var(--panel-2)]" />
          <div className="rounded-xl animate-pulse h-80 bg-[color:var(--panel-2)]" />
        </div>
      </PageContainer>
    )
  }

  const netIncome = (stats?.incomeTotal || 0) - (stats?.expenseTotal || 0)
  const isPositive = netIncome >= 0

  const barData = [
    { name: '收入合同', amount: stats?.incomeTotal || 0 },
    { name: '支出合同', amount: stats?.expenseTotal || 0 },
    { name: '已回款', amount: stats?.incomeReceived || 0 },
    { name: '已付款', amount: stats?.expensePaid || 0 },
  ].sort((a, b) => b.amount - a.amount)

  const typeData = [
    { name: '收入合同', value: stats?.incomeCount || 0, color: PALM_SER[0] },
    { name: '支出合同', value: stats?.expenseCount || 0, color: PALM_SER[1] },
    { name: '其他协议', value: stats?.agreementCount || 0, color: PALM_SER[2] },
  ].filter(d => d.value > 0)
  const typeTotal = (stats?.incomeCount || 0) + (stats?.expenseCount || 0) + (stats?.agreementCount || 0)
  // 合同类型分布 → 编辑风 100 点方阵：份数转百分比（Σ 偏差由组件兜底），0 值类目过滤照旧
  const typePct = typeData.map(d => ({
    name: d.name,
    value: typeTotal > 0 ? Math.round((d.value / typeTotal) * 100) : 0,
    color: d.color,
  }))

  // 导航入口卡片配置（统一中性皮，图标墨色）
  const navCards = [
    { view: 'income' as const, icon: 'TrendingUp', title: '收入合同', desc: '记录新签订单', count: stats?.incomeCount || 0, sub: `总额 ¥${formatContractCurrency(stats?.incomeTotal || 0)}` },
    { view: 'expense' as const, icon: 'TrendingDown', title: '支出合同', desc: '记录采购/分包', count: stats?.expenseCount || 0, sub: `总额 ¥${formatContractCurrency(stats?.expenseTotal || 0)}` },
    { view: 'agreement' as const, icon: 'FileText', title: '其他协议', desc: '框架/合作协议', count: stats?.agreementCount || 0, sub: '协议合同' },
  ]

  const summary = [
    { icon: 'CheckCircle', label: '已回款', value: `¥${formatContractCurrency(stats?.incomeReceived || 0)}`, color: 'var(--fg)' },
    { icon: 'CreditCard', label: '已付款', value: `¥${formatContractCurrency(stats?.expensePaid || 0)}`, color: 'var(--fg)' },
    { icon: 'Sparkles', label: '收支差额', value: `${netIncome >= 0 ? '+' : '-'}¥${formatContractCurrency(Math.abs(netIncome))}`, color: netIncome >= 0 ? 'var(--success)' : 'var(--danger)' },
    { icon: 'AlertTriangle', label: '即将到期', value: `${stats?.expiringSoon?.length || 0} 份`, color: (stats?.expiringSoon?.length || 0) > 0 ? 'var(--warning)' : 'var(--fg)' },
  ]

  return (
    <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
      <PageContainer>
        <HeroBanner
          icon="FileText"
          title="合同看板"
          subtitle="合同数据统计与收支分析"
          metrics={[
            { value: (stats?.incomeCount || 0) + (stats?.expenseCount || 0) + (stats?.agreementCount || 0), label: '合同总数' },
            { value: `${isPositive ? '+' : '-'}¥${formatContractCurrency(Math.abs(netIncome))}`, label: '收支差额' },
          ]}
        />

        {/* 导航入口卡片：点击进入子页面 */}
        <motion.div variants={sectionVariant} className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {navCards.map(c => (
            <button
              key={c.view}
              onClick={() => onNavigate?.(c.view)}
              className={`${CARD} p-6 text-left cursor-pointer transition-[transform,border-color] duration-200 group hover:-translate-y-0.5`}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Icon name={c.icon} size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>{c.title}</h3>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{c.desc}</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-numeric-xl font-mono tabular-nums tracking-tight" style={{ color: 'var(--fg)' }}>{c.count}</p>
                  <p className="text-sm mt-0.5 tabular-nums" style={{ color: 'var(--muted)' }}>{c.sub}</p>
                </div>
                <span className="text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                  查看详情 <Icon name="ChevronRight" size={14} />
                </span>
              </div>
            </button>
          ))}
        </motion.div>

        {/* 汇总统计条 — S13 KPI 卡样式 */}
        <motion.div variants={sectionVariant} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {summary.map(s => (
            <div key={s.label} className={`${CARD} p-4 flex flex-col justify-between min-h-[100px]`}>
              <div className="flex items-center justify-between">
                <span className="text-caption font-bold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{s.label}</span>
                <span style={{ color: s.color }}><Icon name={s.icon} size={14} /></span>
              </div>
              <p className="text-numeric-xl font-mono tabular-nums tracking-tight mt-auto" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </motion.div>

        {/* Charts Section */}
        <motion.div variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className={`${CARD} p-6`}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>收支对比</h3>
            {stats ? (
              /* 编辑风横向条形：4 条固定语义类目按金额降序，默认墨阶（accentFirst 默认，冠军 var(--accent)） */
              <EditorialBars
                data={barData.map(d => ({ name: d.name, value: d.amount }))}
                formatValue={(v) => `¥${formatMoney(v)}`}
              />
            ) : (
              <div className="flex items-center justify-center h-[280px]" style={{ color: 'var(--muted)' }}>暂无数据</div>
            )}
          </div>

          <div className={`${CARD} p-6`}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>合同类型分布</h3>
            {typePct.length > 0 ? (
              /* 编辑风 100 点方阵：每点 1%，图例侧特大百分比为组件自带（原手写图例移除） */
              <SquareHundred data={typePct} />
            ) : (
              <div className="flex items-center justify-center h-[280px]" style={{ color: 'var(--muted)' }}>暂无数据</div>
            )}
          </div>
        </motion.div>

        {/* 即将到期合同 + 快捷创建 */}
        <motion.div variants={sectionVariant} className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className={`${CARD} p-6 lg:col-span-3`}>
            <div className="flex items-center gap-2 mb-4">
              <Icon name="AlertTriangle" size={18} className="text-[color:var(--warning)]" />
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>即将到期合同</h3>
              {stats?.expiringSoon && stats.expiringSoon.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full font-medium" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>{stats.expiringSoon.length} 份</span>
              )}
            </div>
            {stats?.expiringSoon && stats.expiringSoon.length > 0 ? (
              <div className="space-y-2">
                {stats.expiringSoon.map((contract: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--panel-2)' }}>
                    <div>
                      <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{contract.name}</div>
                      <div className="text-xs font-mono tabular-nums" style={{ color: 'var(--muted)' }}>{contract.contractNo}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium font-mono tabular-nums" style={{ color: 'var(--warning)' }}>剩余 {contract.daysLeft} 天</div>
                      <div className="text-xs font-mono tabular-nums" style={{ color: 'var(--muted)' }}>到期: {contract.endDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>暂无即将到期的合同</p>
            )}
          </div>

          <div className={`${CARD} p-6`}>
            <h3 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--muted)' }}>快捷创建</h3>
            <div className="space-y-2">
              <button onClick={() => onNavigate?.('income', { createNew: true })}
                className="w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 hover:bg-[color:var(--sidebar-item-hover)]" style={{ background: 'var(--panel-2)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Icon name="Plus" size={18} />
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>新增收入合同</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>记录新签订单</div>
                </div>
              </button>
              <button onClick={() => onNavigate?.('expense', { createNew: true })}
                className="w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 hover:bg-[color:var(--sidebar-item-hover)]" style={{ background: 'var(--panel-2)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Icon name="Plus" size={18} />
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>新增支出合同</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>记录采购/分包</div>
                </div>
              </button>
              <button onClick={() => onNavigate?.('templates')}
                className="w-full p-3 rounded-lg text-left transition-colors flex items-center gap-3 hover:bg-[color:var(--sidebar-item-hover)]" style={{ background: 'var(--panel-2)' }}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Icon name="FileText" size={18} />
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>合同模板库</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>变量模板维护与生成</div>
                </div>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Empty State */}
        {(!stats || (stats.incomeCount === 0 && stats.expenseCount === 0 && stats.agreementCount === 0)) && (
          <motion.div variants={sectionVariant} className={`${CARD} p-12 text-center`}>
            <Icon name="BarChart3" size={56} className="mx-auto mb-4 text-[color:var(--border-strong)]" />
            <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--fg)' }}>暂无合同数据</h3>
            <p style={{ color: 'var(--muted)' }}>开始添加收入合同和支出合同来查看统计数据</p>
          </motion.div>
        )}
      </PageContainer>
    </motion.div>
  )
}

export default ContractDashboard

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import ButtonLoader from '@/components/ui/ButtonLoader'
import { generateReport, type ReportRequest } from '@/services/report-client'
import ReportResultPanel from './ReportResultPanel'
import { useAuth } from '@/hooks/useAuth'

interface ReportGeneratorModalProps {
  onClose: () => void
}

type PeriodPreset = 'day' | 'week' | 'month' | 'custom'
type ScopeType = 'all' | 'project' | 'user'
type ReportFormat = 'text' | 'chart'
type ReportTheme = 'general' | 'wage'

/** 报告主题二选一（默认综合经营） */
const THEME_OPTIONS: { value: ReportTheme; label: string; desc: string }[] = [
  { value: 'general', label: '综合经营', desc: '操作记录+业务 KPI，全局经营视角' },
  { value: 'wage', label: '工资专项', desc: '工资总额/项目分布/走势/用工构成，老板视角' },
]

/** 报告形式二选一（默认文本版，零惊讶） */
const FORMAT_OPTIONS: { value: ReportFormat; label: string; desc: string }[] = [
  { value: 'text', label: '文本版', desc: '全文+表格+附图，适合存档细读' },
  { value: 'chart', label: '图形版', desc: '每节一图+大数字，适合例会投影' },
]

const ACTION_OPTIONS = [
  { value: 'create', label: '新增' },
  { value: 'update', label: '修改' },
  { value: 'delete', label: '删除' },
  { value: 'export', label: '导出' },
  { value: 'import', label: '导入' },
  { value: 'login', label: '登录' },
  { value: 'logout', label: '登出' },
]

/** 「报告主题」「报告形式」共用的二选一卡片节（DOM 与原内联版一致，控制文件行数在铁律上限内） */
function renderPickSection<T extends string>(
  title: string, options: { value: T; label: string; desc: string }[], active: T, onPick: (value: T) => void
) {
  return (
    <div>
      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const isActive = active === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(o.value)}
              className="rounded-lg border px-3 py-2.5 text-left transition-colors"
              style={{
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                background: isActive ? 'var(--accent-soft, var(--bg))' : 'transparent',
              }}
            >
              <div className="text-xs font-bold" style={{ color: isActive ? 'var(--fg)' : 'var(--fg-2)' }}>{o.label}</div>
              <div className="text-caption mt-1" style={{ color: 'var(--muted)' }}>{o.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 报告生成弹窗 — 选周期/范围 → 一键生成 → 富文本预览编辑 → 导出
 */
const ReportGeneratorModal: React.FC<ReportGeneratorModalProps> = ({ onClose }) => {
  const { currentUser } = useAuth()
  const isAdmin = currentUser?.roleId === 'admin'

  // 表单状态
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('week')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [scope, setScope] = useState<ScopeType>('user')
  const [scopeId, setScopeId] = useState('')
  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [format, setFormat] = useState<ReportFormat>('text')
  const [theme, setTheme] = useState<ReportTheme>('general')
  // 结果面板的 format 取生成时快照（结果出来后改表单不影响已生成报告的呈现）
  const [resultFormat, setResultFormat] = useState<ReportFormat>('text')

  // 生成状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [timestamp, setTimestamp] = useState('')

  // 构建请求
  const buildRequest = useCallback((): ReportRequest => {
    const req: ReportRequest = {
      period: periodPreset === 'custom' ? 'week' : periodPreset,
      scope,
      format,
      theme,
    }

    if (periodPreset === 'custom' && customStart && customEnd) {
      req.startDate = customStart
      req.endDate = customEnd
    }

    if (scope === 'project' && scopeId) {
      req.scopeId = parseInt(scopeId, 10)
    }

    if (selectedActions.length > 0) {
      req.actionFilter = selectedActions
    }

    return req
  }, [periodPreset, customStart, customEnd, scope, scopeId, selectedActions, format, theme])

  // 生成报告
  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMarkdown('')

    const request = buildRequest()
    const result = await generateReport(request)

    setLoading(false)
    if (result.success && result.data) {
      setMarkdown(result.data.markdown)
      setTimestamp(result.data.timestamp)
      setResultFormat(request.format ?? 'text')
    } else {
      setError(result.error ?? '生成失败，请重试')
    }
  }, [buildRequest])

  // 构建请求
  const toggleAction = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    )
  }

  const hasResult = markdown.length > 0

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* 背景遮罩 */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />

        {/* 弹窗 */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[85vh] overflow-auto rounded-2xl shadow-xl"
          style={{ background: 'var(--panel)' }}
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* 标题栏 */}
          <div
            className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b"
            style={{
              background: 'var(--panel)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Icon name="Sparkles" size={18} />
              <span className="text-sm font-bold" style={{ color: 'var(--fg)' }}>
                生成报告
              </span>
              {timestamp && (
                <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>
                  {timestamp}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--sidebar-item-hover)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon name="X" size={18} />
            </button>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* ── 时间范围 ── */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>
                时间范围
              </label>
              <div className="flex gap-2">
                {([
                  { key: 'day', label: '今天' },
                  { key: 'week', label: '本周' },
                  { key: 'month', label: '本月' },
                  { key: 'custom', label: '自定义' },
                ] as const).map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setPeriodPreset(key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: periodPreset === key ? 'var(--accent)' : 'transparent',
                      color: periodPreset === key ? 'var(--on-accent)' : 'var(--fg-2)',
                      border: `1px solid ${periodPreset === key ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {periodPreset === 'custom' && (
                <div className="flex gap-2 mt-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs border flex-1"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                    }}
                  />
                  <span className="flex items-center text-xs" style={{ color: 'var(--muted)' }}>
                    至
                  </span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-1.5 rounded-lg text-xs border flex-1"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--fg)',
                    }}
                  />
                </div>
              )}
            </div>

            {/* ── 作用域 ── */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>
                作用域
              </label>
              <div className="flex gap-2">
                {isAdmin && (
                  <button
                    onClick={() => setScope('all')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    style={{
                      background: scope === 'all' ? 'var(--accent)' : 'transparent',
                      color: scope === 'all' ? 'var(--on-accent)' : 'var(--fg-2)',
                      border: `1px solid ${scope === 'all' ? 'var(--accent)' : 'var(--border)'}`,
                    }}
                  >
                    全系统
                  </button>
                )}
                <button
                  onClick={() => setScope('project')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: scope === 'project' ? 'var(--accent)' : 'transparent',
                    color: scope === 'project' ? 'var(--on-accent)' : 'var(--fg-2)',
                    border: `1px solid ${scope === 'project' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  按项目
                </button>
                <button
                  onClick={() => setScope('user')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    background: scope === 'user' ? 'var(--accent)' : 'transparent',
                    color: scope === 'user' ? 'var(--on-accent)' : 'var(--fg-2)',
                    border: `1px solid ${scope === 'user' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  按用户（当前）
                </button>
              </div>
              {scope === 'project' && (
                <input
                  type="number"
                  placeholder="项目 ID"
                  value={scopeId}
                  onChange={(e) => setScopeId(e.target.value)}
                  className="mt-2 px-3 py-1.5 rounded-lg text-xs border w-full"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                  }}
                />
              )}
            </div>

            {/* ── 操作类型过滤 ── */}
            <div>
              <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>
                操作类型过滤（不选则全部）
              </label>
              <div className="flex flex-wrap gap-2">
                {ACTION_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer border transition-colors"
                    style={{
                      borderColor: selectedActions.includes(value) ? 'var(--accent)' : 'var(--border)',
                      background: selectedActions.includes(value) ? 'var(--accent-soft, var(--bg))' : 'transparent',
                      color: 'var(--fg-2)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedActions.includes(value)}
                      onChange={() => toggleAction(value)}
                      className="w-3 h-3 accent-[var(--accent)]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            {/* ── 报告主题 ── */}
            {renderPickSection('报告主题', THEME_OPTIONS, theme, setTheme)}

            {/* ── 报告形式 ── */}
            {renderPickSection('报告形式', FORMAT_OPTIONS, format, setFormat)}

            {/* ── 错误信息 ── */}
            {error && (
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: 'var(--danger-soft, #fee)', color: 'var(--danger)' }}
              >
                {error}
              </div>
            )}

            {/* ── 生成按钮 ── */}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              {loading ? (
                <ButtonLoader loading={true} loadingText="正在生成...">生成报告</ButtonLoader>
              ) : (
                <>
                  <Icon name="Sparkles" size={16} />
                  生成报告
                </>
              )}
            </button>

            {/* ── 生成结果 ── */}
            {hasResult && (
              <ReportResultPanel markdown={markdown} onUpdateMarkdown={setMarkdown} format={resultFormat} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ReportGeneratorModal

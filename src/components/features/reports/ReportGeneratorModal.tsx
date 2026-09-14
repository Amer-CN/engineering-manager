import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import ButtonLoader from '@/components/ui/ButtonLoader'
import { generateReport, type ReportRequest } from '@/services/report-client'
import { getTemplateId } from '@/utils/reportTemplates/index'
import ReportResultPanel from './ReportResultPanel'
import ReportPurposeSection, { type ReportPurpose } from './ReportPurposeSection'
import { THEME_OPTIONS, FORMAT_OPTIONS, ACTION_OPTIONS, renderPickSection } from './ReportPickSections'
import { useAuth } from '@/hooks/useAuth'
import ActiveModelNote from '@/components/features/agent/ActiveModelNote'

interface ReportGeneratorModalProps {
  onClose: () => void
}

type PeriodPreset = 'day' | 'week' | 'month' | 'custom'
type ScopeType = 'all' | 'project' | 'user'
export type ReportFormat = 'text' | 'chart'
export type ReportTheme = 'general' | 'wage'

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
  const [purpose, setPurpose] = useState<ReportPurpose>('review')
  // 结果面板的 format/template 取生成时快照（结果出来后改表单不影响已生成报告的呈现）
  const [resultFormat, setResultFormat] = useState<ReportFormat>('text')
  const [resultTemplateId, setResultTemplateId] = useState<string>('r04')

  // 生成状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState('')
  const [timestamp, setTimestamp] = useState('')
  // 当前在途请求的控制器（用于用户主动取消生成）
  const abortRef = useRef<AbortController | null>(null)

  // 组件卸载时中止在途请求，避免弹窗关闭后后台继续生成
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [])

  // 构建请求
  const buildRequest = useCallback((): ReportRequest => {
    const req: ReportRequest = {
      period: periodPreset === 'custom' ? 'week' : periodPreset,
      scope,
      format,
      theme,
      purpose,
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
  }, [periodPreset, customStart, customEnd, scope, scopeId, selectedActions, format, theme, purpose])

  // 生成报告
  const handleGenerate = useCallback(async () => {
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)
    setMarkdown('')

    const request = buildRequest()
    const result = await generateReport(request, controller.signal)

    // 用户已主动取消：丢弃本次结果，不设错误、不设 markdown（弹窗已由 handleCancel 处理状态）
    if (controller.signal.aborted) return

    abortRef.current = null
    setLoading(false)
    if (result.success && result.data) {
      setMarkdown(result.data.markdown)
      setTimestamp(result.data.timestamp)
      setResultFormat(request.format ?? 'text')
      setResultTemplateId(getTemplateId(request.purpose ?? 'review', request.theme))
    } else {
      setError(result.error ?? '生成失败，请重试')
    }
  }, [buildRequest])

  // 用户主动取消生成：中止在途请求并回到待生成状态；thenClose 为真时同时关闭弹窗
  const handleCancel = useCallback((thenClose: boolean) => {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
    if (thenClose) onClose()
  }, [onClose])

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
        {/* 背景遮罩：生成中禁点——误触关闭会丢弃已等待数分钟的生成结果 */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.5)', cursor: loading ? 'wait' : 'default' }}
          onClick={loading ? undefined : onClose}
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
            {/* 生成中点 X = 取消生成并关闭（中止在途请求）；非生成中直接关闭 */}
            <button
              onClick={loading ? () => handleCancel(true) : onClose}
              aria-label={loading ? '取消生成并关闭' : '关闭'}
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
            <ReportPurposeSection purpose={purpose} scope={scope} isAdmin={isAdmin} onPick={setPurpose} onScopePick={setScope} />
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
                    onClick={() => setScope('all')} disabled={purpose === 'work'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                  onClick={() => setScope('project')} disabled={purpose === 'work'}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: scope === 'project' ? 'var(--accent)' : 'transparent',
                    color: scope === 'project' ? 'var(--on-accent)' : 'var(--fg-2)',
                    border: `1px solid ${scope === 'project' ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                >
                  按项目
                </button>
                <button
                  onClick={() => setScope('user')} disabled={purpose === 'work'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed${purpose === 'evidence' ? ' hidden' : ''}`}
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

            {/* ── 报告主题（仅经营复盘：用途三分后主题降级为 review 子选择） ── */}
            {purpose === 'review' && renderPickSection('报告主题', THEME_OPTIONS, theme, setTheme)}

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

            {/* ── 生成按钮（生成中旁附「取消生成」：中止请求并回到待生成状态，不关窗） ── */}
            <div className="flex gap-2">
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
              {loading && (
                <button
                  onClick={() => handleCancel(false)}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border transition-opacity hover:opacity-80"
                  style={{ borderColor: 'var(--border)', color: 'var(--fg-2)' }}
                >
                  取消生成
                </button>
              )}
            </div>

            {/* ── 当前生效模型 ── */}
            <ActiveModelNote />

            {/* ── 生成结果 ── */}
            {hasResult && (
              <ReportResultPanel markdown={markdown} onUpdateMarkdown={setMarkdown} format={resultFormat} templateId={resultTemplateId} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default ReportGeneratorModal

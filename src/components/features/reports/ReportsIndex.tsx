import React, { useState } from 'react'
import PageContainer from '@/components/ui/PageContainer'
import { Icon } from '@/components/ui/Icon'
import { RequirePermission } from '@/hooks/usePermission'
import { NoAccessState } from '@/components/ui/NoAccessState'
import ReportGeneratorModal from './ReportGeneratorModal'

/**
 * 报告中心 — 容器页
 *
 * 入口页面，点击"生成报告"打开 ReportGeneratorModal
 */
const ReportsIndex: React.FC = () => {
  const [showModal, setShowModal] = useState(false)

  return (
    <RequirePermission permission="reports:create" fallback={<NoAccessState />}>
      <PageContainer maxWidth="default">
        {/* 页头 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
            >
              <Icon name="FileBarChart" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--fg)' }}>
                报告中心
              </h1>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                AI 一键生成日/周/月报，基于审计日志与业务数据自动汇总
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
          >
            <Icon name="Sparkles" size={16} />
            生成报告
          </button>
        </div>

        {/* 说明卡片 */}
        <div
          className="rounded-xl p-6 border"
          style={{
            background: 'var(--panel)',
            borderColor: 'var(--border)',
          }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>
            报告类型
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: 'Calendar', label: '日报', desc: '汇总当日操作记录与业务变动' },
              { icon: 'CalendarDays', label: '周报', desc: '聚合一周审计日志与关键 KPI' },
              { icon: 'CalendarRange', label: '月报', desc: '全月数据总览与趋势分析' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-lg p-4 border"
                style={{ borderColor: 'var(--border)' }}
              >
                <Icon name={item.icon} size={20} />
                <div className="text-sm font-medium mt-2" style={{ color: 'var(--fg)' }}>
                  {item.label}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 使用说明 */}
        <div
          className="mt-4 rounded-xl p-6 border"
          style={{
            background: 'var(--panel)',
            borderColor: 'var(--border)',
          }}
        >
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--fg)' }}>
            使用说明
          </h2>
          <ul className="text-xs space-y-2" style={{ color: 'var(--fg-2)' }}>
            <li>1. 点击右上角「生成报告」按钮</li>
            <li>2. 选择时间范围（今天/本周/本月/自定义）</li>
            <li>3. 选择作用域（全系统/按项目/按用户）</li>
            <li>4. 可选过滤操作类型（create/update/delete 等）</li>
            <li>5. AI 将基于审计日志和业务数据生成 Markdown 报告</li>
            <li>6. 生成后可编辑、复制或打印</li>
          </ul>
        </div>
      </PageContainer>

      {showModal && <ReportGeneratorModal onClose={() => setShowModal(false)} />}
    </RequirePermission>
  )
}

export default ReportsIndex

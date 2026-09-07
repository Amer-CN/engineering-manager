/** R01 对外举证——React 预览组件（R04 ChartReportView 同风格） */
import React from 'react'
import type { TemplateReportData } from '@/utils/reportTemplates/types'
import { PORCELAIN } from '@/utils/reportTemplates/types'

interface Props {
  data: TemplateReportData
}

const R01EvidenceView: React.FC<Props> = ({ data }) => {
  // 证据带与打印 buildEvidenceSvg 同口径：数据源 = bigNumbers、前 5 条
  const bigNums = data.charts?.bigNumbers ?? []
  const rows = bigNums.slice(0, 5)

  return (
    <div className="grid w-full mx-auto max-w-[1080px]" style={{ gridTemplateColumns: '1fr 300px', background: PORCELAIN.bg }}>
      {/* 主栏：minWidth:0 允许收缩——长 ASCII 词（agent_approval_executed 等）会把 1fr 的
          min-content 撑爆容器，导致侧栏被挤出可视区（2026-09-07 实测预览裁切根因） */}
      <div style={{ padding: '56px 48px 44px 8px', minWidth: 0 }}>
        <h1 style={{ fontFamily: PORCELAIN.serif, fontSize: 50, fontWeight: 400, letterSpacing: '.01em', lineHeight: 1.2, color: PORCELAIN.txt }}>
          {data.title}
        </h1>
        <div style={{ fontFamily: PORCELAIN.serif, fontSize: 25, lineHeight: 1.45, margin: '44px 0 6px', maxWidth: 520, color: PORCELAIN.txt }}>
          {data.period}
        </div>
        {/* 证据带：横向数据行（r01Print buildEvidenceSvg 同款：label 左、值右、发丝线） */}
        {rows.map((b, i) => (
          <div key={b.label} style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: PORCELAIN.mut }}>
                <span style={{ color: PORCELAIN.data }}>{String(i + 1).padStart(2, '0')}</span> · {b.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: PORCELAIN.data }}>{b.value}</div>
            </div>
            <div style={{ height: 1, background: PORCELAIN.grid, marginTop: 6 }} />
          </div>
        ))}
        {rows.length > 0 && (
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.11em', color: PORCELAIN.faint, marginTop: 10 }}>
            EVIDENCE LEDGER · 数据可溯源至操作记录
          </div>
        )}
        {/* 叙事区：r01Print kick/claim/body 同款（空数据安全） */}
        {data.sections.map((s, i) => (
          <div key={i}>
            {s.name && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: PORCELAIN.mut, marginTop: i === 0 ? 30 : 44, marginBottom: 14 }}>
                <span style={{ color: PORCELAIN.data }}>{String(i + 1).padStart(2, '0')}</span> · {s.name}
              </div>
            )}
            {s.heading && (
              <div style={{ fontSize: 14, fontWeight: 700, margin: '34px 0 4px', color: PORCELAIN.txt }}>{s.heading}</div>
            )}
            <div style={{ fontSize: 12.5, lineHeight: 1.8, color: PORCELAIN.lab, maxWidth: 520, marginTop: 8, overflowWrap: 'anywhere' }}>
              {s.lines.filter((l) => l.trim()).map((l, j) => (
                <div key={j} style={{ marginTop: j > 0 ? 8 : 0 }}>
                  {/^[-*]\s/.test(l.trim()) ? `• ${l.trim().replace(/^[-*]\s/, '')}` : l}
                </div>
              ))}
            </div>
          </div>
        ))}
        {/* 底部特征三栏：与打印 traits 同口径，全量渲染（>3 不截断） */}
        {bigNums.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', color: PORCELAIN.mut, margin: '52px 0 0' }}>
              关键数据
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 26, marginTop: 24, borderTop: `1px solid ${PORCELAIN.txt}`, paddingTop: 24 }}>
              {bigNums.map((b) => (
                <div key={b.label}>
                  <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-.03em', color: PORCELAIN.data }}>{b.value}</div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, marginTop: 8, color: PORCELAIN.txt }}>{b.label}</div>
                  <div style={{ fontSize: 10.5, lineHeight: 1.7, color: PORCELAIN.mut, marginTop: 5 }}>{b.sub}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* 侧栏轨道 */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: PORCELAIN.railBg, color: PORCELAIN.bg, padding: '56px 30px 48px', flex: 1 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', opacity: 0.6, marginBottom: 12 }}>关于这份报告</div>
          <h3 style={{ fontSize: 16.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 18 }}>{data.title}</h3>
          <p style={{ fontSize: 11.5, lineHeight: 1.9, opacity: 0.88 }}>数据来源：{data.meta.dataSource}。</p>
          <p style={{ fontSize: 11.5, lineHeight: 1.9, opacity: 0.88, marginTop: 12 }}>统计期间：{data.period}。取数日期：{data.meta.date}。</p>
        </div>
        <div style={{ background: PORCELAIN.railDark, color: PORCELAIN.bg, padding: '44px 30px 52px' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.16em', opacity: 0.6, marginBottom: 12 }}>口径说明</div>
          <p style={{ fontSize: 11.5, lineHeight: 1.9, opacity: 0.88 }}>本报告数据全部来自工程管家本地台账，可溯源至原始操作记录。</p>
          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 20, textDecoration: 'underline', textUnderlineOffset: 3 }}>{data.meta.product}</div>
        </div>
      </div>
    </div>
  )
}

export default R01EvidenceView

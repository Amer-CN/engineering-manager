/** R12 周报速览——React 预览组件（Glance 系 + Palm 色系 + 速览条两数 + 双图区） */
import React from 'react'
import type { TemplateReportData } from '@/utils/reportTemplates/types'
import { PALM } from '@/utils/reportTemplates/types'

interface Props {
  data: TemplateReportData
}

const R12WeeklyView: React.FC<Props> = ({ data }) => {
  const bigNums = data.charts?.bigNumbers ?? []
  const waffle = data.charts?.waffle
  const topBars = data.charts?.topBars
  // rowsA 与打印 r12Print slice(0,7) 一致
  const rowsA = waffle?.rows.slice(0, 7) ?? []
  const rowsB = topBars?.rows.slice(0, 6) ?? []
  // 点位分配：累计封顶 100（chartReport.ts:354 min(100-cum) 同口径），余量补 faint 段
  const countsA: number[] = []
  let cumA = 0
  for (const r of rowsA) {
    const n = Math.max(0, Math.min(Math.round(r.pct), 100 - cumA))
    countsA.push(n)
    cumA += n
  }
  const restA = 100 - cumA
  const maxB = Math.max(...rowsB.map((r) => r.value), 1)

  return (
    <div className="w-full" style={{ background: PALM.data2, padding: '40px 0' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', background: PALM.bg, padding: '60px 68px 64px' }}>
        {/* 节标题：flex 两端对齐——float:right 不撑开父高度，标题换行时期间文字会压到下划线上（2026-09-08 实测） */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 16, fontSize: 14, fontWeight: 800, letterSpacing: '.2em', paddingBottom: 10, borderBottom: `2px solid ${PALM.txt}`, marginBottom: 22, color: PALM.txt }}>
          <span>{data.title}</span>
          <span style={{ fontWeight: 600, color: PALM.mut, letterSpacing: '.1em', fontSize: 12, flexShrink: 0 }}>{data.period}</span>
        </div>
        {/* 顶部速览条：两个数 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 44 }}>
          <div style={{ padding: '18px 16px 16px', border: `1px solid ${PALM.faint}` }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.14em', opacity: 0.7, color: PALM.txt }}>{bigNums[0]?.label ?? '合计'}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, marginTop: 6, color: PALM.txt }}>{bigNums[0]?.value ?? data.period}</div>
            <div style={{ fontSize: 10, lineHeight: 1.65, marginTop: 8, opacity: 0.85, color: PALM.txt }}>{bigNums[0]?.sub ?? data.period}</div>
          </div>
          <div style={{ padding: '18px 16px 16px', background: PALM.data, color: PALM.bg }}>
            <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.14em', opacity: 0.7 }}>{bigNums[1]?.label ?? '数据来源'}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, marginTop: 6 }}>{bigNums[1]?.value ?? data.meta.date}</div>
            <div style={{ fontSize: 10, lineHeight: 1.65, marginTop: 8, opacity: 0.85 }}>{bigNums[1]?.sub ?? data.meta.dataSource}</div>
          </div>
        </div>
        {/* 图区：左右双卡 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
          {/* 方阵卡 */}
          <div style={{ padding: '24px 26px 22px', border: `1px solid ${PALM.faint}` }}>
            <div style={{ fontSize: 11, color: PALM.mut, marginBottom: 14 }}>占比速览</div>
            <div data-testid="r12-waffle-dots" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
              {rowsA.map((r, ri) =>
                Array.from({ length: countsA[ri] }).map((_, k) => (
                  // 点色按行取 PALM.ser 色序——与打印 pictorSvg 逐行赋色同口径；
                  // 不用 r.color（上层传入的是 R04 瓷蓝板，会让预览与打印异色）
                  <span key={`${r.name}-${k}`} style={{ width: 10, height: 10, borderRadius: '50%', background: PALM.ser[ri % PALM.ser.length], display: 'inline-block' }} />
                )),
              )}
              {restA > 0 && Array.from({ length: restA }).map((_, k) => (
                <span key={`rest-${k}`} style={{ width: 10, height: 10, borderRadius: '50%', background: PALM.faint, display: 'inline-block' }} />
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              {rowsA.map((r) => (
                <div key={r.name} style={{ fontSize: 10, fontWeight: 600, color: PALM.mut, marginTop: 4 }}>{r.name} · {Math.round(r.pct)}%</div>
              ))}
            </div>
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', color: PALM.faint, marginTop: 10, lineHeight: 1.6 }}>
              WAFFLE 100 · 一点 = 1%
            </div>
          </div>
          {/* 条形卡 */}
          <div style={{ padding: '24px 26px 22px', border: `1px solid ${PALM.faint}` }}>
            <div style={{ fontSize: 11, color: PALM.mut, marginBottom: 14 }}>排行速览</div>
            {rowsB.map((r, i) => {
              const col = i === 0 ? PALM.data : PALM.ramp[Math.min(3, Math.max(0, 3 - Math.round((i - 1) / Math.max(1, rowsB.length - 2) * 3)))]
              return (
                <div key={r.name} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: PALM.faint, marginBottom: 2 }}>{r.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 26, borderRadius: 13, background: PALM.bg, border: `1px solid ${PALM.faint}`, position: 'relative' }}>
                      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 13, width: `${Math.round((r.value / maxB) * 100)}%`, background: col }} />
                    </div>
                    <span style={{ fontFamily: 'ui-monospace,monospace', fontWeight: 700, fontSize: 11, color: PALM.txt, whiteSpace: 'nowrap' }}>
                      ¥{r.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', color: PALM.faint, marginTop: 10, lineHeight: 1.6 }}>
              CHUNKY BARS · 深绿 = 最大 · 依次转浅
            </div>
          </div>
        </div>
        {/* 页脚 */}
        <div style={{ marginTop: 52, paddingTop: 16, borderTop: `2px solid ${PALM.txt}`, display: 'grid', gridTemplateColumns: '1fr 1.55fr .85fr', gap: 26, fontSize: 9, fontWeight: 600, letterSpacing: '.08em', color: PALM.mut }}>
          <div>数据 · {data.meta.dataSource}</div>
          <div>取数 · {data.meta.date}</div>
          <div style={{ textAlign: 'right' }}>{data.meta.product}</div>
        </div>
      </div>
    </div>
  )
}

export default R12WeeklyView

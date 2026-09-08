/** R05 工作汇报——React 预览组件（Mono 墨阶 + 叙事故事线 + 760px 窄版心） */
import React from 'react'
import type { TemplateReportData } from '@/utils/reportTemplates/types'
import { MONO } from '@/utils/reportTemplates/types'

interface Props {
  data: TemplateReportData
}

const R05WorkView: React.FC<Props> = ({ data }) => {
  const bigNums = data.charts?.bigNumbers ?? []
  const firstSection = data.sections[0]
  const intro = firstSection?.lines.filter((l) => l.trim()).slice(0, 2).join(' ') ?? data.period
  const stories = data.sections.slice(1)
  // 图区（与 r05Print 同数据源）：TICK STRIP ← topBars、HUNDRED FIELD ← waffle
  const tickBars = data.charts?.topBars?.rows ?? []
  const tickTotal = tickBars.reduce((s, r) => s + r.value, 0)
  const tickShares = tickBars.slice(0, 3).map((r) => (tickTotal > 0 ? Math.round((r.value / tickTotal) * 100) : 0))
  while (tickShares.length < 3) tickShares.push(0)
  const tickShades = [MONO.ink, '#8F8E88', '#C6C5BF']
  const waffleRows = data.charts?.waffle?.rows ?? []
  const countsW: number[] = []
  let cumW = 0
  for (const r of waffleRows) {
    const n = Math.max(0, Math.min(Math.round(r.pct), 100 - cumW))
    countsW.push(n)
    cumW += n
  }
  const restW = 100 - cumW
  const wafflePalette = [MONO.ink, '#4A4944', '#8F8E88', '#B0AFA9', '#C6C5BF', '#D8D7D1']
  // 颜色白名单（与 r05Print seg.color 校验同口径）：非法色用 palette 兜底
  const safeColor = (c: string | undefined, fallback: string) => (/^#[0-9a-fA-F]{3,8}$/.test(c ?? '') ? c! : fallback)
  const tickColorAt = (k: number) => {
    let acc = 0
    for (let si = 0; si < 3; si++) {
      if (k < acc + tickShares[si]) return tickShades[si]
      acc += tickShares[si]
    }
    return MONO.faint
  }

  return (
    <div className="w-full" style={{ maxWidth: 760, margin: '0 auto', background: MONO.paper, padding: '64px 0' }}>
      <div style={{ padding: '0 24px' }}>
        <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '.01em', lineHeight: 1.3, maxWidth: 560, color: MONO.ink }}>
          {data.title.split(/(?=的|了|在)/).map((seg, i) =>
            i === 1 ? <span key={i} style={{ background: MONO.ink, color: MONO.paper, padding: '0 12px' }}>{seg}</span> : seg,
          )}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.95, color: '#4A4944', maxWidth: 520, marginTop: 26 }}>
          <b>{data.period}</b> · {intro}
        </p>
        {/* 大数 + 条带 */}
        {bigNums.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 52 }}>
            <div style={{ fontSize: 54, fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: MONO.ink }}>{bigNums[0].value}</div>
            <div style={{ fontSize: 12, color: MONO.mut, fontWeight: 500 }}>{bigNums[0].label}</div>
          </div>
        )}
        {/* 图区：TICK STRIP（100 格队列，与 r05Print buildTickStripSvg 同口径） */}
        {tickTotal > 0 && (
          <div style={{ marginTop: 10 }}>
            <div data-testid="r05-tick-strip" style={{ display: 'flex', gap: 1 }}>
              {Array.from({ length: 100 }).map((_, k) => (
                <span key={k} style={{ flex: 1, height: 8, background: tickColorAt(k), opacity: 0.85 }} />
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: MONO.faint, marginTop: 8 }}>
              TICK STRIP · 一格 = 1% · 深墨 = 最大占比
            </div>
          </div>
        )}
        {/* 图区：HUNDRED FIELD（100 点方阵，累计封顶 100，余量补 faint） */}
        {waffleRows.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <div data-testid="r05-waffle-dots" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
              {waffleRows.map((r, ri) =>
                Array.from({ length: countsW[ri] }).map((_, k) => (
                  <span key={`${r.name}-${k}`} style={{ width: 10, height: 10, borderRadius: '50%', background: safeColor(r.color, wafflePalette[ri % wafflePalette.length]), display: 'inline-block' }} />
                )),
              )}
              {restW > 0 && Array.from({ length: restW }).map((_, k) => (
                <span key={`rest-${k}`} style={{ width: 10, height: 10, borderRadius: '50%', background: MONO.faint, display: 'inline-block' }} />
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#8F8E88' }}>
              {waffleRows.map((r, ri) => (
                <div key={r.name}>{r.name} · {countsW[ri]}%</div>
              ))}
            </div>
          </div>
        )}
        {waffleRows.length > 0 && (
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.1em', color: MONO.faint, marginTop: 8 }}>
            HUNDRED FIELD · 一点 = 一人
          </div>
        )}
        {stories.length > 0 && <div style={{ borderTop: `1px solid ${MONO.grid}`, margin: '32px 0 0' }} />}
        {stories.map((s, i) => (
          <div key={i} style={{ marginTop: i > 0 ? 48 : 0 }}>
            {s.heading && (
              <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, maxWidth: 600, marginTop: i === 0 ? 24 : 68, color: MONO.ink }}>
                {i === 0 && <span style={{ background: MONO.ink, color: MONO.paper, padding: '1px 12px 2px' }}>{s.heading}</span>}
                {i > 0 && s.heading}
              </div>
            )}
            {s.lines.filter((l) => l.trim()).slice(0, 4).map((l, j) => (
              <p key={j} style={{ fontSize: 12, lineHeight: 1.85, color: MONO.mut, maxWidth: 260, marginTop: 20, marginLeft: i % 2 === 1 ? 'auto' : 0 }}>
                {l.replace(/^[-*]\s/, '')}
              </p>
            ))}
          </div>
        ))}
        <div style={{ marginTop: 64, paddingTop: 14, borderTop: `1px solid ${MONO.grid}`, display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, letterSpacing: '.12em', color: MONO.faint }}>
          <span>{data.title} · {data.period}</span>
          <span>来源 · {data.meta.dataSource}</span>
        </div>
      </div>
    </div>
  )
}

export default R05WorkView

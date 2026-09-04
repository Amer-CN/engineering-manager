/**
 * ChartReportView — 图形版报告预览（R04 版式 React 转写）
 *
 * 版式正本：vendor/lieflat-charts/templates/reports/report-04.zh.html（只读）：
 * 米纸底整页 + 左书脊竖排大标题（writing-mode:vertical-rl）+ 每节 = 右对齐小节名
 * （宽字距）+ 结论句标题 + 要点 + 一图（方阵/条形/折线由 AI 数据块类型决定）+
 * 「值得记住的数字」细线分栏大数字 + 页脚来源行（大写格式）。
 *
 * 数据来源：完全来自 AI 数据段（parseChartReport 解析 ```chart-* 块），不做本地聚合注入；
 * 无有效 chart 块时退纯文本节展示（不白屏，解析器已 console.warn 一次）。
 * 色板：图形版统一 Porcelain 青瓷蓝（import colorPresets，本文件零 hex）。
 * 预览态在 Modal 滚动容器内渲染：书脊列缩窄（72px）且标题 sticky 跟随滚动。
 */

import React, { useMemo } from 'react'
import {
  parseChartReport,
  chartBlockSvg,
  chartCaption,
  type ChartReportSection,
} from '@/utils/chartReport'
import { PRESETS, PORCELAIN_INK } from '@/components/ui/charts/colorPresets'

const HERO = PRESETS.porcelain.hero

/** 单节：序号小节名（右对齐宽字距）+ 结论句 + 兜底行 + 要点 + 图（含图名/图例句） */
function Section({ section, index }: { section: ChartReportSection; index: number }) {
  const { headline, bullets, lines, chart } = section
  const svg = chart ? chartBlockSvg(chart) : ''
  return (
    <section className={index === 0 ? '' : 'mt-9'}>
      <div className="flex items-baseline gap-3">
        <div className="flex-1" style={{ borderTop: `1px solid ${PORCELAIN_INK.lab}` }} />
        <span
          className="font-bold"
          style={{ fontSize: 13, letterSpacing: '.2em', color: HERO, whiteSpace: 'nowrap' }}
        >
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      {headline && (
        <div className="text-sm font-bold mt-2" style={{ color: HERO, lineHeight: 1.6 }}>
          {headline}
        </div>
      )}
      {lines.map((l, j) => (
        <p key={j} className="text-micro mt-1" style={{ color: PORCELAIN_INK.lab, lineHeight: 1.8 }}>
          {l}
        </p>
      ))}
      {bullets.length > 0 && (
        <ul className="mt-1 space-y-0.5 list-disc ml-4">
          {bullets.map((b, j) => (
            <li key={j} className="text-micro" style={{ color: PORCELAIN_INK.lab, lineHeight: 1.7 }}>
              {b}
            </li>
          ))}
        </ul>
      )}
      {chart && svg && (
        <figure className="mt-3">
          {chart.title && (
            <div
              className="text-caption font-semibold uppercase"
              style={{ color: PORCELAIN_INK.mut, letterSpacing: '.14em' }}
            >
              {chart.title}
            </div>
          )}
          {chart.kind === 'trend' && chart.label && (
            <div
              className="text-caption font-semibold uppercase"
              style={{ color: PORCELAIN_INK.mut, letterSpacing: '.14em' }}
            >
              {chart.label}
            </div>
          )}
          {/* SVG 产物由 chartReport 生成器输出：静态无 script、内容全转义 */}
          <div className="mt-1" dangerouslySetInnerHTML={{ __html: svg }} />
          <figcaption
            className="text-caption mt-1"
            style={{ color: PORCELAIN_INK.mut, letterSpacing: '.12em' }}
          >
            {chartCaption(chart)}
          </figcaption>
        </figure>
      )}
    </section>
  )
}

const ChartReportView: React.FC<{ markdown: string }> = ({ markdown }) => {
  const data = useMemo(() => parseChartReport(markdown), [markdown])
  const { title, period, sections, bigNumbers } = data

  return (
    <div className="w-full" style={{ background: 'var(--bg)' }}>
      <div className="grid w-full mx-auto" style={{ gridTemplateColumns: '72px 1fr', maxWidth: 1080 }}>
        {/* ── 书脊：竖排大字标题（静态缩窄列；Modal 滚动容器被 overflow-hidden 隔断，sticky 不可依赖）+ 底部竖排期间 ── */}
        <aside className="relative" style={{ borderRight: `1px solid ${PORCELAIN_INK.lab}` }}>
          <div
            className="pt-1 pl-3"
            style={{
              writingMode: 'vertical-rl',
              fontWeight: 900,
              fontSize: 32,
              lineHeight: 1.15,
              letterSpacing: '.06em',
              whiteSpace: 'nowrap',
              color: HERO,
            }}
          >
            {title || '运营报告'}
          </div>
          {period && (
            <div
              className="absolute bottom-0"
              style={{
                writingMode: 'vertical-rl',
                left: 40,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.26em',
                color: PORCELAIN_INK.mut,
              }}
            >
              {period}
            </div>
          )}
        </aside>

        {/* ── 主栏 ── */}
        <div className="pl-6 pr-4" style={{ minWidth: 0 }}>
          {/* 页眉：左产品名 | 右数据说明 */}
          <div
            className="flex items-baseline gap-3"
            style={{ borderBottom: `1px solid ${PORCELAIN_INK.lab}`, paddingBottom: 10 }}
          >
            <span
              className="uppercase font-semibold"
              style={{ fontSize: 12, letterSpacing: '.08em', color: HERO }}
            >
              工程管家
            </span>
            <span style={{ color: PORCELAIN_INK.faint }}>|</span>
            <span
              className="uppercase"
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.12em', color: PORCELAIN_INK.mut }}
            >
              AI 生成 · 图形版
            </span>
          </div>

          {sections.length === 0 && (
            <p className="text-micro mt-4" style={{ color: PORCELAIN_INK.mut }}>
              （暂无内容）
            </p>
          )}
          {sections.map((s, i) => (
            <Section key={i} section={s} index={i} />
          ))}

          {/* ── 值得记住的数字：细线分栏大数字（AI 缺失时整节隐藏） ── */}
          {bigNumbers.length > 0 && (
            <section className="mt-10">
              <div className="flex items-baseline gap-3">
                <div className="flex-1" style={{ borderTop: `1px solid ${PORCELAIN_INK.lab}` }} />
                <span
                  className="font-bold"
                  style={{ fontSize: 13, letterSpacing: '.2em', color: HERO, whiteSpace: 'nowrap' }}
                >
                  值得记住的数字
                </span>
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(bigNumbers.length, 4)},1fr)`,
                  borderTop: `1px solid ${PORCELAIN_INK.lab}`,
                  marginTop: 8,
                }}
              >
                {bigNumbers.slice(0, 4).map((b, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '20px 14px 4px',
                      borderRight: i < Math.min(bigNumbers.length, 4) - 1 ? `1px dotted ${PORCELAIN_INK.faint}` : undefined,
                    }}
                  >
                    <div
                      className="font-mono font-extrabold"
                      style={{ fontSize: 28, lineHeight: 1, color: HERO }}
                    >
                      {b.value}
                    </div>
                    {b.label && (
                      <div
                        className="text-caption mt-1.5"
                        style={{ color: PORCELAIN_INK.mut, letterSpacing: '.1em', fontWeight: 600 }}
                      >
                        {b.label}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── 页脚来源行（大写格式） ── */}
          <footer
            className="mt-10 flex justify-between items-baseline gap-3 pb-2"
            style={{ borderTop: `1px solid ${PORCELAIN_INK.lab}`, paddingTop: 12 }}
          >
            <span
              className="text-caption"
              style={{ color: PORCELAIN_INK.mut, letterSpacing: '.12em', fontWeight: 600 }}
            >
              {title || '运营报告'}
              {period ? ` · ${period}` : ''}
            </span>
            <span
              className="text-caption uppercase"
              style={{ color: PORCELAIN_INK.mut, letterSpacing: '.12em', fontWeight: 600 }}
            >
              AI 生成 · 数据优先
            </span>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default ChartReportView

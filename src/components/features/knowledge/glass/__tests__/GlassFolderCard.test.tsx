/**
 * GlassFolderCard 三件套测试（Card / Papers / Pocket）
 *
 * jsdom 无真实 3D，断言：类名（选中态透传）、transform 字符串（扇形展开真值）、
 * 内容渲染（Tab/标题/pill/进度）、aria 可点击性。
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GlassFolderCard } from '../GlassFolderCard'
import { GlassFolderPapers } from '../GlassFolderPapers'
import { GlassFolderPocket } from '../GlassFolderPocket'
import type { FolderItem } from '../types'

const folder: FolderItem = {
  id: 'f1',
  title: '安全生产资料',
  englishTitle: 'SAFETY',
  period: '2026 · 上半年',
  progress: 92,
  memberCount: 6,
  category: '安全',
  documents: [
    { id: 'd1', title: '年度安全交底记录汇总', code: 'SAF-2026-01', priority: '高', status: '已完成', date: '2026-01-15', assignee: '王强' },
    { id: 'd2', title: '特种作业人员持证台账', code: 'SAF-2026-02', priority: '中', status: '进行中', date: '2026-02-03', assignee: '李敏' },
    { id: 'd3', title: '隐患排查整改闭环报告', code: 'SAF-2026-03', priority: '低', status: '未开始', date: '2026-03-28', assignee: '赵磊' },
  ],
}

describe('GlassFolderCard — 卡容器', () => {
  it('渲染 Tab（englishTitle）+ 后盖板/封边/前袋结构', () => {
    render(<GlassFolderCard folder={folder} isActive={false} />)
    // SAFETY 同时出现在 Tab 与 Pocket 副行，按容器作用域断言
    expect(document.querySelector('.gc-tab')!.textContent).toContain('SAFETY')
    const card = document.querySelector('.gc-card-inner')
    expect(card).not.toBeNull()
    expect(card!.querySelector('.gc-back')).not.toBeNull()
    expect(card!.querySelector('.gc-bottom-seal')).not.toBeNull()
    expect(card!.querySelector('.gc-pocket')).not.toBeNull()
  })

  it('isActive 透传：gc-back--active / gc-tab--active / gc-bottom-seal--active', () => {
    const { rerender } = render(<GlassFolderCard folder={folder} isActive={false} />)
    expect(document.querySelector('.gc-back--active')).toBeNull()

    rerender(<GlassFolderCard folder={folder} isActive={true} />)
    expect(document.querySelector('.gc-back--active')).not.toBeNull()
    expect(document.querySelector('.gc-tab--active')).not.toBeNull()
    expect(document.querySelector('.gc-bottom-seal--active')).not.toBeNull()
  })

  it('点击回调触发（选中卡进入文件夹）', () => {
    const onClick = vi.fn()
    render(<GlassFolderCard folder={folder} isActive={false} onClick={onClick} />)
    fireEvent.click(document.querySelector('.gc-card-inner')!)
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('GlassFolderPapers — 三张阶梯纸', () => {
  it('渲染三张纸（gc-paper--1/2/3）与文档标题', () => {
    render(<GlassFolderPapers docs={folder.documents} isActive={false} />)
    const papers = document.querySelectorAll('.gc-paper')
    expect(papers.length).toBe(3)
    expect(screen.getByText('年度安全交底记录汇总')).toBeInTheDocument()
    expect(screen.getByText('特种作业人员持证台账')).toBeInTheDocument()
    expect(screen.getByText('隐患排查整改闭环报告')).toBeInTheDocument()
  })

  it('常态收拢 transform（translate3d 0/16-20px，无旋转）', () => {
    render(<GlassFolderPapers docs={folder.documents} isActive={false} />)
    const papers = document.querySelectorAll('.gc-paper')
    expect(papers[0].getAttribute('style')).toContain('translate3d(0px, 16px, 3px) rotate(0deg)')
    expect(papers[1].getAttribute('style')).toContain('translate3d(0px, 18px, 6px) rotate(0deg)')
    expect(papers[2].getAttribute('style')).toContain('translate3d(0px, 20px, 9px) rotate(0deg)')
  })

  it('选中扇形展开 transform（真值：(-8,-24,3)∠-4° 等）', () => {
    render(<GlassFolderPapers docs={folder.documents} isActive={true} />)
    const papers = document.querySelectorAll('.gc-paper')
    expect(papers[0].getAttribute('style')).toContain('translate3d(-8px, -24px, 3px) rotate(-4deg)')
    expect(papers[1].getAttribute('style')).toContain('translate3d(8px, -16px, 6px) rotate(3.5deg)')
    expect(papers[2].getAttribute('style')).toContain('translate3d(0px, -6px, 9px) rotate(-0.5deg)')
  })

  it('文档不足三张时用兜底纸（不崩溃）', () => {
    render(<GlassFolderPapers docs={[folder.documents[0]]} isActive={false} />)
    expect(document.querySelectorAll('.gc-paper').length).toBe(3)
    // 缺第 2/3 张 → FALLBACK_DOCS[1]/[2]
    expect(screen.getByText('目录与版本记录')).toBeInTheDocument()
    expect(screen.getByText('历史归档记录')).toBeInTheDocument()
  })
})

describe('GlassFolderPocket — 磨砂玻璃前袋', () => {
  it('渲染人数 pill + 进度 pill + 标题 + englishTitle', () => {
    render(<GlassFolderPocket folder={folder} isActive={false} />)
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('92%')).toBeInTheDocument()
    expect(screen.getByText('安全生产资料')).toBeInTheDocument()
    expect(screen.getByText('SAFETY')).toBeInTheDocument()
  })

  it('常态 rotateX(-1°) / 选中 rotateX(-4.5°)（绕底边前倾）', () => {
    const { rerender } = render(<GlassFolderPocket folder={folder} isActive={false} />)
    const pocket = document.querySelector('.gc-pocket')!
    expect(pocket.getAttribute('style')).toContain('rotateX(-1deg)')
    expect(pocket.classList.contains('gc-pocket--active')).toBe(false)

    rerender(<GlassFolderPocket folder={folder} isActive={true} />)
    expect(pocket.getAttribute('style')).toContain('rotateX(-4.5deg)')
    expect(pocket.classList.contains('gc-pocket--active')).toBe(true)
  })
})

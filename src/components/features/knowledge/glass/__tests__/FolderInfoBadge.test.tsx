/**
 * FolderInfoBadge 测试（纯展示：M2 不接点击动作）
 *
 * 断言：标题/englishTitle/period/大字号进度%/呼吸绿点/内嵌光斑；无 onClick 交互。
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FolderInfoBadge } from '../FolderInfoBadge'
import type { FolderItem } from '../types'

const folder: FolderItem = {
  id: 'f1',
  title: '安全生产资料',
  englishTitle: 'SAFETY',
  period: '2026 · 上半年',
  progress: 92,
  memberCount: 6,
  category: '安全',
  documents: [],
}

describe('FolderInfoBadge — 悬浮信息卡', () => {
  it('渲染标题 + englishTitle + period 副行', () => {
    render(<FolderInfoBadge folder={folder} />)
    expect(screen.getByText('安全生产资料')).toBeInTheDocument()
    expect(screen.getByText('(SAFETY)')).toBeInTheDocument()
    expect(screen.getByText('2026 · 上半年')).toBeInTheDocument()
  })

  it('渲染大字号进度%（92 + % 分列）', () => {
    render(<FolderInfoBadge folder={folder} />)
    expect(screen.getByText('92')).toBeInTheDocument()
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('含呼吸绿点（gc-dot-live）与内嵌光斑（gc-badge-glow）', () => {
    const { container } = render(<FolderInfoBadge folder={folder} />)
    expect(container.querySelector('.gc-dot-live')).not.toBeNull()
    expect(container.querySelector('.gc-badge-glow')).not.toBeNull()
  })

  it('M2 纯展示：无按钮可点（不接动作）', () => {
    render(<FolderInfoBadge folder={folder} />)
    // 只有装饰元素，无 interactive 角色（圆形箭头是纯展示 div）
    expect(screen.queryByRole('button')).toBeNull()
  })
})

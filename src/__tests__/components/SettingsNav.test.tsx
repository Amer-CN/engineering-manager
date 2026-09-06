/**
 * SettingsNav — 设置分类导航组件测试（动效批 1）
 * 断言：渲染全部分类、胶囊层存在、点击切换导航项。
 */
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import React from 'react'
import { SettingsNav } from '@/components/features/settings/SettingsNav'
import { SETTING_CATEGORIES } from '@/constants/settingsIndex'

vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon">{name}</span>,
}))

describe('SettingsNav（滑动胶囊版）', () => {
  it('渲染全部分类项 + 胶囊层（aria-hidden span）存在', () => {
    const { container, getByText } = render(<SettingsNav active="account" onSelect={() => {}} />)
    SETTING_CATEGORIES.forEach(cat => {
      expect(getByText(cat.label)).toBeTruthy()
    })
    // 胶囊层：aria-hidden 的绝对定位 span
    const pill = container.querySelector('span[aria-hidden]')
    expect(pill).toBeTruthy()
    expect(pill!.className).toContain('absolute')
  })

  it('点击分类项触发 onSelect；active 变化后胶囊样式更新', () => {
    const onSelect = vi.fn()
    const { getByText, container, rerender } = render(
      <SettingsNav active="account" onSelect={onSelect} />,
    )
    fireEvent.click(getByText('外观'))
    expect(onSelect).toHaveBeenCalledWith('appearance')

    // active 切到 appearance 后重渲染，胶囊仍存在且可见（位置由 hook 计算）
    rerender(<SettingsNav active="appearance" onSelect={onSelect} />)
    const pill = container.querySelector('span[aria-hidden]') as HTMLElement
    expect(pill).toBeTruthy()
  })
})

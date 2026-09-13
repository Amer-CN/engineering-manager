import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from '@/components/ui/Icon'

describe('问号图标修复验证', () => {
  it('Pin / PinOff / Trash / FolderPlus 渲染为 svg 而非 ? 降级', () => {
    for (const name of ['Pin', 'PinOff', 'Trash', 'FolderPlus']) {
      const { container } = render(<Icon name={name} size={14} />)
      expect(container.querySelector('svg'), `图标 ${name} 应渲染 svg`).toBeTruthy()
      expect(container.textContent, `图标 ${name} 不应降级为问号`).not.toContain('?')
    }
  })
})

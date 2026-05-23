// 验证 jest-dom 匹配器是否加载
// 注意：不要从 'vitest' 导入，使用全局变量（globals: true）
import '@testing-library/jest-dom/vitest'

describe('jest-dom matcher check', () => {
  it('toBeInTheDocument should work', () => {
    const div = document.createElement('div')
    document.body.appendChild(div)
    expect(div).toBeInTheDocument()
    document.body.removeChild(div)
  })
})

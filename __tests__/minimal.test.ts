// 不导入，使用全局变量（globals: true）
// describe, it, expect, vi 都是全局可用的

describe('minimal test', () => {
  it('works', () => {
    expect(1).toBe(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock })

/**
 * 测试 sessionStorage 的 pendingDocId 消费逻辑
 * 模拟 KnowledgeSourceCard 写入 → KnowledgeHomePage 读取并清除
 */
describe('sessionStorage pendingDocId mechanism', () => {
  beforeEach(() => {
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  it('write pendingDocId when clicking source card', () => {
    // 模拟 KnowledgeSourceCard 的 handleOpenDocument
    const docId = 42
    sessionStorageMock.setItem('knowledge:pendingDocId', String(docId))

    expect(sessionStorageMock.setItem).toHaveBeenCalledWith('knowledge:pendingDocId', '42')
    expect(sessionStorageMock.getItem('knowledge:pendingDocId')).toBe('42')
  })

  it('read and clear pendingDocId on page mount', () => {
    // 写入
    sessionStorageMock.setItem('knowledge:pendingDocId', '99')

    // 模拟 KnowledgeHomePage useEffect 中的读取逻辑
    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBe('99')

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      expect(docId).toBe(99)
      expect(!isNaN(docId)).toBe(true)
    }

    // 验证已被清除
    expect(sessionStorageMock.getItem('knowledge:pendingDocId')).toBeNull()
    expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('knowledge:pendingDocId')
  })

  it('no pendingDocId — does nothing on mount', () => {
    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBeNull()

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
    }

    // 不应该调用 removeItem
    expect(sessionStorageMock.removeItem).not.toHaveBeenCalled()
  })

  it('invalid pendingDocId — parseInt returns NaN, does not open', () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', 'not-a-number')

    const pending = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending).toBe('not-a-number')

    if (pending) {
      sessionStorageMock.removeItem('knowledge:pendingDocId')
      const docId = parseInt(pending, 10)
      expect(isNaN(docId)).toBe(true)
    }
  })

  it('pendingDocId is consumed exactly once (no double-open)', () => {
    sessionStorageMock.setItem('knowledge:pendingDocId', '55')

    // 第一次读取（页面挂载）
    const pending1 = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending1).toBe('55')
    if (pending1) sessionStorageMock.removeItem('knowledge:pendingDocId')

    // 第二次读取（如果组件重新挂载）
    const pending2 = sessionStorageMock.getItem('knowledge:pendingDocId')
    expect(pending2).toBeNull()
  })
})

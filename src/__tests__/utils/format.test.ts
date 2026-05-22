// @ts-nocheck
import { describe, it, expect, vi } from 'vitest'
import {
  formatMoney,
  parseMoney,
  formatPercent,
  truncate,
  capitalize,
  kebabCase,
  camelCase,
  generateId,
  copyToClipboard,
  downloadFile,
} from '../../utils/format'

describe('format.ts', () => {
  // ─── formatMoney ─────────────────────────────────────────────
  describe('formatMoney', () => {
    it('应格式化整数金额', () => {
      expect(formatMoney(1000)).toBe('1,000.00')
    })

    it('应格式化小数金额', () => {
      expect(formatMoney(1234.5)).toBe('1,234.50')
      expect(formatMoney(1234.567)).toBe('1,234.57') // 四舍五入
    })

    it('应处理大额数字', () => {
      expect(formatMoney(1000000)).toBe('1,000,000.00')
    })

    it('应处理零和负数', () => {
      expect(formatMoney(0)).toBe('0.00')
      expect(formatMoney(-1000)).toBe('-1,000.00')
    })

    it('应处理 null/undefined', () => {
      expect(formatMoney(null)).toBe('0.00')
      expect(formatMoney(undefined)).toBe('0.00')
    })

    it('应支持自定义小数位', () => {
      expect(formatMoney(1234.567, 3)).toBe('1,234.567')
      expect(formatMoney(1234.5, 0)).toBe('1,235')
    })
  })

  // ─── parseMoney ──────────────────────────────────────────────
  describe('parseMoney', () => {
    it('应解析千分位格式金额', () => {
      expect(parseMoney('1,000.00')).toBe(1000)
      expect(parseMoney('1,000,000.50')).toBe(1000000.5)
    })

    it('应解析普通数字字符串', () => {
      expect(parseMoney('1234.56')).toBe(1234.56)
    })

    it('应处理空字符串', () => {
      expect(parseMoney('')).toBe(0)
    })

    it('应处理非数字字符串', () => {
      expect(parseMoney('abc')).toBe(0)
    })
  })

  // ─── formatPercent ──────────────────────────────────────────
  describe('formatPercent', () => {
    it('应格式化百分比', () => {
      expect(formatPercent(0.1234)).toBe('12.34%')
      expect(formatPercent(0.5)).toBe('50.00%')
      expect(formatPercent(1)).toBe('100.00%')
    })

    it('应处理 null/undefined', () => {
      expect(formatPercent(null)).toBe('0%')
      expect(formatPercent(undefined)).toBe('0%')
    })

    it('应支持自定义小数位', () => {
      expect(formatPercent(0.1234, 1)).toBe('12.3%')
    })
  })

  // ─── truncate ──────────────────────────────────────────────
  describe('truncate', () => {
    it('应在超过最大长度时截断', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...')
    })

    it('应在未超过最大长度时保持原样', () => {
      expect(truncate('Hello', 10)).toBe('Hello')
      expect(truncate('Hello', 5)).toBe('Hello')
    })

    it('应处理空字符串', () => {
      expect(truncate('', 5)).toBe('')
    })
  })

  // ─── capitalize ────────────────────────────────────────────
  describe('capitalize', () => {
    it('应将首字母大写', () => {
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('HELLO')).toBe('Hello')
    })

    it('应处理空字符串', () => {
      expect(capitalize('')).toBe('')
    })
  })

  // ─── kebabCase / camelCase ──────────────────────────────────
  describe('kebabCase', () => {
    it('应将驼峰转为短横线', () => {
      expect(kebabCase('helloWorld')).toBe('hello-world')
      // 连续大写字母只在最后一个字母到小写字母的边界触发短横线
      expect(kebabCase('myXMLParser')).toBe('my-xmlparser') // regex 只匹配单字母边界
    })
  })

  describe('camelCase', () => {
    it('应将短横线转为驼峰', () => {
      expect(camelCase('hello-world')).toBe('helloWorld')
      expect(camelCase('my-xml-parser')).toBe('myXmlParser')
    })
  })

  // ─── generateId ────────────────────────────────────────────
  describe('generateId', () => {
    it('应生成唯一的字符串 ID', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
      expect(typeof id1).toBe('string')
      expect(id1.length).toBeGreaterThan(0)
    })

    it('应包含时间戳和随机部分', () => {
      const id = generateId()
      expect(id).toContain('-')
    })
  })

  // ─── copyToClipboard ──────────────────────────────────────────
  describe('copyToClipboard', () => {
    it('复制成功应返回 true', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      })
      const result = await copyToClipboard('hello')
      expect(result).toBe(true)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hello')
    })

    it('复制失败应返回 false', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('denied')),
        },
      })
      const result = await copyToClipboard('hello')
      expect(result).toBe(false)
    })
  })

  // ─── downloadFile ─────────────────────────────────────────────
  describe('downloadFile', () => {
    it('应调用 URL.createObjectURL 和 revokeObjectURL', () => {
      const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
      const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL')

      // downloadFile 会创建真实的 <a> 并 appendChild → click
      // jsdom 支持 createElement 和 click
      downloadFile('test content', 'report.txt', 'text/plain')

      expect(createUrlSpy).toHaveBeenCalled()
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock')

      vi.restoreAllMocks()
    })

    it('应接受 Blob 参数', () => {
      const createUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock2')
      const revokeUrlSpy = vi.spyOn(URL, 'revokeObjectURL')

      const blob = new Blob(['data'], { type: 'application/json' })
      downloadFile(blob, 'data.json')

      expect(createUrlSpy).toHaveBeenCalledWith(blob)
      expect(revokeUrlSpy).toHaveBeenCalledWith('blob:mock2')

      vi.restoreAllMocks()
    })
  })
})

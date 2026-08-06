/**
 * knowledgeTextMask — 显示脱敏 helper 单元测试
 */

import { describe, it, expect } from 'vitest'
import {
  maskKnowledgeText,
  getHitType,
  getHitTypeLabel,
  formatSpeakers,
} from '@/utils/knowledgeTextMask'

describe('maskKnowledgeText', () => {
  it('masked=false 时原样返回', () => {
    const text = '电话 [已脱敏]'
    expect(maskKnowledgeText(text, false)).toBe(text)
  })

  it('11 位手机号 → 138****5678', () => {
    expect(maskKnowledgeText('电话 [已脱敏]', true)).toBe('电话 138****5678')
  })

  it('身份证号 → 保留前 4 后 4', () => {
    const masked = maskKnowledgeText('身份证 11010519491231002X', true)
    expect(masked).toContain('1101')
    expect(masked).toContain('002X')
    expect(masked).toContain('****')
  })

  it('银行卡号 → 保留前 4 后 4', () => {
    const masked = maskKnowledgeText('账号 6222021234567890123', true)
    expect(masked).toContain('6222')
    expect(masked).toContain('0123')
    expect(masked).toContain('****')
  })

  it('空文本原样返回', () => {
    expect(maskKnowledgeText('', true)).toBe('')
    expect(maskKnowledgeText('', false)).toBe('')
  })

  it('业务语义文本不会被过度脱敏', () => {
    const text = '他说三十万就够了，百分之八十的进度'
    expect(maskKnowledgeText(text, true)).toBe(text)
  })
})

describe('getHitType', () => {
  it('两个 rank 都有 → mixed', () => {
    expect(getHitType({ ftsRank: 1, semanticRank: 2 })).toBe('mixed')
  })

  it('只有 ftsRank → keyword', () => {
    expect(getHitType({ ftsRank: 1, semanticRank: null })).toBe('keyword')
    expect(getHitType({ ftsRank: 1 })).toBe('keyword')
  })

  it('只有 semanticRank → semantic', () => {
    expect(getHitType({ ftsRank: null, semanticRank: 2 })).toBe('semantic')
    expect(getHitType({ semanticRank: 2 })).toBe('semantic')
  })

  it('都没有 → semantic (fallback)', () => {
    expect(getHitType({ ftsRank: null, semanticRank: null })).toBe('semantic')
    expect(getHitType({})).toBe('semantic')
  })
})

describe('getHitTypeLabel', () => {
  it('mixed → 混合命中', () => {
    expect(getHitTypeLabel('mixed')).toBe('混合命中')
  })
  it('keyword → 关键词命中', () => {
    expect(getHitTypeLabel('keyword')).toBe('关键词命中')
  })
  it('semantic → 语义命中', () => {
    expect(getHitTypeLabel('semantic')).toBe('语义命中')
  })
})

describe('formatSpeakers', () => {
  it('JSON 数组 → 逗号分隔', () => {
    expect(formatSpeakers('["说话人1","说话人2"]')).toBe('说话人1、说话人2')
  })

  it('null/undefined → 空字符串', () => {
    expect(formatSpeakers(null)).toBe('')
    expect(formatSpeakers(undefined)).toBe('')
  })

  it('非 JSON 字符串原样返回', () => {
    expect(formatSpeakers('all')).toBe('all')
  })
})

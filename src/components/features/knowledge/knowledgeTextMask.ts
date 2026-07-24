/**
 * 知识库文本显示脱敏 helper
 *
 * 仅做显示层脱敏，不修改数据库原文、不修改搜索索引。
 * 复用 MaskContext 的 toggle 状态。
 *
 * 处理内容：
 * - 11 位手机号：138****5678
 * - 身份证号：保留前 4 后 4
 * - 银行卡号：保留前 4 后 4
 * - 金额表达：可选遮盖（不破坏业务语义）
 */

/** 脱敏手机号：保留前 3 后 4 */
function maskPhone(text: string): string {
  return text.replace(/1[3-9]\d{9}/g, (match) => {
    return match.substring(0, 3) + '****' + match.substring(7)
  })
}

/** 脱敏身份证号：保留前 4 后 4 */
function maskIdCard(text: string): string {
  // 18 位身份证号（最后一位可能是 X）
  return text.replace(/\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx]\b/g, (match) => {
    if (match.length <= 8) return match
    return match.substring(0, 4) + '****' + match.substring(match.length - 4)
  })
}

/** 脱敏银行卡号：保留前 4 后 4（16-19 位连续数字） */
function maskBankAccount(text: string): string {
  return text.replace(/\b[1-9]\d{15,18}\b/g, (match) => {
    if (match.length <= 8) return match
    return match.substring(0, 4) + '****' + match.substring(match.length - 4)
  })
}

/**
 * 对知识库文本进行显示脱敏
 * @param text 原始文本
 * @param masked 是否启用脱敏（来自 MaskContext.masked）
 * @returns 脱敏后的文本
 */
export function maskKnowledgeText(text: string, masked: boolean): string {
  if (!masked || !text) return text
  let result = text
  result = maskPhone(result)
  result = maskIdCard(result)
  result = maskBankAccount(result)
  return result
}

/**
 * 判断命中类型
 * @param hit 知识库命中
 * @returns 'mixed' | 'keyword' | 'semantic'
 */
export function getHitType(hit: {
  ftsRank?: number | null
  semanticRank?: number | null
}): 'mixed' | 'keyword' | 'semantic' {
  const hasFts = hit.ftsRank != null && hit.ftsRank > 0
  const hasSemantic = hit.semanticRank != null && hit.semanticRank > 0
  if (hasFts && hasSemantic) return 'mixed'
  if (hasFts) return 'keyword'
  return 'semantic'
}

/** 命中类型标签 */
export function getHitTypeLabel(type: 'mixed' | 'keyword' | 'semantic'): string {
  switch (type) {
    case 'mixed': return '混合命中'
    case 'keyword': return '关键词命中'
    case 'semantic': return '语义命中'
  }
}

/** 格式化说话人信息 */
export function formatSpeakers(speakers?: string | null): string {
  if (!speakers) return ''
  try {
    const parsed = typeof speakers === 'string' ? JSON.parse(speakers) : speakers
    if (Array.isArray(parsed)) {
      return parsed.map((s: any) => {
        if (typeof s === 'string') return s
        if (typeof s === 'object' && s.label) return s.label
        return String(s)
      }).join('、')
    }
    return String(parsed)
  } catch {
    return speakers
  }
}

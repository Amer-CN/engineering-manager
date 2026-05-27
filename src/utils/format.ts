/**
 * 格式化工具函数
 */

/**
 * 格式化金额（中文格式：千分位 + 去尾零）
 * 例：1234500 → "1,234,500"，1234.50 → "1,234.5"，1234.56 → "1,234.56"
 */
export function formatMoney(amount: number | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '0'
  const fixed = amount.toFixed(decimals)
  // 去掉尾部多余的 0 和小数点
  const trimmed = fixed.replace(/\.?0+$/, '')
  // 添加千分位
  const [int, dec] = trimmed.split('.')
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec ? `${formatted}.${dec}` : formatted
}

/**
 * 解析金额字符串（移除千分位）
 */
export function parseMoney(str: string): number {
  if (!str) return 0
  return parseFloat(str.replace(/,/g, '')) || 0
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 截断文本
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 驼峰转短横线
 */
export function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 短横线转驼峰
 */
export function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 生成随机ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

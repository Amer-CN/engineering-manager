/**
 * 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * 安全归一化日期显示 — 对已存库的各种脏数据容错
 * - 先用 parseDateString 尝试标准格式
 * - 再尝试宽松匹配（处理逗号代替点/多种混合分隔符）
 * - 仍失败则返回原值，不阻断显示
 */
export function normalizeDate(date: string | null | undefined): string {
  if (!date) return ''
  // 已经是标准格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const parsed = parseDateString(date)
  if (parsed) return parsed
  // 宽松匹配：各种分隔符混用（如 2025.4,10）
  const loose = String(date).trim().match(/^(\d{4})\s*[.,/\- ]\s*(\d{1,2})\s*[.,/\- ]\s*(\d{1,2})$/)
  if (loose) {
    const y = loose[1], mo = loose[2].padStart(2, '0'), d = loose[3].padStart(2, '0')
    const mNum = parseInt(mo), dNum = parseInt(d)
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${y}-${mo}-${d}`
    }
  }
  return date
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * 格式化日期为中文显示
 */
export function formatDateChinese(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 计算年龄
 */
export function calculateAge(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 0
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  if (isNaN(birth.getTime())) return 0
  
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return Math.max(0, age)
}

/**
 * 判断日期是否有效
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return !isNaN(d.getTime())
}

/**
 * 解析多种日期格式为 YYYY-MM-DD
 * 支持: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYYMMDD, YYYY年MM月DD日
 */
export function parseDateString(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const patterns = [
    { regex: /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/, order: [0, 1, 2] },
    { regex: /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/, order: [2, 0, 1] },
    { regex: /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/, order: [2, 1, 0] },
    { regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, order: [0, 1, 2] },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, order: [0, 1, 2] },
  ]
  for (const p of patterns) {
    const m = trimmed.match(p.regex)
    if (m) {
      const parts = p.order.map(i => parseInt(m[i + 1], 10))
      const [y, mo, d] = parts
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const dim = new Date(y, mo, 0).getDate()
        if (d <= dim) {
          // 仅对 DD/MM/YYYY 或 MM/DD/YYYY 模式做歧义消除（order[0]===2 表示年份是第一个捕获组）
          if (p.order[0] === 2) {
            const first = parseInt(m[1], 10)
            const second = parseInt(m[2], 10)
            if (first > 12 && second <= 12) return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
            if (second > 12 && first <= 12) return `${y.toString().padStart(4, '0')}-${d.toString().padStart(2, '0')}-${mo.toString().padStart(2, '0')}`
          }
          return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
        }
      }
    }
  }
  return null
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}月前`
  return `${Math.floor(diffDay / 365)}年前`
}

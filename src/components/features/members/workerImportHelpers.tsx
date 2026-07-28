import { Icon } from '../../ui/Icon'
import type { ImportState } from './useWorkerImport'

export function getConfidenceClass(
  importState: ImportState | null,
  key: string,
  onGetConfidence: (key: string) => number,
): string {
  if (!importState) return ''
  const colIdx = importState.mapping[key]
  if (colIdx >= 0 && onGetConfidence(key) >= 50) return 'border-success-300 bg-success-50'
  if (colIdx >= 0) return 'border-[color:var(--border)]'
  return 'border-danger-300 bg-danger-50'
}

export function getConfidenceIcon(
  importState: ImportState | null,
  key: string,
  onGetConfidence: (key: string) => number,
): JSX.Element | null {
  if (!importState) return null
  const colIdx = importState.mapping[key]
  if (colIdx >= 0 && onGetConfidence(key) >= 50) {
    return <Icon name="CheckCircle" size={14} className="text-success-500" />
  }
  if (colIdx >= 0) return null
  return <Icon name="AlertCircle" size={14} className="text-danger-400" />
}

export function validateRow(
  row: any[],
  mapping: Record<string, number>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const nameIdx = mapping['name']
  const idCardIdx = mapping['idCard']

  if (nameIdx >= 0) {
    const name = String(row[nameIdx] || '').trim()
    if (!name) errors.push('缺姓名')
  }
  if (idCardIdx >= 0) {
    const idCard = String(row[idCardIdx] || '').trim()
    if (!idCard) errors.push('缺身份证号')
    else if (idCard.length !== 18 || !/^\d{17}[\dXx]$/.test(idCard)) errors.push('身份证号格式错误')
  }
  return { valid: errors.length === 0, errors }
}

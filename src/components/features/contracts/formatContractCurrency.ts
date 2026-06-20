import { formatMoney } from '../../../utils/format'

/**
 * 智能格式化金额 (亿/万/元)
 * - >= 1 亿: 显示 X.XX 亿
 * - >= 1 万: 显示 X.XX 万
 * - 其他: 调用 formatMoney
 *
 * @param amount - 金额 (元, 整数)
 * @returns 格式化后的字符串
 */
export function formatContractCurrency(amount: number): string {
  if (amount >= 100000000) return (amount / 100000000).toFixed(2) + ' 亿'
  if (amount >= 10000) return (amount / 10000).toFixed(2) + ' 万'
  return formatMoney(amount)
}

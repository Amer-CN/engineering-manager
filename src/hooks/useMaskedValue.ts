import { useMask } from '../contexts/MaskContext'
import { maskIdCard, maskPhone, maskBankAccount, maskEmail } from '../utils/mask'

/**
 * useMaskedFn — v0.74.0 PII Mask toggle 响应式 helper (工厂版)
 *
 * 在组件顶层调用一次, 返回一个 (type, value) => string 的函数.
 * 之后在 .map / render callback 中调用这个函数即可 (不违反 hook 规则).
 *
 * 用法:
 *   function MyList() {
 *     const masked = useMaskedFn()
 *     return data.map(item => <span>{masked('idCard', item.idCard)}</span>)
 *   }
 *
 * masked=true (默认, 保守) -> 返回脱敏值
 * masked=false (用户 toggle 后) -> 返回原值
 *
 * 注: 后端 Common.MaskIdCard 已经做了一层响应层 mask, 这里再次 mask 是 double-mask.
 * 这是 v0.72.0 既有行为, 本 helper 不改.
 */
export function useMaskedFn(): (
  type: 'idCard' | 'phone' | 'bankAccount' | 'email',
  value: string | null | undefined
) => string {
  const { masked } = useMask()
  return (type, value) => {
    if (!value) return ''
    if (!masked) return String(value)
    switch (type) {
      case 'idCard': return maskIdCard(String(value))
      case 'phone': return maskPhone(String(value))
      case 'bankAccount': return maskBankAccount(String(value))
      case 'email': return maskEmail(String(value))
    }
  }
}

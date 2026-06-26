import { useState } from 'react'
import { useToastStore } from '@/store/toastStore'
import { validateCreditCode, isOnline, queryCompanyByCreditCode, queryCompanyByName, inferTaxTypeFromCreditCode, getTaxTypeLabel } from '../../../services/companyQuery'

export function useCompanyQuery(creditCode: string, setFormData: React.Dispatch<React.SetStateAction<Record<string, unknown>>>) {
  const [queryLoading, setQueryLoading] = useState(false)
  const showToast = useToastStore(state => state.showToast)

  // 按信用代码查询（原有功能）
  const handleQueryCreditCode = async () => {
    if (!creditCode) return
    const validation = validateCreditCode(creditCode)
    if (!validation.valid) { showToast(validation.message || '验证失败', 'error'); return }
    const inferred = inferTaxTypeFromCreditCode(creditCode)
    const label = inferred ? getTaxTypeLabel(inferred) : ''
    if (!isOnline()) { if (inferred) { setFormData((prev: Record<string, unknown>) => ({ ...prev, taxType: inferred })); showToast(`离线状态，已判断纳税资质为：${label}`, 'info') } else showToast('离线状态，无法联网查询', 'warning'); return }
    setQueryLoading(true)
    try {
      const info = await queryCompanyByCreditCode(creditCode)
      if (info) { setFormData((prev: Record<string, unknown>) => ({ ...prev, name: info.name || prev.name, registeredAddress: info.registeredAddress || prev.registeredAddress, businessScope: info.businessScope || prev.businessScope, taxType: info.taxType || inferred || prev.taxType })); showToast('已自动填充企业信息', 'success') }
      else if (inferred) { setFormData((prev: Record<string, unknown>) => ({ ...prev, taxType: inferred })); showToast(`未查询到完整信息，纳税资质：${label}`, 'warning') }
      else showToast('未查询到企业信息', 'error')
    } catch { if (inferred) { setFormData((prev: Record<string, unknown>) => ({ ...prev, taxType: inferred })); showToast(`纳税资质：${label}`, 'info') } else showToast('查询失败', 'error') }
    finally { setQueryLoading(false) }
  }

  // 按公司名称查询（新增功能）
  const handleQueryByName = async (companyName: string) => {
    if (!companyName || companyName.trim().length < 2) return
    setQueryLoading(true)
    try {
      const info = await queryCompanyByName(companyName)
      if (info) {
        setFormData((prev: Record<string, unknown>) => ({
          ...prev,
          name: info.name || prev.name,
          creditCode: info.creditCode || prev.creditCode,
          registeredAddress: info.registeredAddress || prev.registeredAddress,
          businessScope: info.businessScope || prev.businessScope,
          taxType: info.taxType || prev.taxType,
        }))
        return { success: true, message: '已自动填充企业信息' }
      }
      return { success: false, message: '未查询到该企业信息' }
    } catch {
      return { success: false, message: '查询失败，请检查网络' }
    } finally {
      setQueryLoading(false)
    }
  }

  return { queryLoading, handleQueryCreditCode, handleQueryByName }
}


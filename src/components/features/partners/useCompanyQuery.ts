import { useState } from 'react'
import { validateCreditCode, isOnline, queryCompanyByCreditCode, inferTaxTypeFromCreditCode, getTaxTypeLabel } from '../../../services/companyQuery'

export function useCompanyQuery(creditCode: string, setFormData: React.Dispatch<React.SetStateAction<any>>) {
  const [queryLoading, setQueryLoading] = useState(false)
  const handleQueryCreditCode = async () => {
    if (!creditCode) return
    const validation = validateCreditCode(creditCode)
    if (!validation.valid) { alert(validation.message); return }
    const inferred = inferTaxTypeFromCreditCode(creditCode)
    const label = inferred ? getTaxTypeLabel(inferred) : ''
    if (!isOnline()) { if (inferred) { setFormData((prev: any) => ({ ...prev, taxType: inferred })); alert(`离线状态，已判断纳税资质为：${label}`) } else alert('离线状态，无法联网查询'); return }
    setQueryLoading(true)
    try {
      const info = await queryCompanyByCreditCode(creditCode)
      if (info) { setFormData((prev: any) => ({ ...prev, name: info.name || prev.name, registeredAddress: info.registeredAddress || prev.registeredAddress, businessScope: info.businessScope || prev.businessScope, taxType: info.taxType || inferred || prev.taxType })); alert('已自动填充企业信息') }
      else if (inferred) { setFormData((prev: any) => ({ ...prev, taxType: inferred })); alert(`未查询到完整信息，纳税资质：${label}`) }
      else alert('未查询到企业信息')
    } catch { if (inferred) { setFormData((prev: any) => ({ ...prev, taxType: inferred })); alert(`纳税资质：${label}`) } else alert('查询失败') }
    finally { setQueryLoading(false) }
  }
  return { queryLoading, handleQueryCreditCode }
}

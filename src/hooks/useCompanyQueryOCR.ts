import { useCallback } from 'react'
import { queryCompanyInfo, type OCRResult } from '../services/ocr'
import { useToastStore } from '../store/toastStore'

interface CompanyQueryData {
  creditCode: string
  companyName: string
  legalPerson: string
  registeredCapital: string
  address: string
  businessScope: string
  establishDate: string
  expireDate: string
}

interface UseCompanyQueryOCRReturn {
  queryCompany: (companyName: string) => Promise<CompanyQueryData | null>
}

export function useCompanyQueryOCR(): UseCompanyQueryOCRReturn {
  const showToast = useToastStore(state => state.showToast)

  const queryCompany = useCallback(async (companyName: string): Promise<CompanyQueryData | null> => {
    if (!companyName || companyName.length < 2) {
      showToast('请输入至少2个字符的公司名称', 'error')
      return null
    }

    try {
      showToast('正在查询企业信息...', 'info')

      const result: OCRResult = await queryCompanyInfo(companyName)

      if (!result.success || !result.businessLicense) {
        showToast(result.error || '企业查询失败', 'error')
        return null
      }

      const company = result.businessLicense

      showToast('企业信息查询成功', 'success')
      return {
        creditCode: company.creditCode || '',
        companyName: company.companyName || '',
        legalPerson: company.legalPerson || '',
        registeredCapital: company.registeredCapital || '',
        address: company.address || '',
        businessScope: company.businessScope || '',
        establishDate: company.establishDate || '',
        expireDate: company.expireDate || ''
      }
    } catch (err: any) {
      showToast(`查询失败: ${err.message}`, 'error')
      return null
    }
  }, [showToast])

  return { queryCompany }
}

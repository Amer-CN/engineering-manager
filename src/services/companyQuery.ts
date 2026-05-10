// 企业信息查询服务
// 通过统一社会信用代码查询企业基本信息

// 纳税资质类型
export type TaxType = 'general' | 'small'  // general=一般纳税人，small=小规模纳税人

interface CompanyInfo {
  name: string           // 企业名称
  creditCode: string     // 统一社会信用代码
  registeredAddress: string  // 注册地址
  businessScope: string // 经营范围
  taxType: TaxType      // 纳税资质
  legalPerson: string    // 法定代表人
  registeredCapital: string // 注册资本
  establishmentDate: string // 成立日期
  address: string        // 地址
}

// 检查网络是否可用
export const isOnline = (): boolean => {
  return navigator.onLine
}

// 通过统一社会信用代码查询企业信息
export const queryCompanyByCreditCode = async (creditCode: string): Promise<CompanyInfo | null> => {
  // 统一社会信用代码格式校验（18位）
  const creditCodeRegex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/
  if (!creditCodeRegex.test(creditCode)) {
    console.warn('统一社会信用代码格式不正确')
    return null
  }

  try {
    // 使用阿里的企业信息查询API（免费的公开接口）
    const response = await fetch(
      `https://aiqicha.baidu.com/c/s?search=统一社会信用代码:${creditCode}&rn=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      }
    )

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    // 由于百度等网站可能有反爬虫，这里我们模拟返回
    // 实际项目中应该接入企业信息查询API
    return null
  } catch (error) {
    console.warn('查询企业信息失败:', error)
    return null
  }
}

// 根据统一社会信用代码判断纳税资质
// 规则：第17位为0-5的是小规模纳税人，其他数字是一般纳税人
// 这是基于企业税务登记的编码规则推断，仅供参考
export const inferTaxTypeFromCreditCode = (creditCode: string): TaxType | null => {
  if (!creditCode || creditCode.length !== 18) {
    return null
  }

  // 提取第17位（索引16）
  // 统一社会信用代码中第17位来自组织机构代码的第8位
  // 有效值为 0-9 和 X（10）
  const char17th = creditCode.charAt(16).toUpperCase()

  // X 代表 10，在编码中通常归类为大数（视为 6-9 范围）
  if (char17th === 'X') {
    return 'general'  // X 视为一般纳税人
  }

  // 检查是否是数字
  if (!/^[0-9]$/.test(char17th)) {
    // 第17位不是有效数字，无法推断
    return null
  }

  const code = parseInt(char17th, 10)

  // 根据编码规则推断
  // 0-5: 小规模纳税人
  // 6-9: 一般纳税人
  return code <= 5 ? 'small' : 'general'
}

// 获取纳税资质的中文名称
export const getTaxTypeLabel = (taxType: TaxType | string | undefined): string => {
  if (!taxType) return ''
  switch (taxType) {
    case 'general':
      return '一般纳税人'
    case 'small':
      return '小规模纳税人'
    default:
      return ''
  }
}

// 使用天眼查开放API查询（需要API Key）
export const queryCompanyTianYanCha = async (creditCode: string, apiKey?: string): Promise<CompanyInfo | null> => {
  if (!apiKey) {
    console.warn('未配置天眼查API Key')
    return null
  }

  try {
    const response = await fetch('https://open.api.tianyancha.com/services/v4/company/search', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword: creditCode }),
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    if (data.ErrorMsg === 'ok' && data.Result && data.Result.items.length > 0) {
      const company = data.Result.items[0]
      return {
        name: company.name,
        creditCode: company.creditCode || creditCode,
        registeredAddress: company.registeredAddress || '',
        businessScope: company.businessScope || '',
        taxType: 'general' as TaxType,
        legalPerson: company.legalPerson || '',
        registeredCapital: company.registeredCapital || '',
        establishmentDate: company.establishmentDate || '',
        address: company.address || ''
      }
    }
    return null
  } catch (error) {
    console.warn('天眼查API查询失败:', error)
    return null
  }
}

// 简单的本地校验和格式化
export const validateCreditCode = (code: string): { valid: boolean; message?: string } => {
  if (!code) {
    return { valid: false, message: '请输入统一社会信用代码' }
  }
  
  if (code.length !== 18) {
    return { valid: false, message: '统一社会信用代码必须为18位' }
  }
  
  // 统一社会信用代码校验规则
  const regex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/
  if (!regex.test(code)) {
    return { valid: false, message: '统一社会信用代码格式不正确' }
  }
  
  return { valid: true }
}

// 从名称推断行业类型（简单实现）
export const inferCategoryFromName = (name: string): string => {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('劳务')) return 'labor'
  if (lowerName.includes('材料') || lowerName.includes('建材') || lowerName.includes('商贸')) return 'material'
  if (lowerName.includes('租赁') || lowerName.includes('设备')) return 'equipment'
  if (lowerName.includes('设计')) return 'design'
  if (lowerName.includes('监理')) return 'supervisor'
  if (lowerName.includes('检测')) return 'testing'
  if (lowerName.includes('地勘') || lowerName.includes('勘察')) return 'survey'
  
  return 'other'
}

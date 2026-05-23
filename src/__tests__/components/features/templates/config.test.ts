import { categoryConfig, categoryColors } from '@/components/features/templates/config'

describe('templates/config', () => {
  describe('categoryConfig', () => {
    test('应包含所有模板分类', () => {
      const categories = Object.keys(categoryConfig)
      expect(categories).toContain('contract')
      expect(categories).toContain('settlement')
      expect(categories).toContain('seal_application')
      expect(categories).toContain('fund_application')
      expect(categories).toContain('official_document')
      expect(categories).toContain('letter')
      expect(categories).toContain('other')
    })

    test('每个分类都有必要字段', () => {
      for (const [, config] of Object.entries(categoryConfig)) {
        expect(config.label).toBeTruthy()
        expect(config.icon).toBeTruthy()
        expect(config.fileType).toBeTruthy()
        expect(config.description).toBeTruthy()
        expect(Array.isArray(config.defaultVariables)).toBe(true)
      }
    })

    test('合同模板有正确的变量定义', () => {
      const contractVars = categoryConfig.contract.defaultVariables
      const keys = contractVars.map(v => v.key)
      expect(keys).toContain('partyA')
      expect(keys).toContain('partyB')
      expect(keys).toContain('contractAmount')
      expect(keys).toContain('signedDate')
    })

    test('结算模板有正确的变量定义', () => {
      const vars = categoryConfig.settlement.defaultVariables
      const keys = vars.map(v => v.key)
      expect(keys).toContain('settlementName')
      expect(keys).toContain('settlementAmount')
      expect(keys).toContain('partyA')
      expect(keys).toContain('partyB')
    })

    test('其他分类默认变量为空', () => {
      expect(categoryConfig.other.defaultVariables).toEqual([])
    })
  })

  describe('categoryColors', () => {
    test('每个分类都有颜色配置', () => {
      for (const key of Object.keys(categoryConfig)) {
        expect(categoryColors[key as keyof typeof categoryColors]).toBeTruthy()
      }
    })

    test('合同模板为紫色', () => {
      expect(categoryColors.contract).toContain('violet')
    })

    test('结算模板为绿色', () => {
      expect(categoryColors.settlement).toContain('emerald')
    })
  })
})

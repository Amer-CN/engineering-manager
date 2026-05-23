import { HR_DEPT_COLORS, HR_STATUS_LABELS, HR_STATUS_COLORS } from '@/components/features/hr/config'

describe('HR config', () => {
  test('HR_DEPT_COLORS 应包含关键部门', () => {
    expect(HR_DEPT_COLORS['工程部']).toBeTruthy()
    expect(HR_DEPT_COLORS['财务部']).toBeTruthy()
    expect(HR_DEPT_COLORS['行政部']).toBeTruthy()
  })

  test('HR_STATUS_LABELS 应包含在职和离职', () => {
    expect(HR_STATUS_LABELS.active).toBe('在职')
    expect(HR_STATUS_LABELS.left).toBe('离职')
  })

  test('HR_STATUS_COLORS 应有对应样式类', () => {
    expect(HR_STATUS_COLORS.active).toContain('emerald')
    expect(HR_STATUS_COLORS.left).toContain('slate')
  })
})

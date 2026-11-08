import { getRetentionDisplayStatus, getRetentionStatusLabel } from '../../utils/settlementRetention'

describe('settlementRetention util (JS03 到期派生)', () => {
  it('无质保（空状态+空到期日）→ null', () => {
    expect(getRetentionDisplayStatus(null, null)).toBeNull()
    expect(getRetentionDisplayStatus('', '')).toBeNull()
    expect(getRetentionDisplayStatus(undefined, undefined)).toBeNull()
    expect(getRetentionStatusLabel(null, null)).toBeNull()
  })

  it('released 显式写最高优先（到期也不改判）', () => {
    expect(getRetentionDisplayStatus('released', '2020-01-01', '2026-09-18')).toBe('released')
    expect(getRetentionDisplayStatus('released', '2027-01-01', '2026-09-18')).toBe('released')
    expect(getRetentionStatusLabel('released', '2020-01-01', '2026-09-18')).toBe('已释放')
  })

  it('到期日过去（due_date<今天）→ due_to_collect', () => {
    expect(getRetentionDisplayStatus('in_warranty', '2020-01-01', '2026-09-18')).toBe('due_to_collect')
    expect(getRetentionStatusLabel('in_warranty', '2020-01-01', '2026-09-18')).toBe('已到期待收')
  })

  it('未到期 → 存量状态原值（in_warranty）', () => {
    expect(getRetentionDisplayStatus('in_warranty', '2027-06-30', '2026-09-18')).toBe('in_warranty')
    expect(getRetentionStatusLabel('in_warranty', '2027-06-30', '2026-09-18')).toBe('质保期内')
  })

  it('有到期日无状态 → 视为质保期内（未到期）/ 到期待收（已过期）', () => {
    expect(getRetentionDisplayStatus(null, '2027-06-30', '2026-09-18')).toBe('in_warranty')
    expect(getRetentionDisplayStatus('', '2020-01-01', '2026-09-18')).toBe('due_to_collect')
  })
})

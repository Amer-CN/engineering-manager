// @ts-nocheck
import { describe, it, expect } from 'vitest'
import {
  getWorkerTypeLabel,
  getRoleLabel,
  workerTypes,
  staffRoles,
  genders,
  politicalStatuses,
  maritalStatuses,
  memberStatuses,
  educationLevels,
  ethnicities,
} from '../../utils/member'

// ============================================================
//  getWorkerTypeLabel
// ============================================================
describe('getWorkerTypeLabel', () => {
  it('应返回全部已知工人类型的标签', () => {
    const cases: [string, string][] = [
      ['bricklayer', '砌筑工'],
      ['concrete',   '混凝土工'],
      ['carpenter',  '木工'],
      ['steel',      '钢筋工'],
      ['painter',    '抹灰工'],
      ['water',      '水电工'],
      ['welder',     '电焊工'],
      ['glass',      '玻璃工'],
      ['tile',       '防水工'],
      ['scaffolder', '架子工'],
      ['elevator',   '起重工'],
      ['mechanic',   '机械工'],
      ['truck_driver','司机'],
      ['foreman',    '班组长'],
      ['helper',     '小工/杂工'],
      ['other',      '其他工种'],
    ]
    cases.forEach(([value, label]) => {
      expect(getWorkerTypeLabel(value)).toBe(label)
    })
  })

  it('未匹配的值 → 返回原值（透传）', () => {
    expect(getWorkerTypeLabel('custom_type')).toBe('custom_type')
    expect(getWorkerTypeLabel('BRICKLAYER')).toBe('BRICKLAYER') // 区分大小写
    expect(getWorkerTypeLabel('  bricklayer  ')).toBe('  bricklayer  ') // 不裁剪空格
  })

  it('null → 未知', () => {
    expect(getWorkerTypeLabel(null)).toBe('未知')
  })

  it('undefined → 未知', () => {
    expect(getWorkerTypeLabel(undefined)).toBe('未知')
  })

  it('空字符串 → 未知', () => {
    expect(getWorkerTypeLabel('')).toBe('未知')
  })
})

// ============================================================
//  getRoleLabel
// ============================================================
describe('getRoleLabel', () => {
  it('应返回全部已知管理人员角色的标签', () => {
    const cases: [string, string][] = [
      ['manager',     '项目经理'],
      ['engineer',    '工程师'],
      ['technician',  '技术员'],
      ['safety',      '安全员'],
      ['quality',     '质量员'],
      ['cost',        '造价员'],
      ['material',    '材料员'],
      ['procurement', '采购员'],
      ['accountant',  '会计'],
      ['hr',          '人事'],
      ['admin',       '行政'],
      ['other',       '其他'],
    ]
    cases.forEach(([value, label]) => {
      expect(getRoleLabel(value)).toBe(label)
    })
  })

  it('未匹配的值 → 返回原值（透传）', () => {
    expect(getRoleLabel('custom_role')).toBe('custom_role')
    expect(getRoleLabel('MANAGER')).toBe('MANAGER') // 区分大小写
  })

  it('null → 未知', () => {
    expect(getRoleLabel(null)).toBe('未知')
  })

  it('undefined → 未知', () => {
    expect(getRoleLabel(undefined)).toBe('未知')
  })

  it('空字符串 → 未知', () => {
    expect(getRoleLabel('')).toBe('未知')
  })
})

// ============================================================
//  常量结构完整性
// ============================================================
describe('workerTypes 常量', () => {
  it('应为非空数组，每项含 value 和 label', () => {
    expect(Array.isArray(workerTypes)).toBe(true)
    expect(workerTypes.length).toBeGreaterThan(0)
    workerTypes.forEach(item => {
      expect(item).toHaveProperty('value')
      expect(item).toHaveProperty('label')
      expect(typeof item.value).toBe('string')
      expect(typeof item.label).toBe('string')
      expect(item.value.length).toBeGreaterThan(0)
      expect(item.label.length).toBeGreaterThan(0)
    })
  })

  it('value 值不重复', () => {
    const values = workerTypes.map(t => t.value)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('label 值不重复', () => {
    const labels = workerTypes.map(t => t.label)
    const unique = new Set(labels)
    expect(unique.size).toBe(labels.length)
  })

  it('包含 16 个工种', () => {
    expect(workerTypes.length).toBe(16)
  })
})

describe('staffRoles 常量', () => {
  it('应为非空数组，每项含 value 和 label', () => {
    expect(Array.isArray(staffRoles)).toBe(true)
    expect(staffRoles.length).toBeGreaterThan(0)
    staffRoles.forEach(item => {
      expect(item).toHaveProperty('value')
      expect(item).toHaveProperty('label')
      expect(typeof item.value).toBe('string')
      expect(typeof item.label).toBe('string')
      expect(item.value.length).toBeGreaterThan(0)
      expect(item.label.length).toBeGreaterThan(0)
    })
  })

  it('value 值不重复', () => {
    const values = staffRoles.map(r => r.value)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('label 值不重复', () => {
    const labels = staffRoles.map(r => r.label)
    const unique = new Set(labels)
    expect(unique.size).toBe(labels.length)
  })

  it('包含 12 个角色', () => {
    expect(staffRoles.length).toBe(12)
  })
})

describe('genders 常量', () => {
  it('包含男/女两项', () => {
    expect(genders.length).toBe(2)
    const values = genders.map(g => g.value)
    expect(values).toContain('male')
    expect(values).toContain('female')
  })

  it('标签正确', () => {
    const male = genders.find(g => g.value === 'male')
    const female = genders.find(g => g.value === 'female')
    expect(male?.label).toBe('男')
    expect(female?.label).toBe('女')
  })
})

describe('politicalStatuses 常量', () => {
  it('包含 4 种政治面貌', () => {
    expect(politicalStatuses.length).toBe(4)
  })

  it('包含群众/共青团员/中共党员/民主党派', () => {
    const labels = politicalStatuses.map(p => p.label)
    expect(labels).toContain('群众')
    expect(labels).toContain('共青团员')
    expect(labels).toContain('中共党员')
    expect(labels).toContain('民主党派')
  })
})

describe('maritalStatuses 常量', () => {
  it('包含 4 种婚姻状况', () => {
    expect(maritalStatuses.length).toBe(4)
  })

  it('包含未婚/已婚/离异/丧偶', () => {
    const labels = maritalStatuses.map(m => m.label)
    expect(labels).toContain('未婚')
    expect(labels).toContain('已婚')
    expect(labels).toContain('离异')
    expect(labels).toContain('丧偶')
  })
})

describe('memberStatuses 常量', () => {
  it('包含在职/离场/调离三种状态', () => {
    expect(memberStatuses.length).toBe(3)
    const values = memberStatuses.map(s => s.value)
    expect(values).toContain('active')
    expect(values).toContain('left')
    expect(values).toContain('transferred')
  })

  it('标签正确', () => {
    const active = memberStatuses.find(s => s.value === 'active')
    const left = memberStatuses.find(s => s.value === 'left')
    const transferred = memberStatuses.find(s => s.value === 'transferred')
    expect(active?.label).toBe('在职')
    expect(left?.label).toBe('离场')
    expect(transferred?.label).toBe('调离')
  })
})

describe('educationLevels 常量', () => {
  it('包含 7 个学历层次', () => {
    expect(educationLevels.length).toBe(7)
  })

  it('从小学到博士完整', () => {
    const values = educationLevels.map(e => e.value)
    expect(values).toContain('primary')
    expect(values).toContain('junior')
    expect(values).toContain('senior')
    expect(values).toContain('college')
    expect(values).toContain('bachelor')
    expect(values).toContain('master')
    expect(values).toContain('doctor')
  })

  it('标签正确', () => {
    const map = Object.fromEntries(educationLevels.map(e => [e.value, e.label]))
    expect(map['primary']).toBe('小学')
    expect(map['junior']).toBe('初中')
    expect(map['senior']).toBe('高中/中专')
    expect(map['college']).toBe('大专')
    expect(map['bachelor']).toBe('本科')
    expect(map['master']).toBe('硕士')
    expect(map['doctor']).toBe('博士')
  })
})

describe('ethnicities 常量', () => {
  it('应为非空数组', () => {
    expect(Array.isArray(ethnicities)).toBe(true)
    expect(ethnicities.length).toBeGreaterThan(0)
  })

  it('包含汉族', () => {
    expect(ethnicities).toContain('汉族')
  })

  it('包含中国 56 个民族（满 56 项）', () => {
    expect(ethnicities.length).toBe(56)
  })

  it('每项均为非空字符串', () => {
    ethnicities.forEach(name => {
      expect(typeof name).toBe('string')
      expect(name.length).toBeGreaterThan(0)
    })
  })

  it('民族名称不重复', () => {
    const unique = new Set(ethnicities)
    expect(unique.size).toBe(ethnicities.length)
  })
})

// ============================================================
//  getWorkerTypeLabel / getRoleLabel 与常量数组一致性
// ============================================================
describe('函数与常量一致性', () => {
  it('getWorkerTypeLabel 可正确解析 workerTypes 中所有 value', () => {
    workerTypes.forEach(({ value, label }) => {
      expect(getWorkerTypeLabel(value)).toBe(label)
    })
  })

  it('getRoleLabel 可正确解析 staffRoles 中所有 value', () => {
    staffRoles.forEach(({ value, label }) => {
      expect(getRoleLabel(value)).toBe(label)
    })
  })
})

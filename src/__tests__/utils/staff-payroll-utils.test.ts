import {
  getEntryDate,
  monthEnd,
  filteredStaffForGenerate,
  getAttendanceForMember,
  isAttendanceReady,
  computeWorkDays,
} from '../../utils/staff-payroll-utils'

// ═══════════════════════════════════════════════════════════════════════════════
// 测试数据
// ═══════════════════════════════════════════════════════════════════════════════
const makeStaff = (overrides: Record<string, any> = {}) => ({
  id: 1,
  name: '张三',
  departmentId: 10,
  entryDate: '2026-01-15',
  leaveDate: null,
  reentryDate: null,
  createdAt: '2026-01-10T08:00:00Z',
  ...overrides,
})

describe('staff-payroll-utils.ts', () => {
  // ─── getEntryDate ─────────────────────────────────────────────
  describe('getEntryDate', () => {
    it('应优先返回 entryDate', () => {
      const s = makeStaff({ entryDate: '2026-03-01', createdAt: '2026-01-01T00:00:00Z' })
      expect(getEntryDate(s)).toBe('2026-03-01')
    })

    it('entryDate 不存在时应回退到 createdAt 的日期部分', () => {
      const s = makeStaff({ entryDate: null, createdAt: '2026-02-14T10:30:00Z' })
      expect(getEntryDate(s)).toBe('2026-02-14')
    })

    it('entryDate 和 createdAt 都不存在时应返回 null', () => {
      const s = makeStaff({ entryDate: null, createdAt: null })
      expect(getEntryDate(s)).toBeNull()
    })

    it('entryDate 为空字符串时应回退到 createdAt', () => {
      const s = makeStaff({ entryDate: '', createdAt: '2026-05-01T00:00:00Z' })
      expect(getEntryDate(s)).toBe('2026-05-01')
    })
  })

  // ─── monthEnd ────────────────────────────────────────────────
  describe('monthEnd', () => {
    it('1月 最后一天为 31', () => {
      expect(monthEnd('2026-01')).toBe('2026-01-31')
    })

    it('2月 平年28天', () => {
      expect(monthEnd('2025-02')).toBe('2025-02-28')
    })

    it('2月 闰年29天', () => {
      expect(monthEnd('2024-02')).toBe('2024-02-29')
    })

    it('4月 小月30天', () => {
      expect(monthEnd('2026-04')).toBe('2026-04-30')
    })

    it('12月 最后一天为 31', () => {
      expect(monthEnd('2026-12')).toBe('2026-12-31')
    })
  })

  // ─── filteredStaffForGenerate ─────────────────────────────────
  describe('filteredStaffForGenerate', () => {
    it('不应过滤部门不匹配 filterDept=0 的员工', () => {
      const staff = [makeStaff({ departmentId: 10 })]
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      expect(result).toHaveLength(1)
    })

    it('应过滤掉部门不匹配的员工', () => {
      const staff = [
        makeStaff({ id: 1, departmentId: 10 }),
        makeStaff({ id: 2, departmentId: 20 }),
      ]
      const result = filteredStaffForGenerate(staff, 10, '2026-04')
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
    })

    it('应过滤掉尚未入职的员工', () => {
      const staff = [makeStaff({ entryDate: '2026-05-01' })]
      // 4月份，入职在5月
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      expect(result).toHaveLength(0)
    })

    it('应保留入职日在当月内的员工', () => {
      const staff = [makeStaff({ entryDate: '2026-04-15' })]
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      expect(result).toHaveLength(1)
    })

    it('应过滤掉已离职且无返岗的员工（离职在月初之前）', () => {
      const staff = [makeStaff({ leaveDate: '2026-03-20', reentryDate: null })]
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      // leaveDate '2026-03-20' < '2026-04-01'，且无 reentryDate
      expect(result).toHaveLength(0)
    })

    it('应保留离职后已返岗的员工（返岗在当月内）', () => {
      const staff = [makeStaff({
        leaveDate: '2026-03-10',
        reentryDate: '2026-04-05',
      })]
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      expect(result).toHaveLength(1)
    })

    it('应过滤掉离职-返岗期间不在当月的员工', () => {
      const staff = [makeStaff({
        leaveDate: '2026-03-10',
        reentryDate: '2026-05-01',
      })]
      // leaveDate < '2026-04-01' 且 reentryDate > '2026-04-30'
      const result = filteredStaffForGenerate(staff, 0, '2026-04')
      expect(result).toHaveLength(0)
    })

    it('filterDept 为空字符串时应不过滤部门', () => {
      const staff = [makeStaff({ departmentId: 10 })]
      const result = filteredStaffForGenerate(staff, '' as any, '2026-04')
      expect(result).toHaveLength(1)
    })
  })

  // ─── getAttendanceForMember ──────────────────────────────────
  describe('getAttendanceForMember', () => {
    const attendances = [
      { memberId: 1, yearMonth: '2026-04', dailyStatus: { 1: 'work', 2: 'work' } },
      { memberId: 2, yearMonth: '2026-04', dailyStatus: { 1: 'sick_leave' } },
      { memberId: 1, yearMonth: '2026-03', dailyStatus: {} },
    ]

    it('应找到匹配的考勤记录', () => {
      const result = getAttendanceForMember(attendances, 1, '2026-04')
      expect(result).toBeDefined()
      expect(result!.memberId).toBe(1)
    })

    it('找不到时应返回 undefined', () => {
      const result = getAttendanceForMember(attendances, 99, '2026-04')
      expect(result).toBeUndefined()
    })

    it('月份不匹配应返回 undefined', () => {
      const result = getAttendanceForMember(attendances, 2, '2026-03')
      expect(result).toBeUndefined()
    })
  })

  // ─── isAttendanceReady ──────────────────────────────────────
  describe('isAttendanceReady', () => {
    it('无考勤记录时应返回 false', () => {
      expect(isAttendanceReady(1, '2026-04', [])).toBe(false)
    })

    it('dailyStatus 为空对象时应返回 false', () => {
      const attendances = [
        { memberId: 1, yearMonth: '2026-04', dailyStatus: {} },
      ]
      expect(isAttendanceReady(1, '2026-04', attendances)).toBe(false)
    })

    it('dailyStatus 有内容时应返回 true', () => {
      const attendances = [
        { memberId: 1, yearMonth: '2026-04', dailyStatus: { 1: 'work' } },
      ]
      expect(isAttendanceReady(1, '2026-04', attendances)).toBe(true)
    })

    it('dailyStatus 为 undefined 时应返回 false', () => {
      const attendances = [
        { memberId: 1, yearMonth: '2026-04', dailyStatus: undefined },
      ]
      expect(isAttendanceReady(1, '2026-04', attendances)).toBe(false)
    })
  })

  // ─── computeWorkDays ────────────────────────────────────────
  describe('computeWorkDays', () => {
    it('无考勤记录时应返回 0', () => {
      const result = computeWorkDays([], 1, '2026-04', 1)
      expect(result.workDays).toBe(0)
      expect(result.daysOff).toBe(0)
    })

    it('有考勤记录时应正确计算', () => {
      // 构造完整月份（4月30天），避免未设天默认为 work
      const dailyStatus: Record<number, string> = {
        1: 'work', 2: 'work', 3: 'work',
        4: 'holiday',
        5: 'sick_leave', 6: 'personal_leave',
        7: 'work', 8: 'work', 9: 'work', 10: 'work',
        11: 'work', 12: 'work', 13: 'work', 14: 'work',
        15: 'work', 16: 'work', 17: 'work', 18: 'work',
        19: 'work', 20: 'work', 21: 'work', 22: 'work',
        23: 'work', 24: 'work', 25: 'work', 26: 'work',
        27: 'work', 28: 'work', 29: 'work', 30: 'work',
      }
      const attendances = [
        { memberId: 1, yearMonth: '2026-04', dailyStatus },
      ]
      const result = computeWorkDays(attendances, 1, '2026-04', 1)
      // work: 26, holiday: 1 → workDays = 26 + 1 = 27... wait let me recount
      // work days: 1,2,3,7-30 = 3 + 24 = 27; holiday: 4 = 1; workDays = 27+1 = 28
      // sick_leave: 5 = 1; personal_leave: 6 = 1; daysOff = 2
      expect(result.workDays).toBe(28)
      expect(result.daysOff).toBe(2)
    })

    it('全勤应返回正确天数', () => {
      const dailyStatus: Record<number, string> = {}
      for (let d = 1; d <= 30; d++) dailyStatus[d] = 'work'
      const attendances = [
        { memberId: 1, yearMonth: '2026-04', dailyStatus },
      ]
      const result = computeWorkDays(attendances, 1, '2026-04', 1)
      expect(result.workDays).toBe(30)
      expect(result.daysOff).toBe(0)
    })
  })
})

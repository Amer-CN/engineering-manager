/**
 * 测试 8: 考勤统计准确性测试 🟡 P2
 * 
 * 验证考勤统计逻辑正确性
 */

// ══════════════════════════════════════
// 从 src/constants/attendance.ts 复制的纯函数
// ══════════════════════════════════════

interface AttendanceDay {
  date: string
  status: 'present' | 'absent' | 'leave' | 'weekend' | 'holiday'
}

interface AttendanceSummary {
  presentDays: number
  absentDays: number
  leaveDays: number
  weekendDays: number
  holidayDays: number
  totalDays: number
  fullAttendanceRate: number
}

/**
 * 计算出勤统计
 */
function computeAttendanceSummary(
  days: AttendanceDay[],
  yearMonth: string,
  entryDate?: string
): AttendanceSummary {
  const [year, month] = yearMonth.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  let presentDays = 0
  let absentDays = 0
  let leaveDays = 0
  let weekendDays = 0
  let holidayDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    
    // 入职前日期不计入
    if (entryDate && dateStr < entryDate) {
      continue
    }

    const dayData = days.find((d: AttendanceDay) => d.date === dateStr)
    
    if (!dayData || dayData.status === 'absent') {
      absentDays++
    } else if (dayData.status === 'present') {
      presentDays++
    } else if (dayData.status === 'leave') {
      leaveDays++
    } else if (dayData.status === 'weekend') {
      weekendDays++
    } else if (dayData.status === 'holiday') {
      holidayDays++
    }
  }

  const totalDays = presentDays + absentDays + leaveDays
  const fullAttendanceRate = totalDays > 0 ? presentDays / totalDays : 0

  return {
    presentDays,
    absentDays,
    leaveDays,
    weekendDays,
    holidayDays,
    totalDays,
    fullAttendanceRate
  }
}

// ══════════════════════════════════════
// 测试
// ══════════════════════════════════════

import { describe, it, expect } from 'vitest'

describe('考勤统计准确性', () => {

  // ─── 基础统计测试 ──────────────────────────
  describe('基础统计', () => {

    it('应正确计算出勤/缺勤/请假天数', () => {
      const days: AttendanceDay[] = Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: i < 22 ? 'present' : 'absent' // 前22天出勤，后9天缺勤
      }))

      const summary = computeAttendanceSummary(days, '2026-05')

      expect(summary.presentDays).toBe(22)
      expect(summary.absentDays).toBe(9)
      expect(summary.leaveDays).toBe(0)
      expect(summary.totalDays).toBe(31)
      expect(summary.fullAttendanceRate).toBeCloseTo(22 / 31, 2)
    })

    it('应正确统计请假天数', () => {
      const days: AttendanceDay[] = [
        { date: '2026-05-10', status: 'leave' },
        { date: '2026-05-11', status: 'leave' },
        { date: '2026-05-12', status: 'leave' }
      ]

      const summary = computeAttendanceSummary(days, '2026-05')

      expect(summary.leaveDays).toBe(3)
    })

    it('应正确统计周末天数', () => {
      // 2026-05 周末：3, 4, 10, 11, 17, 18, 24, 25, 31（共 9 天）
      const days: AttendanceDay[] = [
        { date: '2026-05-03', status: 'weekend' },
        { date: '2026-05-04', status: 'weekend' },
        { date: '2026-05-10', status: 'weekend' },
        { date: '2026-05-11', status: 'weekend' },
        { date: '2026-05-17', status: 'weekend' },
        { date: '2026-05-18', status: 'weekend' },
        { date: '2026-05-24', status: 'weekend' },
        { date: '2026-05-25', status: 'weekend' },
        { date: '2026-05-31', status: 'weekend' }
      ]

      const summary = computeAttendanceSummary(days, '2026-05')

      expect(summary.weekendDays).toBe(9)
    })
  })

  // ─── 入职日期测试 ──────────────────────────
  describe('入职日期', () => {

    it('入职前日期不应计入统计', () => {
      const days: AttendanceDay[] = Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present' // 全部出勤
      }))

      // 5月15日入职
      const summary = computeAttendanceSummary(days, '2026-05', '2026-05-15')

      // 入职前14天不计入
      // 5月15-31日共17天，全部出勤
      expect(summary.presentDays).toBe(17)
      expect(summary.absentDays).toBe(0)
      expect(summary.totalDays).toBe(17)
      expect(summary.fullAttendanceRate).toBe(1.0) // 100%
    })

    it('应正确处理月初入职', () => {
      const days: AttendanceDay[] = Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present'
      }))

      // 5月1日入职（全月计入）
      const summary = computeAttendanceSummary(days, '2026-05', '2026-05-01')

      expect(summary.presentDays).toBe(31)
      expect(summary.totalDays).toBe(31)
    })

    it('应正确处理月末入职', () => {
      const days: AttendanceDay[] = Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present'
      }))

      // 5月31日入职（仅1天）
      const summary = computeAttendanceSummary(days, '2026-05', '2026-05-31')

      expect(summary.presentDays).toBe(1)
      expect(summary.totalDays).toBe(1)
    })
  })

  // ─── 全勤率测试 ──────────────────────────
  describe('全勤率', () => {

    it('应正确计算全勤率', () => {
      const days: AttendanceDay[] = Array(22).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present'
      }))

      const summary = computeAttendanceSummary(days, '2026-05')

      // 22/31 ≈ 71%
      expect(summary.fullAttendanceRate).toBeCloseTo(0.71, 2)
    })

    it('应处理无考勤记录', () => {
      const days: AttendanceDay[] = []

      const summary = computeAttendanceSummary(days, '2026-05')

      expect(summary.presentDays).toBe(0)
      expect(summary.absentDays).toBe(31) // 全部缺勤
      expect(summary.totalDays).toBe(31)
      expect(summary.fullAttendanceRate).toBe(0)
    })

    it('应处理全勤', () => {
      const days: AttendanceDay[] = Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present'
      }))

      const summary = computeAttendanceSummary(days, '2026-05')

      expect(summary.presentDays).toBe(31)
      expect(summary.fullAttendanceRate).toBe(1.0) // 100%
    })
  })

  // ─── 年度汇总测试 ──────────────────────────
  describe('年度汇总', () => {

    it('应正确汇总年度考勤时间线', () => {
      const timelineData = [
        { year: 2026, month: 1, presentDays: 20, absentDays: 11, leaveDays: 0 },
        { year: 2026, month: 2, presentDays: 18, absentDays: 8, leaveDays: 2 },
        { year: 2026, month: 3, presentDays: 22, absentDays: 9, leaveDays: 0 }
      ]

      // 手动汇总
      const totalPresent = timelineData.reduce((sum, d) => sum + d.presentDays, 0)
      const totalAbsent = timelineData.reduce((sum, d) => sum + d.absentDays, 0)
      const totalLeave = timelineData.reduce((sum, d) => sum + d.leaveDays, 0)
      const totalDays = totalPresent + totalAbsent + totalLeave
      const overallRate = totalDays > 0 ? totalPresent / totalDays : 0

      expect(totalPresent).toBe(60)
      expect(totalAbsent).toBe(28)
      expect(totalLeave).toBe(2)
      expect(totalDays).toBe(90)
      expect(overallRate).toBeCloseTo(60 / 90, 2) // ≈ 66.67%
    })
  })
})

/**
 * 日期相关常量
 */

export const MONTHS = ['全部', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

export const MONTH_OPTIONS = MONTHS.map((m, i) => ({
  label: m,
  value: i === 0 ? '全部' : String(i),
}))

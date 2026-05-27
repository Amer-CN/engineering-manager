import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface DashboardData {
  totalStaff: number
  newThisMonth: number
  leftThisMonth: number
  monthlyPayroll: number
  monthlyPayrollEstimated: number
  todayPresent: number
  todayLeave: number
  deptDistribution: { name: string; value: number }[]
  recentStaff: { id: number; name: string; departmentId?: number; position?: string; createdAt: string }[]
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']

const HRDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData>({
    totalStaff: 0, newThisMonth: 0, leftThisMonth: 0, monthlyPayroll: 0, monthlyPayrollEstimated: 0,
    todayPresent: 0, todayLeave: 0, deptDistribution: [], recentStaff: []
  })
  const [loading, setLoading] = useState(true)
  const [depts, setDepts] = useState<any[]>([])

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, memberRes, wageRes, attRes] = await Promise.allSettled([
          window.electronAPI.getDepartments(),
          window.electronAPI.getMembers(),
          window.electronAPI.getWages(undefined, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`),
          window.electronAPI.getAttendances(undefined, `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
        ])
        const get = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' && r.value?.success ? r.value.data || [] : []
        const deptList = get(deptRes)
        const members = get(memberRes)
        const wages = get(wageRes)
        const attendances = get(attRes)
        const staff = members.filter((m: any) => m.memberType === 'staff' || !m.memberType)
        const now = new Date()
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        const today = now.getDate()

        const getEntryDate = (m: any) => m.entryDate || (m.createdAt ? m.createdAt.split('T')[0] : null)
        const newThisMonth = staff.filter((m: any) => (getEntryDate(m) || '').startsWith(thisMonth)).length
        const activeStaff = staff.filter((m: any) => m.status !== 'left')
        const leftThisMonth = staff.filter((m: any) => m.status === 'left').length

        // Actual payroll from wage records
        const monthlyPayroll = wages.reduce((sum: number, w: any) => sum + ((w.netSalary || 0) + (w.bonus || 0) - (w.deduction || 0)), 0)
        const monthlyPayrollEstimated = activeStaff.reduce((sum: number, m: any) => sum + (m.baseSalary || 0), 0)

        // Today's attendance
        let todayPresent = 0
        let todayLeave = 0
        for (const s of activeStaff) {
          const att = attendances.find((a: any) => a.memberId === s.id && a.yearMonth === thisMonth)
          if (att?.dailyStatus) {
            const dayStatus = att.dailyStatus[today]
            if (dayStatus === 'work' || dayStatus === 'holiday') {
              todayPresent++
            } else if (dayStatus === 'sick_leave' || dayStatus === 'personal_leave') {
              todayLeave++
            }
          }
        }

        setDepts(deptList)
        setData({
          totalStaff: activeStaff.length,
          newThisMonth,
          leftThisMonth,
          monthlyPayroll,
          monthlyPayrollEstimated,
          todayPresent,
          todayLeave,
          deptDistribution: deptList.map((d: any) => ({ name: d.name, value: d.memberCount || 0 })).filter((d: any) => d.value > 0),
          recentStaff: staff.sort((a: any, b: any) => new Date(getEntryDate(b) || 0).getTime() - new Date(getEntryDate(a) || 0).getTime()).slice(0, 8)
        })
      } catch (e) { console.error('HR dashboard load error:', e) }
      finally { setLoading(false) }
    })()
  }, [])

  if (loading) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
  }

  const payrollDiff = data.monthlyPayroll - data.monthlyPayrollEstimated

  const kpis = [
    { label: '在编人数', value: data.totalStaff, unit: '人', icon: 'Users', color: 'bg-indigo-50 text-indigo-600' },
    { label: '本月入职', value: data.newThisMonth, unit: '人', icon: 'UserCheck', color: 'bg-emerald-50 text-emerald-600' },
    { label: '本月离职', value: data.leftThisMonth, unit: '人', icon: 'LogOut', color: 'bg-red-50 text-red-600' },
    { label: '今日在岗', value: data.todayPresent, unit: `人 · 请假${data.todayLeave}`, icon: 'CalendarCheck', color: 'bg-emerald-50 text-emerald-600' },
    {
      label: '月度薪酬', value: data.monthlyPayroll, unit: '元',
      icon: 'Banknote', color: 'bg-amber-50 text-amber-600',
      suffix: data.monthlyPayroll > 0 && payrollDiff !== 0 ? (
        <span className={`text-xs ${payrollDiff < 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
          比预算{payrollDiff < 0 ? '节省' : '超出'} {Math.abs(payrollDiff).toLocaleString()}
        </span>
      ) : null
    },
  ]

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <motion.div key={kpi.label} className="bg-white rounded-xl shadow-sm p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{kpi.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color}`}>
                <Icon name={kpi.icon} size={18} />
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-800">{kpi.value.toLocaleString()}</span>
              <span className="text-sm text-slate-400">{kpi.unit}</span>
            </div>
            {kpi.suffix && <div className="mt-1">{kpi.suffix}</div>}
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">部门人数分布</h3>
          {data.deptDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={data.deptDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value">
                  {data.deptDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: 'var(--shadow-md)', color: 'var(--fg)' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-slate-400">暂无部门数据</div>
          )}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {data.deptDistribution.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{d.name}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">最近入职</h3>
          {data.recentStaff.length > 0 ? (
            <div className="space-y-2">
              {data.recentStaff.map((s) => {
                const dept = depts.find((d: any) => d.id === s.departmentId)
                return (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{s.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{dept?.name || ''}{s.position ? ` · ${s.position}` : ''}</span>
                    </div>
                    <span className="text-xs text-slate-400">{(s as any).entryDate || s.createdAt?.split('T')[0]}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 text-sm text-slate-400">暂无人员数据</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default HRDashboard

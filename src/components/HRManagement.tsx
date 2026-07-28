import React, { useState, useCallback } from 'react'
import { Tabs } from './ui/Tabs'
import HRDashboard from './features/hr/HRDashboard'
import StaffList from './features/hr/StaffList'
import StaffAttendance from './features/hr/StaffAttendance'
import DepartmentManager from './features/hr/DepartmentManager'
import PayrollPage from './features/payroll/PayrollPage'

const TAB_KEY = 'hr_active_tab'
const TABS = [
  { id: 'dashboard', label: '看板', icon: 'LayoutDashboard' },
  { id: 'staff', label: '人员档案', icon: 'Users' },
  { id: 'attendance', label: '考勤管理', icon: 'Calendar' },
  { id: 'payroll', label: '薪酬管理', icon: 'Banknote' },
  { id: 'departments', label: '部门管理', icon: 'Building2' },
]

const HRManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem(TAB_KEY) || 'dashboard')

  const setTab = useCallback((id: string) => {
    setActiveTab(id)
    localStorage.setItem(TAB_KEY, id)
  }, [])

  return (
    <div className="h-[calc(100vh-60px)] flex flex-col overflow-hidden p-6">
      {/* 页面标题 - 固定高度 */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-[color:var(--border)] shrink-0">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">人事管理</h1>
          <p className="text-[color:var(--muted)] mt-1">管理人员档案、考勤、薪酬与部门架构</p>
        </div>
      </div>

      {/* Tab 导航 - 填满剩余空间 */}
      <Tabs
        value={activeTab}
        onChange={setTab}
        tabs={TABS.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
        animated={true}
        className="flex-1 flex flex-col min-h-0"
        contentClassName="flex-1 flex flex-col min-h-0"
      >
        {activeTab === 'dashboard' && <HRDashboard />}
        {activeTab === 'staff' && <StaffList />}
        {activeTab === 'attendance' && <StaffAttendance />}
        {activeTab === 'payroll' && <PayrollPage mode="staff" />}
        {activeTab === 'departments' && <DepartmentManager />}
      </Tabs>
    </div>
  )
}

export default HRManagement

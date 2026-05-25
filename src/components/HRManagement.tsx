import React, { useState, useCallback } from 'react'
import { Tabs } from './ui/Tabs'
import HRDashboard from './features/hr/HRDashboard'
import StaffList from './features/hr/StaffList'
import StaffAttendance from './features/hr/StaffAttendance'
import StaffPayroll from './features/hr/StaffPayroll'
import DepartmentManager from './features/hr/DepartmentManager'

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
    <div className="p-6 max-w-[1400px] mx-auto min-h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">人事管理</h1>
        <p className="text-slate-500 mt-1">管理人员档案、考勤、薪酬与部门架构</p>
      </div>

      {/* Tab 导航 (统一 Tabs 组件) */}
      <Tabs
        value={activeTab}
        onChange={setTab}
        tabs={TABS.map(tab => ({ key: tab.id, label: tab.label, icon: tab.icon }))}
        animated={true}
      >
        {/* Tab 内容 */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'dashboard' && <HRDashboard />}
          {activeTab === 'staff' && <StaffList />}
          {activeTab === 'attendance' && <StaffAttendance />}
          {activeTab === 'payroll' && <StaffPayroll />}
          {activeTab === 'departments' && <DepartmentManager />}
        </div>
      </Tabs>
    </div>
  )
}

export default HRManagement

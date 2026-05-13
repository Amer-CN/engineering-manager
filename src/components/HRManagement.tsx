import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { useToastContext } from '../hooks/useToast'
import { Department } from '../types/electron'
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
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">人事管理</h1>
        <p className="text-slate-500 mt-1">管理人员档案、考勤、薪酬与部门架构</p>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-indigo-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="hr-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {activeTab === 'dashboard' && <HRDashboard />}
        {activeTab === 'staff' && <StaffList />}
        {activeTab === 'attendance' && <StaffAttendance />}
        {activeTab === 'payroll' && <StaffPayroll />}
        {activeTab === 'departments' && <DepartmentManager />}
      </motion.div>
    </div>
  )
}

export default HRManagement

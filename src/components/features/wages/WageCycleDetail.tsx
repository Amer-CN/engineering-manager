import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { Member, Project, WorkerTeam, AttendanceRecord, WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import AttendanceTab from './AttendanceTab'
import WageTableTab from './WageTableTab'
import WageRecordsTab from './WageRecordsTab'
import AttendanceDetail from '../../AttendanceDetail'

type CycleTab = 'attendance' | 'wagetable' | 'records'

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

interface WageCycleDetailProps {
  selectedProject: Project
  selectedMonth: string
  members: Member[]
  workerTeams: WorkerTeam[]
  // Attendance
  attendances: AttendanceRecord[]
  attendancesCount: number
  attendanceDetailRecord: AttendanceRecord | null
  setAttendanceDetailRecord: (r: AttendanceRecord | null) => void
  onGenerateAttendance: () => void
  onDeleteAttendance: (r: AttendanceRecord) => void
  uploadingFileId: number | null
  setUploadingFileId: (id: number | null) => void
  onFileUpload: (r: AttendanceRecord, f: File) => void
  onFileDelete: (r: AttendanceRecord) => void
  onFilePreview: (r: AttendanceRecord) => void
  onBatchDeleteAttendances: () => void
  selectedAttendanceIds: Set<number>
  toggleAttendanceSelect: (id: number) => void
  toggleAllAttendances: () => void
  // Wage table
  wageRecords: WageRecord[]
  editingWages: Map<number, { bonus: number; deduction: number }>
  onGenerateWages: () => void
  onSaveWages: () => void
  onBonusDeductionChange: (recordId: number, field: 'bonus' | 'deduction', value: number) => void
  onBatchDeleteWageTable: () => void
  selectedWageTableIds: Set<number>
  toggleWageTableSelect: (id: number) => void
  toggleAllWageTable: () => void
  // Payment records
  allWageRecords: WageRecord[]
  paymentEdits: Map<number, { paidAmount: number; paidDate: string }>
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string | number) => void
  onSavePayments: () => void
  onBatchDeleteWages: () => void
  selectedWageIds: Set<number>
  toggleWageSelect: (id: number) => void
  toggleAllWages: () => void
  // Filter
  filterMemberName: string
  setFilterMemberName: (v: string) => void
  loading: boolean
  onBack: () => void
}

export default function WageCycleDetail(props: WageCycleDetailProps) {
  const {
    selectedProject, selectedMonth, members, workerTeams,
    attendances, attendancesCount, attendanceDetailRecord, setAttendanceDetailRecord,
    onGenerateAttendance, onDeleteAttendance,
    uploadingFileId, setUploadingFileId, onFileUpload, onFileDelete, onFilePreview,
    onBatchDeleteAttendances, selectedAttendanceIds, toggleAttendanceSelect, toggleAllAttendances,
    wageRecords, editingWages, onGenerateWages, onSaveWages, onBonusDeductionChange,
    onBatchDeleteWageTable, selectedWageTableIds, toggleWageTableSelect, toggleAllWageTable,
    allWageRecords, paymentEdits, onPaymentChange, onSavePayments,
    onBatchDeleteWages, selectedWageIds, toggleWageSelect, toggleAllWages,
    filterMemberName, setFilterMemberName, loading, onBack,
  } = props

  const [activeTab, setActiveTab] = useState<CycleTab>('attendance')
  const [filterYear, setFilterYear] = useState(selectedMonth.split('-')[0])
  const [filterMonth, setFilterMonth] = useState(selectedMonth.split('-')[1])
  const daysInMonth = getDaysInMonth(selectedMonth)

  // Attendance detail sub-page
  if (attendanceDetailRecord) {
    const member = members.find(m => m.id === attendanceDetailRecord.memberId)
    const team = workerTeams.find(t => t.id === member?.teamId)
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <button onClick={() => setAttendanceDetailRecord(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <Icon name="ChevronLeft" size={16} /> 返回考勤列表
        </button>
        <AttendanceDetail record={attendanceDetailRecord} member={member}
          teamName={team?.name || '-'} yearMonth={selectedMonth}
          daysInMonth={daysInMonth} projectName={selectedProject?.name || ''}
          onBack={() => setAttendanceDetailRecord(null)}
          onSaved={async () => { setAttendanceDetailRecord(null); await onGenerateAttendance() }} />
      </div>
    )
  }

  const cycleTabs: { id: CycleTab; label: string; icon: string }[] = [
    { id: 'attendance', label: '考勤管理', icon: 'ClipboardFile' },
    { id: 'wagetable', label: '项目工资表', icon: 'FileText' },
    { id: 'records', label: '工资发放记录', icon: 'File' },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* 返回 + 标题 */}
      <div className="flex items-center gap-4">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <Icon name="ChevronLeft" size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{selectedProject?.name}</h1>
          <p className="text-slate-500 text-sm">{selectedMonth} 工资周期</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 mb-6 bg-white border border-slate-200 p-1 rounded-2xl w-fit shadow-sm">
        {cycleTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === tab.id ? 'text-white' : 'text-slate-600 hover:text-slate-800'}`}>
            {activeTab === tab.id && (
              <motion.div layoutId="wage-cycle-tab" className="absolute inset-0 bg-primary-600 rounded-xl shadow-md"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
            )}
            <span className="relative z-10 flex items-center gap-1.5"><Icon name={tab.icon} size={14} />{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'attendance' && (
          <AttendanceTab
            selectedProject={selectedProject} selectedMonth={selectedMonth}
            daysInMonth={daysInMonth} members={members} workerTeams={workerTeams}
            attendances={attendances} projectMemberCount={attendancesCount}
            uploadingFileId={uploadingFileId} setUploadingFileId={setUploadingFileId}
            selectedIds={selectedAttendanceIds} toggleSelect={toggleAttendanceSelect}
            toggleAll={toggleAllAttendances} onGenerateAttendance={onGenerateAttendance}
            onOpenDetail={setAttendanceDetailRecord} onDelete={onDeleteAttendance}
            onFileUpload={onFileUpload} onFileDelete={onFileDelete}
            onFilePreview={onFilePreview} onBatchDelete={onBatchDeleteAttendances}
            loading={loading}
          />
        )}
        {activeTab === 'wagetable' && (
          <WageTableTab
            selectedProject={selectedProject} selectedMonth={selectedMonth}
            members={members} workerTeams={workerTeams} wageRecords={wageRecords}
            attendancesCount={attendances.length} editingWages={editingWages}
            selectedIds={selectedWageTableIds} toggleSelect={toggleWageTableSelect}
            toggleAll={toggleAllWageTable} onGenerate={onGenerateWages}
            onSave={onSaveWages} onBonusDeductionChange={onBonusDeductionChange}
            onBatchDelete={onBatchDeleteWageTable} loading={loading}
          />
        )}
        {activeTab === 'records' && (
          <WageRecordsTab
            allWageRecords={allWageRecords}
            filterYear={filterYear} filterMonth={filterMonth}
            filterMemberName={filterMemberName}
            selectedIds={selectedWageIds}
            paymentEdits={paymentEdits}
            onFilterYearChange={setFilterYear} onFilterMonthChange={setFilterMonth}
            onFilterNameChange={setFilterMemberName}
            onPaymentChange={onPaymentChange} onSavePayments={onSavePayments}
            toggleSelect={toggleWageSelect} toggleAll={toggleAllWages}
            onBatchDelete={onBatchDeleteWages}
          />
        )}
      </div>
    </div>
  )
}

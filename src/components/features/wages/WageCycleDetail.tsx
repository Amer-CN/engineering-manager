import React, { useState } from 'react'
import { motion } from 'framer-motion'
import type { Project, WorkerTeam, AttendanceRecord, WageRecord } from '@/types'
import { Icon } from '../../ui/Icon'
import AttendanceTab from './AttendanceTab'
import WageTableTab from './WageTableTab'
import WageRecordsTab from './WageRecordsTab'
import AttendanceDetail from '../../AttendanceDetail'
import { AttendanceImportModal } from './AttendanceImportModal'

type CycleTab = 'attendance' | 'wagetable' | 'records'

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

interface WageCycleDetailProps {
  selectedProject: Project
  selectedMonth: string
  workerTeams: WorkerTeam[]
  // Attendance
  attendances: AttendanceRecord[]
  attendancesCount: number
  attendanceDetailRecord: AttendanceRecord | null
  setAttendanceDetailRecord: (r: AttendanceRecord | null) => void
  onGenerateAttendance: () => void
  onDeleteAttendance: (r: AttendanceRecord) => void
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
  paymentEdits: Map<number, { paidAmount: string; paidDate: string; bankReceiptPath?: string }>
  onPaymentChange: (recordId: number, field: 'paidAmount' | 'paidDate', value: string) => void
  onSavePayments: () => void
  onBatchDeleteWages: () => void
  onBatchArchivePayments: () => void
  selectedWageIds: Set<number>
  toggleWageSelect: (id: number) => void
  toggleAllWages: () => void
  // Bank receipt
  onBankReceiptUpload: (pdfPath: string) => void
  receiptParsing: boolean
  receiptResult: { matched: number; failed: number; totalItems: number; date: string; receiptPath: string; totalAmount?: number; successAmount?: number } | null
  // Filter
  filterMemberName: string
  setFilterMemberName: (v: string) => void
  loading: boolean
  onChangeMonth: (month: string) => void
  onBack: () => void
  // Import
  projectWorkerList: { id: number; name: string; teamName?: string; idCard: string }[]
  onImportAttendance: (data: { projectWorkerId: number; workDays: number; workerName: string }[]) => void
}

export default function WageCycleDetail(props: WageCycleDetailProps) {
  const {
    selectedProject, selectedMonth, workerTeams,
    attendances, attendancesCount, attendanceDetailRecord, setAttendanceDetailRecord,
    onGenerateAttendance, onDeleteAttendance,
    onBatchDeleteAttendances, selectedAttendanceIds, toggleAttendanceSelect, toggleAllAttendances,
    wageRecords, editingWages, onGenerateWages, onSaveWages, onBonusDeductionChange,
    onBatchDeleteWageTable, selectedWageTableIds, toggleWageTableSelect, toggleAllWageTable,
    allWageRecords, paymentEdits, onPaymentChange, onSavePayments,
    onBatchDeleteWages, onBatchArchivePayments, selectedWageIds, toggleWageSelect, toggleAllWages,
    onBankReceiptUpload, receiptParsing, receiptResult,
    filterMemberName, setFilterMemberName, loading, onChangeMonth, onBack,
    projectWorkerList, onImportAttendance,
  } = props

  const [activeTab, setActiveTab] = useState<CycleTab>('attendance')
  const [showImportModal, setShowImportModal] = useState(false)
  const [filterYear, setFilterYear] = useState(selectedMonth.split('-')[0])
  const [filterMonth, setFilterMonth] = useState(selectedMonth.split('-')[1])
  const daysInMonth = getDaysInMonth(selectedMonth)

  // Attendance detail sub-page
  if (attendanceDetailRecord) {
    const adr = attendanceDetailRecord as any
    const teamName = adr.teamName || workerTeams.find(t => t.id === adr.teamId)?.name || '-'
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <button onClick={() => setAttendanceDetailRecord(null)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <Icon name="ChevronLeft" size={16} /> 返回考勤列表
        </button>
        <AttendanceDetail record={attendanceDetailRecord} member={undefined}
          teamName={teamName} yearMonth={selectedMonth}
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

      {/* Attendance Import Modal */}
      <AttendanceImportModal
        show={showImportModal}
        projectId={selectedProject.id}
        yearMonth={selectedMonth}
        workerList={projectWorkerList}
        onClose={() => setShowImportModal(false)}
        onImport={onImportAttendance}
      />

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'attendance' && (
          <AttendanceTab
            selectedProject={selectedProject} selectedMonth={selectedMonth}
            daysInMonth={daysInMonth} workerTeams={workerTeams}
            attendances={attendances} projectMemberCount={attendancesCount}
            selectedIds={selectedAttendanceIds} toggleSelect={toggleAttendanceSelect}
            toggleAll={toggleAllAttendances} onGenerateAttendance={onGenerateAttendance}
            onOpenDetail={setAttendanceDetailRecord} onDelete={onDeleteAttendance}
            onBatchDelete={onBatchDeleteAttendances}
            loading={loading}
            onImportAttendance={() => setShowImportModal(true)}
            onChangeMonth={onChangeMonth}
          />
        )}
        {activeTab === 'wagetable' && (
          <WageTableTab
            selectedProject={selectedProject} selectedMonth={selectedMonth}
            workerTeams={workerTeams} wageRecords={wageRecords}
            attendancesCount={attendances.length} editingWages={editingWages}
            selectedIds={selectedWageTableIds} toggleSelect={toggleWageTableSelect}
            toggleAll={toggleAllWageTable} onGenerate={onGenerateWages}
            onSave={onSaveWages} onBonusDeductionChange={onBonusDeductionChange}
            onBatchDelete={onBatchDeleteWageTable} loading={loading}
            onChangeMonth={onChangeMonth}
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
            onBankReceiptUpload={onBankReceiptUpload}
            receiptParsing={receiptParsing} receiptResult={receiptResult}
            toggleSelect={toggleWageSelect} toggleAll={toggleAllWages}
            onBatchDelete={onBatchDeleteWages} onBatchArchive={onBatchArchivePayments}
          />
        )}
      </div>
    </div>
  )
}

import React, { useState, useRef } from 'react'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import FilterBar from '../../ui/FilterBar'
import { Settlement as SettlementData, SettlementStatus, SettlementType, Project, Partner, Template } from '../../../types/electron'
import { SettlementList } from './SettlementList'
import { SettlementForm } from './SettlementForm'
import { PrintContent } from './SettlementPrintTemplate'
import { formatMoney } from '../../../utils/format'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { TemplateSelectorModal, TemplateGenerate } from '../templates'
import { useSettlementFilters } from './useSettlementFilters'
import { useSettlementHandlers } from './useSettlementHandlers'
import { printSettlement } from './settlementPrintUtil'

interface SettlementProjectDetailProps {
  project: Project
  settlements: SettlementData[]
  partners: Partner[]
  onBack: () => void
  onDataChange: () => void
}

const SettlementProjectDetail: React.FC<SettlementProjectDetailProps> = ({
  project,
  settlements,
  partners,
  onBack,
  onDataChange,
}) => {
  const [showModal, setShowModal] = useState(false)
  const [editingSettlement, setEditingSettlement] = useState<SettlementData | null>(null)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [generatingTemplate, setGeneratingTemplate] = useState<Template | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  const {
    filterType, filterStatus, setFilterType, setFilterStatus,
    filteredSettlements, stats,
  } = useSettlementFilters(settlements)

  const {
    handleSubmit, handleEdit, handleDelete, handleProcess,
    handleUnarchive, handlePreviewFile, ConfirmDialog,
  } = useSettlementHandlers({
    project, settlements, editingSettlement, onDataChange,
    setShowModal, setEditingSettlement,
  })

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-6 max-w-[1400px] mx-auto w-full">
      {ConfirmDialog}
      {/* 打印内容 */}
      <div ref={printRef}>
        {filteredSettlements.map(s => (
          <PrintContent key={s.id} settlement={s} projects={[project]} partners={partners} />
        ))}
      </div>

      {/* 头部：返回 + 项目名 */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
          <p className="text-slate-500 mt-1">结算办理</p>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => setShowTemplateSelector(true)}
          className="btn btn-secondary flex items-center gap-1.5 mr-2"
        >
          <Icon name="FileText" size={16} /> 从模板生成
        </button>
        <button
          onClick={() => { setEditingSettlement(null); setShowModal(true) }}
          className="btn btn-primary"
        >
          <span className="text-xl">+</span>
          新建结算单
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算单总数</p>
          <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">未办理</p>
          <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">已办理</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">已归档</p>
          <p className="text-2xl font-bold text-slate-500">{stats.archived}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-slate-500">结算总金额</p>
          <p className="text-2xl font-bold text-primary-600">¥{formatMoney(stats.totalAmount)}</p>
        </div>
      </div>

      {/* 筛选器 */}
      <FilterBar className="mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">结算类型:</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as SettlementType | '')}
            className="select text-sm"
          >
            <option value="">全部</option>
            <option value="income">收入结算</option>
            <option value="expense">支出结算</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">状态:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as SettlementStatus | '')}
            className="select text-sm"
          >
            <option value="">全部</option>
            <option value="pending">未办理</option>
            <option value="completed">已办理</option>
            <option value="archived">已归档</option>
          </select>
        </div>
      </FilterBar>

      {/* 结算单列表 */}
      <HoverScrollbar className="flex-1 min-h-0">
      <SettlementList
        settlements={filteredSettlements}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onProcess={handleProcess}
        onUnarchive={handleUnarchive}
        onPrint={() => printSettlement(printRef)}
        onPreviewFile={handlePreviewFile}
      />
      </HoverScrollbar>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingSettlement(null) }}
        title={editingSettlement ? '编辑结算单' : '新建结算单'} size="full">
        <SettlementForm settlement={editingSettlement} projects={[project]} partners={partners}
          onSubmit={handleSubmit} onCancel={() => { setShowModal(false); setEditingSettlement(null) }} />
      </Modal>

      {/* 模板选择器 */}
      {showTemplateSelector && (
        <TemplateSelectorModal
          category="settlement"
          onSelect={(template) => {
            setShowTemplateSelector(false)
            setGeneratingTemplate(template)
          }}
          onClose={() => setShowTemplateSelector(false)}
        />
      )}

      {/* 模板生成 */}
      {generatingTemplate && (
        <TemplateGenerate
          template={generatingTemplate}
          onClose={() => setGeneratingTemplate(null)}
        />
      )}
    </div>
  )
}

export default SettlementProjectDetail


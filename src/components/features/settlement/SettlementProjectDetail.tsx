import React, { useState, useRef } from 'react'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import PageContainer from '@/components/ui/PageContainer'
import { Settlement as SettlementData, SettlementStatus, SettlementType, Project, Partner, Template } from '../../../types/electron'
import { SettlementList } from './SettlementList'
import { SettlementForm } from './SettlementForm'
import { PrintContent } from './SettlementPrintTemplate'
import { Icon } from '../../ui/Icon'
import { Modal } from '../../ui/Modal/Modal'
import { TemplateSelectorModal, TemplateGenerate } from '../templates'
import { useSettlementFilters } from './useSettlementFilters'
import { useSettlementHandlers } from './useSettlementHandlers'
import { printSettlement } from './settlementPrintUtil'
import { Button } from '../../ui/Button'

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
    filteredSettlements,
  } = useSettlementFilters(settlements)

  const {
    handleSubmit, handleEdit, handleDelete, handleProcess,
    handleUnarchive, handlePreviewFile, ConfirmDialog,
  } = useSettlementHandlers({
    project, settlements, editingSettlement, onDataChange,
    setShowModal, setEditingSettlement,
  })

  return (
    <PageContainer className="flex-1 flex flex-col overflow-hidden w-full">
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
          className="p-2 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors"
        >
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div>
          <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">{project.name}</h1>
          <p className="text-[color:var(--muted)] mt-1">结算办理</p>
        </div>
        <div className="flex-1" />
        <Button
          onClick={() => setShowTemplateSelector(true)}
          
         variant="secondary" className="flex items-center gap-1.5 mr-2">
          <Icon name="FileText" size={16} /> 从模板生成
        </Button>
        <Button
          onClick={() => { setEditingSettlement(null); setShowModal(true) }}
          
         variant="primary">
          <span className="text-xl">+</span>
          新建结算单
        </Button>
      </div>

      {/* S19 Stitch: 类别 pill-tabs (替代下拉 + 取消统计卡片) */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[
          { value: '', label: '全部' },
          { value: 'income', label: '收入结算' },
          { value: 'expense', label: '支出结算' },
        ].map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilterType(opt.value as SettlementType | '')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filterType === opt.value
                ? 'bg-[color:var(--accent)] text-[color:var(--on-accent)]'
                : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {filterStatus && (
          <span className="ml-2 text-xs text-[color:var(--muted)]">
            状态: {filterStatus === 'pending' ? '未办理' : filterStatus === 'completed' ? '已办理' : '已归档'}
            <button onClick={() => setFilterStatus('')} className="ml-1 text-[color:var(--accent)] hover:opacity-80">×</button>
          </span>
        )}
        <div className="flex-1" />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as SettlementStatus | '')}
          className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm bg-[color:var(--card)]"
        >
          <option value="">所有状态</option>
          <option value="pending">未办理</option>
          <option value="completed">已办理</option>
          <option value="archived">已归档</option>
        </select>
      </div>

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
    </PageContainer>
  )
}

export default SettlementProjectDetail


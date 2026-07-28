import { Template, TemplateCategory } from '../../../types/electron'
import { categoryConfig } from './config'
import { TemplateCard } from './TemplateCard'
import { Icon } from '../../ui/Icon'
import { Card } from '@/components/ui/Card'
import { Button } from '../../ui/Button'

interface TemplateListProps {
  category: TemplateCategory
  templates: Template[]
  onBack: () => void
  onEdit: (t: Template) => void
  onDelete: (id: number) => void
  onPreview: (t: Template) => void
  onGenerate: (t: Template) => void
  onCreate: () => void
}

export default function TemplateList({
  category, templates, onBack, onEdit, onDelete, onPreview, onGenerate, onCreate,
}: TemplateListProps) {
  const config = categoryConfig[category]
  const docxCount = templates.filter(t => t.fileType === 'docx').length
  const xlsxCount = templates.filter(t => t.fileType === 'xlsx').length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-[color:var(--panel-2)] text-[color:var(--muted)] hover:text-[color:var(--fg-2)] transition-colors">
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.fileType === 'xlsx' ? 'bg-success-50 text-success-600' : 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'}`}>
          <Icon name={config.icon} size={22} />
        </div>
        <div className="flex-1">
          <h1 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">{config.label}</h1>
          <p className="text-sm text-[color:var(--muted)]">{config.description}</p>
        </div>
        <Button onClick={onCreate}  variant="primary">
          <Icon name="Plus" size={16} /> 新建模板
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card bordered={false} className="p-3">
          <p className="text-xs text-[color:var(--muted)]">模板总数</p>
          <p className="text-lg font-bold text-[color:var(--fg)]">{templates.length}</p>
        </Card>
        <Card bordered={false} className="p-3">
          <p className="text-xs text-[color:var(--muted)]">Word 文档</p>
          <p className="text-lg font-bold text-[color:var(--fg)]">{docxCount}</p>
        </Card>
        <Card bordered={false} className="p-3">
          <p className="text-xs text-[color:var(--muted)]">Excel 表格</p>
          <p className="text-lg font-bold text-success-600">{xlsxCount}</p>
        </Card>
      </div>

      {/* Template cards */}
      {templates.length === 0 ? (
        <div className="text-center py-16 text-[color:var(--muted)] bg-[color:var(--card)] rounded-xl border border-[color:var(--border)]">
          <Icon name="FileText" size={48} className="mx-auto mb-3 text-[color:var(--border-strong)]" />
          <p className="text-lg">此分类暂无模板</p>
          <p className="text-sm mt-1">点击「新建模板」上传 .docx 或 .xlsx 文件</p>
          <Button onClick={onCreate}  variant="primary" className="mt-4 text-sm">创建第一个模板</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(t => (
            <TemplateCard key={t.id}
              template={t}
              onEdit={onEdit}
              onDelete={onDelete}
              onPreview={onPreview}
              onGenerate={onGenerate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

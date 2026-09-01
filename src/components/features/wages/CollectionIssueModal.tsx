import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Button } from '../../ui/Button'
import { getAPI } from '@/services/api-adapter'
import { useToastStore } from '@/store/toastStore'
import { usePermission } from '@/hooks/usePermission'
import type { Project, WorkerTeam, Template } from '@/types'

interface CollectionIssueModalProps {
  project: Project
  yearMonth: string
  workerTeams: WorkerTeam[]
  onClose: () => void
}

export function CollectionIssueModal({ project, yearMonth, workerTeams, onClose }: CollectionIssueModalProps) {
  const showToast = useToastStore(state => state.showToast)
  const { can } = usePermission()
  const [templates, setTemplates] = useState<Template[]>([])
  const [templateId, setTemplateId] = useState<number | null>(null)
  const [teamName, setTeamName] = useState('')
  const [issuing, setIssuing] = useState(false)

  useEffect(() => {
    (async () => {
      const api = await getAPI()
      const res = await api.getTemplates()
      if (res.success && res.data) {
        const list = res.data.filter((t: Template) => t.category === 'collection' && t.fileType === 'xlsx')
        setTemplates(list)
        if (list.length > 0) setTemplateId(list[0].id)
      }
    })()
  }, [])

  const teams = workerTeams.filter(t => t.projectId === project.id)
  const [y, m] = yearMonth.split('-')

  const handleIssue = async () => {
    if (!can('wages:create')) { showToast('您没有下发采集表的权限', 'error'); return }
    if (!templateId) { showToast('请先选择采集表模板', 'warning'); return }
    setIssuing(true)
    try {
      const api = await getAPI()
      const res = await api.issueCollectionTemplate(templateId, { projectName: project.name, yearMonth, teamName })
      if (!res.success || !res.data) { showToast(res.error || '生成失败', 'error'); return }
      const a = document.createElement('a')
      a.href = res.data.dataUrl
      a.download = `${project.name} ${y}年${parseInt(m)}月考勤采集表${teamName ? `（${teamName}）` : ''}.xlsx`
      a.click()
      onClose()
    } finally {
      setIssuing(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title="下发考勤采集表" size="sm"
      footer={<>
        <Button onClick={onClose}>取消</Button>
        <Button variant="primary" onClick={handleIssue} disabled={issuing || templates.length === 0}>
          {issuing ? '生成中...' : '生成并下载'}
        </Button>
      </>}>
      {templates.length === 0 ? (
        <p className="text-sm text-[color:var(--muted)]">还没有采集表模板。请先在「模板」模块上传一份空表（分类选“采集表”，.xlsx 格式）。</p>
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            采集表模板
            <select value={templateId ?? ''} onChange={e => setTemplateId(Number(e.target.value))}
              className="px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            班组
            <select value={teamName} onChange={e => setTeamName(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)]">
              <option value="">全部班组</option>
              {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </label>
          <p className="text-xs text-[color:var(--muted)]">标题中的项目 / 月份 / 班组会自动填好，下载后转发给班组即可。</p>
        </div>
      )}
    </Modal>
  )
}

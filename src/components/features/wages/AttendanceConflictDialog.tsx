import { useEffect, useState } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Button } from '../../ui/Button'

export interface AttendanceConflict {
  projectWorkerId: number
  workerName: string
  currentWorkDays: number
  importWorkDays: number
}

interface AttendanceConflictDialogProps {
  conflicts: AttendanceConflict[]
  onSubmit: (resolutions: { projectWorkerId: number; action: 'overwrite' | 'keep'; workDays: number }[]) => void
  onCancel: () => void
}

export function AttendanceConflictDialog({ conflicts, onSubmit, onCancel }: AttendanceConflictDialogProps) {
  const [choices, setChoices] = useState<Map<number, 'overwrite' | 'keep'>>(new Map())

  useEffect(() => {
    if (conflicts.length === 0) setChoices(new Map())
  }, [conflicts.length])

  if (conflicts.length === 0) return null

  const submit = () => {
    onSubmit(conflicts.map(c => ({
      projectWorkerId: c.projectWorkerId,
      action: choices.get(c.projectWorkerId) ?? 'keep',
      workDays: c.importWorkDays,
    })))
  }

  return (
    <Modal isOpen onClose={onCancel} title={`考勤冲突（${conflicts.length} 人）`} size="lg"
      footer={<>
        <Button onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={submit}>确认</Button>
      </>}>
      <p className="text-sm text-[color:var(--muted)] mb-3">以下工人的考勤曾手动修改过，与导入表不一致，请逐个选择：</p>
      <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
        {conflicts.map(c => {
          const choice = choices.get(c.projectWorkerId) ?? 'keep'
          return (
            <div key={c.projectWorkerId} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2">
              <div className="text-sm">
                <span className="font-medium">{c.workerName}</span>
                <span className="ml-3 text-[color:var(--muted)]">库内 {c.currentWorkDays} 天</span>
                <span className="ml-2 text-[color:var(--muted)]">表里 {c.importWorkDays} 天</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant={choice === 'keep' ? 'primary' : 'secondary'}
                  onClick={() => setChoices(prev => new Map(prev).set(c.projectWorkerId, 'keep'))}>留我的</Button>
                <Button size="sm" variant={choice === 'overwrite' ? 'primary' : 'secondary'}
                  onClick={() => setChoices(prev => new Map(prev).set(c.projectWorkerId, 'overwrite'))}>用表里的</Button>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

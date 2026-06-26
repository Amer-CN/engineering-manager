import { useCallback, useRef } from 'react'
import type { Member } from '../../../../types/electron'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '../../../../hooks/useConfirm'
import { useMemberOperations } from '../../members/useMemberOperations'
import type { WorkerFormData } from '../../members/memberFormTypes'

interface UseLaborMemberOpsOptions {
  members: Member[]
  projects: any[]
  editingWorker?: any | null
  loadData: () => Promise<void>
  onSuccess?: () => void
}

export interface UseLaborMemberOpsReturn {
  handleDeleteMember: (id: number) => Promise<void>
  handleSubmitWorker: (data: WorkerFormData | import('../../members/memberFormTypes').StaffFormData) => Promise<void>
  handleFileModified: (field: string) => void
}

export function useLaborMemberOps({
  members, projects, editingWorker, loadData, onSuccess,
}: UseLaborMemberOpsOptions): UseLaborMemberOpsReturn {
  const showToast = useToastStore(state => state.showToast)
  const { confirm } = useConfirm()
  const originalMemberFileRef = useRef<Record<number, Record<string, string>>>({})

  const {
    handleDeleteMember: origDelete,
    handleSubmitWorker: origSubmit,
    handleFileModified,
  } = useMemberOperations({
    editingStaff: null, editingWorker, projects, originalMemberFileRef, loadData,
    showToast: (msg: string, type: any) => showToast(msg, type),
    onSuccess: onSuccess || (() => {}),
  })

  const handleDeleteMember = useCallback(async (id: number) => {
    const memberToDelete = members.find(m => m.id === id)
    const ok = await confirm({
      title: '确认删除',
      content: `确定要删除成员"${memberToDelete?.name || ''}"吗？`,
      confirmVariant: 'danger',
    })
    if (ok) await origDelete(id, members)
  }, [members, origDelete, confirm])

  const handleSubmitWorker = useCallback(async (data: WorkerFormData | import('../../members/memberFormTypes').StaffFormData) => {
    await origSubmit(data as WorkerFormData)
  }, [origSubmit])

  return { handleDeleteMember, handleSubmitWorker, handleFileModified }
}

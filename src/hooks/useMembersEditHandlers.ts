import { useCallback } from 'react'
import type { Member } from '../types/electron'
import { memberToStaffForm, memberToWorkerForm } from '../components/features/members'

interface UseMembersEditHandlersProps {
  setEditingStaff: React.Dispatch<React.SetStateAction<Member | null>>
  setEditingWorker: React.Dispatch<React.SetStateAction<Member | null>>
  setShowStaffModal: React.Dispatch<React.SetStateAction<boolean>>
  setShowWorkerModal: React.Dispatch<React.SetStateAction<boolean>>
  originalMemberFileRef: React.MutableRefObject<Record<number, Record<string, string>>>
}

export function useMembersEditHandlers({
  setEditingStaff, setEditingWorker,
  setShowStaffModal, setShowWorkerModal,
  originalMemberFileRef,
}: UseMembersEditHandlersProps) {
  const handleEditStaff = useCallback((staff: Member) => {
    setEditingStaff(staff)
    const formData = memberToStaffForm(staff)
    originalMemberFileRef.current[staff.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile']) {
      const val = (formData as unknown as Record<string, unknown>)[key]
      if (val && typeof val === 'string' && !val.startsWith('data:')) originalMemberFileRef.current[staff.id][key] = val
    }
    setShowStaffModal(true)
  }, [setEditingStaff, setShowStaffModal, originalMemberFileRef])

  const handleEditWorker = useCallback((worker: Member) => {
    setEditingWorker(worker)
    const formData = memberToWorkerForm(worker)
    originalMemberFileRef.current[worker.id] = {}
    for (const key of ['idCardFront', 'idCardBack', 'contractFile', 'safetyTrainingFile', 'healthReportFile', 'specialCertificateFile']) {
      const val = (formData as unknown as Record<string, unknown>)[key]
      if (val && typeof val === 'string' && !val.startsWith('data:')) originalMemberFileRef.current[worker.id][key] = val
    }
    setShowWorkerModal(true)
  }, [setEditingWorker, setShowWorkerModal, originalMemberFileRef])

  return { handleEditStaff, handleEditWorker }
}

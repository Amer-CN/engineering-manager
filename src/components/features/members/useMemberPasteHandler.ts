import { useEffect } from 'react'
import { useToastStore } from '@/store/toastStore'
import { validateImageFile, validateFile } from './memberFormTypes'
import type { StaffFormData, WorkerFormData } from './memberFormTypes'

export function useMemberPasteHandler({ visible, type, staffFormData, workerFormData, setStaffFormData, setWorkerFormData, processIdCardFile, processUploadFile }: {
  visible: boolean; type: 'staff' | 'worker'; staffFormData: StaffFormData; workerFormData: WorkerFormData
  setStaffFormData: React.Dispatch<React.SetStateAction<StaffFormData>>
  setWorkerFormData: React.Dispatch<React.SetStateAction<WorkerFormData>>
  processIdCardFile: (file: File, field: 'idCardFront' | 'idCardBack', setter: any) => Promise<void>
  processUploadFile: (file: File, field: string, setter: any) => Promise<void>
}) {
  const showToast = useToastStore(state => state.showToast)
  useEffect(() => {
    if (!visible) return
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) { const err = validateImageFile(file); if (err) { showToast(err, 'error'); return }
            if (type === 'staff') { if (!staffFormData.idCardFront) await processIdCardFile(file, 'idCardFront', setStaffFormData); else if (!staffFormData.idCardBack) await processIdCardFile(file, 'idCardBack', setStaffFormData) }
            else { if (!workerFormData.idCardFront) await processIdCardFile(file, 'idCardFront', setWorkerFormData); else if (!workerFormData.idCardBack) await processIdCardFile(file, 'idCardBack', setWorkerFormData) }
            e.preventDefault(); return }
        }
        if (item.type === 'application/pdf') {
          const file = item.getAsFile()
          if (file) { const err = validateFile(file); if (err) { showToast(err, 'error'); return }
            if (type === 'staff' && !staffFormData.contractFile) await processUploadFile(file, 'contractFile', setStaffFormData)
            else if (type === 'worker' && !workerFormData.contractFile) await processUploadFile(file, 'contractFile', setWorkerFormData)
            e.preventDefault(); return }
        }
      }
    }
    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [visible, type, staffFormData.idCardFront, staffFormData.idCardBack, staffFormData.contractFile, workerFormData.idCardFront, workerFormData.idCardBack, workerFormData.contractFile])
}

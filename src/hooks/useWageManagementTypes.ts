export type ViewMode = 'dashboard' | 'cycle'

export interface ProjectWorkerItem {
  pwId: number
  name: string
  teamName: string
  idCard: string
}

export interface UseWageManagementOptions {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
}

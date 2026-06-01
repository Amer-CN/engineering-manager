import { create } from 'zustand'

interface StatusInfo {
  total: number
  start: number
  end: number
  selectedCount?: number
  pageName?: string
}

interface StatusStore {
  info: StatusInfo | null
  setInfo: (info: StatusInfo | null) => void
  setSelectedCount: (count: number) => void
  setPageName: (name: string) => void
}

export const useStatusStore = create<StatusStore>((set) => ({
  info: null,
  setInfo: (info) => set({ info }),
  setSelectedCount: (count) => set((state) => ({
    info: state.info ? { ...state.info, selectedCount: count } : null
  })),
  setPageName: (name) => set((state) => ({
    info: state.info ? { ...state.info, pageName: name } : { total: 0, start: 0, end: 0, pageName: name }
  })),
}))

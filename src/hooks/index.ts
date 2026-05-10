/**
 * Hooks 入口文件
 * 
 * 统一导出所有自定义 Hooks
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 基础 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { useCRUDBase, createCRUDHook } from './useCRUDBase'
export type { CRUDAPI, CRUDState, UseCRUDBaseOptions, UseCRUDBaseReturn } from './useCRUDBase'

// ═══════════════════════════════════════════════════════════════════════════════
// 业务 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { useIdCardOCR } from './useIdCardOCR'
export type { UseIdCardOCRReturn, OCRResult, Toast } from './useIdCardOCR'

// 文件上传
export { useFileUpload } from './useFileUpload'
export type { UseFileUploadOptions, UseFileUploadReturn, UploadedFile } from './useFileUpload'

export { useProjects } from './useProjects'
export { useMembers, useWorkerTeams, useWorkerTransfers } from './useMembers'
export { usePartners, useRegions, useSupervisors } from './usePartners'
export { useInvoices, usePaymentRecords } from './useInvoices'
export { useTasks } from './useTasks'

// ═══════════════════════════════════════════════════════════════════════════════
// 通用 Hooks
// ═══════════════════════════════════════════════════════════════════════════════

export { usePagination } from './usePagination'
export { useFilters } from './useFilters'
export { useModal, useConfirm } from './useModal'
export { useAsync } from './useAsync'
export { useForm } from './useForm'
export { useDebounce } from './useDebounce'
export { useLocalStorage } from './useLocalStorage'

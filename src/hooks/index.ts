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

// OCR 相关 Hooks
export { useInvoiceOCR } from './useInvoiceOCR'
export { useBankCardOCR } from './useBankCardOCR'
export { useBusinessLicenseOCR } from './useBusinessLicenseOCR'
export { useBankReceiptOCR } from './useBankReceiptOCR'
export { usePermitOCR } from './usePermitOCR'
export { useBankStatementOCR } from './useBankStatementOCR'
export { useGeneralReceiptOCR } from './useGeneralReceiptOCR'
export { useCompanyQueryOCR } from './useCompanyQueryOCR'

// 文件上传
export { useFileUpload } from './useFileUpload'
export type { UseFileUploadOptions, UseFileUploadReturn, UploadedFile } from './useFileUpload'

export { useProjects } from './useProjects'
export { useMembers } from './useMembers'
export { useWorkerTeams, useWorkerTransfers } from './useWorkerTeams'
export { usePartners } from './usePartners'
export { useRegions, useSupervisors } from './useRegionsAndSupervisors'
export { useInvoices, usePaymentRecords } from './useInvoices'
export { useInvoicePage } from './useInvoicePage'
export { useInventoryPage } from './useInventoryPage'
export { useDataPath } from './useDataPath'
export { useDepartments } from './useDepartments'
export { useOCRConfig } from './useOCRConfig'
export { useAuditLogFilters } from './useAuditLogFilters'
export type { AuditLogFilters } from './useAuditLogFilters'
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
export { useRowHoverOpacity } from './useRowHoverOpacity'

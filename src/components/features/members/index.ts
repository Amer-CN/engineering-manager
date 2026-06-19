/**
 * Members 功能模块入口
 * 
 * 统一导出所有成员管理相关组件
 */

// 成员列表
export { MemberList } from './MemberList'

// 成员卡片
export { MemberCard } from './MemberCard'

// 成员筛选
export { MemberFilters } from './MemberFilters'

// 成员表单类型/常量/Helper
export {
  staffRoles, workerTypes, getWorkerTypeLabel, calculateAge,
  cleanFormData, memberToStaffForm, memberToWorkerForm,
  defaultStaffFormData, defaultWorkerFormData,
  validateImageFile, validateFile, readFileAsBase64,
  type StaffFormData, type WorkerFormData, type MemberFormProps,
} from './memberFormTypes'

// 成员表单组件
export { MemberForm } from './MemberForm'

// 表单子组件
export { default as StaffForm } from './StaffForm'
export { default as WorkerForm } from './WorkerForm'
export { IdCardUploadArea, FileUploadArea, SmallFileUpload } from './FormUploadWidgets'

// 成员详情
export { MemberDetail } from './MemberDetail'

// 农民工管理
export { WorkerSection } from './WorkerSection'

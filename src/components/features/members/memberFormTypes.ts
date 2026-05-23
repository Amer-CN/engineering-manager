import type { Member } from '@/types'

// ═══════════════════════════════════════════════════════════
// 常量
// ═══════════════════════════════════════════════════════════

export const staffRoles = [
  { value: '项目经理', icon: '👔' },
  { value: '技术负责人', icon: '🔧' },
  { value: '施工员', icon: '🏗️' },
  { value: '生产经理', icon: '⚙️' },
  { value: '安全负责人', icon: '🛡️' },
  { value: '质量员', icon: '📏' },
  { value: '造价工程师', icon: '💹' },
  { value: '材料员', icon: '📦' },
  { value: '资料员', icon: '📁' },
  { value: '财务负责人', icon: '💰' },
  { value: '劳资员', icon: '👤' },
  { value: '商务经理', icon: '💼' },
  { value: '其他', icon: '👤' },
]

export const workerTypes = [
  { value: 'bricklayer', label: '砌筑工' },
  { value: 'concreter', label: '混凝土工' },
  { value: 'steel', label: '钢筋工' },
  { value: 'formwork', label: '模板工' },
  { value: 'carpenter', label: '木工' },
  { value: 'painter', label: '油漆工' },
  { value: 'plumber', label: '水暖工' },
  { value: 'electrician', label: '电工' },
  { value: 'welder', label: '焊工' },
  { value: 'rigger', label: '起重工/架子工' },
  { value: 'driver', label: '驾驶员/司机' },
  { value: 'mechanic', label: '机械工' },
  { value: 'other', label: '其他工种' },
]

// ═══════════════════════════════════════════════════════════
// 类型
// ═══════════════════════════════════════════════════════════

export interface StaffFormData {
  name: string
  phone: string
  email: string
  role: string
  idCard: string
  idCardFront: string
  idCardBack: string
  gender: string
  ethnicity: string
  birthDate: string
  idCardAddress: string
  contractFile: string
  contractFileType: string
  baseSalary?: number
  socialSecurityPersonal?: number
  socialSecurityCompany?: number
  housingFund?: number
  housingFundPersonal?: number
  otherAllowances?: number
  companyCoversSocial?: boolean
  entryDate: string
}

export interface WorkerFormData {
  name: string
  phone: string
  idCard: string
  workerType: string
  idCardFront: string
  idCardBack: string
  gender: string
  ethnicity: string
  birthDate: string
  idCardAddress: string
  contractFile: string
  contractFileType: string
  projectId?: number
  teamId?: number
  dailyWage?: number
  entryDate: string
  expectedLeaveDate: string
  wageBankAccount: string
  wageBankName: string
  threeLevelEducation: boolean
  safetyTrainingFile: string
  healthReportFile: string
  specialCertificateFile: string
}

export interface MemberFormProps {
  type: 'staff' | 'worker'
  editingMember?: Member | null
  projects: Array<{ id: number; name: string }>
  workerTeams: Array<{ id: number; name: string; projectId: number; projectName?: string }>
  visible: boolean
  onClose: () => void
  onSubmit: (data: StaffFormData | WorkerFormData) => Promise<void>
  onFileModified?: (field: string) => void
}

// ═══════════════════════════════════════════════════════════
// 默认值
// ═══════════════════════════════════════════════════════════

export const defaultStaffFormData: StaffFormData = {
  name: '', phone: '', email: '', role: '', idCard: '',
  idCardFront: '', idCardBack: '', gender: '', ethnicity: '',
  birthDate: '', idCardAddress: '', contractFile: '', contractFileType: '',
  baseSalary: undefined, socialSecurityPersonal: undefined,
  socialSecurityCompany: undefined, housingFund: undefined,
  housingFundPersonal: undefined, otherAllowances: undefined,
  companyCoversSocial: false, entryDate: '',
}

export const defaultWorkerFormData: WorkerFormData = {
  name: '', phone: '', idCard: '', workerType: 'other',
  idCardFront: '', idCardBack: '', gender: '', ethnicity: '',
  birthDate: '', idCardAddress: '', contractFile: '', contractFileType: '',
  projectId: undefined, teamId: undefined, dailyWage: undefined,
  entryDate: '', expectedLeaveDate: '', wageBankAccount: '', wageBankName: '',
  threeLevelEducation: false, safetyTrainingFile: '', healthReportFile: '',
  specialCertificateFile: '',
}

// ═══════════════════════════════════════════════════════════
// Helper 函数
// ═══════════════════════════════════════════════════════════

export function getWorkerTypeLabel(type: string): string {
  if (!type) return ''
  // 先按 code 匹配，再按中文名匹配，都没有则直接返回原文
  return workerTypes.find(w => w.value === type)?.label
    || workerTypes.find(w => w.label === type)?.label
    || type
}

/** 中文工种名 → code（用于表单下拉框匹配） */
export function workerTypeToCode(type: string): string {
  if (!type) return 'other'
  // 已经是 code
  if (workerTypes.some(w => w.value === type)) return type
  // 中文名 → code
  return workerTypes.find(w => w.label === type)?.value || 'other'
}

export function calculateAge(birthDate: string): string {
  if (!birthDate) return ''
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 ? `${age}岁` : ''
}

export function cleanFormData<T extends Record<string, any>>(data: T): Partial<T> {
  const cleaned: Partial<T> = {}
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' && value === '') {
      if (['name', 'phone', 'idCard', 'role'].includes(key)) {
        cleaned[key as keyof T] = value as any
      }
    } else {
      cleaned[key as keyof T] = value
    }
  })
  return cleaned
}

export function memberToStaffForm(member: Member): StaffFormData {
  return {
    name: member.name || '', phone: member.phone || '',
    email: member.email || '', role: member.role || '',
    idCard: member.idCard || '', idCardFront: member.idCardFront || '',
    idCardBack: member.idCardBack || '', gender: member.gender || '',
    ethnicity: member.ethnicity || '', birthDate: member.birthDate || '',
    idCardAddress: member.idCardAddress || '',
    contractFile: member.contractFile || '', contractFileType: member.contractFileType || '',
    baseSalary: member.baseSalary, socialSecurityPersonal: member.socialSecurityPersonal,
    socialSecurityCompany: member.socialSecurityCompany, housingFund: member.housingFund,
    housingFundPersonal: member.housingFundPersonal, otherAllowances: member.otherAllowances,
    companyCoversSocial: member.companyCoversSocial ?? false, entryDate: member.entryDate || '',
  }
}

export function memberToWorkerForm(member: Member): WorkerFormData {
  // 从身份证自动推断性别（如果未设置）
  const idCard = (member as any).idCard || member.idCard || ''
  const autoGender = member.gender || inferGenderFromIdCard(idCard)
  return {
    name: member.name || '', phone: member.phone || '',
    idCard: member.idCard || '', workerType: member.workerType || '',
    idCardFront: member.idCardFront || '', idCardBack: member.idCardBack || '',
    gender: autoGender, ethnicity: member.ethnicity || '',
    birthDate: member.birthDate || '', idCardAddress: member.idCardAddress || '',
    contractFile: member.contractFile || '', contractFileType: member.contractFileType || '',
    projectId: member.projectId, teamId: member.teamId, dailyWage: member.dailyWage,
    entryDate: member.entryDate || '', expectedLeaveDate: member.expectedLeaveDate || '',
    wageBankAccount: (member as any).bankAccount || member.wageBankAccount || '', wageBankName: (member as any).bankName || member.wageBankName || '',
    threeLevelEducation: member.threeLevelEducation || false,
    safetyTrainingFile: member.safetyTrainingFile || '',
    healthReportFile: member.healthReportFile || '',
    specialCertificateFile: member.specialCertificateFile || '',
  }
}

/** 从身份证号推断性别（15/18 位，第 17/15 位奇数=男，偶数=女） */
export function inferGenderFromIdCard(idCard: string): string {
  if (!idCard || idCard.length < 15) return ''
  const idx = idCard.length === 15 ? 14 : 16
  const digit = parseInt(idCard[idx])
  if (isNaN(digit)) return ''
  return digit % 2 === 1 ? 'male' : 'female'
}

export function validateImageFile(file: File): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) return '只能上传 JPG、PNG 或 WebP 格式的图片'
  if (file.size > 5 * 1024 * 1024) return '图片大小不能超过 5MB'
  return null
}

export function validateFile(file: File, maxSizeMB: number = 10): string | null {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowedTypes.includes(file.type)) return '只能上传 JPG、PNG、WebP 或 PDF 格式的文件'
  if (file.size > maxSizeMB * 1024 * 1024) return `文件大小不能超过 ${maxSizeMB}MB`
  return null
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

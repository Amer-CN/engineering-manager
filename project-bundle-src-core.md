This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

================================================================
File Summary
================================================================

Purpose:
--------
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

File Format:
------------
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A separator line (================)
  b. The file path (File: path/to/file)
  c. Another separator line
  d. The full contents of the file
  e. A blank line

Usage Guidelines:
-----------------
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

Notes:
------
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/services/**, src/utils/**, src/constants/**, src/types/**, src/store/**, src/contexts/**, src/data/**, src/App.tsx, src/main.tsx, src/routes.ts, src/index.css, src/version.ts, src/vite-env.d.ts, src/test-setup.ts, src/test-utils/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)


================================================================
Directory Structure
================================================================
src/App.tsx
src/constants/animations.ts
src/constants/attendance.ts
src/constants/auditLog.ts
src/constants/changelog.ts
src/constants/date.ts
src/constants/index.ts
src/constants/member.ts
src/constants/snapshots.ts
src/constants/status.tsx
src/constants/table.ts
src/contexts/MaskContext.tsx
src/data/regions.ts
src/index.css
src/main.tsx
src/routes.ts
src/services/__tests__/agent-client.rename.test.ts
src/services/__tests__/agent-client.stream.test.ts
src/services/agent-client.ts
src/services/api-adapter.ts
src/services/api-client.ts
src/services/companyQuery.ts
src/services/fileService.ts
src/services/ocr/bankCard.ts
src/services/ocr/bankReceipt.ts
src/services/ocr/bankStatement.ts
src/services/ocr/businessLicense.ts
src/services/ocr/companyQuery.ts
src/services/ocr/config.ts
src/services/ocr/generalReceipt.ts
src/services/ocr/idCard.ts
src/services/ocr/index.ts
src/services/ocr/invoice.ts
src/services/ocr/permit.ts
src/services/ocr/types.ts
src/services/ocr/utils.ts
src/services/tauri-bridge.ts
src/services/update-client.ts
src/store/authStore.ts
src/store/statusStore.ts
src/store/toastStore.ts
src/test-setup.ts
src/test-utils/db-helpers.ts
src/types/agent.ts
src/types/common/Error.ts
src/types/common/index.ts
src/types/common/Result.ts
src/types/electron.d.ts
src/types/guards.ts
src/types/index.ts
src/types/permissions.ts
src/types/router.ts
src/utils/audit.ts
src/utils/audit/cleanup.ts
src/utils/audit/export.ts
src/utils/audit/index.ts
src/utils/audit/logger.ts
src/utils/audit/query.ts
src/utils/audit/stats.ts
src/utils/audit/storage.ts
src/utils/audit/types.ts
src/utils/date.ts
src/utils/export-import.ts
src/utils/format.ts
src/utils/iconMap.ts
src/utils/index.ts
src/utils/mask.ts
src/utils/member.ts
src/utils/printContractTemplate.ts
src/utils/projectHealth.ts
src/utils/staff-payroll-utils.ts
src/utils/validate.ts
src/utils/wage-export.ts
src/utils/wageExportColors.ts
src/version.ts
src/vite-env.d.ts

================================================================
Files
================================================================

================
File: src/constants/animations.ts
================
/**
 * Shared framer-motion animation variants for Dashboard-style pages.
 * Import these instead of defining local duplicates.
 */

/** Stagger container — wrap a group of sections so they animate in sequence */
export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
} as const

/** Section variant — fade + slide up for each content block */
export const sectionVariant = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
} as const

/** Page-level transition — simple fade in */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.2 },
} as const

================
File: src/constants/attendance.ts
================
import type { DayStatus } from '../types/electron'

export const UNSET_COLOR = 'bg-slate-50 text-slate-400'

export interface StatusMeta {
  key: DayStatus | undefined
  label: string
  color: string
}

export const STATUS_META: StatusMeta[] = [
  { key: undefined, label: '未设', color: UNSET_COLOR },
  { key: 'work', label: '出勤', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'holiday', label: '法定假', color: 'bg-blue-100 text-blue-700' },
  { key: 'sick_leave', label: '病假', color: 'bg-amber-100 text-amber-700' },
  { key: 'personal_leave', label: '事假', color: 'bg-orange-100 text-orange-700' },

]

export const summaryDot: Record<DayStatus, string> = {
  work: 'bg-emerald-500', holiday: 'bg-blue-500', sick_leave: 'bg-amber-500',
  personal_leave: 'bg-orange-500',
}

export const summaryLabel: Record<DayStatus, string> = {
  work: '出勤', holiday: '法定假', sick_leave: '病假', personal_leave: '事假',
}

export function computeAttendanceSummary(
  dailyStatus: Record<number, DayStatus> | undefined,
  daysInMonth: number,
  startDay: number = 1
): { counts: Record<DayStatus, number>; workDays: number; daysOff: number; applicableDays: number } {
  const counts: Record<DayStatus, number> = { work: 0, holiday: 0, sick_leave: 0, personal_leave: 0 }
  if (!dailyStatus) return { counts, workDays: 0, daysOff: 0, applicableDays: 0 }
  for (let d = startDay; d <= daysInMonth; d++) {
    const s = dailyStatus[d] || 'work'
    counts[s]++
  }
  const workDays = counts.work + counts.holiday
  const daysOff = counts.sick_leave + counts.personal_leave
  const applicableDays = daysInMonth - startDay + 1
  return { counts, workDays, daysOff, applicableDays }
}

================
File: src/constants/auditLog.ts
================
import type { AuditAction, AuditLevel } from '../utils/audit'

/** 操作类型映射 (用于下拉框 / 显示) */
export const ACTION_LABELS: Record<AuditAction, string> = {
  create: '创建',
  read: '查看',
  update: '更新',
  delete: '删除',
  export: '导出',
  import: '导入',
  login: '登录',
  logout: '退出',
  approve: '审批',
  lock: '锁定',
  unlock: '解锁',
}

/** 审计级别映射 (badge 颜色) */
export const LEVEL_COLORS: Record<AuditLevel, string> = {
  info: 'text-blue-600 bg-blue-50',
  warning: 'text-yellow-600 bg-yellow-50',
  error: 'text-red-600 bg-red-50',
}

/** 资源标签映射 */
export const RESOURCE_LABELS: Record<string, string> = {
  projects: '项目',
  partners: '合作单位',
  members: '员工',
  contracts: '合同',
  invoices: '发票',
  settlements: '结算',
  inventory: '库存',
  settings: '设置',
}

================
File: src/constants/date.ts
================
/**
 * 日期相关常量
 */

export const MONTHS = ['全部', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

export const MONTH_OPTIONS = MONTHS.map((m, i) => ({
  label: m,
  value: i === 0 ? '全部' : String(i),
}))

================
File: src/constants/index.ts
================
/**
 * 常量统一导出
 */

// 成员相关常量
export * from './member'

// 考勤相关常量
export * from './attendance'

// 日期相关常量
export * from './date'

// 地区数据常量
export * from '../data/regions'

================
File: src/constants/member.ts
================
/**
 * 成员相关常量
 */

/**
 * 农民工类型标签
 */
export const workerTypes = [
  { value: 'bricklayer', label: '砌筑工' },
  { value: 'concrete', label: '混凝土工' },
  { value: 'carpenter', label: '木工' },
  { value: 'steel', label: '钢筋工' },
  { value: 'painter', label: '抹灰工' },
  { value: 'water', label: '水电工' },
  { value: 'welder', label: '电焊工' },
  { value: 'glass', label: '玻璃工' },
  { value: 'tile', label: '防水工' },
  { value: 'scaffolder', label: '架子工' },
  { value: 'elevator', label: '起重工' },
  { value: 'mechanic', label: '机械工' },
  { value: 'truck_driver', label: '司机' },
  { value: 'foreman', label: '班组长' },
  { value: 'helper', label: '小工/杂工' },
  { value: 'other', label: '其他工种' }
] as const

export type WorkerType = typeof workerTypes[number]['value']

/**
 * 管理人员角色
 */
export const staffRoles = [
  { value: 'manager', label: '项目经理' },
  { value: 'engineer', label: '工程师' },
  { value: 'technician', label: '技术员' },
  { value: 'safety', label: '安全员' },
  { value: 'quality', label: '质量员' },
  { value: 'cost', label: '造价员' },
  { value: 'material', label: '材料员' },
  { value: 'procurement', label: '采购员' },
  { value: 'accountant', label: '会计' },
  { value: 'hr', label: '人事' },
  { value: 'admin', label: '行政' },
  { value: 'other', label: '其他' }
] as const

export type StaffRole = typeof staffRoles[number]['value']

/**
 * 性别
 */
export const genders = [
  { value: 'male', label: '男' },
  { value: 'female', label: '女' }
] as const

/**
 * 政治面貌
 */
export const politicalStatuses = [
  { value: 'citizen', label: '群众' },
  { value: 'league', label: '共青团员' },
  { value: 'party', label: '中共党员' },
  { value: 'democratic', label: '民主党派' }
] as const

/**
 * 婚姻状况
 */
export const maritalStatuses = [
  { value: 'single', label: '未婚' },
  { value: 'married', label: '已婚' },
  { value: 'divorced', label: '离异' },
  { value: 'widowed', label: '丧偶' }
] as const

/**
 * 人员状态
 */
export const memberStatuses = [
  { value: 'active', label: '在职' },
  { value: 'left', label: '离场' },
  { value: 'transferred', label: '调离' }
] as const

/**
 * 教育程度
 */
export const educationLevels = [
  { value: 'primary', label: '小学' },
  { value: 'junior', label: '初中' },
  { value: 'senior', label: '高中/中专' },
  { value: 'college', label: '大专' },
  { value: 'bachelor', label: '本科' },
  { value: 'master', label: '硕士' },
  { value: 'doctor', label: '博士' }
] as const

/**
 * 民族
 */
export const ethnicities = [
  '汉族', '蒙古族', '回族', '藏族', '维吾尔族', '苗族', '彝族', '壮族', '布依族', '朝鲜族',
  '满族', '侗族', '瑶族', '白族', '土家族', '哈尼族', '哈萨克族', '傣族', '黎族', '傈僳族',
  '佤族', '畲族', '高山族', '拉祜族', '水族', '东乡族', '纳西族', '景颇族', '科尔克孜族',
  '土族', '达斡尔族', '仫佬族', '羌族', '布朗族', '撒拉族', '毛南族', '仡佬族', '锡伯族',
  '阿昌族', '普米族', '塔吉克族', '怒族', '乌孜别克族', '俄罗斯族', '鄂温克族', '德昂族',
  '保安族', '裕固族', '京族', '塔塔尔族', '独龙族', '鄂伦春族', '赫哲族', '门巴族', '珞巴族', '基诺族'
] as const

================
File: src/constants/snapshots.ts
================
/**
 * 数据库表名 → 中文标签映射
 * 用于 SnapshotsTab 展示快照包含的表 (中英对照)
 */
export const SNAPSHOT_TABLE_LABELS: Record<string, string> = {
  projects: '项目',
  members: '人员',
  drawings: '图纸',
  materials: '材料',
  expenses: '费用',
  costLedger: '台账',
  partners: '合作单位',
  incomeContracts: '收入合同',
  expenseContracts: '支出合同',
  workerTeams: '班组',
  settlements: '结算',
  inventoryItems: '库存',
  invoices: '发票',
  auditLogs: '审计日志',
}

================
File: src/constants/status.tsx
================
import { Badge, type BadgeVariant } from '@/components/ui/Badge/Badge'

/**
 * 统一状态标签配置
 * 所有业务实体的状态显示都应使用这些常量，确保全站视觉一致
 */

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

// ── 项目状态 ──
export const PROJECT_STATUS: Record<string, StatusConfig> = {
  planning: { label: '规划中', variant: 'info' },
  in_progress: { label: '进行中', variant: 'success' },
  completed: { label: '已完工', variant: 'primary' },
  archived: { label: '已归档', variant: 'gray' },
}

// ── 结算状态 ──
export const SETTLEMENT_STATUS: Record<string, StatusConfig> = {
  draft: { label: '草稿', variant: 'gray' },
  pending: { label: '未办理', variant: 'warning' },
  processed: { label: '已办理', variant: 'success' },
  completed: { label: '已办理', variant: 'success' },
  archived: { label: '已归档', variant: 'primary' },
}

// ── 发票状态（收票）──
export const INVOICE_IN_STATUS: Record<string, StatusConfig> = {
  issued: { label: '已收票', variant: 'info' },
  partial: { label: '部分付款', variant: 'warning' },
  paid: { label: '已付清', variant: 'success' },
}

// ── 发票状态（开票）──
export const INVOICE_OUT_STATUS: Record<string, StatusConfig> = {
  issued: { label: '已开具', variant: 'info' },
  partial: { label: '部分收款', variant: 'warning' },
  paid: { label: '已收齐', variant: 'success' },
}

// ── 人员状态 ──
export const MEMBER_STATUS: Record<string, StatusConfig> = {
  active: { label: '在职', variant: 'success' },
  left: { label: '已离职', variant: 'gray' },
}

// ── 工人状态 ──
export const WORKER_STATUS: Record<string, StatusConfig> = {
  active: { label: '在职', variant: 'success' },
  left: { label: '已离场', variant: 'gray' },
}

// ── 用户状态 ──
export const USER_STATUS: Record<string, StatusConfig> = {
  active: { label: '正常', variant: 'success' },
  disabled: { label: '已禁用', variant: 'danger' },
}

// ── 审计日志级别 ──
export const AUDIT_LEVEL: Record<string, StatusConfig> = {
  info: { label: '信息', variant: 'info' },
  warning: { label: '警告', variant: 'warning' },
  error: { label: '错误', variant: 'danger' },
}

// ── 合同状态 ──
export const CONTRACT_STATUS: Record<string, StatusConfig> = {
  draft: { label: '草稿', variant: 'gray' },
  active: { label: '执行中', variant: 'success' },
  completed: { label: '已完工', variant: 'primary' },
  terminated: { label: '已终止', variant: 'danger' },
}

/**
 * 通用状态标签组件
 * 根据 statusConfig 自动渲染 Badge
 */
export function StatusBadge({
  status,
  config,
  fallback = '未知',
}: {
  status: string | undefined | null
  config: Record<string, StatusConfig>
  fallback?: string
}) {
  const cfg = status ? config[status] : null
  return (
    <Badge variant={cfg?.variant ?? 'gray'} size="sm" rounded="full">
      {cfg?.label ?? fallback}
    </Badge>
  )
}

================
File: src/constants/table.ts
================
/**
 * 统一表格样式常量 — 唯一的样式来源
 *
 * 使用规则：
 * - <table>  → TABLE.table
 * - <thead>  → TABLE.headerRow + TABLE.stickyHeader
 * - <th>     → TABLE.headerCell (+ 对齐修饰)
 * - <tr>     → TABLE.bodyRow (+ 点击光标)
 * - <td>     → TABLE.bodyCell (+ 对齐/修饰)
 *
 * 全局 CSS 已为所有 table tbody tr 定义了 hover 高亮，
 * 因此 bodyRow 不再包含 hover:bg-slate-50，避免重复。
 */
export const TABLE = {
  /** 表格外层容器 */
  container:
    'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',

  /** <table> 元素 */
  table: 'w-full border-separate border-spacing-0',

  /** <thead> 行 — 包含底部边框，与表体分隔 */
  headerRow: 'bg-slate-50 border-b border-slate-200',

  /** <th> 单元格 — 默认左对齐、加粗、大写 */
  headerCell:
    'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',

  /** 粘性表头（配合 overflow-auto 容器使用） */
  stickyHeader: 'sticky top-0 z-10',

  /** <tbody> 表体行 — 顶部分隔线 + 过渡 */
  bodyRow: 'border-t border-slate-100 transition-colors',

  /** <td> 单元格 */
  bodyCell: 'px-4 py-3 text-sm text-slate-700',

  /** <td> 左对齐修饰 */
  cellLeft: 'text-left',

  /** <td> 居中对齐修饰 */
  cellCenter: 'text-center',

  /** <td> 右对齐修饰 */
  cellRight: 'text-right',
} as const

================
File: src/contexts/MaskContext.tsx
================
// v0.75.0 MaskContext — PII 脱敏开关 (浮动按钮)
// 升级要点 (commit 6c43a97 + 2ff2550):
// 1. localStorage 是缓存层 (离线立即生效)
// 2. 后端 /api/user-preferences 是权威源 (多设备同步)
// 3. 同步策略: toggle 时立即写 localStorage + 异步 PUT 后端 (失败不阻塞 UI)

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from "react"

interface MaskContextValue {
  masked: boolean
  toggleMask: () => void
  setMasked: (v: boolean) => void
  /** v0.75.0: 后端同步状态 (true = 同步中, 可用于按钮 disabled 显示) */
  isSyncing: boolean
  /** v0.75.0: 后端拉取是否完成 (用于避免在拉取完成前 toggle 写入后端冲突) */
  isHydrated: boolean
}

const MaskContext = createContext<MaskContextValue | null>(null)
const STORAGE_KEY = "v120_mask_enabled"
const PREF_KEY = "pii_mask_enabled"

// 注: MaskProvider 不再调用 getAPI() — 由外部在登录后用 useUserIdSync 触发同步.
// 这里只暴露 setMasked / toggleMask, 它们写 localStorage + 异步 PUT 后端.

export function MaskProvider({ children }: { children: ReactNode }) {
  // v0.76.0 累计待办 #2: 同步从 localStorage 初始化 (避免首屏 mask 闪一下). 默认 true (保守).
  const [masked, setMaskedState] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === "1") return true
      if (v === "0") return false
    } catch { /* SSR / 隐私模式 fallback */ }
    return true
  })
  const [isSyncing, setIsSyncing] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // 防重复 PUT: 上次同步值与本次相同则跳过
  const lastSyncedRef = useRef<boolean | null>(null)

  // v0.76.0 累计待办 #2: localStorage 已在 useState 同步读, useEffect 只标记 hydrated
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  // 同步到后端的 helper
  const syncToServer = useCallback(async (value: boolean) => {
    // 防重复: 同一值不重复请求
    if (lastSyncedRef.current === value) return
    lastSyncedRef.current = value
    setIsSyncing(true)
    try {
      // 动态 import 避免循环依赖
      const { getAPI } = await import("../services/api-adapter")
      const api = await getAPI()
      if (api?.putUserPreference) {
        await api.putUserPreference(PREF_KEY, value ? "1" : "0")
      }
    } catch (err) {
      // 失败不阻塞 UI — localStorage 已是真值, 下次 hydrate 重新拉
      console.error("[MaskContext] 后端同步失败, localStorage 仍是权威:", err)
      lastSyncedRef.current = null // 允许下次重试
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const setMasked = useCallback((v: boolean) => {
    setMaskedState(v)
    try { localStorage.setItem(STORAGE_KEY, v ? "1" : "0") } catch (err) { console.warn('[MaskContext] 写入localStorage失败:', err) }
    // 异步同步后端 (fire-and-forget)
    void syncToServer(v)
  }, [syncToServer])

  const toggleMask = useCallback(() => setMasked(!masked), [masked, setMasked])

  // v0.75.0: 暴露 syncToServer (供外部 useUserIdSync hook 在登录后调用, 拉后端真值)
  // 注: 这里把 syncToServer 通过 ref 暴露, 不放在 context 里 (避免 context value 频繁变)
  const syncToServerRef = useRef(syncToServer)
  syncToServerRef.current = syncToServer

  return (
    <MaskContext.Provider value={{ masked, toggleMask, setMasked, isSyncing, isHydrated }}>
      {children}
    </MaskContext.Provider>
  )
}

export function useMask() {
  const ctx = useContext(MaskContext)
  if (!ctx) throw new Error("useMask must be used within MaskProvider")
  return ctx
}

/**
 * v0.75.0 useUserIdSync — 登录后拉取后端 user_preferences, 覆盖 localStorage 当前值.
 * 用法: 在 App.tsx 的已登录分支渲染 <UserIdSyncBridge userId={...} />
 */
export function useUserIdSync(userId: string | null | undefined) {
  const { setMasked, isHydrated } = useMask()
  const syncedRef = useRef(false)

  useEffect(() => {
    if (!userId || !isHydrated || syncedRef.current) return
    syncedRef.current = true
    ;(async () => {
      try {
        const { getAPI } = await import("../services/api-adapter")
        const api = await getAPI()
        if (!api?.getUserPreference) return
        const res = await api.getUserPreference(PREF_KEY)
        if (res?.success && res.data?.value != null) {
          const serverValue = res.data.value === "1" || res.data.value === "true"
          setMasked(serverValue)
        }
      } catch (err) {
        console.error("[useUserIdSync] 拉取后端 pii_mask_enabled 失败, 保持 localStorage:", err)
        syncedRef.current = false // 允许重试
      }
    })()
  }, [userId, isHydrated, setMasked])
}

================
File: src/data/regions.ts
================
// 地区数据
export interface RegionOption {
  name: string
  districts: string[]
}

export const provinceCities: Record<string, RegionOption[]> = {
  '北京市': [{ name: '北京市', districts: ['东城区', '西城区', '朝阳区', '丰台区', '石景山区', '海淀区', '房山区', '通州区', '顺义区', '昌平区', '大兴区', '怀柔区', '平谷区', '密云区', '延庆区'] }],
  '上海市': [{ name: '上海市', districts: ['黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区', '杨浦区', '闵行区', '宝山区', '嘉定区', '浦东新区', '金山区', '松江区', '青浦区', '奉贤区'] }],
  '广东省': [
    { name: '广州市', districts: ['天河区', '海珠区', '越秀区', '荔湾区', '白云区', '黄埔区', '番禺区', '南沙区', '花都区', '从化区', '增城区'] },
    { name: '深圳市', districts: ['福田区', '罗湖区', '南山区', '宝安区', '龙岗区', '龙华区', '盐田区', '坪山区', '光明区', '大鹏新区'] },
    { name: '东莞市', districts: ['莞城区', '南城区', '东城区', '万江区', '长安镇', '虎门镇', '厚街镇', '常平镇', '塘厦镇'] },
    { name: '佛山市', districts: ['禅城区', '南海区', '顺德区', '高明区', '三水区'] },
    { name: '珠海市', districts: ['香洲区', '斗门区', '金湾区'] },
    { name: '惠州市', districts: ['惠城区', '惠阳区', '博罗县', '惠东县', '龙门县'] },
    { name: '中山市', districts: ['石岐区', '东区', '西区', '南区', '小榄镇', '古镇镇', '横栏镇'] },
    { name: '江门市', districts: ['蓬江区', '江海区', '新会区', '台山市', '开平市', '鹤山市', '恩平市'] },
    { name: '汕头市', districts: ['龙湖区', '金平区', '澄海区', '潮阳区', '潮南区'] },
    { name: '湛江市', districts: ['赤坎区', '霞山区', '麻章区', '坡头区', '廉江市', '雷州市', '吴川市'] },
    { name: '茂名市', districts: ['茂南区', '电白区', '高州市', '化州市', '信宜市'] },
    { name: '肇庆市', districts: ['端州区', '鼎湖区', '四会市', '高要区'] },
    { name: '梅州市', districts: ['梅江区', '梅县区', '兴宁市'] },
    { name: '河源市', districts: ['源城区', '龙川县', '紫金县'] },
    { name: '阳江市', districts: ['江城区', '阳春市', '阳东区', '阳西县'] },
    { name: '清远市', districts: ['清城区', '清新区', '英德市', '连州市'] },
    { name: '韶关市', districts: ['武江区', '浈江区', '乐昌市', '南雄市'] },
    { name: '揭阳市', districts: ['榕城区', '揭东区', '普宁市'] },
    { name: '云浮市', districts: ['云城区', '罗定市'] }
  ],
  '浙江省': [
    { name: '杭州市', districts: ['上城区', '下城区', '西湖区', '拱墅区', '江干区', '滨江区', '萧山区', '余杭区', '临平区', '钱塘区', '富阳区', '临安区', '桐庐县', '建德市', '淳安县'] },
    { name: '宁波市', districts: ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '余姚市', '慈溪市', '象山县', '宁海县'] },
    { name: '温州市', districts: ['鹿城区', '龙湾区', '瓯海区', '洞头区', '瑞安市', '乐清市', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县'] },
    { name: '嘉兴市', districts: ['南湖区', '秀洲区', '海宁市', '平湖市', '桐乡市', '嘉善县', '海盐县'] },
    { name: '湖州市', districts: ['吴兴区', '南浔区', '德清县', '长兴县', '安吉县'] },
    { name: '绍兴市', districts: ['越城区', '柯桥区', '上虞区', '诸暨市', '嵊州市', '新昌县'] },
    { name: '金华市', districts: ['婺城区', '金东区', '兰溪市', '义乌市', '东阳市', '永康市', '武义县', '浦江县', '磐安县'] },
    { name: '衢州市', districts: ['柯城区', '衢江区', '江山市', '龙游县', '开化县', '常山县'] },
    { name: '舟山市', districts: ['定海区', '普陀区', '岱山县', '嵊泗县'] },
    { name: '台州市', districts: ['椒江区', '黄岩区', '路桥区', '温岭市', '临海市', '玉环市', '三门县', '天台县', '仙居县'] },
    { name: '丽水市', districts: ['莲都区', '龙泉市', '青田县', '缙云县', '遂昌县', '松阳县', '云和县', '庆元县', '景宁畲族自治县'] }
  ],
  '江苏省': [
    { name: '南京市', districts: ['玄武区', '秦淮区', '建邺区', '鼓楼区', '栖霞区', '雨花台区', '江宁区', '浦口区', '六合区', '溧水区', '高淳区'] },
    { name: '苏州市', districts: ['姑苏区', '虎丘区', '吴中区', '相城区', '吴江区', '工业园区', '高新区', '常熟市', '张家港市', '昆山市', '太仓市'] },
    { name: '无锡市', districts: ['梁溪区', '锡山区', '惠山区', '滨湖区', '新吴区', '江阴市', '宜兴市'] },
    { name: '常州市', districts: ['天宁区', '钟楼区', '新北区', '武进区', '金坛区', '溧阳市'] },
    { name: '镇江市', districts: ['京口区', '润州区', '丹徒区', '丹阳市', '扬中市', '句容市'] },
    { name: '扬州市', districts: ['广陵区', '邗江区', '江都区', '仪征市', '高邮市', '宝应县'] },
    { name: '泰州市', districts: ['海陵区', '高港区', '姜堰区', '靖江市', '泰兴市', '兴化市'] },
    { name: '南通市', districts: ['崇川区', '港闸区', '通州区', '海安市', '如东县', '启东市', '如皋市'] },
    { name: '盐城市', districts: ['亭湖区', '盐都区', '大丰区', '东台市', '响水县', '滨海县', '阜宁县', '射阳县', '建湖县'] },
    { name: '徐州市', districts: ['云龙区', '鼓楼区', '泉山区', '铜山区', '贾汪区', '邳州市', '新沂市', '丰县', '沛县', '睢宁县'] },
    { name: '连云港市', districts: ['海州区', '连云区', '赣榆区', '东海县', '灌云县', '灌南县'] },
    { name: '淮安市', districts: ['清江浦区', '淮安区', '淮阴区', '洪泽区', '涟水县', '盱眙县', '金湖县'] },
    { name: '宿迁市', districts: ['宿城区', '宿豫区', '沭阳县', '泗阳县', '泗洪县'] }
  ],
  '四川省': [
    { name: '成都市', districts: ['锦江区', '青羊区', '金牛区', '武侯区', '成华区', '龙泉驿区', '青白江区', '新都区', '温江区', '双流区', '郫都区', '新津区', '简阳市', '都江堰市', '彭州市', '邛崃市', '崇州市', '金堂县', '大邑县', '蒲江县'] },
    { name: '绵阳市', districts: ['涪城区', '游仙区', '安州区', '江油市', '三台县', '盐亭县', '梓潼县', '北川羌族自治县', '平武县'] },
    { name: '德阳市', districts: ['旌阳区', '罗江区', '广汉市', '什邡市', '绵竹市', '中江县'] },
    { name: '南充市', districts: ['顺庆区', '高坪区', '嘉陵区', '阆中市', '南部县', '营山县', '蓬安县', '仪陇县', '西充县'] },
    { name: '宜宾市', districts: ['翠屏区', '南溪区', '叙州区', '江安县', '长宁县', '高县', '珙县', '筠连县', '兴文县', '屏山县'] },
    { name: '自贡市', districts: ['自流井区', '贡井区', '大安区', '沿滩区', '荣县', '富顺县'] },
    { name: '泸州市', districts: ['江阳区', '纳溪区', '龙马潭区', '泸县', '合江县', '叙永县', '古蔺县'] },
    { name: '内江市', districts: ['市中区', '东兴区', '隆昌市', '威远县', '资中县'] },
    { name: '乐山市', districts: ['市中区', '沙湾区', '五通桥区', '金口河区', '峨眉山市', '犍为县', '井研县', '夹江县', '沐川县'] },
    { name: '达州市', districts: ['通川区', '达川区', '万源市', '宣汉县', '开江县', '大竹县', '渠县'] },
    { name: '遂宁市', districts: ['船山区', '安居区', '射洪市', '蓬溪县', '大英县'] },
    { name: '广安市', districts: ['广安区', '前锋区', '华蓥市', '岳池县', '武胜县', '邻水县'] },
    { name: '资阳市', districts: ['雁江区', '安岳县', '乐至县'] },
    { name: '眉山市', districts: ['东坡区', '彭山区', '仁寿县', '洪雅县', '丹棱县', '青神县'] },
    { name: '雅安市', districts: ['雨城区', '名山区', '荥经县', '汉源县', '石棉县', '天全县', '芦山县', '宝兴县'] },
    { name: '广元市', districts: ['利州区', '昭化区', '朝天区', '旺苍县', '青川县', '剑阁县', '苍溪县'] },
    { name: '巴中市', districts: ['巴州区', '恩阳区', '通江县', '南江县', '平昌县'] },
    { name: '攀枝花市', districts: ['东区', '西区', '仁和区', '米易县', '盐边县'] },
    { name: '凉山彝族自治州', districts: ['西昌市', '德昌县', '会理县', '会东县', '宁南县', '冕宁县'] }
  ],
  '湖北省': [
    { name: '武汉市', districts: ['江岸区', '江汉区', '硚口区', '汉阳区', '武昌区', '青山区', '洪山区', '东西湖区', '汉南区', '蔡甸区', '江夏区', '黄陂区', '新洲区'] },
    { name: '黄石市', districts: ['黄石港区', '西塞山区', '下陆区', '铁山区', '大冶市', '阳新县'] },
    { name: '十堰市', districts: ['茅箭区', '张湾区', '郧阳区', '丹江口市', '郧西县', '竹山县', '竹溪县', '房县'] },
    { name: '宜昌市', districts: ['西陵区', '伍家岗区', '点军区', '猇亭区', '夷陵区', '宜都市', '当阳市', '枝江市', '远安县', '兴山县', '秭归县'] },
    { name: '襄阳市', districts: ['襄城区', '樊城区', '襄州区', '老河口市', '枣阳市', '宜城市', '南漳县', '谷城县', '保康县'] },
    { name: '鄂州市', districts: ['梁子湖区', '华容区', '鄂城区'] },
    { name: '荆州市', districts: ['沙市区', '荆州区', '石首市', '洪湖市', '松滋市', '公安县', '监利县', '江陵县'] },
    { name: '荆门市', districts: ['东宝区', '掇刀区', '钟祥市', '京山市', '沙洋县'] },
    { name: '孝感市', districts: ['孝南区', '应城市', '安陆市', '汉川市', '孝昌县', '大悟县', '云梦县'] },
    { name: '黄冈市', districts: ['黄州区', '麻城市', '武穴市', '红安县', '罗田县', '英山县', '浠水县', '蕲春县', '黄梅县', '团风县'] },
    { name: '咸宁市', districts: ['咸安区', '赤壁市', '嘉鱼县', '通城县', '崇阳县', '通山县'] },
    { name: '随州市', districts: ['曾都区', '广水市', '随县'] },
    { name: '恩施土家族苗族自治州', districts: ['恩施市', '利川市', '建始县', '巴东县', '宣恩县', '咸丰县', '来凤县', '鹤峰县'] }
  ],
  '湖南省': [
    { name: '长沙市', districts: ['芙蓉区', '天心区', '岳麓区', '开福区', '雨花区', '望城区', '长沙县', '浏阳市', '宁乡市'] },
    { name: '株洲市', districts: ['天元区', '芦淞区', '荷塘区', '石峰区', '渌口区', '醴陵市', '攸县', '茶陵县', '炎陵县'] },
    { name: '湘潭市', districts: ['雨湖区', '岳塘区', '湘乡市', '韶山市', '湘潭县'] },
    { name: '衡阳市', districts: ['蒸湘区', '珠晖区', '雁峰区', '石鼓区', '南岳区', '耒阳市', '常宁市', '衡阳县', '衡南县', '衡山县', '衡东县', '祁东县'] },
    { name: '邵阳市', districts: ['双清区', '大祥区', '北塔区', '武冈市', '邵东市', '新邵县', '邵阳县', '隆回县', '洞口县', '绥宁县', '新宁县'] },
    { name: '岳阳市', districts: ['岳阳楼区', '云溪区', '君山区', '汨罗市', '临湘市', '岳阳县', '华容县', '湘阴县', '平江县'] },
    { name: '常德市', districts: ['武陵区', '鼎城区', '津市市', '安乡县', '汉寿县', '澧县', '临澧县', '桃源县', '石门县'] },
    { name: '张家界市', districts: ['永定区', '武陵源区', '慈利县', '桑植县'] },
    { name: '益阳市', districts: ['赫山区', '资阳区', '沅江市', '南县', '桃江县', '安化县'] },
    { name: '郴州市', districts: ['北湖区', '苏仙区', '资兴市', '桂阳县', '宜章县', '永兴县', '嘉禾县', '临武县', '汝城县', '桂东县', '安仁县'] },
    { name: '永州市', districts: ['零陵区', '冷水滩区', '祁阳县', '东安县', '双牌县', '道县', '江永县', '宁远县', '蓝山县', '新田县', '江华瑶族自治县'] },
    { name: '怀化市', districts: ['鹤城区', '洪江市', '沅陵县', '辰溪县', '溆浦县', '会同县', '麻阳苗族自治县', '新晃侗族自治县', '芷江侗族自治县'] },
    { name: '娄底市', districts: ['娄星区', '冷水江市', '涟源市', '双峰县', '新化县'] },
    { name: '湘西土家族苗族自治州', districts: ['吉首市', '泸溪县', '凤凰县', '花垣县', '保靖县', '古丈县', '永顺县', '龙山县'] }
  ],
  '山东省': [
    { name: '济南市', districts: ['历下区', '市中区', '槐荫区', '天桥区', '历城区', '长清区', '章丘区', '济阳区', '莱芜区', '钢城区', '平阴县', '商河县'] },
    { name: '青岛市', districts: ['市南区', '市北区', '黄岛区', '崂山区', '李沧区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市'] },
    { name: '淄博市', districts: ['张店区', '淄川区', '博山区', '临淄区', '周村区', '桓台县', '高青县', '沂源县'] },
    { name: '枣庄市', districts: ['市中区', '薛城区', '峄城区', '台儿庄区', '山亭区', '滕州市'] },
    { name: '东营市', districts: ['东营区', '河口区', '垦利区', '利津县', '广饶县'] },
    { name: '烟台市', districts: ['芝罘区', '福山区', '牟平区', '莱山区', '蓬莱区', '龙口市', '莱阳市', '莱州市', '招远市', '栖霞市', '海阳市'] },
    { name: '潍坊市', districts: ['奎文区', '潍城区', '寒亭区', '坊子区', '青州市', '诸城市', '寿光市', '安丘市', '高密市', '昌邑市', '临朐县', '昌乐县'] },
    { name: '济宁市', districts: ['任城区', '兖州区', '曲阜市', '邹城市', '微山县', '鱼台县', '金乡县', '嘉祥县', '汶上县', '泗水县', '梁山县'] },
    { name: '泰安市', districts: ['泰山区', '岱岳区', '新泰市', '肥城市', '宁阳县', '东平县'] },
    { name: '威海市', districts: ['环翠区', '文登区', '荣成市', '乳山市'] },
    { name: '日照市', districts: ['东港区', '岚山区', '五莲县', '莒县'] },
    { name: '临沂市', districts: ['兰山区', '罗庄区', '河东区', '沂南县', '郯城县', '沂水县', '兰陵县', '费县', '平邑县', '莒南县', '蒙阴县', '临沭县'] },
    { name: '德州市', districts: ['德城区', '陵城区', '乐陵市', '禹城市', '宁津县', '庆云县', '临邑县', '齐河县', '平原县', '夏津县', '武城县'] },
    { name: '聊城市', districts: ['东昌府区', '临清市', '阳谷县', '莘县', '茌平区', '东阿县', '冠县', '高唐县'] },
    { name: '滨州市', districts: ['滨城区', '沾化区', '邹平市', '惠民县', '阳信县', '无棣县', '博兴县'] },
    { name: '菏泽市', districts: ['牡丹区', '定陶区', '曹县', '单县', '成武县', '巨野县', '郓城县', '鄄城县', '东明县'] }
  ],
  '河南省': [
    { name: '郑州市', districts: ['中原区', '二七区', '管城回族区', '金水区', '惠济区', '上街区', '巩义市', '荥阳市', '新密市', '新郑市', '登封市', '中牟县'] },
    { name: '开封市', districts: ['龙亭区', '顺河回族区', '鼓楼区', '禹王台区', '祥符区', '兰考县', '杞县', '通许县', '尉氏县'] },
    { name: '洛阳市', districts: ['涧西区', '西工区', '老城区', '瀍河回族区', '洛龙区', '吉利区', '偃师区', '孟津县', '新安县', '栾川县', '嵩县', '汝阳县', '宜阳县', '洛宁县', '伊川县'] },
    { name: '平顶山市', districts: ['新华区', '卫东区', '湛河区', '石龙区', '舞钢市', '汝州市', '宝丰县', '叶县', '鲁山县', '郏县'] },
    { name: '安阳市', districts: ['文峰区', '北关区', '殷都区', '龙安区', '林州市', '安阳县', '汤阴县', '滑县', '内黄县'] },
    { name: '鹤壁市', districts: ['淇滨区', '山城区', '鹤山区', '浚县', '淇县'] },
    { name: '新乡市', districts: ['卫滨区', '红旗区', '凤泉区', '牧野区', '卫辉市', '辉县市', '长垣市', '新乡县', '获嘉县', '原阳县', '延津县', '封丘县'] },
    { name: '焦作市', districts: ['山阳区', '解放区', '中站区', '马村区', '沁阳市', '孟州市', '修武县', '博爱县', '武陟县', '温县'] },
    { name: '濮阳市', districts: ['华龙区', '清丰县', '南乐县', '范县', '台前县', '濮阳县'] },
    { name: '许昌市', districts: ['魏都区', '建安区', '禹州市', '长葛市', '鄢陵县', '襄城县'] },
    { name: '漯河市', districts: ['郾城区', '源汇区', '召陵区', '舞阳县', '临颍县'] },
    { name: '三门峡市', districts: ['湖滨区', '陕州区', '义马市', '灵宝市', '渑池县', '卢氏县'] },
    { name: '南阳市', districts: ['卧龙区', '宛城区', '邓州市', '南召县', '方城县', '西峡县', '镇平县', '内乡县', '淅川县', '社旗县', '唐河县', '新野县', '桐柏县'] },
    { name: '商丘市', districts: ['梁园区', '睢阳区', '永城市', '民权县', '睢县', '宁陵县', '柘城县', '虞城县', '夏邑县'] },
    { name: '信阳市', districts: ['浉河区', '平桥区', '固始县', '罗山县', '光山县', '新县', '商城县', '潢川县', '淮滨县', '息县'] },
    { name: '周口市', districts: ['川汇区', '项城市', '扶沟县', '西华县', '商水县', '沈丘县', '淮阳区', '鹿邑县', '太康县'] },
    { name: '驻马店市', districts: ['驿城区', '确山县', '泌阳县', '遂平县', '西平县', '上蔡县', '汝南县', '平舆县', '新蔡县', '正阳县'] },
    { name: '济源市', districts: ['济源市'] }
  ],
  '河北省': [
    { name: '石家庄市', districts: ['长安区', '桥西区', '新华区', '井陉矿区', '裕华区', '藁城区', '鹿泉区', '栾城区', '晋州市', '新乐市', '正定县', '井陉县', '行唐县', '灵寿县', '高邑县', '深泽县', '赞皇县', '无极县', '平山县', '元氏县', '赵县'] },
    { name: '唐山市', districts: ['路南区', '路北区', '古冶区', '开平区', '丰南区', '丰润区', '曹妃甸区', '遵化市', '迁安市', '滦州市', '滦南县', '乐亭县', '迁西县', '玉田县'] },
    { name: '秦皇岛市', districts: ['海港区', '山海关区', '北戴河区', '抚宁区', '昌黎县', '卢龙县', '青龙满族自治县'] },
    { name: '邯郸市', districts: ['丛台区', '复兴区', '邯山区', '峰峰矿区', '武安市', '邯郸县', '临漳县', '成安县', '大名县', '涉县', '磁县', '肥乡县', '永年县', '邱县', '鸡泽县', '广平县', '馆陶县', '魏县', '曲周县'] },
    { name: '邢台市', districts: ['襄都区', '信都区', '任泽区', '南和区', '南宫市', '沙河市', '临城县', '内丘县', '柏乡县', '隆尧县', '宁晋县', '巨鹿县', '新河县', '广宗县', '平乡县', '威县', '清河县', '临西县'] },
    { name: '保定市', districts: ['竞秀区', '莲池区', '满城区', '清苑区', '徐水区', '涿州市', '定州市', '安国市', '高碑店市', '涞水县', '阜平县', '定兴县', '唐县', '高阳县', '涞源县', '望都县', '易县', '曲阳县', '蠡县', '顺平县', '博野县', '雄县'] },
    { name: '张家口市', districts: ['桥东区', '桥西区', '宣化区', '下花园区', '万全区', '崇礼区', '张北县', '康保县', '沽源县', '尚义县', '蔚县', '阳原县', '怀安县', '怀来县', '涿鹿县', '赤城县'] },
    { name: '承德市', districts: ['双桥区', '双滦区', '鹰手营子矿区', '平泉市', '承德县', '兴隆县', '滦平县', '隆化县', '丰宁满族自治县', '宽城满族自治县', '围场满族蒙古族自治县'] },
    { name: '沧州市', districts: ['运河区', '新华区', '泊头市', '任丘市', '黄骅市', '河间市', '沧县', '青县', '东光县', '海兴县', '盐山县', '肃宁县', '南皮县', '吴桥县', '献县', '孟村回族自治县'] },
    { name: '廊坊市', districts: ['广阳区', '安次区', '霸州市', '三河市', '固安县', '永清县', '香河县', '大城县', '文安县', '大厂回族自治县'] },
    { name: '衡水市', districts: ['桃城区', '冀州区', '深州市', '枣强县', '武邑县', '武强县', '饶阳县', '安平县', '故城县', '景县', '阜城县'] }
  ],
  '福建省': [
    { name: '福州市', districts: ['鼓楼区', '台江区', '仓山区', '马尾区', '晋安区', '长乐区', '福清市', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县'] },
    { name: '厦门市', districts: ['思明区', '海沧区', '湖里区', '集美区', '同安区', '翔安区'] },
    { name: '莆田市', districts: ['城厢区', '涵江区', '荔城区', '秀屿区', '仙游县'] },
    { name: '三明市', districts: ['三元区', '沙县区', '永安市', '明溪县', '清流县', '宁化县', '大田县', '尤溪县', '将乐县', '泰宁县', '建宁县'] },
    { name: '泉州市', districts: ['丰泽区', '鲤城区', '洛江区', '泉港区', '石狮市', '晋江市', '南安市', '惠安县', '安溪县', '永春县', '德化县'] },
    { name: '漳州市', districts: ['芗城区', '龙文区', '龙海区', '漳浦县', '云霄县', '诏安县', '长泰县', '东山县', '南靖县', '平和县', '华安县'] },
    { name: '南平市', districts: ['延平区', '建阳区', '邵武市', '武夷山市', '建瓯市', '顺昌县', '浦城县', '光泽县', '松溪县', '政和县'] },
    { name: '龙岩市', districts: ['新罗区', '永定区', '漳平市', '长汀县', '上杭县', '武平县', '连城县'] },
    { name: '宁德市', districts: ['蕉城区', '福安市', '福鼎市', '霞浦县', '古田县', '屏南县', '寿宁县', '周宁县', '柘荣县'] }
  ],
  '江西省': [
    { name: '南昌市', districts: ['东湖区', '西湖区', '青云谱区', '青山湖区', '新建区', '红谷滩区', '南昌县', '进贤县', '安义县'] },
    { name: '景德镇市', districts: ['珠山区', '昌江区', '乐平市', '浮梁县'] },
    { name: '萍乡市', districts: ['安源区', '湘东区', '莲花县', '上栗县', '芦溪县'] },
    { name: '九江市', districts: ['浔阳区', '濂溪区', '柴桑区', '瑞昌市', '共青城市', '庐山市', '武宁县', '修水县', '永修县', '德安县', '都昌县', '湖口县', '彭泽县'] },
    { name: '新余市', districts: ['渝水区', '分宜县'] },
    { name: '鹰潭市', districts: ['月湖区', '余江区', '贵溪市'] },
    { name: '赣州市', districts: ['章贡区', '南康区', '赣县区', '瑞金市', '龙南市', '信丰县', '大余县', '上犹县', '崇义县', '安远县', '定南县', '全南县', '宁都县', '于都县', '兴国县', '会昌县', '寻乌县', '石城县'] },
    { name: '吉安市', districts: ['吉州区', '青原区', '井冈山市', '吉安县', '吉水县', '峡江县', '新干县', '永丰县', '泰和县', '遂川县', '万安县', '安福县', '永新县'] },
    { name: '宜春市', districts: ['袁州区', '丰城市', '樟树市', '高安市', '奉新县', '万载县', '上高县', '宜丰县', '靖安县', '铜鼓县'] },
    { name: '抚州市', districts: ['临川区', '东乡区', '南城县', '黎川县', '南丰县', '崇仁县', '乐安县', '宜黄县', '金溪县', '资溪县', '广昌县'] },
    { name: '上饶市', districts: ['信州区', '广丰区', '广信区', '德兴市', '上饶县', '玉山县', '铅山县', '横峰县', '弋阳县', '余干县', '鄱阳县', '万年县', '婺源县'] }
  ],
  '安徽省': [
    { name: '合肥市', districts: ['蜀山区', '庐阳区', '瑶海区', '包河区', '巢湖市', '长丰县', '肥东县', '肥西县', '庐江县'] },
    { name: '芜湖市', districts: ['镜湖区', '弋江区', '鸠江区', '三山区', '皖江江北新兴产业集中区', '繁昌区', '芜湖县', '南陵县', '无为市'] },
    { name: '蚌埠市', districts: ['蚌山区', '龙子湖区', '禹会区', '淮上区', '怀远县', '五河县', '固镇县'] },
    { name: '淮南市', districts: ['田家庵区', '大通区', '谢家集区', '八公山区', '潘集区', '凤台县', '寿县'] },
    { name: '马鞍山市', districts: ['雨山区', '花山区', '博望区', '当涂县', '含山县', '和县'] },
    { name: '淮北市', districts: ['相山区', '杜集区', '烈山区', '濉溪县'] },
    { name: '铜陵市', districts: ['铜官区', '义安区', '郊区', '枞阳县'] },
    { name: '安庆市', districts: ['迎江区', '大观区', '宜秀区', '桐城市', '潜山市', '怀宁县', '太湖县', '宿松县', '望江县', '岳西县'] },
    { name: '黄山市', districts: ['屯溪区', '黄山区', '徽州区', '歙县', '休宁县', '黟县', '祁门县'] },
    { name: '滁州市', districts: ['琅琊区', '南谯区', '天长市', '明光市', '来安县', '全椒县', '定远县', '凤阳县'] },
    { name: '阜阳市', districts: ['颍州区', '颍东区', '颍泉区', '界首市', '临泉县', '太和县', '阜南县', '颍上县'] },
    { name: '宿州市', districts: ['埇桥区', '砀山县', '萧县', '灵璧县', '泗县'] },
    { name: '六安市', districts: ['金安区', '裕安区', '叶集区', '霍邱县', '霍山县', '舒城县', '金寨县'] },
    { name: '亳州市', districts: ['谯城区', '涡阳县', '蒙城县', '利辛县'] },
    { name: '池州市', districts: ['贵池区', '东至县', '石台县', '青阳县'] },
    { name: '宣城市', districts: ['宣州区', '宁国市', '广德市', '郎溪县', '泾县', '绩溪县', '旌德县'] }
  ],
  '辽宁省': [
    { name: '沈阳市', districts: ['和平区', '沈河区', '皇姑区', '铁西区', '大东区', '浑南区', '于洪区', '沈北新区', '苏家屯区', '辽中区', '新民市', '康平县', '法库县'] },
    { name: '大连市', districts: ['中山区', '西岗区', '沙河口区', '甘井子区', '旅顺口区', '金州区', '普兰店区', '瓦房店市', '庄河市', '长海县'] },
    { name: '鞍山市', districts: ['铁东区', '铁西区', '立山区', '千山区', '海城市', '台安县', '岫岩满族自治县'] },
    { name: '抚顺市', districts: ['顺城区', '新抚区', '东洲区', '望花区', '抚顺县', '新宾满族自治县', '清原满族自治县'] },
    { name: '本溪市', districts: ['平山区', '溪湖区', '明山区', '南芬区', '本溪满族自治县', '桓仁满族自治县'] },
    { name: '丹东市', districts: ['元宝区', '振兴区', '振安区', '东港市', '凤城市', '宽甸满族自治县'] },
    { name: '锦州市', districts: ['古塔区', '凌河区', '太和区', '凌海市', '北镇市', '黑山县', '义县'] },
    { name: '营口市', districts: ['站前区', '西市区', '鲅鱼圈区', '老边区', '大石桥市', '盖州市'] },
    { name: '阜新市', districts: ['海州区', '新邱区', '太平区', '清河门区', '细河区', '阜新蒙古族自治县', '彰武县'] },
    { name: '辽阳市', districts: ['白塔区', '文圣区', '宏伟区', '弓长岭区', '太子河区', '灯塔市', '辽阳县'] },
    { name: '盘锦市', districts: ['双台子区', '兴隆台区', '大洼区', '盘山县'] },
    { name: '铁岭市', districts: ['银州区', '清河区', '调兵山市', '开原市', '铁岭县', '西丰县', '昌图县'] },
    { name: '朝阳市', districts: ['双塔区', '龙城区', '北票市', '凌源市', '朝阳县', '建平县', '喀喇沁左翼蒙古族自治县'] },
    { name: '葫芦岛市', districts: ['连山区', '龙港区', '南票区', '兴城市', '绥中县', '建昌县'] }
  ],
  '吉林省': [
    { name: '长春市', districts: ['南关区', '宽城区', '朝阳区', '二道区', '绿园区', '双阳区', '九台区', '榆树市', '德惠市', '农安县'] },
    { name: '吉林市', districts: ['船营区', '昌邑区', '龙潭区', '丰满区', '磐石市', '蛟河市', '桦甸市', '舒兰市', '永吉县'] },
    { name: '四平市', districts: ['铁西区', '铁东区', '双辽市', '公主岭市', '梨树县', '伊通满族自治县'] },
    { name: '辽源市', districts: ['龙山区', '西安区', '东丰县', '东辽县'] },
    { name: '通化市', districts: ['东昌区', '二道江区', '梅河口市', '集安市', '通化县', '辉南县', '柳河县'] },
    { name: '白山市', districts: ['浑江区', '江源区', '临江市', '抚松县', '靖宇县', '长白朝鲜族自治县'] },
    { name: '松原市', districts: ['宁江区', '扶余市', '长岭县', '乾安县', '前郭尔罗斯蒙古族自治县'] },
    { name: '白城市', districts: ['洮北区', '洮南市', '大安市', '镇赉县', '通榆县'] },
    { name: '延边朝鲜族自治州', districts: ['延吉市', '图们市', '敦化市', '珲春市', '龙井市', '和龙市', '汪清县', '安图县'] }
  ],
  '黑龙江省': [
    { name: '哈尔滨市', districts: ['道里区', '南岗区', '道外区', '平房区', '松北区', '香坊区', '呼兰区', '阿城区', '双城区', '五常市', '尚志市', '宾县', '方正县', '依兰县', '巴彦县', '木兰县', '通河县', '延寿县'] },
    { name: '齐齐哈尔市', districts: ['龙沙区', '建华区', '铁锋区', '昂昂溪区', '富拉尔基区', '碾子山区', '梅里斯达斡尔族区', '讷河市', '龙江县', '依安县', '甘南县', '富裕县', '克山县', '克东县', '拜泉县'] },
    { name: '鸡西市', districts: ['鸡冠区', '恒山区', '滴道区', '梨树区', '城子河区', '麻山区', '虎林市', '密山市', '鸡东县'] },
    { name: '鹤岗市', districts: ['向阳区', '工农区', '南山区', '兴安区', '东山区', '兴山区', '萝北县', '绥滨县'] },
    { name: '双鸭山市', districts: ['尖山区', '岭东区', '四方台区', '宝山区', '集贤县', '友谊县', '宝清县', '饶河县'] },
    { name: '大庆市', districts: ['萨尔图区', '龙凤区', '让胡路区', '红岗区', '大同区', '肇州县', '肇源县', '林甸县', '杜尔伯特蒙古族自治县'] },
    { name: '伊春市', districts: ['伊美区', '乌翠区', '友好区', '嘉荫县', '汤旺县', '丰林县', '南岔县', '金林区', '铁力市'] },
    { name: '佳木斯市', districts: ['向阳区', '前进区', '东风区', '郊区', '同江市', '富锦市', '抚远市', '桦南县', '桦川县', '汤原县'] },
    { name: '七台河市', districts: ['新兴区', '桃山区', '茄子河区', '勃利县'] },
    { name: '牡丹江市', districts: ['东安区', '阳明区', '爱民区', '西安区', '绥芬河市', '海林市', '宁安市', '穆棱市', '东宁市', '林口县'] },
    { name: '黑河市', districts: ['爱辉区', '北安市', '五大连池市', '嫩江市', '逊克县', '孙吴县'] },
    { name: '绥化市', districts: ['北林区', '望奎县', '兰西县', '青冈县', '庆安县', '明水县', '绥棱县', '安达市', '肇东市', '海伦市'] }
  ],
  '陕西省': [
    { name: '西安市', districts: ['新城区', '碑林区', '莲湖区', '灞桥区', '未央区', '雁塔区', '阎良区', '临潼区', '长安区', '高陵区', '鄠邑区', '蓝田县', '周至县'] },
    { name: '铜川市', districts: ['王益区', '印台区', '耀州区', '宜君县'] },
    { name: '宝鸡市', districts: ['渭滨区', '金台区', '陈仓区', '凤翔县', '岐山县', '扶风县', '眉县', '陇县', '千阳县', '麟游县', '凤县', '太白县'] },
    { name: '咸阳市', districts: ['秦都区', '渭城区', '杨陵区', '兴平市', '彬州市', '三原县', '泾阳县', '乾县', '礼泉县', '永寿县', '长武县', '旬邑县', '淳化县', '武功县'] },
    { name: '渭南市', districts: ['临渭区', '华州区', '韩城市', '华阴市', '潼关县', '大荔县', '合阳县', '澄城县', '蒲城县', '白水县', '富平县'] },
    { name: '延安市', districts: ['宝塔区', '安塞区', '子长市', '延长县', '延川县', '志丹县', '吴起县', '甘泉县', '富县', '洛川县', '宜川县', '黄龙县', '黄陵县'] },
    { name: '汉中市', districts: ['汉台区', '南郑区', '城固县', '洋县', '西乡县', '勉县', '宁强县', '略阳县', '镇巴县', '留坝县', '佛坪县'] },
    { name: '榆林市', districts: ['榆阳区', '横山区', '神木市', '府谷县', '靖边县', '定边县', '绥德县', '米脂县', '佳县', '吴堡县', '清涧县', '子洲县'] },
    { name: '安康市', districts: ['汉滨区', '旬阳市', '汉阴县', '石泉县', '宁陕县', '紫阳县', '岚皋县', '平利县', '镇坪县', '白河县'] },
    { name: '商洛市', districts: ['商州区', '洛南县', '丹凤县', '商南县', '山阳县', '镇安县', '柞水县'] }
  ],
  '云南省': [
    { name: '昆明市', districts: ['五华区', '盘龙区', '官渡区', '西山区', '东川区', '呈贡区', '晋宁区', '安宁市', '富民县', '宜良县', '嵩明县', '禄劝彝族苗族自治县', '寻甸回族彝族自治县', '石林彝族自治县'] },
    { name: '曲靖市', districts: ['麒麟区', '沾益区', '马龙区', '宣威市', '陆良县', '师宗县', '罗平县', '富源县', '会泽县'] },
    { name: '玉溪市', districts: ['红塔区', '江川区', '澄江市', '通海县', '华宁县', '易门县', '峨山彝族自治县', '新平彝族傣族自治县', '元江哈尼族彝族傣族自治县'] },
    { name: '保山市', districts: ['隆阳区', '腾冲市', '施甸县', '龙陵县', '昌宁县'] },
    { name: '昭通市', districts: ['昭阳区', '水富市', '鲁甸县', '巧家县', '盐津县', '大关县', '永善县', '绥江县', '镇雄县', '彝良县', '威信县'] },
    { name: '丽江市', districts: ['古城区', '玉龙纳西族自治县', '永胜县', '华坪县', '宁蒗彝族自治县'] },
    { name: '普洱市', districts: ['思茅区', '宁洱哈尼族彝族自治县', '墨江哈尼族自治县', '景东彝族自治县', '景谷傣族彝族自治县', '镇沅彝族哈尼族拉祜族自治县', '江城哈尼族彝族自治县', '孟连傣族拉祜族佤族自治县', '澜沧拉祜族自治县', '西盟佤族自治县'] },
    { name: '临沧市', districts: ['临翔区', '凤庆县', '云县', '永德县', '镇康县', '双江拉祜族佤族布朗族傣族自治县', '耿马傣族佤族自治县', '沧源佤族自治县'] },
    { name: '楚雄彝族自治州', districts: ['楚雄市', '双柏县', '牟定县', '南华县', '姚安县', '大姚县', '永仁县', '元谋县', '武定县', '禄丰县'] },
    { name: '红河哈尼族彝族自治州', districts: ['蒙自市', '个旧市', '开远市', '弥勒市', '泸西县', '建水县', '石屏县', '元阳县', '红河县', '绿春县', '屏边苗族自治县', '金平苗族瑶族傣族自治县', '河口瑶族自治县'] },
    { name: '文山壮族苗族自治州', districts: ['文山市', '砚山县', '西畴县', '麻栗坡县', '马关县', '丘北县', '广南县', '富宁县'] },
    { name: '西双版纳傣族自治州', districts: ['景洪市', '勐海县', '勐腊县'] },
    { name: '大理白族自治州', districts: ['大理市', '祥云县', '宾川县', '弥渡县', '永平县', '云龙县', '洱源县', '剑川县', '鹤庆县', '漾濞彝族自治县', '南涧彝族自治县', '巍山彝族回族自治县'] },
    { name: '德宏傣族景颇族自治州', districts: ['芒市', '瑞丽市', '梁河县', '盈江县', '陇川县'] },
    { name: '怒江傈僳族自治州', districts: ['泸水市', '福贡县', '贡山独龙族怒族自治县', '兰坪白族普米族自治县'] },
    { name: '迪庆藏族自治州', districts: ['香格里拉市', '德钦县', '维西傈僳族自治县'] }
  ],
  '贵州省': [
    { name: '贵阳市', districts: ['云岩区', '南明区', '花溪区', '乌当区', '白云区', '观山湖区', '清镇市', '开阳县', '息烽县', '修文县'] },
    { name: '六盘水市', districts: ['钟山区', '水城区', '盘州市', '六枝特区'] },
    { name: '遵义市', districts: ['红花岗区', '汇川区', '播州区', '赤水市', '仁怀市', '桐梓县', '绥阳县', '正安县', '道真仡佬族苗族自治县', '务川仡佬族苗族自治县', '凤冈县', '湄潭县', '余庆县', '习水县'] },
    { name: '安顺市', districts: ['西秀区', '平坝区', '普定县', '镇宁布依族苗族自治县', '关岭布依族苗族自治县', '紫云苗族布依族自治县'] },
    { name: '毕节市', districts: ['七星关区', '大方县', '黔西市', '金沙县', '织金县', '纳雍县', '威宁彝族回族苗族自治县', '赫章县'] },
    { name: '铜仁市', districts: ['碧江区', '万山区', '江口县', '玉屏侗族自治县', '石阡县', '思南县', '印江土家族苗族自治县', '德江县', '沿河土家族自治县', '松桃苗族自治县'] },
    { name: '黔西南布依族苗族自治州', districts: ['兴义市', '兴仁市', '普安县', '晴隆县', '贞丰县', '望谟县', '册亨县', '安龙县'] },
    { name: '黔东南苗族侗族自治州', districts: ['凯里市', '黄平县', '施秉县', '三穗县', '镇远县', '岑巩县', '天柱县', '锦屏县', '剑河县', '台江县', '黎平县', '榕江县', '从江县', '雷山县', '麻江县', '丹寨县'] },
    { name: '黔南布依族苗族自治州', districts: ['都匀市', '福泉市', '荔波县', '贵定县', '瓮安县', '独山县', '平塘县', '罗甸县', '长顺县', '龙里县', '惠水县', '三都水族自治县'] }
  ],
  '海南省': [
    { name: '海口市', districts: ['秀英区', '龙华区', '琼山区', '美兰区'] },
    { name: '三亚市', districts: ['海棠区', '吉阳区', '天涯区', '崖州区'] },
    { name: '三沙市', districts: ['西沙群岛', '南沙群岛', '中沙群岛'] },
    { name: '儋州市', districts: ['那大镇', '和庆镇', '南丰镇', '大成镇', '雅星镇'] },
    { name: '五指山市', districts: ['通什镇', '南圣镇', '毛阳镇', '番阳镇'] },
    { name: '琼海市', districts: ['嘉积镇', '万泉镇', '石壁镇', '中原镇', '博鳌镇'] },
    { name: '文昌市', districts: ['文城镇', '重兴镇', '蓬莱镇', '会文镇', '东路镇'] },
    { name: '万宁市', districts: ['万城镇', '龙滚镇', '和乐镇', '后安镇', '大茂镇'] },
    { name: '东方市', districts: ['八所镇', '东河镇', '大田镇', '感城镇', '板桥镇'] }
  ],
  '内蒙古自治区': [
    { name: '呼和浩特市', districts: ['新城区', '回民区', '玉泉区', '赛罕区', '托克托县', '武川县', '清水河县', '和林格尔县'] },
    { name: '包头市', districts: ['昆都仑区', '东河区', '青山区', '石拐区', '白云鄂博矿区', '九原区', '固阳县', '土默特右旗'] },
    { name: '乌海市', districts: ['海勃湾区', '海南区', '乌达区'] },
    { name: '赤峰市', districts: ['红山区', '元宝山区', '松山区', '阿鲁科尔沁旗', '巴林左旗', '巴林右旗', '林西县', '克什克腾旗', '翁牛特旗', '喀喇沁旗', '宁城县', '敖汉旗'] },
    { name: '通辽市', districts: ['科尔沁区', '霍林郭勒市', '科尔沁左翼中旗', '科尔沁左翼后旗', '开鲁县', '库伦旗', '奈曼旗', '扎鲁特旗'] },
    { name: '鄂尔多斯市', districts: ['康巴什区', '东胜区', '达拉特旗', '准格尔旗', '鄂托克前旗', '鄂托克旗', '杭锦旗', '乌审旗', '伊金霍洛旗'] },
    { name: '呼伦贝尔市', districts: ['海拉尔区', '满洲里市', '牙克石市', '扎兰屯市', '额尔古纳市', '根河市', '阿荣旗', '莫力达瓦达斡尔族自治旗', '鄂伦春自治旗', '鄂温克族自治旗', '新巴尔虎左旗', '新巴尔虎右旗'] },
    { name: '巴彦淖尔市', districts: ['临河区', '五原县', '磴口县', '乌拉特前旗', '乌拉特中旗', '乌拉特后旗', '杭锦后旗'] },
    { name: '乌兰察布市', districts: ['集宁区', '丰镇市', '卓资县', '化德县', '商都县', '兴和县', '凉城县', '察哈尔右翼前旗', '察哈尔右翼中旗', '察哈尔右翼后旗', '四子王旗'] },
    { name: '兴安盟', districts: ['乌兰浩特市', '阿尔山市', '科尔沁右翼前旗', '科尔沁右翼中旗', '扎赉特旗', '突泉县'] },
    { name: '锡林郭勒盟', districts: ['锡林浩特市', '二连浩特市', '阿巴嘎旗', '苏尼特左旗', '苏尼特右旗', '东乌珠穆沁旗', '西乌珠穆沁旗', '太仆寺旗', '镶黄旗', '正镶白旗', '正蓝旗', '多伦县'] },
    { name: '阿拉善盟', districts: ['阿拉善左旗', '阿拉善右旗', '额济纳旗'] }
  ],
  '广西壮族自治区': [
    { name: '南宁市', districts: ['青秀区', '兴宁区', '江南区', '西乡塘区', '良庆区', '邕宁区', '武鸣区', '横州市', '隆安县', '马山县', '上林县', '宾阳县'] },
    { name: '柳州市', districts: ['柳北区', '柳南区', '城中区', '鱼峰区', '柳江区', '鹿寨县', '柳城县', '融安县', '融水苗族自治县', '三江侗族自治县'] },
    { name: '桂林市', districts: ['临桂区', '秀峰区', '叠彩区', '象山区', '七星区', '雁山区', '荔浦市', '阳朔县', '灵川县', '全州县', '兴安县', '永福县', '灌阳县', '资源县', '龙胜各族自治县', '恭城瑶族自治县', '平乐县'] },
    { name: '梧州市', districts: ['长洲区', '万秀区', '龙圩区', '岑溪市', '苍梧县', '藤县', '蒙山县'] },
    { name: '北海市', districts: ['海城区', '银海区', '铁山港区', '合浦县'] },
    { name: '防城港市', districts: ['港口区', '防城区', '东兴市', '上思县'] },
    { name: '钦州市', districts: ['钦南区', '钦北区', '灵山县', '浦北县'] },
    { name: '贵港市', districts: ['港北区', '港南区', '覃塘区', '桂平市', '平南县'] },
    { name: '玉林市', districts: ['玉州区', '福绵区', '北流市', '容县', '陆川县', '博白县', '兴业县'] },
    { name: '百色市', districts: ['右江区', '平果市', '靖西市', '田阳区', '田东县', '德保县', '那坡县', '凌云县', '乐业县', '田林县', '西林县', '隆林各族自治县'] },
    { name: '贺州市', districts: ['八步区', '平桂区', '昭平县', '钟山县', '富川瑶族自治县'] },
    { name: '河池市', districts: ['宜州区', '金城江区', '南丹县', '天峨县', '凤山县', '东兰县', '罗城仫佬族自治县', '环江毛南族自治县', '巴马瑶族自治县', '都安瑶族自治县', '大化瑶族自治县'] },
    { name: '来宾市', districts: ['兴宾区', '合山市', '忻城县', '象州县', '武宣县', '金秀瑶族自治县'] },
    { name: '崇左市', districts: ['江州区', '凭祥市', '扶绥县', '宁明县', '龙州县', '大新县', '天等县'] }
  ],
  '山西省': [
    { name: '太原市', districts: ['小店区', '迎泽区', '杏花岭区', '尖草坪区', '万柏林区', '晋源区', '古交市', '清徐县', '阳曲县', '娄烦县'] },
    { name: '大同市', districts: ['平城区', '云冈区', '新荣区', '云州区', '阳高县', '天镇县', '广灵县', '灵丘县', '浑源县', '左云县'] },
    { name: '阳泉市', districts: ['城区', '矿区', '郊区', '平定县', '盂县'] },
    { name: '长治市', districts: ['潞州区', '上党区', '屯留区', '潞城区', '襄垣县', '平顺县', '黎城县', '壶关县', '长子县', '武乡县', '沁县', '沁源县'] },
    { name: '晋城市', districts: ['城区', '高平市', '沁水县', '阳城县', '陵川县', '泽州县'] },
    { name: '朔州市', districts: ['朔城区', '平鲁区', '怀仁市', '山阴县', '应县', '右玉县'] },
    { name: '晋中市', districts: ['榆次区', '太谷区', '介休市', '榆社县', '左权县', '和顺县', '昔阳县', '寿阳县', '祁县', '平遥县', '灵石县'] },
    { name: '运城市', districts: ['盐湖区', '永济市', '河津市', '临猗县', '万荣县', '闻喜县', '稷山县', '新绛县', '绛县', '垣曲县', '夏县', '平陆县', '芮城县'] },
    { name: '忻州市', districts: ['忻府区', '原平市', '定襄县', '五台县', '代县', '繁峙县', '宁武县', '静乐县', '神池县', '五寨县', '岢岚县', '河曲县', '保德县', '偏关县'] },
    { name: '临汾市', districts: ['尧都区', '侯马市', '霍州市', '曲沃县', '翼城县', '襄汾县', '洪洞县', '古县', '安泽县', '浮山县', '吉县', '乡宁县', '大宁县', '隰县', '永和县', '蒲县', '汾西县'] },
    { name: '吕梁市', districts: ['离石区', '孝义市', '汾阳市', '文水县', '交城县', '兴县', '临县', '柳林县', '石楼县', '岚县', '方山县', '中阳县', '交口县'] }
  ],
  '甘肃省': [
    { name: '兰州市', districts: ['城关区', '七里河区', '西固区', '安宁区', '红古区', '永登县', '皋兰县', '榆中县'] },
    { name: '嘉峪关市', districts: ['雄关区', '钢城街道', '郊区街道'] },
    { name: '金昌市', districts: ['金川区', '永昌县'] },
    { name: '白银市', districts: ['白银区', '平川区', '靖远县', '会宁县', '景泰县'] },
    { name: '天水市', districts: ['秦州区', '麦积区', '武山县', '甘谷县', '秦安县', '张家川回族自治县'] },
    { name: '武威市', districts: ['凉州区', '民勤县', '古浪县', '天祝藏族自治县'] },
    { name: '张掖市', districts: ['甘州区', '民乐县', '临泽县', '高台县', '山丹县', '肃南裕固族自治县'] },
    { name: '平凉市', districts: ['崆峒区', '华亭市', '泾川县', '灵台县', '崇信县', '庄浪县', '静宁县'] },
    { name: '酒泉市', districts: ['肃州区', '玉门市', '敦煌市', '金塔县', '瓜州县', '肃北蒙古族自治县', '阿克塞哈萨克族自治县'] },
    { name: '庆阳市', districts: ['西峰区', '庆城县', '环县', '华池县', '合水县', '正宁县', '宁县', '镇原县'] },
    { name: '定西市', districts: ['安定区', '通渭县', '陇西县', '渭源县', '临洮县', '漳县', '岷县'] },
    { name: '陇南市', districts: ['武都区', '成县', '文县', '宕昌县', '康县', '西和县', '礼县', '徽县', '两当县'] },
    { name: '临夏回族自治州', districts: ['临夏市', '临夏县', '康乐县', '永靖县', '广河县', '和政县', '东乡族自治县', '积石山保安族东乡族撒拉族自治县'] },
    { name: '甘南藏族自治州', districts: ['合作市', '临潭县', '卓尼县', '舟曲县', '迭部县', '玛曲县', '碌曲县', '夏河县'] }
  ],
  '青海省': [
    { name: '西宁市', districts: ['城东区', '城中区', '城西区', '城北区', '湟中区', '湟源县', '大通回族土族自治县'] },
    { name: '海东市', districts: ['乐都区', '平安区', '民和回族土族自治县', '互助土族自治县', '化隆回族自治县', '循化撒拉族自治县'] },
    { name: '海北藏族自治州', districts: ['海晏县', '祁连县', '刚察县', '门源回族自治县'] },
    { name: '黄南藏族自治州', districts: ['同仁市', '尖扎县', '河南蒙古族自治县', '泽库县'] },
    { name: '海南藏族自治州', districts: ['共和县', '同德县', '贵德县', '兴海县', '贵南县'] },
    { name: '果洛藏族自治州', districts: ['玛沁县', '班玛县', '甘德县', '达日县', '久治县', '玛多县'] },
    { name: '玉树藏族自治州', districts: ['玉树市', '杂多县', '称多县', '治多县', '囊谦县', '曲麻莱县'] },
    { name: '海西蒙古族藏族自治州', districts: ['德令哈市', '格尔木市', '茫崖市', '乌兰县', '都兰县', '天峻县'] }
  ],
  '宁夏回族自治区': [
    { name: '银川市', districts: ['兴庆区', '西夏区', '金凤区', '灵武市', '永宁县', '贺兰县'] },
    { name: '石嘴山市', districts: ['大武口区', '惠农区', '平罗县'] },
    { name: '吴忠市', districts: ['利通区', '红寺堡区', '青铜峡市', '盐池县', '同心县'] },
    { name: '固原市', districts: ['原州区', '西吉县', '隆德县', '泾源县', '彭阳县'] },
    { name: '中卫市', districts: ['沙坡头区', '中宁县', '海原县'] }
  ],
  '新疆维吾尔自治区': [
    { name: '乌鲁木齐市', districts: ['天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区', '达坂城区', '米东区', '乌鲁木齐县'] },
    { name: '克拉玛依市', districts: ['克拉玛依区', '独山子区', '白碱滩区', '乌尔禾区'] },
    { name: '吐鲁番市', districts: ['高昌区', '鄯善县', '托克逊县'] },
    { name: '哈密市', districts: ['伊州区', '巴里坤哈萨克自治县', '伊吾县'] },
    { name: '昌吉回族自治州', districts: ['昌吉市', '阜康市', '呼图壁县', '玛纳斯县', '奇台县', '吉木萨尔县', '木垒哈萨克自治县'] },
    { name: '博尔塔拉蒙古自治州', districts: ['博乐市', '阿拉山口市', '精河县', '温泉县'] },
    { name: '巴音郭楞蒙古自治州', districts: ['库尔勒市', '轮台县', '尉犁县', '若羌县', '且末县', '焉耆回族自治县', '和静县', '和硕县', '博湖县'] },
    { name: '阿克苏地区', districts: ['阿克苏市', '温宿县', '库车市', '沙雅县', '新和县', '拜城县', '乌什县', '阿瓦提县', '柯坪县'] },
    { name: '克孜勒苏柯尔克孜自治州', districts: ['阿图什市', '阿克陶县', '阿合奇县', '乌恰县'] },
    { name: '喀什地区', districts: ['喀什市', '疏附县', '疏勒县', '英吉沙县', '泽普县', '莎车县', '叶城县', '麦盖提县', '岳普湖县', '伽师县', '巴楚县', '塔什库尔干塔吉克自治县'] },
    { name: '和田地区', districts: ['和田市', '和田县', '墨玉县', '皮山县', '洛浦县', '策勒县', '于田县', '民丰县'] },
    { name: '伊犁哈萨克自治州', districts: ['伊宁市', '奎屯市', '霍尔果斯市', '伊宁县', '察布查尔锡伯自治县', '霍城县', '巩留县', '新源县', '昭苏县', '特克斯县', '尼勒克县'] },
    { name: '塔城地区', districts: ['塔城市', '乌苏市', '额敏县', '沙湾县', '托里县', '裕民县', '和布克赛尔蒙古自治县'] },
    { name: '阿勒泰地区', districts: ['阿勒泰市', '布尔津县', '富蕴县', '福海县', '哈巴河县', '青河县', '吉木乃县'] }
  ],
  '西藏自治区': [
    { name: '拉萨市', districts: ['城关区', '堆龙德庆区', '达孜区', '林周县', '当雄县', '尼木县', '曲水县', '墨竹工卡县'] },
    { name: '日喀则市', districts: ['桑珠孜区', '南木林县', '江孜县', '定日县', '萨迦县', '拉孜县', '昂仁县', '谢通门县', '白朗县', '仁布县', '康马县', '定结县', '仲巴县', '亚东县', '吉隆县', '聂拉木县', '萨嘎县', '岗巴县'] },
    { name: '昌都市', districts: ['卡若区', '江达县', '贡觉县', '类乌齐县', '丁青县', '察雅县', '八宿县', '左贡县', '芒康县', '洛隆县', '边坝县'] },
    { name: '林芝市', districts: ['巴宜区', '工布江达县', '米林县', '墨脱县', '波密县', '察隅县', '朗县'] },
    { name: '山南市', districts: ['乃东区', '扎囊县', '贡嘎县', '桑日县', '琼结县', '曲松县', '措美县', '洛扎县', '加查县', '隆子县', '错那县', '浪卡子县'] },
    { name: '那曲市', districts: ['色尼区', '嘉黎县', '比如县', '聂荣县', '安多县', '申扎县', '索县', '班戈县', '巴青县', '尼玛县', '双湖县'] },
    { name: '阿里地区', districts: ['噶尔县', '普兰县', '札达县', '日土县', '革吉县', '改则县', '措勤县'] }
  ],
  '重庆市': [
    { name: '重庆市', districts: ['万州区', '黔江区', '涪陵区', '渝中区', '江北区', '沙坪坝区', '南岸区', '北碚区', '渝北区', '巴南区', '长寿区', '江津区', '合川区', '永川区', '南川区', '大足区', '璧山区', '铜梁区', '潼南区', '荣昌区', '开州区', '梁平区', '武隆区', '綦江区'] }
  ],
  '天津市': [
    { name: '天津市', districts: ['和平区', '河东区', '河西区', '南开区', '河北区', '红桥区', '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区', '滨海新区', '宁河区', '静海区', '蓟州区'] }
  ]
}

// 监管单位类型
export const supervisorCategories = [
  { value: 'quality', label: '质安站' },
  { value: 'housing', label: '住建局' },
  { value: 'environmental', label: '环保局' },
  { value: 'urban', label: '城管局' },
  { value: 'fire', label: '消防大队' },
  { value: 'water', label: '自来水公司' },
  { value: 'power', label: '供电局' },
  { value: 'gas', label: '燃气公司' },
  { value: 'planning', label: '规划局' },
  { value: 'civil_defense', label: '人防办' },
  { value: 'traffic', label: '交通局' },
  { value: 'health', label: '卫健委' },
  { value: 'other', label: '其他' }
]

// 合作单位类型
export const partnerCategories = [
  { value: 'owner', label: '建设单位（甲方）' },
  { value: 'general_contract', label: '总承包单位' },
  { value: 'professional', label: '专业分包单位' },
  { value: 'labor', label: '劳务分包单位' },
  { value: 'material', label: '材料供应商' },
  { value: 'equipment', label: '设备租赁单位' },
  { value: 'design', label: '设计单位' },
  { value: 'supervisor', label: '监理单位' },
  { value: 'survey', label: '地勘单位' },
  { value: 'testing', label: '检测单位' },
  { value: 'other', label: '其他' }
]

// 合同状态
export const contractStatuses = [
  { value: 'draft', label: '起草' },
  { value: 'pending', label: '待签署' },
  { value: 'active', label: '执行中' },
  { value: 'expired', label: '已到期' },
  { value: 'terminated', label: '已终止' },
  { value: 'archived', label: '已归档' }
]

// 付款方式
export const paymentMethods = [
  { value: 'one_time', label: '一次性付款' },
  { value: 'monthly', label: '按月付款' },
  { value: 'by_progress', label: '按进度付款' },
  { value: 'by_stage', label: '按节点付款' }
]

// 获取省份列表
export const getProvinces = () => Object.keys(provinceCities)

// 获取城市列表
export const getCities = (province: string) => {
  const cities = provinceCities[province]
  return cities ? cities.map(c => c.name) : []
}

// 获取区县列表
export const getDistricts = (province: string, city: string) => {
  const cities = provinceCities[province]
  if (!cities) return []
  const cityData = cities.find(c => c.name === city)
  return cityData ? cityData.districts : []
}

================
File: src/index.css
================
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── 隐藏 WebView2/Edge 原生密码框装饰按钮 ──
   ::-ms-reveal 是内核自动渲染的"显示密码"眼睛，会和组件自定义的
   眼睛按钮叠加显示（输入密码时出现，看起来像左侧多了一个眼睛）。
   这里全局关掉，统一用组件自己的 toggle 按钮。 */
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}

/* ═══════════════════════════════════════════════════════════════
  多主题系统 — CSS 变量定义

  色彩层级：
  - 氛围层：bg/text/border/sidebar/shadow/overlay 随主题切换
  - 语义层：primary/success/warning/danger/info primary 随主题，其余不变
  - 领域层：indigo/amber/emerald/violet 等硬编码 不动

  主题变体 = theme × mode = 6 种组合：
  default-light / default-dark
  graphite-light / graphite-dark
  sandstone-light / sandstone-dark

  颜色调色板使用 RGB 格式（空格分隔），供 tailwind rgba() 使用。
  ═══════════════════════════════════════════════════════════════ */

/* ── White 主题（当前浅色模式 ── 保留现有配色）── */
:root,
[data-theme="white"] {
  font-family: 'Noto Sans SC', 'Source Han Sans SC', 'Microsoft YaHei', 'PingFang SC', sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  color: #1f2937;
  background-color: #f8fafc;

  /* Reasonix-style shell tokens (映射到现有色值) */
  --bg: #f8fafc;
  --bg-2: #f1f5f9;
  --panel: #ffffff;
  --panel-2: #f1f5f9;
  --card: #ffffff;
  --card-hover: #f8fafc;
  --border: #e2e8f0;
  --border-strong: #cbd5e1;
  --fg: #0f172a;
  --fg-2: #475569;
  --muted: #94a3b8;
  --muted-2: #64748b;
  --accent: #2563eb;
  --accent-soft: rgba(37, 99, 235, 0.12);
  --accent-strong: #1d4ed8;
  --success: #16a34a;
  --success-soft: rgba(22, 163, 74, 0.12);
  --warning: #d97706;
  --warning-soft: rgba(217, 119, 6, 0.12);
  --danger: #dc2626;

  /* 滚动条主题色 */
  --scrollbar-thumb: rgba(148, 163, 184, 0.5);
  --scrollbar-thumb-hover: rgba(100, 116, 139, 0.7);
  --scrollbar-track: transparent;
  --danger-soft: rgba(220, 38, 38, 0.12);
  --violet: #8b5cf6;
  --violet-soft: rgba(139, 92, 246, 0.12);
  --shadow-sm: 0 1px 0 rgba(0,0,0,0.04);
  --shadow-md: 0 8px 24px -10px rgba(0,0,0,0.1);
  --shadow-lg: 0 24px 60px -20px rgba(0,0,0,0.18);
  --radius: 8px;
  --radius-lg: 12px;

  /* 语义色 — Blue palette */
  --color-primary-50: 239 246 255;
  --color-primary-100: 219 234 254;
  --color-primary-200: 191 219 254;
  --color-primary-300: 147 197 253;
  --color-primary-400: 96 165 250;
  --color-primary-500: 59 130 246;
  --color-primary-600: 37 99 235;
  --color-primary-700: 29 78 216;
  --color-primary-800: 30 64 175;
  --color-primary-900: 30 58 138;
  --color-success-50: 240 253 244;
  --color-success-100: 220 252 231;
  --color-success-200: 187 247 208;
  --color-success-300: 134 239 172;
  --color-success-400: 74 222 128;
  --color-success-500: 34 197 94;
  --color-success-600: 22 163 74;
  --color-success-700: 21 128 61;
  --color-success-800: 22 101 52;
  --color-success-900: 20 83 45;
  --color-warning-50: 255 251 235;
  --color-warning-100: 254 243 199;
  --color-warning-200: 253 230 138;
  --color-warning-300: 252 211 77;
  --color-warning-400: 251 191 36;
  --color-warning-500: 245 158 11;
  --color-warning-600: 217 119 6;
  --color-warning-700: 180 83 9;
  --color-warning-800: 146 64 14;
  --color-warning-900: 120 53 15;
  --color-danger-50: 254 242 242;
  --color-danger-100: 254 226 226;
  --color-danger-200: 254 202 202;
  --color-danger-300: 252 165 165;
  --color-danger-400: 248 113 113;
  --color-danger-500: 239 68 68;
  --color-danger-600: 220 38 38;
  --color-danger-700: 185 28 28;
  --color-danger-800: 153 27 27;
  --color-danger-900: 127 29 29;
  --color-info-50: 240 249 255;
  --color-info-100: 224 242 254;
  --color-info-200: 186 230 253;
  --color-info-300: 125 211 252;
  --color-info-400: 56 189 248;
  --color-info-500: 14 165 233;
  --color-info-600: 2 132 199;
  --color-info-700: 3 105 161;
  --color-info-800: 7 89 133;
  --color-info-900: 12 74 110;

  /* 向后兼容 — 现有组件使用的变量 */
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1e293b;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --border-primary: #e2e8f0;
  --border-secondary: #cbd5e1;
  --sidebar-bg: #ffffff;
  --sidebar-border: #e2e8f0;
  --sidebar-item-hover: #f1f5f9;
  --sidebar-item-active: #eff6ff;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-dropdown: 0 10px 15px -3px rgba(0,0,0,0.1);
  --overlay: rgba(0, 0, 0, 0.5);
}

/* ── 界面字号 — 通过修改根 font-size 缩放所有 Tailwind rem 字号 ── */
/* medium (16px) 为默认值，由浏览器默认决定，不重复设置 */
[data-font-size="small"] { font-size: 14px; }
[data-font-size="large"] { font-size: 18px; }

/* 隐藏 Chromium 浏览器原生密码显示按钮和自动填充按钮 */
input::-webkit-password-reveal-button,
input::-webkit-credentials-auto-fill-button,
input::-webkit-strong-password-auto-fill-button,
input::-webkit-strong-password-text,
input::-webkit-clear-button,
input::-webkit-inner-spin-button,
input::-webkit-outer-spin-button {
  visibility: hidden !important;
  pointer-events: none !important;
  position: absolute !important;
  right: -9999px !important;
  width: 0 !important;
  height: 0 !important;
}

/* 用 CSS 模拟密码遮罩，避免浏览器原生密码按钮 */
.password-mask {
  -webkit-text-security: disc;
}

/* ── Graphite 主题（深色 — Reasonix 原版 OKLCH 色值）── */
[data-theme="graphite"] {
  /* Reasonix-style shell tokens */
  --bg: oklch(17% 0.005 280);
  --bg-2: oklch(20% 0.006 275);
  --panel: oklch(21.5% 0.007 275);
  --panel-2: oklch(24.5% 0.008 275);
  --card: oklch(23.5% 0.007 275);
  --card-hover: oklch(26.5% 0.008 275);
  --border: oklch(30% 0.008 275);
  --border-strong: oklch(38% 0.01 275);
  --fg: oklch(96% 0.004 280);
  --fg-2: oklch(81% 0.005 280);
  --muted: oklch(63% 0.006 280);
  --muted-2: oklch(49% 0.006 280);
  --accent: oklch(68% 0.16 38);
  --accent-soft: oklch(68% 0.16 38 / 0.15);
  --accent-strong: oklch(72% 0.18 36);
  --success: oklch(70% 0.14 145);
  --success-soft: oklch(70% 0.14 145 / 0.14);
  --warning: oklch(78% 0.14 85);
  --warning-soft: oklch(78% 0.14 85 / 0.16);
  --danger: oklch(66% 0.18 25);
  --danger-soft: oklch(66% 0.18 25 / 0.16);
  --violet: oklch(72% 0.14 295);
  --violet-soft: oklch(72% 0.14 295 / 0.16);
  --shadow-sm: 0 1px 0 oklch(0% 0 0 / 0.35);
  --shadow-md: 0 8px 24px -8px oklch(0% 0 0 / 0.5);
  --shadow-lg: 0 24px 60px -16px oklch(0% 0 0 / 0.65);
  --radius: 8px;
  --radius-lg: 12px;

  background-color: var(--bg);
  color: var(--fg);
  color-scheme: dark;

  /* 语义色 — 深色模式用主题色搭配 */
  --color-primary-50: 40 25 15;
  --color-primary-100: 60 38 20;
  --color-primary-200: 85 55 30;
  --color-primary-300: 115 75 45;
  --color-primary-400: 150 100 60;
  --color-primary-500: 200 128 55;
  --color-primary-600: 215 115 42;
  --color-primary-700: 190 95 30;
  --color-primary-800: 160 75 20;
  --color-primary-900: 130 55 10;
  --color-success-50: 10 35 20;
  --color-success-100: 15 60 35;
  --color-success-200: 20 85 50;
  --color-success-300: 30 115 65;
  --color-success-400: 40 140 80;
  --color-success-500: 50 165 95;
  --color-success-600: 70 190 115;
  --color-success-700: 100 210 140;
  --color-success-800: 140 230 175;
  --color-success-900: 190 245 215;
  --color-warning-50: 45 30 8;
  --color-warning-100: 70 50 12;
  --color-warning-200: 95 70 18;
  --color-warning-300: 125 95 25;
  --color-warning-400: 155 120 35;
  --color-warning-500: 185 145 50;
  --color-warning-600: 210 170 75;
  --color-warning-700: 230 195 110;
  --color-warning-800: 245 220 155;
  --color-warning-900: 250 240 200;
  --color-danger-50: 55 15 15;
  --color-danger-100: 80 22 20;
  --color-danger-200: 110 30 28;
  --color-danger-300: 140 40 38;
  --color-danger-400: 170 52 48;
  --color-danger-500: 195 68 62;
  --color-danger-600: 220 90 82;
  --color-danger-700: 235 125 118;
  --color-danger-800: 245 168 162;
  --color-danger-900: 250 210 207;
  --color-info-50: 9 34 54;
  --color-info-100: 12 58 94;
  --color-info-200: 16 85 135;
  --color-info-300: 22 108 168;
  --color-info-400: 32 133 198;
  --color-info-500: 42 151 213;
  --color-info-600: 76 171 226;
  --color-info-700: 118 196 237;
  --color-info-800: 168 219 245;
  --color-info-900: 208 236 251;

  /* 向后兼容 */
  --bg-primary: oklch(17% 0.005 280);
  --bg-secondary: oklch(20% 0.006 275);
  --bg-tertiary: oklch(24.5% 0.008 275);
  --text-primary: oklch(96% 0.004 280);
  --text-secondary: oklch(81% 0.005 280);
  --text-tertiary: oklch(63% 0.006 280);
  --border-primary: oklch(30% 0.008 275);
  --border-secondary: oklch(38% 0.01 275);
  --sidebar-bg: oklch(21.5% 0.007 275);
  --sidebar-border: oklch(30% 0.008 275);
  --sidebar-item-hover: oklch(24.5% 0.008 275);
  --sidebar-item-active: oklch(26% 0.04 38);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.35);
  --shadow-dropdown: 0 10px 15px -3px rgba(0,0,0,0.5);
  --overlay: rgba(0, 0, 0, 0.7);

  /* 自定义滚动条 — Graphite 主题用更亮的灰色 */
  --scrollbar-thumb: rgba(160, 170, 180, 0.45);
  --scrollbar-thumb-hover: rgba(200, 110, 40, 0.6);
  --scrollbar-track: transparent;
}

/* ── Sandstone 主题（暖浅色 — Reasonix 原版 OKLCH 色值）── */
[data-theme="sandstone"] {
  /* Reasonix-style shell tokens */
  --bg: oklch(97.5% 0.008 80);
  --bg-2: oklch(95.5% 0.011 78);
  --panel: oklch(98.5% 0.005 80);
  --panel-2: oklch(93.5% 0.014 76);
  --card: oklch(99.5% 0.003 80);
  --card-hover: oklch(96.5% 0.009 78);
  --border: oklch(88% 0.016 76);
  --border-strong: oklch(78% 0.020 72);
  --fg: oklch(22% 0.014 55);
  --fg-2: oklch(36% 0.013 55);
  --muted: oklch(53% 0.011 60);
  --muted-2: oklch(67% 0.010 65);
  --accent: oklch(60% 0.19 38);
  --accent-soft: oklch(60% 0.19 38 / 0.1);
  --accent-strong: oklch(54% 0.21 36);
  --success: oklch(48% 0.14 155);
  --success-soft: oklch(48% 0.14 155 / 0.1);
  --warning: oklch(58% 0.14 75);
  --warning-soft: oklch(58% 0.14 75 / 0.12);
  --danger: oklch(54% 0.2 22);
  --danger-soft: oklch(54% 0.2 22 / 0.1);
  --violet: oklch(62% 0.16 52);
  --violet-soft: oklch(62% 0.16 52 / 0.10);
  --shadow-sm: 0 1px 0 oklch(30% 0.05 50 / 0.05);
  --shadow-md: 0 8px 24px -10px oklch(30% 0.05 50 / 0.13);
  --shadow-lg: 0 24px 60px -20px oklch(30% 0.05 50 / 0.20);
  --radius: 8px;
  --radius-lg: 12px;

  background-color: var(--bg);
  color: var(--fg);

  /* 语义色 */
  --color-primary-50: 255 247 237;
  --color-primary-100: 255 237 213;
  --color-primary-200: 254 215 170;
  --color-primary-300: 253 186 116;
  --color-primary-400: 251 146 60;
  --color-primary-500: 249 115 22;
  --color-primary-600: 234 88 12;
  --color-primary-700: 194 65 12;
  --color-primary-800: 154 52 18;
  --color-primary-900: 67 20 7;
  --color-success-50: 240 253 244;
  --color-success-100: 220 252 231;
  --color-success-200: 187 247 208;
  --color-success-300: 134 239 172;
  --color-success-400: 74 222 128;
  --color-success-500: 34 197 94;
  --color-success-600: 22 163 74;
  --color-success-700: 21 128 61;
  --color-success-800: 22 101 52;
  --color-success-900: 20 83 45;
  --color-warning-50: 255 251 235;
  --color-warning-100: 254 243 199;
  --color-warning-200: 253 230 138;
  --color-warning-300: 252 211 77;
  --color-warning-400: 251 191 36;
  --color-warning-500: 245 158 11;
  --color-warning-600: 217 119 6;
  --color-warning-700: 180 83 9;
  --color-warning-800: 146 64 14;
  --color-warning-900: 120 53 15;
  --color-danger-50: 254 242 242;
  --color-danger-100: 254 226 226;
  --color-danger-200: 254 202 202;
  --color-danger-300: 252 165 165;
  --color-danger-400: 248 113 113;
  --color-danger-500: 239 68 68;
  --color-danger-600: 220 38 38;
  --color-danger-700: 185 28 28;
  --color-danger-800: 153 27 27;
  --color-danger-900: 127 29 29;
  --color-info-50: 240 249 255;
  --color-info-100: 224 242 254;
  --color-info-200: 186 230 253;
  --color-info-300: 125 211 252;
  --color-info-400: 56 189 248;
  --color-info-500: 14 165 233;
  --color-info-600: 2 132 199;
  --color-info-700: 3 105 161;
  --color-info-800: 7 89 133;
  --color-info-900: 12 74 110;

  /* 向后兼容 */
  --bg-primary: oklch(98.5% 0.005 80);
  --bg-secondary: oklch(95.5% 0.011 78);
  --bg-tertiary: oklch(93.5% 0.014 76);
  --text-primary: oklch(22% 0.014 55);
  --text-secondary: oklch(36% 0.013 55);
  --text-tertiary: oklch(53% 0.011 60);
  --border-primary: oklch(88% 0.016 76);
  --border-secondary: oklch(78% 0.020 72);
  --sidebar-bg: oklch(98.5% 0.005 80);
  --sidebar-border: oklch(88% 0.016 76);
  --sidebar-item-hover: oklch(95.5% 0.011 78);
  --sidebar-item-active: oklch(88% 0.06 55);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06);
  --shadow-dropdown: 0 10px 15px -3px rgba(0,0,0,0.1);
  --overlay: rgba(0, 0, 0, 0.4);

  /* 自定义滚动条 — Sandstone 主题用暖琥珀色调 */
  --scrollbar-thumb: rgba(180, 150, 120, 0.45);
  --scrollbar-thumb-hover: rgba(217, 119, 6, 0.6);
  --scrollbar-track: transparent;
}

/* ── Tailwind 通用类覆盖（随主题切换，影响所有页面内容）── */

/* White 主题 — 全面覆盖（值与 Tailwind 默认接近，但确保走 CSS 变量） */
[data-theme="white"] .bg-white,
[data-theme="white"] .card { background-color: var(--card); }
[data-theme="white"] .bg-slate-50,
[data-theme="white"] .bg-slate-100 { background-color: var(--bg); }
[data-theme="white"] .bg-slate-200 { background-color: var(--panel-2); }
[data-theme="white"] .bg-slate-700 { background-color: var(--border-strong); }
[data-theme="white"] .bg-slate-800,
[data-theme="white"] .dark\:bg-slate-800 { background-color: var(--card); }
[data-theme="white"] .bg-slate-900 { background-color: var(--card); }
[data-theme="white"] .text-slate-200,
[data-theme="white"] .text-slate-300,
[data-theme="white"] .text-slate-400 { color: var(--muted); }
[data-theme="white"] .text-slate-500 { color: var(--muted); }
[data-theme="white"] .text-slate-600 { color: var(--fg-2); }
[data-theme="white"] .text-slate-700,
[data-theme="white"] .text-slate-800,
[data-theme="white"] .text-slate-900 { color: var(--fg); }
[data-theme="white"] .border-slate-100,
[data-theme="white"] .border-slate-200 { border-color: var(--border); }
[data-theme="white"] .border-slate-300,
[data-theme="white"] .border-slate-400 { border-color: var(--border-strong); }
[data-theme="white"] .border-slate-600,
[data-theme="white"] .border-slate-700 { border-color: var(--border-strong); }
[data-theme="white"] .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--border); }
[data-theme="white"] .active\:bg-slate-100:active { background-color: var(--panel-2); }
[data-theme="white"] .hover\:bg-white:hover,
[data-theme="white"] .hover\:bg-slate-50:hover,
[data-theme="white"] .hover\:bg-slate-100:hover { background-color: var(--card-hover); }
[data-theme="white"] .hover\:bg-slate-200:hover { background-color: var(--panel-2); }
[data-theme="white"] .hover\:text-slate-700:hover { color: var(--fg-2); }
[data-theme="white"] .hover\:text-red-600:hover { color: var(--danger); }
[data-theme="white"] .hover\:bg-red-50:hover { background-color: var(--danger-soft); }
[data-theme="white"] table tbody tr { transition: background-color 200ms ease; }
[data-theme="white"] table tbody tr:hover { background-color: var(--card-hover) !important; }

[data-theme="white"] .hover\:bg-amber-50:hover,
[data-theme="white"] .hover\:bg-blue-50:hover,
[data-theme="white"] .hover\:bg-green-50:hover,
[data-theme="white"] .hover\:bg-emerald-50:hover {
  background-color: var(--accent-soft);
}
[data-theme="white"] .hover\:bg-gray-50:hover,
[data-theme="white"] .hover\:bg-gray-100:hover {
  background-color: var(--card-hover);
}

[data-theme="white"] .btn-warning { color: var(--bg); }

[data-theme="graphite"] .bg-white,
[data-theme="graphite"] .card { background-color: var(--card); }

[data-theme="sandstone"] .bg-white,
[data-theme="sandstone"] .card { background-color: var(--card); }
[data-theme="sandstone"] .bg-slate-50,
[data-theme="sandstone"] .bg-slate-100 { background-color: var(--bg); }
[data-theme="sandstone"] .text-slate-800,
[data-theme="sandstone"] .text-slate-700 { color: var(--fg); }
[data-theme="sandstone"] .text-slate-600 { color: var(--fg-2); }
[data-theme="sandstone"] .text-slate-500 { color: var(--muted); }
[data-theme="sandstone"] .text-slate-400 { color: var(--muted-2); }
[data-theme="sandstone"] .border-slate-200,
[data-theme="sandstone"] .border-slate-100 { border-color: var(--border); }

/* ── 组件层覆盖（卡片/按钮/输入框/表格）── */
[data-theme="graphite"] .card,
[data-theme="graphite"] .modal-content { background-color: var(--card); }
[data-theme="graphite"] .card-header { border-color: var(--border); }
[data-theme="graphite"] .btn-secondary {
  background-color: var(--panel);
  border-color: var(--border);
  color: var(--fg);
}
[data-theme="graphite"] .btn-secondary:hover { background-color: var(--panel-2); }
[data-theme="graphite"] .input,
[data-theme="graphite"] .select {
  background-color: var(--panel);
  border-color: var(--border);
  color: var(--fg);
}
[data-theme="graphite"] .input:focus,
[data-theme="graphite"] .select:focus {
  border-color: var(--accent-strong);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
[data-theme="graphite"] .label { color: var(--fg-2); }
[data-theme="graphite"] .table th {
  background-color: var(--bg-2);
  color: var(--fg-2);
  border-color: var(--border);
}
[data-theme="graphite"] .table td { border-color: var(--border); }
[data-theme="graphite"] .badge-gray {
  background-color: var(--panel-2);
  color: var(--fg-2);
}
/* Graphite primary 色统一到 accent 体系 */
[data-theme="graphite"] .bg-primary-50 { background-color: var(--accent-soft); }
[data-theme="graphite"] .bg-primary-100 { background-color: var(--accent-soft); }
[data-theme="graphite"] .bg-primary-500 { background-color: var(--accent); }
[data-theme="graphite"] .bg-primary-600 { background-color: var(--accent); }
[data-theme="graphite"] .hover\:bg-primary-500:hover { background-color: var(--accent-strong); }
[data-theme="graphite"] .hover\:bg-primary-700:hover { background-color: var(--accent-strong); }
[data-theme="graphite"] .text-primary-600 { color: var(--accent); }
[data-theme="graphite"] .text-primary-700 { color: var(--accent); }
[data-theme="graphite"] .border-primary-200 { border-color: var(--accent-soft); }
[data-theme="graphite"] .border-primary-300 { border-color: var(--accent-strong); }
[data-theme="graphite"] .border-primary-400 { border-color: var(--accent-strong); }
[data-theme="graphite"] .ring-primary-500 { --tw-ring-color: var(--accent); }
[data-theme="graphite"] .focus\:ring-primary-500:focus { --tw-ring-color: var(--accent); }
[data-theme="graphite"] .focus\:border-primary-500:focus { border-color: var(--accent-strong); }
[data-theme="graphite"] .shadow-primary-500\/25 { --tw-shadow-color: var(--accent); opacity: 0.25; }

/* 白色装饰/进度条调暗 */
[data-theme="graphite"] .bg-white\/20,
[data-theme="graphite"] .bg-white\/10 { opacity: 0.3; }

/* gray 系 hover 修复 */
[data-theme="graphite"] .hover\:bg-gray-50:hover,
[data-theme="graphite"] .hover\:bg-gray-100:hover {
  background-color: var(--card-hover);
}

/* 彩色浅色 hover 修复 */
[data-theme="graphite"] .hover\:bg-amber-50:hover,
[data-theme="graphite"] .hover\:bg-blue-50:hover,
[data-theme="graphite"] .hover\:bg-green-50:hover,
[data-theme="graphite"] .hover\:bg-emerald-50:hover {
  background-color: var(--accent-soft);
}

/* Graphite 主题 — Tailwind slate 类全面覆盖 */
[data-theme="graphite"] .bg-white,
[data-theme="graphite"] .card { background-color: var(--card); }
[data-theme="graphite"] .bg-slate-50,
[data-theme="graphite"] .bg-slate-100 { background-color: var(--bg); }
[data-theme="graphite"] .bg-slate-200 { background-color: var(--panel-2); }
[data-theme="graphite"] .bg-slate-700 { background-color: var(--border-strong); }
[data-theme="graphite"] aside nav .bg-slate-700 { background-color: var(--accent); }
[data-theme="graphite"] .bg-slate-800 { background-color: var(--card); }
[data-theme="graphite"] .dark\:bg-slate-800 { background-color: var(--card); }
[data-theme="graphite"] .text-slate-300,
[data-theme="graphite"] .text-slate-400 { color: var(--muted); }
[data-theme="graphite"] .text-slate-500 { color: var(--muted-2); }
[data-theme="graphite"] .text-slate-600 { color: var(--fg-2); }
[data-theme="graphite"] .text-slate-700,
[data-theme="graphite"] .text-slate-800,
[data-theme="graphite"] .text-slate-900 { color: var(--fg); }
[data-theme="graphite"] .text-slate-200 { color: var(--border); }
[data-theme="graphite"] .border-slate-100,
[data-theme="graphite"] .border-slate-200 { border-color: var(--border); }
[data-theme="graphite"] .border-slate-300 { border-color: var(--border-strong); }
[data-theme="graphite"] .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--border); }
[data-theme="graphite"] .active\:bg-slate-100:active { background-color: var(--panel-2); }
[data-theme="graphite"] .hover\:bg-white:hover,
[data-theme="graphite"] .hover\:bg-slate-50:hover,
[data-theme="graphite"] .hover\:bg-slate-100:hover { background-color: var(--card-hover); }
[data-theme="graphite"] .hover\:bg-slate-200:hover { background-color: var(--panel-2); }
[data-theme="graphite"] .hover\:text-slate-700:hover { color: var(--fg-2); }
[data-theme="graphite"] .hover\:text-red-600:hover { color: var(--danger); }
[data-theme="graphite"] .hover\:bg-red-50:hover { background-color: var(--danger-soft); }

/* Graphite 彩色浅色背景 → 深色版本（图标/文字用浅色时可读） */
[data-theme="graphite"] .bg-blue-50,
[data-theme="graphite"] .bg-blue-100 { background-color: oklch(28% 0.06 260); }
[data-theme="graphite"] .bg-red-50,
[data-theme="graphite"] .bg-red-100 { background-color: oklch(28% 0.06 25); }
[data-theme="graphite"] .bg-green-50,
[data-theme="graphite"] .bg-green-100 { background-color: oklch(28% 0.06 155); }
[data-theme="graphite"] .bg-emerald-50,
[data-theme="graphite"] .bg-emerald-100 { background-color: oklch(28% 0.06 160); }
[data-theme="graphite"] .bg-amber-50,
[data-theme="graphite"] .bg-amber-100 { background-color: oklch(28% 0.06 80); }
[data-theme="graphite"] .bg-orange-50,
[data-theme="graphite"] .bg-orange-100 { background-color: oklch(28% 0.06 60); }
[data-theme="graphite"] .bg-purple-50,
[data-theme="graphite"] .bg-purple-100 { background-color: oklch(28% 0.06 300); }
[data-theme="graphite"] .bg-violet-50,
[data-theme="graphite"] .bg-violet-100 { background-color: oklch(28% 0.06 295); }
[data-theme="graphite"] .bg-teal-50,
[data-theme="graphite"] .bg-teal-100 { background-color: oklch(28% 0.06 175); }
[data-theme="graphite"] .bg-sky-50,
[data-theme="graphite"] .bg-sky-100 { background-color: oklch(28% 0.06 240); }
[data-theme="graphite"] .bg-indigo-50,
[data-theme="graphite"] .bg-indigo-100 { background-color: oklch(28% 0.06 275); }
[data-theme="graphite"] .bg-pink-50,
[data-theme="graphite"] .bg-pink-100 { background-color: oklch(28% 0.06 350); }
[data-theme="graphite"] .bg-rose-50,
[data-theme="graphite"] .bg-rose-100 { background-color: oklch(28% 0.06 15); }
[data-theme="graphite"] .bg-yellow-50,
[data-theme="graphite"] .bg-yellow-100 { background-color: oklch(28% 0.06 95); }
[data-theme="graphite"] .bg-cyan-50,
[data-theme="graphite"] .bg-cyan-100 { background-color: oklch(28% 0.06 200); }
[data-theme="graphite"] .bg-fuchsia-50,
[data-theme="graphite"] .bg-fuchsia-100 { background-color: oklch(28% 0.06 330); }
[data-theme="graphite"] .bg-lime-50,
[data-theme="graphite"] .bg-lime-100 { background-color: oklch(28% 0.06 130); }

/* ── Hero Banner 三主题适配 ── */

/* White: 保持原样（深色横幅 + 浅色页面，对比鲜明） */

/* Graphite: hero banner 直接设背景色（不走渐变变量覆盖，更可靠） */
[data-theme="graphite"] .from-slate-800 { background: oklch(28% 0.006 275) !important; }
[data-theme="graphite"] .from-slate-800 .text-white { color: var(--fg) !important; }
[data-theme="graphite"] .from-slate-800 .text-white\/50 { color: var(--muted) !important; }
[data-theme="graphite"] .from-slate-800 .text-white\/60 { color: var(--muted) !important; }
[data-theme="graphite"] .from-slate-800 .text-white\/40 { color: var(--muted-2) !important; }
[data-theme="graphite"] .from-slate-800 .bg-white\/10 { background: oklch(35% 0.008 275) !important; }
[data-theme="graphite"] .from-slate-800 .bg-white\/20 { background: oklch(40% 0.008 275) !important; }
[data-theme="graphite"] .from-slate-800 .text-emerald-300 { color: var(--success) !important; }
[data-theme="graphite"] .from-slate-800 .text-emerald-300\/80 { color: var(--success) !important; opacity: 0.8; }
[data-theme="graphite"] .from-slate-800 .text-amber-300 { color: var(--accent) !important; }
[data-theme="graphite"] .from-slate-800 .text-amber-300\/80 { color: var(--accent) !important; opacity: 0.8; }
[data-theme="graphite"] .from-slate-800 .text-blue-300 { color: oklch(72% 0.12 240) !important; }
[data-theme="graphite"] .hero-overlay { display: none !important; }

/* Sandstone: 深暖棕底横幅（浅色文字，统一适配全部模块） */
[data-theme="sandstone"] .from-slate-800 { background: oklch(35% 0.04 45) !important; }
[data-theme="sandstone"] .from-slate-800 .text-white { color: oklch(96% 0.004 80) !important; }
[data-theme="sandstone"] .from-slate-800 .text-white\/50 { color: oklch(72% 0.018 55) !important; }
[data-theme="sandstone"] .from-slate-800 .text-white\/60 { color: oklch(78% 0.015 60) !important; }
[data-theme="sandstone"] .from-slate-800 .text-white\/40 { color: oklch(60% 0.02 55) !important; }
[data-theme="sandstone"] .from-slate-800 .bg-white\/10 { background: oklch(39% 0.04 45 / 0.5) !important; }
[data-theme="sandstone"] .from-slate-800 .bg-white\/20 { background: oklch(43% 0.04 45 / 0.4) !important; }
[data-theme="sandstone"] .from-slate-800 .text-emerald-300 { color: oklch(72% 0.12 148) !important; }
[data-theme="sandstone"] .from-slate-800 .text-emerald-300\/80 { color: oklch(72% 0.12 148) !important; opacity: 0.8; }
[data-theme="sandstone"] .from-slate-800 .text-amber-300 { color: oklch(78% 0.14 45) !important; }
[data-theme="sandstone"] .from-slate-800 .text-amber-300\/80 { color: oklch(78% 0.14 45) !important; opacity: 0.8; }
[data-theme="sandstone"] .from-slate-800 .text-blue-300 { color: oklch(75% 0.10 245) !important; }
[data-theme="sandstone"] .hero-overlay { opacity: 0 !important; }

/* Graphite 图标在彩色背景容器内 → 深色文字 */
[data-theme="graphite"] .bg-blue-100 span,
[data-theme="graphite"] .bg-red-100 span,
[data-theme="graphite"] .bg-green-100 span,
[data-theme="graphite"] .bg-emerald-100 span,
[data-theme="graphite"] .bg-amber-100 span,
[data-theme="graphite"] .bg-orange-100 span,
[data-theme="graphite"] .bg-purple-100 span,
[data-theme="graphite"] .bg-violet-100 span,
[data-theme="graphite"] .bg-teal-100 span,
[data-theme="graphite"] .bg-sky-100 span,
[data-theme="graphite"] .bg-indigo-100 span,
[data-theme="graphite"] .bg-pink-100 span,
[data-theme="graphite"] .bg-rose-100 span {
  color: oklch(90% 0.04 260) !important;
}
[data-theme="graphite"] table tbody tr { background-color: transparent; transition: background-color 200ms ease; }
[data-theme="graphite"] table tbody tr:hover { background-color: var(--card-hover) !important; }

/* 彩色浅色 hover 修复 */
[data-theme="graphite"] .hover\:bg-amber-50:hover,
[data-theme="graphite"] .hover\:bg-blue-50:hover,
[data-theme="graphite"] .hover\:bg-green-50:hover,
[data-theme="graphite"] .hover\:bg-emerald-50:hover {
  background-color: var(--accent-soft);
}

/* gray 系 hover 修复 */
[data-theme="graphite"] .hover\:bg-gray-50:hover,
[data-theme="graphite"] .hover\:bg-gray-100:hover {
  background-color: var(--card-hover);
}

/* 白色装饰调暗（仅背景，不动文字） */
[data-theme="graphite"] .bg-white\/20,
[data-theme="graphite"] .bg-white\/10 { background-color: rgb(255 255 255 / 0.03) !important; }

/* warning 按钮文字修复 */
[data-theme="graphite"] .btn-warning { color: var(--bg); }

/* 表单控件全面覆盖（含未用 .input/.select 类的原生 Tailwind 写法） */
[data-theme="graphite"] input:not([type="color"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]),
[data-theme="graphite"] textarea {
  background-color: var(--panel);
  color: var(--fg);
  border-color: var(--border);
}
[data-theme="graphite"] input:not([type="color"]):not([type="range"]):not([type="checkbox"]):not([type="radio"])::placeholder,
[data-theme="graphite"] textarea::placeholder {
  color: var(--muted);
}
[data-theme="graphite"] select {
  background-color: var(--panel);
  color: var(--fg);
  border-color: var(--border);
  color-scheme: dark;
}
[data-theme="graphite"] select option {
  background-color: var(--panel);
  color: var(--fg);
}

/* Recharts Tooltip 文字全面覆盖（内联 style 不继承 contentStyle 的 color） */
[data-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-item-value,
[data-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-item-name,
[data-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-label,
[data-theme="graphite"] .recharts-tooltip-wrapper .recharts-tooltip-item-separator {
  color: var(--fg) !important;
}

/* 侧边栏活跃项 — sidebar 专属变量覆盖（比全局 .bg-slate-100 更精确） */
[data-theme="graphite"] aside nav button.bg-slate-100 { background-color: var(--sidebar-item-active); }
[data-theme="graphite"] aside nav button.hover\:bg-slate-50:hover { background-color: var(--sidebar-item-hover); }
[data-theme="graphite"] aside nav button.hover\:bg-slate-100:hover { background-color: var(--sidebar-item-hover); }
[data-theme="graphite"] aside nav button.bg-slate-700\/50 { background-color: var(--sidebar-item-active); }

/* ═══════════════════════════════════════════
   滚动条 — 全球统一风格
   纯 CSS 方案，零 JS 依赖，所有容器自动生效
   后续新建任何模块、页面、弹窗都无需额外配置
   ═══════════════════════════════════════════ */
/* 简单直接 — WebKit 原生 scrollbar 伪元素 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
/* track 浅灰背景，hover 时加深 — 不使用复合选择器，track 始终有背景 */
::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.06);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.45);
  border-radius: 4px;
  min-height: 36px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(100, 116, 139, 0.75);
}
::-webkit-scrollbar-corner {
  background: transparent;
}

/* 暗色主题（graphite） */
[data-theme="graphite"] ::-webkit-scrollbar-track {
  background: rgba(148, 163, 184, 0.08);
}
[data-theme="graphite"] ::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.35);
}
[data-theme="graphite"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.6);
}

/* 暖色主题（sandstone） */
[data-theme="sandstone"] ::-webkit-scrollbar-track {
  background: rgba(180, 150, 120, 0.06);
}
[data-theme="sandstone"] ::-webkit-scrollbar-thumb {
  background: rgba(180, 150, 120, 0.45);
}
[data-theme="sandstone"] ::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 150, 120, 0.7);
}

/* Firefox 兼容 */
* {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.45) rgba(148, 163, 184, 0.06);
}
[data-theme="graphite"] * {
  scrollbar-color: rgba(148, 163, 184, 0.35) rgba(148, 163, 184, 0.08);
}
[data-theme="sandstone"] * {
  scrollbar-color: rgba(180, 150, 120, 0.45) rgba(180, 150, 120, 0.06);
}
[data-theme="graphite"] .animate-float-slow,
[data-theme="graphite"] .animate-float-slower {
  opacity: 0.15;
}
[data-theme="graphite"] button:disabled {
  opacity: 0.3;
}

/* Recharts Tooltip 文字覆盖 — Sandstone */
[data-theme="sandstone"] .recharts-tooltip-wrapper .recharts-tooltip-item-value,
[data-theme="sandstone"] .recharts-tooltip-wrapper .recharts-tooltip-item-name,
[data-theme="sandstone"] .recharts-tooltip-wrapper .recharts-tooltip-label,
[data-theme="sandstone"] .recharts-tooltip-wrapper .recharts-tooltip-item-separator {
  color: var(--fg) !important;
}

[data-theme="sandstone"] .card,
[data-theme="sandstone"] .modal-content { background-color: var(--card); }
[data-theme="sandstone"] .card-header { border-color: var(--border); }
[data-theme="sandstone"] .btn-secondary {
  background-color: var(--panel);
  border-color: var(--border);
  color: var(--fg);
}
[data-theme="sandstone"] .btn-secondary:hover { background-color: var(--panel-2); }
[data-theme="sandstone"] .input,
[data-theme="sandstone"] .select {
  background-color: var(--panel);
  border-color: var(--border);
  color: var(--fg);
}
[data-theme="sandstone"] .label { color: var(--fg-2); }
[data-theme="sandstone"] .table th {
  background-color: var(--bg-2);
  color: var(--fg-2);
  border-color: var(--border);
}
[data-theme="sandstone"] .table td { border-color: var(--border); }
[data-theme="sandstone"] .badge-gray {
  background-color: var(--panel-2);
  color: var(--fg-2);
}

/* Sandstone 主题 — Tailwind slate 类全面覆盖 */
[data-theme="sandstone"] .bg-white,
[data-theme="sandstone"] .card { background-color: var(--card); }
[data-theme="sandstone"] .bg-slate-50,
[data-theme="sandstone"] .bg-slate-100 { background-color: var(--bg); }
[data-theme="sandstone"] .bg-slate-200 { background-color: var(--panel-2); }
[data-theme="sandstone"] .bg-slate-700 { background-color: var(--border-strong); }
[data-theme="sandstone"] .bg-slate-800,
[data-theme="sandstone"] .dark\:bg-slate-800 { background-color: var(--card); }
[data-theme="sandstone"] .bg-slate-900 { background-color: var(--card); }
[data-theme="sandstone"] .text-slate-200,
[data-theme="sandstone"] .text-slate-300,
[data-theme="sandstone"] .text-slate-400 { color: var(--muted); }
[data-theme="sandstone"] .text-slate-500 { color: var(--muted-2); }
[data-theme="sandstone"] .text-slate-600 { color: var(--fg-2); }
[data-theme="sandstone"] .text-slate-700,
[data-theme="sandstone"] .text-slate-800,
[data-theme="sandstone"] .text-slate-900 { color: var(--fg); }
[data-theme="sandstone"] .border-slate-100,
[data-theme="sandstone"] .border-slate-200 { border-color: var(--border); }
[data-theme="sandstone"] .border-slate-300,
[data-theme="sandstone"] .border-slate-400 { border-color: var(--border-strong); }
[data-theme="sandstone"] .border-slate-600,
[data-theme="sandstone"] .border-slate-700 { border-color: var(--border-strong); }
[data-theme="sandstone"] .divide-slate-100 > :not([hidden]) ~ :not([hidden]) { border-color: var(--border); }
[data-theme="sandstone"] .active\:bg-slate-100:active { background-color: var(--panel-2); }
[data-theme="sandstone"] .hover\:bg-white:hover,
[data-theme="sandstone"] .hover\:bg-slate-50:hover,
[data-theme="sandstone"] .hover\:bg-slate-100:hover { background-color: var(--card-hover); }
[data-theme="sandstone"] .hover\:bg-slate-200:hover { background-color: var(--panel-2); }
[data-theme="sandstone"] .hover\:text-slate-700:hover { color: var(--fg-2); }
[data-theme="sandstone"] .hover\:text-red-600:hover { color: var(--danger); }
[data-theme="sandstone"] .hover\:bg-red-50:hover { background-color: var(--danger-soft); }
[data-theme="sandstone"] table tbody tr { background-color: transparent; transition: background-color 200ms ease; }
[data-theme="sandstone"] table tbody tr:hover { background-color: var(--card-hover) !important; }

[data-theme="sandstone"] .hover\:bg-amber-50:hover,
[data-theme="sandstone"] .hover\:bg-blue-50:hover,
[data-theme="sandstone"] .hover\:bg-green-50:hover,
[data-theme="sandstone"] .hover\:bg-emerald-50:hover {
  background-color: var(--accent-soft);
}
[data-theme="sandstone"] .hover\:bg-gray-50:hover,
[data-theme="sandstone"] .hover\:bg-gray-100:hover {
  background-color: var(--card-hover);
}

/* Sandstone 表单控件 */
[data-theme="sandstone"] input:not([type="color"]):not([type="range"]):not([type="checkbox"]):not([type="radio"]),
[data-theme="sandstone"] textarea {
  background-color: var(--panel);
  color: var(--fg);
  border-color: var(--border);
}
[data-theme="sandstone"] input::placeholder,
[data-theme="sandstone"] textarea::placeholder {
  color: var(--muted);
}
[data-theme="sandstone"] select {
  background-color: var(--panel);
  color: var(--fg);
  border-color: var(--border);
}
[data-theme="sandstone"] select option {
  background-color: var(--panel);
  color: var(--fg);
}

[data-theme="sandstone"] .btn-warning { color: var(--bg); }

/* Sandstone primary 色暖化 — 按钮/徽章/标签/焦点环全部走暖橙 */
[data-theme="sandstone"] .bg-primary-50 { background-color: rgb(var(--color-primary-50)); }
[data-theme="sandstone"] .bg-primary-100 { background-color: rgb(var(--color-primary-100)); }
[data-theme="sandstone"] .bg-primary-500 { background-color: rgb(var(--color-primary-500)); }
[data-theme="sandstone"] .bg-primary-600 { background-color: rgb(var(--color-primary-600)); }
[data-theme="sandstone"] .hover\:bg-primary-500:hover { background-color: rgb(var(--color-primary-500)); }
[data-theme="sandstone"] .hover\:bg-primary-700:hover { background-color: rgb(var(--color-primary-700)); }
[data-theme="sandstone"] .text-primary-600 { color: rgb(var(--color-primary-600)); }
[data-theme="sandstone"] .text-primary-700 { color: rgb(var(--color-primary-700)); }
[data-theme="sandstone"] .border-primary-200 { border-color: rgb(var(--color-primary-200)); }
[data-theme="sandstone"] .border-primary-300 { border-color: rgb(var(--color-primary-300)); }
[data-theme="sandstone"] .border-primary-400 { border-color: rgb(var(--color-primary-400)); }
[data-theme="sandstone"] .ring-primary-500 { --tw-ring-color: rgb(var(--color-primary-500)); }
[data-theme="sandstone"] .focus\:ring-primary-500:focus { --tw-ring-color: rgb(var(--color-primary-500)); }
[data-theme="sandstone"] .focus\:border-primary-500:focus { border-color: rgb(var(--color-primary-500)); }
[data-theme="sandstone"] .shadow-primary-500\/25 { --tw-shadow-color: rgb(var(--color-primary-500) / 0.25); }

/* Sandstone 侧边栏活跃项 */
[data-theme="sandstone"] aside nav button.bg-slate-100 { background-color: var(--sidebar-item-active); }
[data-theme="sandstone"] aside nav button.hover\:bg-slate-50:hover,
[data-theme="sandstone"] aside nav button.hover\:bg-slate-100:hover { background-color: var(--sidebar-item-hover); }
[data-theme="sandstone"] aside nav button.bg-slate-700\/50 { background-color: var(--sidebar-item-active); }
[data-theme="sandstone"] aside nav .bg-slate-700 { background-color: var(--accent); }

/* Sandstone 进度条轨道 / 骨架屏 / 徽章 */
[data-theme="sandstone"] .bg-slate-200 { background-color: var(--panel-2); }
[data-theme="sandstone"] .hover\:bg-slate-200:hover { background-color: var(--panel-2); }

/* Sandstone 滚动条 — CSS 变量已在 [data-theme="sandstone"] 中定义，全局规则自动生效 */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}

/* 隐藏原生滚动条（使用自定义 HoverScrollbar 组件） */
.hide-native-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-native-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

/* 按钮样式 — @deprecated 请使用 <Button variant="X" size="Y"> 组件。
   ~232 处存量引用将逐步迁移，check-rules.cjs 阻断新增 btn-* 使用。 */
@layer components {
  .btn {
  @apply px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2;
  }

  .btn-primary {
  @apply bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md;
  }

  .btn-secondary {
  @apply bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 active:bg-slate-100 shadow-sm;
  }

  .btn-success {
  @apply bg-success-600 text-white hover:bg-success-700 active:bg-success-800 shadow-sm hover:shadow-md;
  }

  .btn-danger {
  @apply bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-sm hover:shadow-md;
  }

  .btn-warning {
  @apply bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 shadow-sm hover:shadow-md;
  }

  .btn-ghost {
  @apply bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-200;
  }

  .btn-sm {
  @apply px-3 py-1.5 text-sm;
  }

  .btn-lg {
  @apply px-6 py-3 text-lg;
  }
}

/* 卡片样式 */
@layer components {
  .card {
  @apply bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all duration-200;
  }

  .card-header {
  @apply px-5 py-4 border-b border-slate-100;
  }

  .card-body {
  @apply p-5;
  }
}

/* 表单样式 */
@layer components {
  .input {
  @apply w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800
  placeholder-slate-400 transition-all duration-200
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
  hover:border-slate-300;
  }

  .input-error {
  @apply border-danger-500 focus:ring-danger-500 focus:border-danger-500;
  }

  .select {
  @apply w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800
  transition-all duration-200 cursor-pointer
  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
  hover:border-slate-300;
  }

  .label {
  @apply block text-sm font-medium text-slate-700 mb-1.5;
  }

  .form-group {
  @apply mb-4;
  }
}

/* 表格样式 */
@layer components {
  .table {
  @apply w-full text-sm;
  }

  .table th {
  @apply px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider bg-slate-50 border-b border-slate-200;
  }

  .table td {
  @apply px-4 py-3 border-b border-slate-100;
  }

  .table tr:hover td {
  @apply bg-slate-50;
  }
}

/* 全局表格行悬停高亮（透明度可调，由外观主题设置控制）
  默认对所有表格行生效，新增表格无需额外处理 */
table tbody tr {
  transition: background-color 200ms;
}
table tbody tr:hover {
  background-color: rgb(239 246 255 / var(--row-hover-opacity, 0.6));
}

/* 模态框样式 */
.modal-overlay {
  @apply fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50;
}

.modal-content {
  @apply bg-white rounded-2xl shadow-2xl w-full mx-4 max-h-[90vh] overflow-y-auto;
  max-width: 32rem;
}

/* 标签样式 */
.badge {
  @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
}

.badge-primary {
  @apply bg-primary-100 text-primary-700;
}

.badge-success {
  @apply bg-success-100 text-success-700;
}

.badge-warning {
  @apply bg-warning-100 text-warning-700;
}

.badge-danger {
  @apply bg-danger-100 text-danger-700;
}

.badge-gray {
  @apply bg-slate-100 text-slate-700;
}

/* 空状态 */
.empty-state-title {
  @apply text-lg font-medium text-slate-700 mb-2;
}

.empty-state-description {
  @apply text-sm text-slate-500;
}

.loading-spinner {
  @apply animate-spin rounded-full border-2 border-slate-200 border-t-primary-600;
}

/* 状态指示器 */
.status-dot {
  @apply w-2 h-2 rounded-full inline-block;
}

.status-dot-success {
  @apply bg-success-500;
}

.status-dot-warning {
  @apply bg-warning-500;
}

.status-dot-danger {
  @apply bg-danger-500;
}

/* 按钮禁用样式 */
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* 工具提示 */
.tooltip {
  @apply relative;
}

.tooltip::after {
  @apply absolute hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-50;
}

/* 现代化表单增强（兼容现有页面使用） */
.input-modern {
  @apply w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800
  placeholder-slate-400 transition-all duration-300
  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
  hover:border-slate-300;
}

.input-modern-lg {
  @apply w-full px-5 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-800 text-lg
  placeholder-slate-400 transition-all duration-300
  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
  hover:border-slate-300;
}

.select-modern {
  @apply w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800
  transition-all duration-300 cursor-pointer appearance-none
  focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white
  hover:border-slate-300;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  padding-right: 40px;
}

/* ===== 打印样式 ===== */
@media print {
  /* 隐藏不需要打印的元素 */
  .no-print,
  .sidebar,
  .header-actions,
  .filter-bar,
  .modal-footer,
  .btn,
  button:not(.print-content *) {
  display: none !important;
  }

  /* 打印内容样式 */
  .print-content {
  width: 100%;
  padding: 20px;
  font-size: 12pt;
  line-height: 1.6;
  }

  .print-header {
  text-align: center;
  border-bottom: 2px solid #333;
  padding-bottom: 20px;
  margin-bottom: 20px;
  }

  .print-table {
  width: 100%;
  border-collapse: collapse;
  margin: 20px 0;
  }

  .print-table th,
  .print-table td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
  }

  .print-table th {
  background: #f5f5f5;
  font-weight: bold;
  }

  .print-footer {
  margin-top: 40px;
  display: flex;
  justify-content: space-between;
  }

  .print-signature {
  text-align: center;
  width: 200px;
  }
}

/* ═══════════════════════════════════════════
  Performance-optimized compositor animations
  CSS @keyframes run on GPU compositor thread
  — far smoother than JS-driven animations
  ═══════════════════════════════════════════ */
@keyframes float-slow {
  0%, 100% { transform: translate(-100px, -40px); }
  50% { transform: translate(100px, 60px); }
}
@keyframes float-slower {
  0%, 100% { transform: translate(80px, 20px); }
  50% { transform: translate(-60px, -80px); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  50% { opacity: 1; transform: scale(2); }
}

.animate-float-slow {
  animation: float-slow 12s ease-in-out infinite;
  will-change: transform;
}
.animate-float-slower {
  animation: float-slower 15s ease-in-out infinite;
  will-change: transform;
}
.animate-fade-in {
  animation: fade-in 1s ease-out forwards;
}
.animate-pulse-glow {
  animation: pulse-glow 2.5s ease-in-out infinite;
}

/* GPU compositing hint for large animated elements */
.gpu {
  transform: translateZ(0);
  backface-visibility: hidden;
}

/* ── Status Bar（复刻 Reasonix 风格）── */
.statusbar {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 12px;
  font-size: 11px;
  user-select: none;
  flex-shrink: 0;
  background: var(--bg-2);
  color: var(--fg-2);
  border-top: 1px solid var(--border);
}
.statusbar__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fg-3);
  flex-shrink: 0;
}
.statusbar__dot--busy {
  background: var(--accent);
  animation: pulse 1.2s ease-in-out infinite;
}
.statusbar__model {
  color: var(--fg-2);
  font-weight: 500;
}
.statusbar__sep {
  opacity: 0.4;
  flex-shrink: 0;
}
.statusbar__activity {
  color: var(--accent);
}
.statusbar__cache {
  color: var(--fg-3);
  display: flex;
  align-items: center;
  gap: 4px;
}
.statusbar__ctx {
  color: var(--fg-3);
}
.statusbar__spacer {
  flex: 1;
}

/* ── 脱敏开关（状态栏内联按钮，复用 modelsw__trigger 视觉规范）── */
.statusbar__maskbtn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--fg-3);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  user-select: none;
}
.statusbar__maskbtn svg {
  flex-shrink: 0;
}
.statusbar__maskbtn:hover:not(:disabled) {
  color: var(--fg-2);
}
.statusbar__maskbtn:disabled {
  opacity: 0.5;
  cursor: wait;
}

/* ── Model Switcher（复刻 Reasonix 弹出选择器）── */
.modelsw {
  position: relative;
  display: inline-flex;
}
.modelsw__trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  color: var(--fg-3);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
  min-width: 0;
}
.modelsw__trigger svg {
  flex-shrink: 0;
}
.modelsw__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.modelsw__trigger:hover {
  color: var(--fg-2);
}
.modelsw__backdrop {
  position: fixed;
  inset: 0;
  z-index: 30;
}
.modelsw__menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 31;
  min-width: 160px;
  max-width: 280px;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 5px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25);
}
.modelsw__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 9px;
  background: none;
  border: none;
  border-radius: 6px;
  color: var(--fg-2);
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.modelsw__item:hover {
  background: var(--panel-2);
  color: var(--fg-2);
}
.modelsw__item--current {
  color: var(--accent);
}
.modelsw__model {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.modelsw__check {
  flex-shrink: 0;
}

@keyframes pulse {
  50% { opacity: 0.35; }
}

================
File: src/main.tsx
================
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)

================
File: src/routes.ts
================
/**
 * 路由配置文件
 * 
 * 集中管理所有页面路由的元数据
 * 支持：ID、标签、图标、快捷键、面包屑等
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 页面类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 合同管理子视图
 */
export type ContractView = 'dashboard' | 'income' | 'expense'

/**
 * 页面 ID 枚举
 */
export type PageId =
  | 'dashboard'
  | 'projects'
  | 'contracts'
  | 'partners'
  | 'members'
  | 'hr'
  | 'labor'
  | 'expenses'
  | 'costLedger'
  | 'drawings'
  | 'wages'
  | 'settlement'
  | 'templates'
  | 'inventory'
  | 'invoices'
  | 'settings'
  | 'users'

/**
 * 路由元数据
 */
export interface RouteMeta {
  /** 路由 ID */
  id: PageId
  /** 显示标签 */
  label: string
  /** 图标 emoji */
  icon: string
  /** 快捷键 */
  shortcut?: string
  /** 父路由 ID */
  parentId?: PageId
  /** 是否在侧边栏显示 */
  showInSidebar?: boolean
  /** 是否为系统页面 */
  isSystem?: boolean
  /** 路由描述 */
  description?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 路由配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 所有页面路由配置
 */
export const routes: RouteMeta[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 核心业务模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'dashboard',
    label: '首页',
    icon: 'LayoutDashboard',
    shortcut: 'G D',
    description: '数据概览与统计',
  },
  {
    id: 'projects',
    label: '项目管理',
    icon: 'FolderKanban',
    shortcut: 'G P',
    description: '项目信息、任务、材料、费用等',
  },
  {
    id: 'contracts',
    label: '合同管理',
    icon: 'FileText',
    shortcut: 'G C',
    description: '收入合同与支出合同',
  },
  {
    id: 'partners',
    label: '单位管理',
    icon: 'Building2',
    shortcut: 'G O',
    description: '合作单位与监管单位',
  },
  {
    id: 'members',
    label: '员工管理',
    icon: 'Users',
    shortcut: 'G M',
    description: '管理人员与农民工',
    showInSidebar: false,  // v2.6.0: 已拆分为人事管理和工人管理，保留重定向
  },
  {
    id: 'hr',
    label: '人事管理',
    icon: 'UserCog',
    shortcut: 'G H',
    description: '人员档案·考勤·薪酬·部门',
  },
  {
    id: 'labor',
    label: '工人管理',
    icon: 'HardHat',
    shortcut: 'G L',
    description: '工人信息·班组·工资',
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 财务模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'wages',
    label: '工资管理',
    icon: 'Wallet',
    shortcut: 'G W',
    description: '农民工工资核算与发放',
    showInSidebar: false,  // v2.6.0: 工人工资通过工人管理模块入口访问
  },
  {
    id: 'settlement',
    label: '结算办理',
    icon: 'ClipboardList',
    shortcut: 'G J',
    description: '结算单编制与审核',
  },
  {
    id: 'templates',
    label: '模板管理',
    icon: 'FileText',
    shortcut: 'G T',
    description: '文档模板管理与生成',
  },
  {
    id: 'invoices',
    label: '发票管理',
    icon: 'Receipt',
    shortcut: 'G V',
    description: '收票与开票管理',
  },
  {
    id: 'costLedger',
    label: '成本台账',
    icon: 'ClipboardList',
    shortcut: 'G L',
    description: '真实项目成本追踪',
  },
  {
    id: 'expenses',
    label: '成本管理',
    icon: 'DollarSign',
    shortcut: 'G E',
    description: '项目成本与支出',
    showInSidebar: false,
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 资产模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'inventory',
    label: '仓库管理',
    icon: 'Package',
    shortcut: 'G I',
    description: '物料采购与库存管理',
  },
  {
    id: 'drawings',
    label: '图纸管理',
    icon: 'Ruler',
    shortcut: 'G G',
    description: '项目图纸上传与查看',
  },
  
  // ─────────────────────────────────────────────────────────────────────────────
  // 系统模块
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'users',
    label: '用户管理',
    icon: 'UserCircle',
    shortcut: 'G U',
    isSystem: false,
    description: '系统用户与权限管理',
    showInSidebar: false,
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: 'Settings',
    shortcut: 'G S',
    isSystem: false,
    showInSidebar: false,
    description: '系统配置与数据管理',
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 路由查询函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 根据 ID 获取路由配置
 */
export function getRouteById(id: PageId): RouteMeta | undefined {
  return routes.find(route => route.id === id)
}

/**
 * 获取侧边栏路由列表
 */
export function getSidebarRoutes(): RouteMeta[] {
  return routes.filter(route => route.showInSidebar !== false && !route.isSystem)
}

/**
 * 根据用户权限过滤侧边栏路由
 */
const SIDEBAR_RESOURCE_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  projects: 'projects',
  contracts: 'contracts',
  partners: 'partners',
  members: 'members',
  hr: 'hr',
  labor: 'labor',
  wages: 'wages',
  settlement: 'settlement',
  templates: 'templates',
  inventory: 'inventory',
  invoices: 'invoices',
  expenses: 'expenses',
  costLedger: 'costLedger',
  drawings: 'drawings',
  settings: 'settings',
  users: 'users',
}

export function getFilteredSidebarRoutes(permissions: string[]): RouteMeta[] {
  return routes.filter(route => {
    if (route.isSystem) return false
    if (route.showInSidebar === false) return false
    const resource = SIDEBAR_RESOURCE_MAP[route.id]
    if (!resource) return true
    // 管理员始终看到全部
    if (permissions.includes('users:create')) return true
    return permissions.includes(`${resource}:read`)
  })
}

/**
 * 获取所有业务模块路由（不含系统设置）
 */
export function getBusinessRoutes(): RouteMeta[] {
  return routes.filter(route => !route.isSystem)
}

/**
 * 根据快捷键获取路由
 */
export function getRouteByShortcut(shortcut: string): RouteMeta | undefined {
  return routes.find(route => route.shortcut?.toUpperCase() === shortcut.toUpperCase())
}

/**
 * 路由 ID 集合（用于类型保护）
 */
export const PAGE_IDS: PageId[] = routes.map(r => r.id)

/**
 * 导航项（侧边栏显示）
 */
export const NAV_ITEMS: Omit<RouteMeta, 'description' | 'isSystem'>[] = routes
  .filter(r => r.showInSidebar !== false && !r.isSystem)
  .map(({ description, isSystem, ...rest }) => rest)

// ═══════════════════════════════════════════════════════════════════════════════
// 合同管理子视图配置
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 合同管理视图配置
 */
export interface ContractViewMeta {
  id: ContractView
  label: string
  icon: string
  description: string
}

export const contractViews: ContractViewMeta[] = [
  { id: 'dashboard', label: '合同看板', icon: 'LayoutDashboard', description: '合同统计概览' },
  { id: 'income', label: '收入合同', icon: 'TrendingUp', description: '收入合同台账' },
  { id: 'expense', label: '支出合同', icon: 'TrendingDown', description: '支出合同台账' },
]

/**
 * 根据视图 ID 获取视图配置
 */
export function getContractViewById(id: ContractView): ContractViewMeta | undefined {
  return contractViews.find(view => view.id === id)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型
// ═══════════════════════════════════════════════════════════════════════════════

================
File: src/services/api-client.ts
================
/**
 * C# API 客户端
 *
 * 通过 HTTP fetch 调用 ASP.NET Core Minimal API
 * 替代 Tauri 的 invoke 和 Electron 的 ipcRenderer
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5048';
const TOKEN_KEY = 'jwt_token';
const MASK_KEY = 'v120_mask_enabled';
const PII_PATHS = ['/api/members', '/api/workers', '/api/partners', '/api/project-members'];
function getToken(): string | null { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
export function setToken(token: string | null): void { try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch (err) { console.warn('[ApiClient] 保存token失败:', err) } }
function authHeaders(): Record<string, string> { const t = getToken(); return t ? { Authorization: "Bearer " + t } : {}; }
/** 读取 Mask toggle 状态 (true = masked/默认, false = unmasked) */
function getMaskedState(): boolean { try { return localStorage.getItem(MASK_KEY) !== 'false'; } catch { return true; } }
/** 判断路径是否属于 PII 端点 (精确匹配 + 集合, 避免 /api/members/123 也算) */
function isPiiPath(path: string): boolean { return PII_PATHS.some(p => path === p || path.startsWith(p + '?')); }

/** snake_case → camelCase 转换 */
function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/** 判断 key 是否应转换为 camelCase（包含下划线的属性名） */
function shouldConvert(key: string): boolean {
  return key.includes('_') && !key.startsWith('custom_')
}

/** 递归转换对象 key 为 camelCase（跳过字典型 key） */
function convertKeysToCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeysToCamelCase)
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        shouldConvert(key) ? toCamelCase(key) : key,
        convertKeysToCamelCase(value)
      ])
    )
  }
  return obj
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * GET 请求
 */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }
    // PII 端点 + toggle=false (unmasked) 时, 自动追加 unmask=true
    if (isPiiPath(path) && !getMaskedState() && !url.searchParams.has('unmask')) {
      url.searchParams.set('unmask', 'true');
    }
    const resp = await fetch(url.toString(), { headers: authHeaders() });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      try {
        const errBody = await resp.json();
        if (errBody?.error) return { success: false, error: errBody.error };
      } catch { /* non-JSON response */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] GET ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * POST 请求
 */
async function post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      try {
        const errBody = await resp.json();
        if (errBody?.error) return { success: false, error: errBody.error };
      } catch { /* non-JSON response */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] POST ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * PUT 请求
 */
async function put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      try {
        const errBody = await resp.json();
        if (errBody?.error) return { success: false, error: errBody.error };
      } catch { /* non-JSON response */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] PUT ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

/**
 * DELETE 请求
 */
async function del<T>(path: string): Promise<ApiResponse<T>> {
  try {
    const resp = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders() });
    if (resp.status === 401) setToken(null);
    if (!resp.ok) {
      try {
        const errBody = await resp.json();
        if (errBody?.error) return { success: false, error: errBody.error };
      } catch { /* non-JSON response */ }
      return { success: false, error: `HTTP ${resp.status}: ${resp.statusText}` };
    }
    const raw = await resp.json();
    return convertKeysToCamelCase(raw);
  } catch (err) {
    console.error(`[API] DELETE ${path} 失败:`, err);
    return { success: false, error: String(err) };
  }
}

export const apiClient = { get, post, put, del };

export const piiKeyApi = {
  getPiiKeys: () => apiClient.get<{ keys: any[]; activeKeyId: number; totalKeys: number }>('/api/admin/pii/keys'),
  rotatePiiKey: () => apiClient.post<{ newKeyId: number; message: string }>('/api/admin/pii/rotate', {}),
  startPiiReencrypt: () => apiClient.post<{ status: any; message: string }>('/api/admin/pii/reencrypt', {}),
  getPiiReencryptStatus: () => apiClient.get<any>('/api/admin/pii/reencrypt/status'),
};

================
File: src/services/companyQuery.ts
================
// 企业信息查询服务
// 通过统一社会信用代码查询企业基本信息

// 纳税资质类型
export type TaxType = 'general' | 'small'  // general=一般纳税人，small=小规模纳税人

interface CompanyInfo {
  name: string           // 企业名称
  creditCode: string     // 统一社会信用代码
  registeredAddress: string  // 注册地址
  businessScope: string // 经营范围
  taxType: TaxType      // 纳税资质
  legalPerson: string    // 法定代表人
  registeredCapital: string // 注册资本
  establishmentDate: string // 成立日期
  address: string        // 地址
}

// 检查网络是否可用
export const isOnline = (): boolean => {
  return navigator.onLine
}

// 通过统一社会信用代码查询企业信息
export const queryCompanyByCreditCode = async (creditCode: string): Promise<CompanyInfo | null> => {
  // 统一社会信用代码格式校验（18位）
  const creditCodeRegex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/
  if (!creditCodeRegex.test(creditCode)) {
    console.warn('统一社会信用代码格式不正确')
    return null
  }

  try {
    // 使用阿里的企业信息查询API（免费的公开接口）
    const response = await fetch(
      `https://aiqicha.baidu.com/c/s?search=统一社会信用代码:${creditCode}&rn=1`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      }
    )

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    // 由于百度等网站可能有反爬虫，这里我们模拟返回
    // 实际项目中应该接入企业信息查询API
    return null
  } catch (error) {
    console.warn('查询企业信息失败:', error)
    return null
  }
}

// 根据统一社会信用代码判断纳税资质
// 规则：第17位为0-5的是小规模纳税人，其他数字是一般纳税人
// 这是基于企业税务登记的编码规则推断，仅供参考
export const inferTaxTypeFromCreditCode = (creditCode: string): TaxType | null => {
  if (!creditCode || creditCode.length !== 18) {
    return null
  }

  // 提取第17位（索引16）
  // 统一社会信用代码中第17位来自组织机构代码的第8位
  // 有效值为 0-9 和 X（10）
  const char17th = creditCode.charAt(16).toUpperCase()

  // X 代表 10，在编码中通常归类为大数（视为 6-9 范围）
  if (char17th === 'X') {
    return 'general'  // X 视为一般纳税人
  }

  // 检查是否是数字
  if (!/^[0-9]$/.test(char17th)) {
    // 第17位不是有效数字，无法推断
    return null
  }

  const code = parseInt(char17th, 10)

  // 根据编码规则推断
  // 0-5: 小规模纳税人
  // 6-9: 一般纳税人
  return code <= 5 ? 'small' : 'general'
}

// 获取纳税资质的中文名称
export const getTaxTypeLabel = (taxType: TaxType | string | undefined): string => {
  if (!taxType) return ''
  switch (taxType) {
    case 'general':
      return '一般纳税人'
    case 'small':
      return '小规模纳税人'
    default:
      return ''
  }
}

// 通过公司名称查询企业信息（调用后端百度API）
export const queryCompanyByName = async (companyName: string): Promise<CompanyInfo | null> => {
  if (!companyName || companyName.trim().length < 2) return null

  try {
    const api = await (await import('../services/api-adapter')).getAPI()
    const result = await (api as any).ocrBaiduCompanyQuery(companyName.trim(), {})

    if (result?.success && result?.businessLicense) {
      const bl = result.businessLicense
      return {
        name: bl.companyName || '',
        creditCode: bl.creditCode || '',
        registeredAddress: bl.address || '',
        businessScope: bl.businessScope || '',
        taxType: 'general' as TaxType,
        legalPerson: bl.legalPerson || '',
        registeredCapital: bl.registeredCapital || '',
        establishmentDate: bl.establishDate || '',
        address: bl.address || ''
      }
    }
    return null
  } catch (error) {
    console.warn('按名称查询企业信息失败:', error)
    return null
  }
}

// 使用天眼查开放API查询（需要API Key）
export const queryCompanyTianYanCha = async (creditCode: string, apiKey?: string): Promise<CompanyInfo | null> => {
  if (!apiKey) {
    console.warn('未配置天眼查API Key')
    return null
  }

  try {
    const response = await fetch('https://open.api.tianyancha.com/services/v4/company/search', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ keyword: creditCode }),
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      throw new Error('API request failed')
    }

    const data = await response.json()
    if (data.ErrorMsg === 'ok' && data.Result && data.Result.items.length > 0) {
      const company = data.Result.items[0]
      return {
        name: company.name,
        creditCode: company.creditCode || creditCode,
        registeredAddress: company.registeredAddress || '',
        businessScope: company.businessScope || '',
        taxType: 'general' as TaxType,
        legalPerson: company.legalPerson || '',
        registeredCapital: company.registeredCapital || '',
        establishmentDate: company.establishmentDate || '',
        address: company.address || ''
      }
    }
    return null
  } catch (error) {
    console.warn('天眼查API查询失败:', error)
    return null
  }
}

// 简单的本地校验和格式化
export const validateCreditCode = (code: string): { valid: boolean; message?: string } => {
  if (!code) {
    return { valid: false, message: '请输入统一社会信用代码' }
  }
  
  if (code.length !== 18) {
    return { valid: false, message: '统一社会信用代码必须为18位' }
  }
  
  // 统一社会信用代码校验规则
  const regex = /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/
  if (!regex.test(code)) {
    return { valid: false, message: '统一社会信用代码格式不正确' }
  }
  
  return { valid: true }
}

// 从名称推断行业类型（简单实现）
export const inferCategoryFromName = (name: string): string => {
  const lowerName = name.toLowerCase()
  
  if (lowerName.includes('劳务')) return 'labor'
  if (lowerName.includes('材料') || lowerName.includes('建材') || lowerName.includes('商贸')) return 'material'
  if (lowerName.includes('租赁') || lowerName.includes('设备')) return 'equipment'
  if (lowerName.includes('设计')) return 'design'
  if (lowerName.includes('监理')) return 'supervisor'
  if (lowerName.includes('检测')) return 'testing'
  if (lowerName.includes('地勘') || lowerName.includes('勘察')) return 'survey'
  
  return 'other'
}

================
File: src/services/fileService.ts
================
/**
 * 前端文件服务
 *
 * 封装统一文件 IPC 调用，提供 FILE_CATEGORIES 常量和便捷方法
 * 自动兼容旧 data URL 格式数据
 */

import { getAPI } from './api-adapter'

// ═══════════════════════════════════════════════════════════════════════════════
// 分类常量（与后端 electron/file-service.ts 的 FOLDER_MAP 保持一致）
// ═══════════════════════════════════════════════════════════════════════════════

export const FILE_CATEGORIES = {
  MEMBER_ID_CARD:     { category: 'members', subCategory: 'id-cards' },
  MEMBER_CONTRACT:    { category: 'members', subCategory: 'contracts' },
  MEMBER_TRAINING:    { category: 'members', subCategory: 'training' },
  MEMBER_HEALTH:      { category: 'members', subCategory: 'health' },
  MEMBER_CERTIFICATE: { category: 'members', subCategory: 'certificates' },
  INVOICE_IN:         { category: 'invoices', subCategory: 'invoice_in' },
  INVOICE_OUT:        { category: 'invoices', subCategory: 'invoice_out' },
  PAYMENT_IN:         { category: 'payments', subCategory: 'payment_in' },
  PAYMENT_OUT:        { category: 'payments', subCategory: 'payment_out' },
  WAGE_BANK_RECEIPT:  { category: 'wages', subCategory: 'bank-receipts' },
  PARTNER_LICENSE:    { category: 'partners', subCategory: 'licenses' },
  PARTNER_ATTACHMENT: { category: 'partners', subCategory: 'attachments' },
  CONTRACT_INCOME:    { category: 'contracts', subCategory: 'income' },
  CONTRACT_EXPENSE:   { category: 'contracts', subCategory: 'expense' },
  DRAWING_FILE:       { category: 'drawings', subCategory: 'files' },
  ATTENDANCE_FILE:    { category: 'attendance', subCategory: 'files' },
  SETTLEMENT_FILE:    { category: 'settlement', subCategory: 'files' },
  TEMPLATE_FILE:      { category: 'templates', subCategory: 'files' },
  COST_LEDGER_FILE:   { category: 'costLedger', subCategory: 'files' },
} as const

export type FileCategoryConfig = typeof FILE_CATEGORIES[keyof typeof FILE_CATEGORIES]

// ═══════════════════════════════════════════════════════════════════════════════
// 文件上传
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 上传文件：将 data URL（或原始 base64）保存到磁盘
 * @returns 存储后的文件名
 * @throws 上传失败时抛出异常
 */
export async function uploadFile(
  category: string,
  subCategory: string,
  fileData: string,
  originalFileName: string,
  projectName?: string | null,
): Promise<string> {
  if (!fileData) return ''
  // 如果是纯 base64（无 data: 前缀），不加处理直接传
  // 如果是 data URL，后端 extractBase64Data 会处理
  const result = await (await getAPI()).saveFile({
    category,
    subCategory,
    fileData,
    fileName: originalFileName,
    projectName,
  })
  if (!result.success) {
    throw new Error(result.error || '文件上传失败')
  }
  return result.data!.fileName
}

/**
 * 批量处理对象中的文件字段：将 data URL 字段上传到磁盘并用文件名替换
 *
 * @param obj 包含 data URL 字段的对象
 * @param fieldConfigs 字段配置数组，指定每个文件字段对应的分类和原始文件名
 * @returns 处理后的对象（所有 data URL 已被文件名替换）
 *
 * 示例：
 *   processFileFields(memberData, [
 *     { field: 'idCardFront', category: FILE_CATEGORIES.MEMBER_ID_CARD, getFileName: () => 'id_front.jpg' },
 *     { field: 'contractFile', category: FILE_CATEGORIES.MEMBER_CONTRACT, getFileName: () => 'contract.pdf' },
 *   ])
 */
export async function processFileFields<T extends Record<string, any>>(
  obj: T,
  fieldConfigs: {
    field: keyof T
    category: string
    subCategory: string
    getFileName?: () => string
  }[],
  projectName?: string | null,
): Promise<T> {
  const result = { ...obj }
  const uploads: Promise<void>[] = []

  for (const config of fieldConfigs) {
    const value = result[config.field]
    if (typeof value === 'string' && value.startsWith('data:')) {
      const fileName = config.getFileName ? config.getFileName() : 'file'
      uploads.push(
        uploadFile(config.category, config.subCategory, value, fileName, projectName)
          .then(storedName => {
            (result as any)[config.field] = storedName
          }),
      )
    }
  }

  if (uploads.length > 0) {
    await Promise.all(uploads)
  }

  return result
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件读取
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 获取文件的 data URL 用于前端预览
 * 自动兼容：如果传入的是已有 data URL，直接返回
 *            如果是文件名，走 IPC 读取
 */
export async function readUploadedFile(
  category: string,
  subCategory: string,
  value: string,
  projectName?: string | null,
): Promise<string> {
  if (!value) return ''
  // 向后兼容：如果值是 data URL，直接返回
  if (value.startsWith('data:')) return value
  // 否则按文件名从磁盘读取
  const result = await (await getAPI()).readFile({
    category,
    subCategory,
    fileName: value,
    projectName,
  })
  if (!result.success) return ''
  return result.data!.dataUrl
}

// ═══════════════════════════════════════════════════════════════════════════════
// 文件删除
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 删除已上传的文件
 * 自动兼容：如果值是 data URL（旧格式），不做磁盘删除
 */
export async function deleteUploadedFile(
  category: string,
  subCategory: string,
  value: string,
  projectName?: string | null,
): Promise<void> {
  if (!value || value.startsWith('data:')) return
  await (await getAPI()).deleteFile({
    category,
    subCategory,
    fileName: value,
    projectName,
  })
}

/**
 * 批量删除对象中的文件字段
 */
export async function deleteFileFields<T extends Record<string, any>>(
  obj: T,
  fieldConfigs: {
    field: keyof T
    category: string
    subCategory: string
  }[],
  projectName?: string | null,
): Promise<void> {
  const deletes: Promise<void>[] = []
  for (const config of fieldConfigs) {
    const value = obj[config.field]
    if (typeof value === 'string' && value && !value.startsWith('data:')) {
      deletes.push(deleteUploadedFile(config.category, config.subCategory, value, projectName))
    }
  }
  if (deletes.length > 0) {
    await Promise.all(deletes)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 使用 FileReader 读取文件为 data URL
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 根据 data URL 推断文件扩展名
 */
export function guessFileExt(dataUrl: string, fileType?: string): string {
  if (fileType === 'pdf') return '.pdf'
  if (fileType === 'word') return '.docx'
  if (fileType === 'excel') return '.xlsx'
  if (fileType === 'dwg') return '.dwg'
  if (fileType === 'dxf') return '.dxf'
  // 从 MIME 推断
  const match = dataUrl.match(/^data:([^;]+);/)
  if (match) {
    const mime = match[1]
    if (mime.includes('jpeg')) return '.jpg'
    if (mime.includes('png')) return '.png'
    if (mime.includes('webp')) return '.webp'
    if (mime.includes('gif')) return '.gif'
    if (mime.includes('pdf')) return '.pdf'
    if (mime.includes('dwg') || mime.includes('acad')) return '.dwg'
  }
  return '.bin'
}

================
File: src/services/ocr/bankCard.ts
================
/**
 * 银行卡 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBankCardOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduBankCard(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度银行卡OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度银行卡OCR')
  }
}

export async function recognizeBankCard(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，银行卡识别需要在线模式' }
    return await baiduBankCardOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '银行卡识别仅支持百度在线模式' }
}

================
File: src/services/ocr/bankReceipt.ts
================
/**
 * 银行回单 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBankReceiptOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduBankReceipt(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度银行回单OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度银行回单OCR')
  }
}

export async function recognizeBankReceipt(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，银行回单识别需要在线模式' }
    return await baiduBankReceiptOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '银行回单识别仅支持百度在线模式' }
}

================
File: src/services/ocr/bankStatement.ts
================
/**
 * 银行单据 OCR 识别（高级版）
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBankStatementOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduBankStatement(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度银行单据OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度银行单据OCR')
  }
}

export async function recognizeBankStatement(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，银行单据识别需要在线模式' }
    return await baiduBankStatementOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '银行单据识别仅支持百度在线模式' }
}

================
File: src/services/ocr/businessLicense.ts
================
/**
 * 营业执照 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduBusinessLicenseOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduBusinessLicense(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度营业执照OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度营业执照OCR')
  }
}

export async function recognizeBusinessLicense(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，营业执照识别需要在线模式' }
    return await baiduBusinessLicenseOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '营业执照识别仅支持百度在线模式' }
}

================
File: src/services/ocr/companyQuery.ts
================
/**
 * 企业工商信息查询
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork } from './utils'

async function baiduCompanyQuery(companyName: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduCompanyQuery(companyName, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度企业查询 IPC 调用失败:', error)
    return { success: false, error: `企业查询请求失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

export async function queryCompanyInfo(companyName: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，企业查询需要在线模式' }
    return await baiduCompanyQuery(companyName, currentConfig)
  }
  return { success: false, error: '企业查询仅支持百度在线模式' }
}

================
File: src/services/ocr/config.ts
================
/**
 * OCR 配置管理
 * 包含本地存储、内置配置加载、currentConfig 管理
 */
import type { OCRConfig } from './types'
import { getAPI } from '../api-adapter'

const STORAGE_KEY = 'workbuddy_ocr_config'

function saveConfigToStorage(config: OCRConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('保存OCR配置到localStorage失败:', error)
  }
}

function loadConfigFromStorage(): OCRConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      return JSON.parse(saved) as OCRConfig
    }
  } catch (error) {
    console.error('从localStorage加载OCR配置失败:', error)
  }
  return null
}

export const defaultOCRConfig: OCRConfig = {
  provider: 'offline',
  enabled: true
}

let builtInOCRConfig: OCRConfig = {
  provider: 'baidu',
  enabled: true,
  baidu: { apiKey: '', secretKey: '' }
}

let configLoaded = false

export async function loadBuiltInConfig(): Promise<OCRConfig | null> {
  try {
    const response = await fetch('./ocr-config.json')
    if (response.ok) {
      const config = await response.json()
      return config as OCRConfig
    }
  } catch (err) { console.warn('[OcrConfig] 加载内置配置失败:', err) }
  return null
}

export async function initializeBuiltInConfig(): Promise<void> {
  if (configLoaded) return
  const builtIn = await loadBuiltInConfig()
  if (builtIn) {
    builtInOCRConfig = builtIn
    if (!currentConfig.baidu?.apiKey && builtIn.baidu?.apiKey) {
      currentConfig = { ...builtIn }
    }
  }
  configLoaded = true
}

const storedConfig = loadConfigFromStorage()
export const initialConfig: OCRConfig = storedConfig || builtInOCRConfig

export let currentConfig: OCRConfig = { ...initialConfig }

export function setOCRConfig(config: Partial<OCRConfig>) {
  currentConfig = { ...currentConfig, ...config }
}

export function saveOCRConfig(config: OCRConfig) {
  currentConfig = config
  saveConfigToStorage(config)
  getAPI().then(api => api.ocrClearTokenCache()).catch(() => {})
}

export function getOCRConfig(): OCRConfig {
  return currentConfig
}

================
File: src/services/ocr/generalReceipt.ts
================
/**
 * 通用票据 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduGeneralReceiptOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduGeneralReceipt(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度通用票据OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度通用票据OCR')
  }
}

export async function recognizeGeneralReceipt(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，通用票据识别需要在线模式' }
    return await baiduGeneralReceiptOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '通用票据识别仅支持百度在线模式' }
}

================
File: src/services/ocr/idCard.ts
================
/**
 * 身份证 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduIdCard(imageBase64, {
      apiKey: config.baidu.apiKey,
      secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度OCR')
  }
}

async function offlineOCR(imageBase64: string): Promise<OCRResult> {
  try {
    const response = await fetch(imageBase64)
    const blob = await response.blob()
    const imageUrl = URL.createObjectURL(blob)
    try {
      const Tesseract = await import('tesseract.js')
      const result = await Tesseract.recognize(imageUrl, 'chi_sim+eng')
      const text = result.data.text.replace(/\s+/g, '').trim()
      const patterns = [
        /(\d{17}[\dXx])/,
        /\D(\d{17}[\dXx])\D/,
        /([1-6]\d{16}[\dXx])/,
      ]
      let idCard: string | null = null
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match) { idCard = match[1].toUpperCase(); break }
      }
      if (!idCard) {
        return { success: false, error: '未能识别到身份证号' }
      }
      const parsed = parseIdCard(idCard)
      return { success: true, text, idCard: { number: idCard, ...parsed } }
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  } catch (error: unknown) {
    console.error('[离线OCR] 识别失败:', error)
    return { success: false, error: `离线OCR失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

function parseIdCard(idCard: string): { gender?: string; birthDate?: string } {
  const match = idCard.match(/^(\d{6})(\d{8})(\d{3}[\dXx])$/)
  if (!match) return {}
  const birthStr = match[2]
  const genderCode = parseInt(match[3][0])
  return {
    gender: genderCode % 2 === 1 ? '男' : '女',
    birthDate: `${birthStr.slice(0, 4)}-${birthStr.slice(4, 6)}-${birthStr.slice(6, 8)}`
  }
}

export async function recognizeIdCard(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return offlineOCR(imageBase64)
    const result = await baiduOCR(imageBase64, currentConfig)
    if (!result.success) {
      const fallbackResult = await offlineOCR(imageBase64)
      if (fallbackResult.success) return { ...fallbackResult, error: '百度OCR失败，已使用本地识别: ' + result.error }
      return result
    }
    return result
  }
  return offlineOCR(imageBase64)
}

================
File: src/services/ocr/index.ts
================
/**
 * OCR 服务入口 — Barrel Export
 * 所有外部 import 路径 '@/services/ocr' 或 '../services/ocr' 保持不变
 */
import type { OCRProvider } from './types'
import { currentConfig } from './config'
import { checkNetwork } from './utils'

// ─── 类型 re-export ───
export type { OCRProvider, OCRConfig, OCRResult } from './types'

// ─── 配置管理 re-export ───
export {
  defaultOCRConfig,
  initialConfig,
  initializeBuiltInConfig,
  setOCRConfig,
  saveOCRConfig,
  getOCRConfig,
} from './config'

// ─── 识别函数 re-export ───
export { recognizeIdCard } from './idCard'
export { recognizeInvoice } from './invoice'
export { recognizeBankCard } from './bankCard'
export { recognizeBusinessLicense } from './businessLicense'
export { recognizeBankReceipt } from './bankReceipt'
export { recognizePermit } from './permit'
export { recognizeBankStatement } from './bankStatement'
export { recognizeGeneralReceipt } from './generalReceipt'
export { queryCompanyInfo } from './companyQuery'

/**
 * 检查OCR配置状态
 */
export async function checkOCRStatus(): Promise<{ online: boolean; provider: OCRProvider; configured: boolean }> {
  const isOnline = await checkNetwork()
  const configured = currentConfig.provider === 'offline' ||
    !!(currentConfig.baidu?.apiKey && currentConfig.baidu?.secretKey)
  return { online: isOnline, provider: currentConfig.provider, configured }
}

/**
 * 获取服务商名称
 */
export function getProviderName(provider: OCRProvider): string {
  switch (provider) {
    case 'baidu': return '百度OCR'
    case 'offline': return '本地离线'
    default: return provider
  }
}

================
File: src/services/ocr/invoice.ts
================
/**
 * 发票 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduInvoiceOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduInvoice(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度发票OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度发票OCR')
  }
}

export async function recognizeInvoice(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，发票识别需要在线模式' }
    return await baiduInvoiceOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '发票识别仅支持百度在线模式' }
}

================
File: src/services/ocr/permit.ts
================
/**
 * 开户许可证 OCR 识别
 */
import type { OCRResult } from './types'
import { currentConfig } from './config'
import { getAPI } from '../api-adapter'
import { checkNetwork, baiduOcrError } from './utils'

async function baiduPermitOCR(imageBase64: string, config: { baidu?: { apiKey: string; secretKey: string } }): Promise<OCRResult> {
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { success: false, error: '百度OCR未配置API Key' }
  }
  try {
    const result = await (await getAPI()).ocrBaiduPermit(imageBase64, {
      apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey
    })
    return result as OCRResult
  } catch (error: unknown) {
    console.error('[渲染进程] 百度开户许可证OCR IPC 调用失败:', error)
    return baiduOcrError(error, '百度开户许可证OCR')
  }
}

export async function recognizePermit(imageBase64: string): Promise<OCRResult> {
  const { provider, enabled } = currentConfig
  if (!enabled) return { success: false, error: 'OCR功能已禁用' }
  if (provider === 'baidu' && currentConfig.baidu?.apiKey) {
    const isOnline = await checkNetwork()
    if (!isOnline) return { success: false, error: '网络不可用，开户许可证识别需要在线模式' }
    return await baiduPermitOCR(imageBase64, currentConfig)
  }
  return { success: false, error: '开户许可证识别仅支持百度在线模式' }
}

================
File: src/services/ocr/types.ts
================
/**
 * OCR 类型定义
 */

export type OCRProvider = 'baidu' | 'offline'

export interface OCRConfig {
  provider: OCRProvider
  enabled: boolean
  baidu?: {
    apiKey: string
    secretKey: string
  }
}

export interface OCRResult {
  success: boolean
  text?: string
  idCard?: {
    number: string
    name?: string
    gender?: string
    ethnicity?: string
    birthDate?: string
    address?: string
    issueAuthority?: string
    validDate?: string
  }
  invoice?: {
    invoiceNum: string
    invoiceCode: string
    invoiceDate: string
    invoiceType: string
    totalAmount: number
    amountWithoutTax: number
    totalTax: number
    taxRate: number
    sellerName: string
    purchaserName: string
    checkCode: string
    itemName: string
    remarks: string
  }
  bankCard?: {
    cardNumber: string
    bankName: string
    cardType: string
    validDate: string
  }
  businessLicense?: {
    creditCode: string
    companyName: string
    legalPerson: string
    registeredCapital: string
    address: string
    businessScope: string
    establishDate: string
    expireDate: string
  }
  bankReceipt?: {
    transactionDate: string
    transactionTime: string
    amount: number
    payerName: string
    payerAccount: string
    payeeName: string
    payeeAccount: string
    transactionNo: string
    bankName: string
    remarks: string
  }
  permit?: {
    companyCode: string
    companyName: string
    accountNumber: string
    bankName: string
    permitNumber: string
  }
  bankStatement?: {
    transactions: Array<{
      date: string
      time: string
      amount: number
      balance: number
      type: string
      counterparty: string
      remark: string
    }>
    accountNumber: string
    bankName: string
  }
  generalReceipt?: {
    text: string
    amount: number
    date: string
  }
  error?: string
}

================
File: src/services/ocr/utils.ts
================
/**
 * OCR 通用工具函数
 */
import type { OCRConfig } from './types'

export async function checkNetwork(): Promise<boolean> {
  return navigator.onLine
}

/**
 * 校验百度 API 凭据并调用指定端点
 */
export async function callBaiduOcrEndpoint(
  apiMethod: string,
  params: { imageBase64: string; config: OCRConfig; companyName?: string },
): Promise<{ apiKey: string; secretKey: string } | { error: string }> {
  const { config } = params
  if (!config.baidu?.apiKey || !config.baidu?.secretKey) {
    return { error: '百度OCR未配置API Key' }
  }
  return { apiKey: config.baidu.apiKey, secretKey: config.baidu.secretKey }
}

/**
 * 构造百度 OCR 通用错误结果
 */
export function baiduOcrError(error: unknown, context: string): { success: false; error: string } {
  return {
    success: false,
    error: `百度OCR请求失败: ${error instanceof Error ? error.message : '未知错误'}`,
  }
}

================
File: src/services/tauri-bridge.ts
================
/**
 * API 桥接层
 *
 * 通过 HTTP 调用 C# 后端 API
 * 保持与 Electron/Tauri 版本兼容的接口
 */

import { apiClient, setToken } from './api-client';
import type {
  Project, Member, Worker, UserInfo, Department, Material, Expense,
  Partner, Region, Supervisor, IncomeContract, ExpenseContract, AgreementContract,
  ContractStats, DashboardStats, Settlement,
  Template, TemplateVariable, ContractTemplate,
  InventoryItem, InventoryTransaction,
  Invoice, InvoiceStatus,
  PaymentRecord,
  AttendanceRecord,
  WageRecord, WageStats, SalaryHistoryEntry,
  AuditLogEntry, SnapshotInfo,
  CostLedgerEntry, CostLedgerBatch, CostLedgerMatchRule, CostLedgerSummary, CostLedgerCategory,
  WorkerTeam, ProjectWorker, ProjectMember, Drawing,
  SqliteStatus,
  BankReceiptMatch,
  StoredAuth,
} from '../types/electron';

// ============ 导出的 API ============

export const tauriAPI = {
  // ────────── 系统 ──────────
  getAppVersion: () => '1.0.0',
  getDataPath: () => apiClient.get<string>('/api/config/data-path'),
  getUploadsPath: () => apiClient.get<string>('/api/config/uploads-path'),
  openDevTools: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'devtools' }));
  },

  // ────────── 窗口控制（通过 WebView2 消息） ──────────
  minimizeWindow: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'minimize' }));
  },
  toggleMaximize: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'maximize' }));
  },
  closeWindow: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'close' }));
  },
  isMaximized: () => Promise.resolve({ success: true, data: false }),
  setFullScreen: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'fullscreen' }));
  },
  isFullScreen: () => Promise.resolve({ success: true, data: false }),
  resizeForLogin: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'resize', width: 300, height: 400 }));
  },
  resizeForApp: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'resize', width: 1400, height: 900 }));
  },
  startDrag: () => {
    if ((window as any).chrome?.webview)
      (window as any).chrome.webview.postMessage(JSON.stringify({ action: 'startDrag' }));
  },

  // ────────── 认证 ──────────
  login: async (username: string, password: string) => {
    const result = await apiClient.post<StoredAuth & { token: string }>('/api/auth/login', { username, password });
    if (result.success && result.data?.token) {
      setToken(result.data.token);
    }
    return result;
  },
  authLogin: (username: string, password: string) =>
    apiClient.post<StoredAuth & { token: string }>('/api/auth/login', { username, password }),
  setSession: () => {},
  clearSession: () => {},

  // ────────── 用户管理 ──────────
  getAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  authGetAllUsers: () => apiClient.get<UserInfo[]>('/api/users'),
  getUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  authGetCurrentUser: (id: string) => apiClient.get<UserInfo>(`/api/users/${id}`),
  createUser: (user: { username: string; password: string; displayName: string; roleId: string }) => apiClient.post<{ id: string }>('/api/users', user),
  authCreateUser: (user: { username: string; password: string; displayName: string; roleId: string }) => apiClient.post<{ id: string }>('/api/users', user),
  updateUser: (user: { id: string; displayName?: string; roleId?: string; status?: string; password?: string }) => apiClient.put<void>('/api/users', user),
  authUpdateUser: (user: { id: string; displayName?: string; roleId?: string; status?: string; password?: string }) => apiClient.put<void>('/api/users', user),
  deleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),
  authDeleteUser: (id: string) => apiClient.del<void>(`/api/users/${id}`),

  // ────────── 项目授权管理 (admin only, P0-4 闭环 UI) ──────────
  // 4 个端点: GET list / GET by-user / POST 授权 (幂等) / DELETE 撤销
  getProjectAuthorizations: () =>
    apiClient.get<{ projectId: number; userId: string; grantedAt: string }[]>('/api/admin/project-authorizations'),
  getProjectAuthorizationsByUser: (userId: string) =>
    apiClient.get<{ projectId: number; userId: string; grantedAt: string }[]>(`/api/admin/project-authorizations/by-user/${userId}`),
  grantProjectAuthorization: (projectId: number, userId: string) =>
    apiClient.post<{ granted: boolean }>('/api/admin/project-authorizations', { projectId, userId }),
  revokeProjectAuthorization: (projectId: number, userId: string) =>
    apiClient.del<void>(`/api/admin/project-authorizations/${projectId}/${userId}`),


  // ────────── 用户偏好 (v0.75.0 PII Mask toggle 多设备同步) ──────────
  getUserPreferences: () => apiClient.get<Record<string, string>>('/api/user-preferences'),
  getUserPreference: (key: string) =>
    apiClient.get<{ key: string; value: string }>(`/api/user-preferences/${key}`),
  putUserPreference: (key: string, value: string) =>
    apiClient.put<{ updated: number }>(`/api/user-preferences/${key}`, { value }),
  putUserPreferences: (prefs: Record<string, string>) =>
    apiClient.put<{ updated: number }>('/api/user-preferences', prefs),

  // ────────── 仪表盘 ──────────
  getDashboardStats: () => apiClient.get<DashboardStats>('/api/dashboard/stats'),

  // ────────── 项目 ──────────
  getProjects: () => apiClient.get<Project[]>('/api/projects'),
  getProject: (id: number) => apiClient.get<Project>(`/api/projects/${id}`),
  createProject: (project: Partial<Project>) => apiClient.post<{ id: number }>('/api/projects', project),
  updateProject: (project: Project) => apiClient.put<void>(`/api/projects/${project.id}`, project),
  deleteProject: (id: number) => apiClient.del<void>(`/api/projects/${id}`),

  // ────────── 成员 ──────────
  getMembers: () => apiClient.get<Member[]>('/api/members'),
  createMember: (member: Partial<Member>) => apiClient.post<{ id: number }>('/api/members', member),
  updateMember: (member: Member) => apiClient.put<void>('/api/members', member),
  deleteMember: (id: number) => apiClient.del<void>(`/api/members/${id}`),

  // ────────── 工人 ──────────
  getWorkers: () => apiClient.get<Worker[]>('/api/workers'),
  getWorkerStats: () => apiClient.get<{ projectCount: number; totalEarnings: number; projectBreakdown: { projectId: number; projectName: string; total: number }[] }>('/api/workers/stats'),
  getProjectWorkers: (projectId?: number) =>
    apiClient.get<ProjectWorker[]>('/api/project-workers', { projectId }),
  createWorker: (worker: Partial<Worker>) => apiClient.post<{ id: number }>('/api/workers', worker),
  updateWorker: (worker: Worker) => apiClient.put<Worker>('/api/workers', worker),
  deleteWorker: (id: number) => apiClient.del<void>(`/api/workers/${id}`),
  createProjectWorker: (pw: Partial<ProjectWorker>) => apiClient.post<{ id: number }>('/api/project-workers', pw),
  batchCreateProjectWorkers: (pws: Partial<ProjectWorker>[]) =>
    apiClient.post<{ ids: number[] }>('/api/project-workers/batch', pws),
  updateProjectWorker: (pw: ProjectWorker) => apiClient.put<ProjectWorker>('/api/project-workers', pw),
  deleteProjectWorker: (id: number) => apiClient.del<void>(`/api/project-workers/${id}`),

  // ────────── 合作伙伴 ──────────
  getPartners: (projectId?: number) =>
    apiClient.get<Partner[]>('/api/partners', { projectId }),
  createPartner: (partner: Partial<Partner>) => apiClient.post<{ id: number }>('/api/partners', partner),
  updatePartner: (partner: Partner) => apiClient.put<void>('/api/partners', partner),
  deletePartner: (id: number) => apiClient.del<void>(`/api/partners/${id}`),

  // ────────── 发票 ──────────
  getInvoices: (projectId?: number) =>
    apiClient.get<Invoice[]>('/api/invoices', { projectId }),
  createInvoice: (invoice: Partial<Invoice>) => apiClient.post<{ id: number }>('/api/invoices', invoice),
  updateInvoice: (invoice: Invoice) => apiClient.put<void>('/api/invoices', invoice),
  deleteInvoice: (id: number) => apiClient.del<void>(`/api/invoices/${id}`),
  updateInvoiceStatus: (id: number, status: InvoiceStatus) =>
    apiClient.put<void>(`/api/invoices/${id}/status`, { status }),

  // ────────── 合同 ──────────
  getIncomeContracts: (projectId?: number) =>
    apiClient.get<IncomeContract[]>('/api/contracts/income', { projectId }),
  getExpenseContracts: (projectId?: number) =>
    apiClient.get<ExpenseContract[]>('/api/contracts/expense', { projectId }),
  getAgreementContracts: (projectId?: number) =>
    apiClient.get<AgreementContract[]>('/api/contracts/agreement', { projectId }),
  getContracts: (projectId?: number) =>
    apiClient.get<IncomeContract[]>('/api/contracts/income', { projectId }),
  createIncomeContract: (contract: Partial<IncomeContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/income', contract),
  createExpenseContract: (contract: Partial<ExpenseContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/expense', contract),
  createContract: (contract: Partial<IncomeContract>) =>
    apiClient.post<{ id: number }>('/api/contracts/income', contract),
  updateIncomeContract: (contract: IncomeContract) =>
    apiClient.put<void>('/api/contracts/income', contract),
  updateExpenseContract: (contract: ExpenseContract) =>
    apiClient.put<void>('/api/contracts/expense', contract),
  deleteIncomeContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  deleteExpenseContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/expense/${id}`),
  deleteContract: (id: number) =>
    apiClient.del<void>(`/api/contracts/income/${id}`),
  getContractStats: () => apiClient.get<ContractStats>('/api/contracts/stats'),

  // ────────── 结算 ──────────
  getSettlements: (projectId?: number) =>
    apiClient.get<Settlement[]>('/api/settlements', { projectId }),
  createSettlement: (settlement: Partial<Settlement>) =>
    apiClient.post<{ id: number }>('/api/settlements', settlement),
  updateSettlement: (settlement: Settlement) =>
    apiClient.put<void>('/api/settlements', settlement),
  deleteSettlement: (id: number) =>
    apiClient.del<void>(`/api/settlements/${id}`),
  processSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/process`),
  unarchiveSettlement: (id: number) =>
    apiClient.put<void>(`/api/settlements/${id}/unarchive`),

  // ────────── 成本台账 ──────────
  getCostLedger: (projectId?: number) =>
    apiClient.get<CostLedgerEntry[]>('/api/cost-ledger', { projectId }),
  createCostLedger: (entry: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<CostLedgerEntry>('/api/cost-ledger', entry),
  updateCostLedger: (entry: CostLedgerEntry) =>
    apiClient.put<void>('/api/cost-ledger', entry),
  deleteCostLedger: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/${id}`),
  getCostLedgerSummary: (projectId?: number) =>
    apiClient.get<CostLedgerSummary>('/api/cost-ledger/summary', { projectId }),
  getCostLedgerCategories: () =>
    apiClient.get<CostLedgerCategory[]>('/api/cost-ledger/categories'),
  createCostLedgerCategory: (category: { label: string; direction: string; color?: string; level1?: string }) =>
    apiClient.post<CostLedgerCategory>('/api/cost-ledger/categories', category),
  updateCostLedgerCategory: (category: CostLedgerCategory) =>
    apiClient.put<void>('/api/cost-ledger/categories', category),
  deleteCostLedgerCategory: (id: number) =>
    apiClient.del<void>(`/api/cost-ledger/categories/${id}`),
  resetCostLedgerCategories: () =>
    apiClient.post<void>('/api/cost-ledger/categories/reset'),
  batchCreateCostLedger: (entries: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>[]) =>
    apiClient.post<{ count: number }>('/api/cost-ledger/batch', entries),
  getCostLedgerBatches: (projectId: number) =>
    apiClient.get<CostLedgerBatch[]>(`/api/cost-ledger/batches`, { projectId }),
  createCostLedgerBatch: (batch: { projectId: number; name: string }) =>
    apiClient.post<CostLedgerBatch>('/api/cost-ledger/batches', batch),
  copyCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.post<CostLedgerBatch>(`/api/cost-ledger/batches/${batchId}/copy`, { newName }),
  renameCostLedgerBatch: (batchId: number, newName: string) =>
    apiClient.put<void>(`/api/cost-ledger/batches/${batchId}`, { newName }),
  deleteCostLedgerBatch: (batchId: number) =>
    apiClient.del<void>(`/api/cost-ledger/batches/${batchId}`),
  getCostLedgerMatchRules: () =>
    apiClient.get<CostLedgerMatchRule[]>('/api/cost-ledger/match-rules'),
  saveCostLedgerMatchRule: (rule: CostLedgerMatchRule) =>
    apiClient.post<{ count: number }>('/api/cost-ledger/match-rules', rule),

  // ────────── 考勤 ──────────
  getAttendances: (projectId?: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>('/api/attendances', { projectId, yearMonth }),
  getAttendancesByMember: (memberId: number, yearMonth?: string) =>
    apiClient.get<AttendanceRecord[]>(`/api/attendances/member/${memberId}`, { yearMonth }),
  createAttendance: (record: Partial<AttendanceRecord>) =>
    apiClient.post<{ id: number }>('/api/attendances', record),
  updateAttendance: (record: AttendanceRecord) =>
    apiClient.put<void>('/api/attendances', record),
  deleteAttendance: (id: number) =>
    apiClient.del<void>(`/api/attendances/${id}`),
  batchDeleteAttendances: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/attendances/batch-delete', ids),
  batchCreateAttendances: (records: Partial<AttendanceRecord>[]) =>
    apiClient.post<{ created: number; updated: number }>('/api/attendances/batch-create', records),
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate', { projectId, yearMonth, memberIds }),
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) =>
    apiClient.post<{ count: number }>('/api/attendances/generate-v2', { projectId, yearMonth, projectWorkerIds }),
  batchImportAttendances: (projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) =>
    apiClient.post<{ created: number; updated: number }>('/api/attendances/batch-import', { projectId, yearMonth, records }),

  // ────────── 工资 ──────────
  getWages: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageRecord[]>('/api/wages', { projectId, yearMonth }),
  generateForProject: (projectId: number, yearMonth: string) =>
    apiClient.post<{ newCount: number; archivedSkipped: number }>('/api/wages/generate', { projectId, yearMonth }),
  createWage: (record: Partial<WageRecord>) => apiClient.post<{ id: number }>('/api/wages', record),
  updateWage: (record: WageRecord) => apiClient.put<void>('/api/wages', record),
  deleteWage: (id: number) => apiClient.del<void>(`/api/wages/${id}`),
  batchDeleteWages: (ids: number[]) =>
    apiClient.post<{ deleted: number }>('/api/wages/batch-delete', ids),
  batchClearPayments: (ids: number[]) =>
    apiClient.post<{ cleared: number }>('/api/wages/batch-clear-payments', ids),
  archiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  getWageStats: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageStats>('/api/wages/stats', { projectId, yearMonth }),
  matchBankReceiptItems: (projectId?: number, yearMonth?: string, items?: BankReceiptMatch[]) =>
    apiClient.post<{ matches: BankReceiptMatch[] }>('/api/wages/match-receipts', { projectId, yearMonth, items }),
  batchConfirmMatches: (matches: BankReceiptMatch[], yearMonth?: string) =>
    apiClient.post<{ updated: number }>('/api/wages/confirm-matches', { matches, yearMonth }),
  getWagePaymentRecords: (projectId?: number, yearMonth?: string) =>
    apiClient.get<WageRecord[]>('/api/wages/payment-records', { projectId, yearMonth }),
  getWageOverdueStats: (projectId?: number) =>
    apiClient.get<{ totalOverdueAmount: number; overdueWorkerCount: number; overdueProjectCount: number; maxOverdueDays: number }>('/api/wages/overdue-stats', { projectId }),
  getWageOverdueList: (projectId?: number) =>
    apiClient.get<{ id: number; projectId: number; memberId?: number; projectWorkerId?: number; yearMonth: string; actualWage: number; paidAmount?: number; workerName?: string; workerPhone?: string; projectName?: string; overdueDays: number; overdueAmount: number; paymentStatus: string; createdAt: string; updatedAt: string }[]>('/api/wages/overdue-list', { projectId }),
  batchArchiveWages: (ids: number[]) =>
    apiClient.post<{ archived: number }>('/api/wages/archive', ids),
  batchSaveWages: (records: WageRecord[]) =>
    apiClient.post<{ updated: number }>('/api/wages/batch-save', records),

  // ────────── 薪资历史 ──────────
  getWageHistory: (projectWorkerId: number) =>
    apiClient.get<{ id: number; projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string; createdAt: string }[]>(`/api/wage-history/${projectWorkerId}`),
  getEffectiveWage: (projectWorkerId: number, yearMonth: string) =>
    apiClient.get<{ dailyWage: number; yearMonth: string }>(`/api/wage-history/${projectWorkerId}/effective`, { yearMonth }),
  getTeamWages: (projectId: number, teamId: number) =>
    apiClient.get<{ workerCount: number; teamTotal: number; details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[] }>('/api/team-wages', { projectId, teamId }),
  getSalaryHistory: (memberId: number) =>
    apiClient.get<SalaryHistoryEntry[]>(`/api/salary-history/${memberId}`),
  createSalaryHistory: (entry: Partial<SalaryHistoryEntry>) =>
    apiClient.post<SalaryHistoryEntry>('/api/salary-history', entry),
  deleteSalaryHistory: (id: number) =>
    apiClient.del<void>(`/api/salary-history/${id}`),
  getEffectiveSalary: (memberId: number, yearMonth: string) =>
    apiClient.get<{ baseSalary: number; subsidy: number; effectiveDate: string }>(`/api/salary-history/${memberId}/effective`, { yearMonth }),

  // ────────── 审计日志 ──────────
  auditLog: (entry: AuditLogEntry) => {
    const normalized = {
      ...entry,
      resourceId: entry.resourceId != null ? String(entry.resourceId) : undefined,
      details: typeof entry.details === 'object' ? JSON.stringify(entry.details) : entry.details,
    };
    return apiClient.post<void>('/api/audit/logs', normalized);
  },
  auditQuery: (query: { action?: string; level?: string; userId?: string; resource?: string; resourceId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => apiClient.get<{ total: number; page: number; pageSize: number; data: AuditLogEntry[] }>('/api/audit/logs', query),
  queryAuditLogs: (query: { action?: string; level?: string; userId?: string; resource?: string; resourceId?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) => apiClient.get<{ total: number; page: number; pageSize: number; data: AuditLogEntry[] }>('/api/audit/logs', query),
  auditStats: (days?: number) => apiClient.get<{ total: number; byAction: Record<string, number>; byLevel: Record<string, number>; byResource: Record<string, number> }>('/api/audit/stats', { days }),
  auditClear: (daysToKeep: number) =>
    apiClient.post<{ removedCount: number }>('/api/audit/clear', { daysToKeep }),

  // ────────── 角色权限 ──────────
  getRoles: () => apiClient.get<{ id: string; name: string; permissions: string[] }[]>('/api/roles'),
  updateRole: (roleId: string, permissions: string[]) =>
    apiClient.put<void>('/api/roles', { roleId, permissions }),
  resetRole: (roleId: string) =>
    apiClient.post<{ permissions: string[] }>(`/api/roles/${roleId}/reset`),

  // ────────── 部门 ──────────
  getDepartments: () => apiClient.get<Department[]>('/api/departments'),
  createDepartment: (department: { name: string; managerId?: number; positions?: string[] }) =>
    apiClient.post<{ id: number }>('/api/departments', department),
  updateDepartment: (id: number, updates: { name?: string; managerId?: number | null; positions?: string[] }) =>
    apiClient.put<void>('/api/departments', { id, ...updates }),
  deleteDepartment: (id: number) =>
    apiClient.del<void>(`/api/departments/${id}`),

  // ────────── 模板 ──────────
  getTemplates: () => apiClient.get<Template[]>('/api/templates'),
  getTemplateStats: () => apiClient.get<Record<string, number>>('/api/templates/stats'),
  createTemplate: (template: Partial<Template>) =>
    apiClient.post<{ id: number; variables?: TemplateVariable[] }>('/api/templates', template),
  updateTemplate: (template: Template) =>
    apiClient.put<void>('/api/templates', template),
  deleteTemplate: (id: number) =>
    apiClient.del<void>(`/api/templates/${id}`),

  // ────────── 合同模板 ──────────
  getContractTemplates: () => apiClient.get<ContractTemplate[]>('/api/contract-templates'),
  createContractTemplate: (template: Partial<ContractTemplate>) =>
    apiClient.post<{ id: number }>('/api/contract-templates', template),
  updateContractTemplate: (id: number, updates: { name?: string; type?: string; description?: string; filePath?: string; fileName?: string; variables?: TemplateVariable[] }) =>
    apiClient.put<void>('/api/contract-templates', { id, ...updates }),
  deleteContractTemplate: (id: number) =>
    apiClient.del<void>(`/api/contract-templates/${id}`),

  // ────────── 收付款记录 ──────────
  getPaymentRecords: (paymentType?: string, projectId?: number) =>
    apiClient.get<PaymentRecord[]>('/api/payment-records', { paymentType, projectId }),
  createPaymentRecord: (record: Partial<PaymentRecord>) =>
    apiClient.post<{ id: number }>('/api/payment-records', record),
  updatePaymentRecord: (id: number, updates: Partial<PaymentRecord>) =>
    apiClient.put<void>('/api/payment-records', { id, ...updates }),
  deletePaymentRecord: (id: number) =>
    apiClient.del<void>(`/api/payment-records/${id}`),

  // ────────── 快照 ──────────
  getSnapshots: () => apiClient.get<SnapshotInfo[]>('/api/snapshots'),
  getMaxSnapshots: () => apiClient.get<number>('/api/snapshots/max-count'),
  createSnapshot: () => apiClient.post<SnapshotInfo>('/api/snapshots'),
  restoreSnapshot: (id: string) => apiClient.post<void>(`/api/snapshots/${id}/restore`),
  deleteSnapshot: (id: string) => apiClient.del<void>(`/api/snapshots/${id}`),
  setMaxSnapshots: (count: number) => apiClient.put<void>('/api/snapshots/max-count', { count }),
  backupDatabase: () => apiClient.post<{ path: string; size: number }>('/api/backup'),
  restoreDatabase: () => apiClient.post<{ restored: boolean }>('/api/restore'),
  diagnoseDatabase: () => apiClient.post<{ status: string; tables: { name: string; count: number }[] }>('/api/diagnose'),

  // ────────── 区域 ──────────
  getRegions: () => apiClient.get<Region[]>('/api/regions'),
  createRegion: (region: Partial<Region>) => apiClient.post<{ id: number }>('/api/regions', region),
  deleteRegion: (id: number) => apiClient.del<void>(`/api/regions/${id}`),

  // ────────── 监管单位 ──────────
  getSupervisors: () => apiClient.get<Supervisor[]>('/api/supervisors'),
  createSupervisor: (supervisor: Partial<Supervisor>) =>
    apiClient.post<{ id: number }>('/api/supervisors', supervisor),
  updateSupervisor: (id: number, updates: Partial<Supervisor>) =>
    apiClient.put<void>('/api/supervisors', { id, ...updates }),
  deleteSupervisor: (id: number) =>
    apiClient.del<void>(`/api/supervisors/${id}`),

  // ────────── 项目成员 ──────────
  getProjectMembers: (projectId: number) =>
    apiClient.get<(ProjectMember & { member?: Member })[]>(`/api/project-members/${projectId}`),
  addProjectMember: (projectId: number, memberId: number, joinedAt?: string) =>
    apiClient.post<{ id: number }>('/api/project-members', { projectId, memberId, joinedAt }),
  removeProjectMember: (id: number) =>
    apiClient.del<void>(`/api/project-members/${id}`),
  updateProjectMember: (id: number, updates: { leftAt?: string; joinedAt?: string }) =>
    apiClient.put<void>('/api/project-members', { id, ...updates }),

  // ────────── 班组 ──────────
  getWorkerTeams: (projectId?: number) =>
    apiClient.get<WorkerTeam[]>('/api/worker-teams', { projectId }),
  createWorkerTeam: (team: Partial<WorkerTeam>) =>
    apiClient.post<{ id: number }>('/api/worker-teams', team),
  updateWorkerTeam: (id: number, updates: Partial<WorkerTeam>) =>
    apiClient.put<void>('/api/worker-teams', { id, ...updates }),
  deleteWorkerTeam: (id: number) =>
    apiClient.del<void>(`/api/worker-teams/${id}`),

  // ────────── 图纸 ──────────
  getDrawings: (projectId?: number) =>
    apiClient.get<Drawing[]>('/api/drawings', { projectId }),
  uploadDrawing: (drawing: { projectId: number; name: string; category: string; remarks: string; position?: string; fileName: string; fileData: string }) =>
    apiClient.post<{ id: number; filePath: string }>('/api/drawings', drawing),
  updateDrawing: (id: number, updates: Partial<Drawing>) =>
    apiClient.put<void>('/api/drawings', { id, ...updates }),
  deleteDrawing: (id: number) =>
    apiClient.del<void>(`/api/drawings/${id}`),

  // ────────── 费用 ──────────
  getExpenses: (projectId?: number) =>
    apiClient.get<Expense[]>('/api/expenses', { projectId }),
  createExpense: (expense: Partial<Expense>) =>
    apiClient.post<{ id: number }>('/api/expenses', expense),
  updateExpense: (id: number, updates: Partial<Expense>) =>
    apiClient.put<void>('/api/expenses', { id, ...updates }),
  deleteExpense: (id: number) =>
    apiClient.del<void>(`/api/expenses/${id}`),

  // ────────── 库存 ──────────
  getInventoryItems: () => apiClient.get<InventoryItem[]>('/api/inventory'),
  createInventoryItem: (item: Partial<InventoryItem>) =>
    apiClient.post<{ id: number }>('/api/inventory', item),
  updateInventoryItem: (id: number, updates: Partial<InventoryItem>) =>
    apiClient.put<void>('/api/inventory', { id, ...updates }),
  deleteInventoryItem: (id: number) =>
    apiClient.del<void>(`/api/inventory/${id}`),
  getInventoryTransactions: (itemId?: number) =>
    apiClient.get<InventoryTransaction[]>('/api/inventory/transactions', { itemId }),
  createInventoryTransaction: (transaction: Partial<InventoryTransaction>) =>
    apiClient.post<{ id: number }>('/api/inventory/transactions', transaction),

  // ────────── 物料 ──────────
  getMaterials: (projectId?: number) =>
    apiClient.get<Material[]>('/api/materials', { projectId }),
  createMaterial: (material: Partial<Material>) =>
    apiClient.post<{ id: number }>('/api/materials', material),
  updateMaterial: (id: number, updates: Partial<Material>) =>
    apiClient.put<void>('/api/materials', { id, ...updates }),
  deleteMaterial: (id: number) =>
    apiClient.del<void>(`/api/materials/${id}`),

  // ────────── 配置 ──────────
  getConfig: () => apiClient.get<{ dataPath: string; defaultPath: string }>('/api/config'),
  setDataPath: (path: string) => apiClient.put<void>('/api/config/data-path', { path }),
  getGpuAcceleration: () => apiClient.get<boolean>('/api/config/gpu-acceleration'),
  setGpuAcceleration: (enabled: boolean) =>
    apiClient.put<void>('/api/config/gpu-acceleration', { enabled }),

  // ────────── PII Key Rotation (v0.76.0 累计待办 #5) ──────────
  getPiiKeys: () => apiClient.get<{ keys: { id: number; createdAt: string; isActive: boolean }[]; activeKeyId: number; totalKeys: number }>('/api/admin/pii/keys'),
  rotatePiiKey: () => apiClient.post<{ newKeyId: number; message: string }>('/api/admin/pii/rotate', {}),

  // ────────── PII Re-encrypt Worker (v0.78.0) ──────────
  startPiiReencrypt: () => apiClient.post<{ status: 'idle' | 'running' | 'completed' | 'failed'; message: string }>('/api/admin/pii/reencrypt', {}),
  getPiiReencryptStatus: () => apiClient.get<{ status: 'idle' | 'running' | 'completed' | 'failed'; progress: number; total: number; errors: string[] }>('/api/admin/pii/reencrypt/status'),

  // ────────── 数据健康 ──────────
  dataConsistencyCheck: () => apiClient.get<{ consistent: boolean; discrepancies: { table: string; json: number; sqlite: number }[] }>('/api/health/consistency'),
  consistencyCheck: () => apiClient.get<{ consistent: boolean; discrepancies: { table: string; json: number; sqlite: number }[] }>('/api/health/consistency'),
  dataIntegrityCheck: () => apiClient.get<{ status: string; message: string }>('/api/health/integrity'),
  integrityCheck: () => apiClient.get<{ status: string; message: string }>('/api/health/integrity'),
  dataExportJson: () => apiClient.post<{ path: string }>('/api/health/export-json'),
  exportJson: () => apiClient.post<{ path: string }>('/api/health/export-json'),
  dataReconcile: () => apiClient.post<{ reconciled: boolean; details: string }>('/api/health/reconcile'),
  reconcile: () => apiClient.post<{ reconciled: boolean; details: string }>('/api/health/reconcile'),

  // ────────── SQLite 设置 ──────────
  sqliteStatus: () => apiClient.get<SqliteStatus>('/api/sqlite/status'),
  getSqliteStatus: () => apiClient.get<SqliteStatus>('/api/sqlite/status'),
  sqliteEnable: () => apiClient.post<void>('/api/sqlite/enable'),
  enableSqlite: () => apiClient.post<void>('/api/sqlite/enable'),
  sqliteMigrate: () => apiClient.post<void>('/api/sqlite/migrate'),
  migrateToSqlite: () => apiClient.post<void>('/api/sqlite/migrate'),
  sqliteGetReadMode: () => apiClient.get<string>('/api/sqlite/read-mode'),
  getSqliteReadMode: () => apiClient.get<string>('/api/sqlite/read-mode'),
  sqliteSetReadMode: (mode: string) =>
    apiClient.put<void>('/api/sqlite/read-mode', { mode }),
  setSqliteReadMode: (mode: string) =>
    apiClient.put<void>('/api/sqlite/read-mode', { mode }),

  // ────────── OCR ──────────
  ocrBaiduIdCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; idCard?: { number: string; name?: string; gender?: string; ethnicity?: string; birthDate?: string; address?: string; issueAuthority?: string; validDate?: string } }>('/api/ocr/id-card', { imageBase64, config }),
  ocrBaiduInvoice: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; invoice?: { invoiceNum: string; invoiceCode: string; invoiceDate: string; invoiceType: string; totalAmount: number; amountWithoutTax: number; totalTax: number; taxRate: number; sellerName: string; purchaserName: string; checkCode: string; itemName: string; remarks: string } }>('/api/ocr/invoice', { imageBase64, config }),
  ocrBaiduBankCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankCard?: { cardNumber: string; bankName: string; cardType: string; validDate: string } }>('/api/ocr/bank-card', { imageBase64, config }),
  ocrBaiduBusinessLicense: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string } }>('/api/ocr/business-license', { imageBase64, config }),
  ocrBaiduBankReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankReceipt?: { transactionDate: string; transactionTime: string; amount: number; payerName: string; payerAccount: string; payeeName: string; payeeAccount: string; transactionNo: string; bankName: string; remarks: string } }>('/api/ocr/bank-receipt', { imageBase64, config }),
  ocrBaiduPermit: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; permit?: { companyCode: string; companyName: string; accountNumber: string; bankName: string; permitNumber: string } }>('/api/ocr/permit', { imageBase64, config }),
  ocrBaiduBankStatement: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; bankStatement?: { transactions: Array<{ date: string; time: string; amount: number; balance: number; type: string; counterparty: string; remark: string }>; accountNumber: string; bankName: string } }>('/api/ocr/bank-statement', { imageBase64, config }),
  ocrBaiduGeneralReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; generalReceipt?: { text: string; amount: number; date: string } }>('/api/ocr/general-receipt', { imageBase64, config }),
  ocrBaiduCompanyQuery: (companyName: string, config: { apiKey: string; secretKey: string }) =>
    apiClient.post<{ text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string } }>('/api/ocr/company-query', { companyName, config }),
  ocrCheckNetwork: () => apiClient.get<boolean>('/api/ocr/check-network'),
  ocrClearTokenCache: () => apiClient.post<boolean>('/api/ocr/clear-token-cache'),
  ocrGetStats: () => apiClient.get<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string }>('/api/ocr/stats'),

  // ────────── 文件操作 ──────────
  saveFile: (options: { category: string; subCategory: string; fileData: string; fileName: string; projectName?: string | null }) => apiClient.post<{ fileName: string }>('/api/files/save', options),
  readFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.get<{ dataUrl: string; mimeType: string }>('/api/files/read', options),
  deleteFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.post<void>('/api/files/delete', options),
  openFileExternal: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) => apiClient.post<void>('/api/files/open-external', options),

  // ────────── 合同文件 ──────────
  readContractFile: (fileName: string, subCategory: string, projectName?: string | null) =>
    apiClient.get<{ dataUrl: string; mimeType: string }>('/api/contracts/read-file', { fileName, subCategory, projectName }),
  saveContractFile: (options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) =>
    apiClient.post<{ fileName: string }>('/api/contracts/save-file', options),
};

export default tauriAPI;

================
File: src/store/statusStore.ts
================
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

================
File: src/store/toastStore.ts
================
import { create } from 'zustand'
import { ToastItem } from '@/components/ui/Toast/ToastProvider'

interface ToastStore {
  toasts: ToastItem[]
  showToast: (message: string, type?: ToastItem['type'], duration?: number) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  warning: (message: string) => void
  removeToast: (id: number) => void
}

let idCounter = 0
const timeoutIds = new Map<number, ReturnType<typeof setTimeout>>()


export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  removeToast: (id: number) => {
    const tid = timeoutIds.get(id)
    if (tid) { clearTimeout(tid); timeoutIds.delete(id) }
    set(state => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }))
  },

  showToast: (message: string, type: ToastItem['type'] = 'info', duration: number = 3000) => {
    const id = ++idCounter
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }))
    const timeoutId = setTimeout(() => {
      get().removeToast(id)
    }, duration)
    timeoutIds.set(id, timeoutId)
  },

  success: (message: string) => get().showToast(message, 'success'),
  error: (message: string) => get().showToast(message, 'error', 5000),
  info: (message: string) => get().showToast(message, 'info'),
  warning: (message: string) => get().showToast(message, 'warning', 4000),
}))

================
File: src/test-setup.ts
================
/// <reference types="vitest" />
/**
 * Vitest 全局 setup 文件
 * - 扩展 expect 匹配器（@testing-library/jest-dom）
 * - 模拟 Electron API（渲染进程测试依赖）
 */

// 直接导入并扩展 jest-dom 匹配器（避免 vitest.js 的导入问题）
import * as jestDomMatchers from '@testing-library/jest-dom/matchers'

// 使用全局 expect（globals: true）扩展匹配器
expect.extend(jestDomMatchers)

// 模拟 window.electronAPI（渲染进程测试需要）
const mockElectronAPI = {
  // 数据库 CRUD
  db: {
    projects: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    members: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    contracts: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    invoices: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    wages: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    settlements: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    inventory: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    costLedger: { getAll: vi.fn(), getById: vi.fn(), update: vi.fn(), delete: vi.fn() },
    partners: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    roles: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    users: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    attendance: { getAll: vi.fn(), getById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  // 认证
  login: vi.fn(),
  setSession: vi.fn().mockResolvedValue({ success: true }),
  clearSession: vi.fn().mockResolvedValue({ success: true }),
  // 文件操作
  saveContractFile: vi.fn(),
  deleteContractFile: vi.fn(),
  resolvePreviewFileUrl: vi.fn(),
  // OCR
  ocrIdCard: vi.fn(),
  getOcrConfig: vi.fn(),
  // 审计
  audit: {
    log: vi.fn(),
    getLogs: vi.fn(),
  },
  // 导入导出
  exportData: vi.fn(),
  importData: vi.fn(),
  // 配置
  getConfig: vi.fn(),
  setConfig: vi.fn(),
  // 数据路径
  setDataPath: vi.fn(),
  getDataPath: vi.fn(),
  // 窗口控制
  minimizeWindow: vi.fn(),
  maximizeWindow: vi.fn(),
  closeWindow: vi.fn(),
  // 工资统计
  getWageStats: vi.fn(),
  getWageOverdueStats: vi.fn().mockResolvedValue({ success: true, data: null }),
  getWagePaymentRecords: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWageOverdueList: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkerStats: vi.fn().mockResolvedValue({ success: true, data: null }),
  getTeamWages: vi.fn().mockResolvedValue({ success: true, data: null }),
  batchConfirmMatches: vi.fn().mockResolvedValue({ success: true, data: { updated: 0 } }),
  convertTemplateDocxToHtml: vi.fn().mockResolvedValue({ success: true, data: '<p>preview</p>' }),
  readFile: vi.fn().mockResolvedValue({ success: true, data: { dataUrl: 'data:application/octet-stream;base64,test' } }),
  // SQLite
  getSqliteStatus: vi.fn().mockResolvedValue({ enabled: false, tables: 0, rows: 0, size: 0 }),
  enableSqlite: vi.fn().mockResolvedValue({ success: true, message: 'SQLite 已启用' }),
  migrateToSqlite: vi.fn().mockResolvedValue({ success: true, migratedTables: 0, totalRows: 0, verificationPassed: true, errors: [], warnings: [], duration: 100 }),
  setSqliteReadMode: vi.fn().mockResolvedValue({ success: true }),
  // 项目/工人/班组
  getProjects: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkerTeams: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getAttendances: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWages: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getProjectWorkers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getWorkers: vi.fn().mockResolvedValue({ success: true, data: [] }),
  listSnapshots: vi.fn(),
  restoreSnapshot: vi.fn(),
  deleteSnapshot: vi.fn(),
} as unknown as import('./types/electron').ElectronAPI

// 仅添加 electronAPI 属性，不覆盖整个 window 对象
// 覆盖 window 会破坏 jsdom 原型链，导致 React 的 instanceof Element 检查失败
// Node.js 环境（无 window）跳过，仅 jsdom 环境执行
if (typeof window !== 'undefined') {
  ;(window as unknown as Record<string, unknown>).electronAPI = mockElectronAPI
}

// localStorage 模拟（jsdom 自带，但确保清空状态）
// Node.js 环境（无 localStorage）跳过
beforeEach(() => {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
})

================
File: src/test-utils/db-helpers.ts
================
/**
 * 测试数据库辅助工具
 * 
 * 提供测试所需的数据库 setup/cleanup 功能
 */

interface TestDB {
  projects: any[]; members: any[]; workers: any[]; projectWorkers: any[];
  incomeContracts: any[]; expenseContracts: any[]; agreementContracts: any[];
  invoices: any[]; costLedger: any[]; attendances: any[]; wages: any[];
  settlements: any[]; departments: any[]; roles: any[]; auditLogs: any[];
}
const db: TestDB = {
  projects: [], members: [], workers: [], projectWorkers: [],
  incomeContracts: [], expenseContracts: [], agreementContracts: [],
  invoices: [], costLedger: [], attendances: [], wages: [],
  settlements: [], departments: [], roles: [], auditLogs: [],
};
function saveDatabase(): void {}

/**
 * 设置测试数据库
 * 初始化空的测试数据
 */
export function setupTestDB(): void {
  // 初始化所有数据集合
  db.projects = []
  db.members = []
  db.workers = []
  db.projectWorkers = []
  db.incomeContracts = []
  db.expenseContracts = []
  db.agreementContracts = []
  db.invoices = []
  db.costLedger = []
  db.attendances = []
  db.wages = []
  db.settlements = []
  db.departments = []
  db.roles = []
  db.auditLogs = []
  
  // 标记数据库就绪
  // 注意：实际测试中可能需要 mock dbReady
}

/**
 * 清理测试数据库
 * 清空所有测试数据
 */
export function cleanupTestDB(): void {
  // 清空所有数据集合
  db.projects = []
  db.members = []
  db.workers = []
  db.projectWorkers = []
  db.incomeContracts = []
  db.expenseContracts = []
  db.agreementContracts = []
  db.invoices = []
  db.costLedger = []
  db.attendances = []
  db.wages = []
  db.settlements = []
  db.departments = []
  db.roles = []
  db.auditLogs = []
}

/**
 * 获取测试数据库引用
 * 用于直接操作测试数据
 */
export function getTestDB(): typeof db {
  return db
}

/**
 * 创建测试项目
 */
export function createTestProject(id: number, name: string): void {
  if (!db.projects) db.projects = []
  db.projects.push({
    id,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * 创建测试工人
 */
export function createTestWorker(id: string, name: string, dailyWage: number): void {
  if (!db.workers) db.workers = []
  db.workers.push({
    id,
    name,
    dailyWage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * 创建测试项目工人关联
 */
export function createTestProjectWorker(workerId: string, projectId: number, dailyWage: number): void {
  if (!db.projectWorkers) db.projectWorkers = []
  db.projectWorkers.push({
    id: `pw-${Date.now()}`,
    workerId,
    projectId,
    dailyWage,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  saveDatabase()
}

/**
 * Mock IPC Handler 获取工具
 * 从 ipcMain 获取已注册的 handler
 */
export function getTestHandler(channel: string): Function {
  // 这是一个简化实现
  // 实际测试中可能需要使用 electron 的 ipcMain 实例
  return (...args: any[]) => {
    console.warn(`Mock handler for ${channel} called with`, args)
    return { success: false, error: 'Not implemented' }
  }
}

================
File: src/types/agent.ts
================
/**
 * Agent 相关类型定义
 *
 * 对应后端 EngineeringManager.Api.Models 命名空间下的模型
 */

// ═══════════════════════════════════════════════════════════════
// 对话相关
// ═══════════════════════════════════════════════════════════════

/** 聊天请求 */
export interface AgentChatRequest {
  message: string
  conversationId?: number
}

/** 聊天响应 */
export interface AgentChatResponse {
  success: boolean
  conversationId: number
  message?: AgentMessage
  toolCalls?: ToolCallResult[]
  error?: string
}

/** 消息模型 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: ToolCall[] | ToolCallResult[]
  toolCallId?: string
  name?: string
}

/** 工具调用 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

/** 工具调用结果 */
export interface ToolCallResult {
  toolName: string
  toolCallId: string
  success: boolean
  result?: unknown
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// 对话历史
// ═══════════════════════════════════════════════════════════════

/** 对话列表项 */
export interface AgentConversation {
  id: number
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
  lastMessage?: string
}

/** 对话详情（含消息列表） */
export interface AgentConversationDetail {
  id: number
  title: string
  messages: AgentMessageResponse[]
  createdAt: string
  updatedAt: string
}

/** 单条消息响应 */
export interface AgentMessageResponse {
  id: number
  role: 'user' | 'assistant' | 'system' | 'tool'
  content?: string
  toolCalls?: ToolCallResult[]
  createdAt: string
}

// ═══════════════════════════════════════════════════════════════
// LLM 配置
// ═══════════════════════════════════════════════════════════════

/** LLM Provider 配置 */
export interface LlmProviderConfig {
  providerName: string
  baseUrl: string
  apiKey: string
  model: string
  useBuiltIn: boolean
  temperature: number
  maxTokens: number
  updatedAt?: string
  updatedBy?: string
}

/** LLM 配置状态（不含 apiKey） */
export interface LlmProviderStatus {
  configured: boolean
  provider: string
  model: string
  useBuiltIn: boolean
  source: 'builtin' | 'custom' | 'env'
}

/** 测试连接请求 */
export interface LlmProviderTestRequest {
  baseUrl: string
  apiKey: string
}

/** 测试连接响应 */
export interface LlmProviderTestResponse {
  success: boolean
  message?: string
  data?: {
    models: string[]
    modelCount: number
  }
  error?: string
}

// ═══════════════════════════════════════════════════════════════
// 前端 UI 相关
// ═══════════════════════════════════════════════════════════════

/** 建议卡片配置 */
export interface SuggestionCardConfig {
  icon: string
  title: string
  prompt: string
  requiredPermission?: string
  color?: string
}

/** 工具执行状态（用于 UI 展示） */
export interface ToolExecutionStatus {
  toolName: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: unknown
  error?: string
  startTime?: number
  endTime?: number
}

/** Agent 状态 */
export interface AgentState {
  conversations: AgentConversation[]
  currentConversation: AgentConversationDetail | null
  loading: boolean
  error: string | null
  streamingMessage: string | null
}

================
File: src/types/common/Error.ts
================
/**
 * Error 类型定义
 * 
 * 提供统一的错误处理机制
 */

/**
 * 应用错误码
 */
export enum ErrorCode {
  // 通用错误
  UNKNOWN = 'UNKNOWN',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE = 'DUPLICATE',
  
  // 业务错误
  PROJECT_NOT_FOUND = 'PROJECT_NOT_FOUND',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  CONTRACT_NOT_FOUND = 'CONTRACT_NOT_FOUND',
  
  // 操作错误
  CREATE_FAILED = 'CREATE_FAILED',
  UPDATE_FAILED = 'UPDATE_FAILED',
  DELETE_FAILED = 'DELETE_FAILED',
  
  // 系统错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  IPC_ERROR = 'IPC_ERROR',
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'AppError'
    
    // Node.js 特有功能，captureStackTrace 用于优化堆栈跟踪
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const NodeError = Error as any
    if (NodeError.captureStackTrace) {
      NodeError.captureStackTrace(this, AppError)
    }
  }

  getUserMessage(): string {
    switch (this.code) {
      case ErrorCode.NOT_FOUND:
        return `未找到相关记录: ${this.message}`
      case ErrorCode.DUPLICATE:
        return `记录已存在: ${this.message}`
      case ErrorCode.VALIDATION_ERROR:
        return `数据验证失败: ${this.message}`
      case ErrorCode.CREATE_FAILED:
        return `创建失败: ${this.message}`
      case ErrorCode.UPDATE_FAILED:
        return `更新失败: ${this.message}`
      case ErrorCode.DELETE_FAILED:
        return `删除失败: ${this.message}`
      default:
        return this.message
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
    }
  }
}

/**
 * 错误处理函数 - 将任意错误转换为 AppError
 */
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorCode.UNKNOWN,
      error.message,
      { originalError: error.name }
    )
  }

  if (typeof error === 'string') {
    return new AppError(ErrorCode.UNKNOWN, error)
  }

  return new AppError(
    ErrorCode.UNKNOWN,
    '发生了未知错误',
    { originalError: String(error) }
  )
}

/**
 * 同步 try-catch 包装
 */
export function tryCatch<T>(
  fn: () => T,
  onError?: (error: AppError) => void
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = fn()
    return { success: true, data }
  } catch (error) {
    const appError = handleError(error)
    onError?.(appError)
    return { success: false, error: appError.getUserMessage() }
  }
}

/**
 * 异步 try-catch 包装
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  onError?: (error: AppError) => void
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await fn()
    return { success: true, data }
  } catch (error) {
    const appError = handleError(error)
    onError?.(appError)
    return { success: false, error: appError.getUserMessage() }
  }
}

================
File: src/types/common/index.ts
================
/**
 * 公共类型定义
 *
 * 包含 Result 类型、Error 类型等通用类型定义
 */

export type { Result, VoidResult, PaginatedResult } from './Result'

export {
  isSuccess,
  isFailure,
  ok,
  err,
} from './Result'

export type { Option } from './Result'

export {
  some,
  none,
  isSome,
  isNone,
} from './Result'

export {
  AppError,
  ErrorCode,
  handleError,
  tryCatch,
  tryCatchAsync,
} from './Error'

================
File: src/types/common/Result.ts
================
/**
 * Result 类型定义
 * 
 * 提供统一的操作结果类型，用于替代 throw/catch 模式
 */

export type Result<T, E = string> =
  | { success: true; data: T; warning?: string }
  | { success: false; error: E; warning?: string }

export type VoidResult<E = string> = 
  | { success: true }
  | { success: false; error: E }

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 检查 Result 是否成功
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

/**
 * 检查 Result 是否失败
 */
export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

/**
 * 创建成功结果
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data }
}

/**
 * 创建失败结果
 */
export function err<E = string>(error: E): Result<never, E> {
  return { success: false, error }
}

/**
 * Option 类型 (可选值)
 */
export type Option<T> = 
  | { isSome: true; value: T }
  | { isSome: false }

export function some<T>(value: T): Option<T> {
  return { isSome: true, value }
}

export function none<T>(): Option<T> {
  return { isSome: false }
}

export function isSome<T>(option: Option<T>): option is { isSome: true; value: T } {
  return option.isSome === true
}

export function isNone<T>(option: Option<T>): option is { isSome: false } {
  return option.isSome === false
}

================
File: src/types/electron.d.ts
================
export interface Project {
  id: number
  name: string
  description: string
  address: string
  startDate: string
  endDate: string
  status: 'planning' | 'in_progress' | 'completed' | 'archived'
  budget: number
  projectManagerId: number | null  // 项目负责人 ID
  createdAt: string
  updatedAt: string
  projectManagerName?: string     // 关联查询时附带负责人名称
}

// ============ 认证类型 ============
export interface StoredAuth {
  userId: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
  mustChangePassword?: boolean
}

export interface UserInfo {
  id: string
  username: string
  displayName: string
  roleId: string
  status: 'active' | 'disabled'
  createdAt: string
  lastLoginAt: string | null
}

// ============ 人员类型 ============
export type MemberType = 'staff' | 'worker'  // staff=管理人员, worker=农民工

// ============ 工种分类 ============
export type WorkerType = 
  | 'bricklayer'      // 砌筑工
  | 'concreter'       // 混凝土工
  | 'steel'           // 钢筋工
  | 'formwork'        // 模板工
  | 'carpenter'       // 木工
  | 'painter'         // 油漆工
  | 'plumber'         // 水暖工
  | 'electrician'     // 电工
  | 'welder'          // 焊工
  | 'rigger'          // 起重工
  | 'driver'          // 驾驶员
  | 'mechanic'        // 机械工
  | 'other'           // 其他工种

// ============ 农民工班组 ============
export interface WorkerTeam {
  id: number
  name: string                    // 班组名称
  projectId: number               // 所属项目（必选）
  leaderId: number | null          // 班组长ID
  createdAt: string
  updatedAt: string
  // 关联查询时附带
  projectName?: string
  leaderName?: string
}

// ============ 农民工调动记录 ============
export interface WorkerTransferRecord {
  id: number
  workerId: number                // 工人ID
  fromTeamId: number              // 原班组ID
  toTeamId: number                // 新班组ID
  fromProjectId: number           // 原项目ID
  toProjectId: number             // 新项目ID
  transferDate: string            // 调动日期
  reason: string                  // 调动原因
  createdAt: string
}

// ============ 农民工状态枚举 ============
export type WorkerStatus = 'active' | 'left'  // 在职/离场

// ============ 全局工人信息库（纯身份） ============
export interface Worker {
  id: number
  name: string
  idCard: string                   // 身份证号（唯一）
  gender?: string                  // 男/女
  birthDate?: string               // YYYY-MM-DD
  ethnicity?: string               // 民族
  phone?: string
  address?: string
  bankAccount?: string             // 工资卡号
  bankName?: string                // 开户行
  bankLineNo?: string              // 联行号
  workerType?: string              // 默认工种
  dailyWage?: number               // 默认日工资
  createdAt: string
}

// ============ 项目用工关系（Worker ↔ Project many-to-many） ============
export interface ProjectWorker {
  id: number
  workerId: number
  projectId: number
  teamId?: number                  // 班组ID
  dailyWage: number                // 日工资（元/天）
  workerType: WorkerType | string  // 工种
  entryDate: string                // 进场日期
  status: WorkerStatus             // 'active' | 'left'
  remarks?: string
  createdAt: string
  // 关联查询附加
  workerName?: string
  workerIdCard?: string
  projectName?: string
  teamName?: string
}

// ============ 人员管理 ============
export interface Member {
  // 基础信息
  id: number
  name: string
  phone: string
  email: string
  memberType: MemberType           // 人员类型：管理人员/农民工
  role: string                      // 职位（管理人员）/ 工种（农民工）
  workerType?: WorkerType            // 工种类型（农民工专属）
  
  // 身份证
  idCard: string                    // 身份证号
  idCardFront: string               // 身份证人像面
  idCardBack: string                // 身份证国徽面
  // 身份证扩展信息（从OCR识别）
  gender?: string                   // 性别（男/女）
  ethnicity?: string                // 民族
  birthDate?: string                // 出生日期（YYYY-MM-DD）
  idCardAddress?: string            // 身份证住址
  
  // 劳动合同
  contractFile: string              // 劳动合同
  contractFileType: string          // 合同文件类型
  
  // 管理人员薪酬（管理人员专属）
  baseSalary?: number               // 基本工资（元/月）
  socialSecurityPersonal?: number   // 社保个人（元/月）
  socialSecurityCompany?: number    // 社保单位（元/月）
  housingFund?: number               // 公积金（元/月）
  housingFundPersonal?: number       // 公积金个人部分（元/月），仅当 companyCoversSocial=false 时扣除
  otherAllowances?: number          // 其他补贴（元/月）
  companyCoversSocial?: boolean      // 公司是否承担社保公积金个人部分（不扣工资）
  
  // 农民工专属字段
  teamId?: number                  // 所属班组ID
  dailyWage?: number                // 日工资/工价（元/天）
  entryDate?: string                // 进场日期
  expectedLeaveDate?: string        // 预计退场日期
  actualLeaveDate?: string          // 实际退场日期
  wageBankAccount?: string           // 工资卡号
  wageBankName?: string             // 工资开户行
  threeLevelEducation?: boolean     // 三级教育是否完成
  safetyTrainingFile?: string        // 安全培训记录
  healthReportFile?: string         // 健康报告
  specialCertificateFile?: string    // 特种作业证
  status?: WorkerStatus             // 在职/离场状态
  leaveDate?: string                // 离职日期（YYYY-MM-DD，员工专用）
  reentryDate?: string              // 重新入职日期（YYYY-MM-DD）
  remarks?: string                  // 备注（如离场原因等）
  
  createdAt: string
  
  // 关联查询时附带
  teamName?: string                // 班组名称（冗余存储便于显示）
  projectId?: number               // 当前所属项目ID
  projectName?: string             // 当前项目名称
  isTeamLeader?: boolean           // 是否为班组长

  // 部门与职位（管理人员专属，v2.6.0 新增）
  departmentId?: number            // 所属部门 ID → db.departments.id
  position?: string                // 职位名称（如"部门经理""工程师""会计"）
}

// ============ 部门管理 ============
export interface Department {
  id: number
  name: string                     // 部门名称
  managerId: number | null         // 部门负责人 member.id
  memberCount: number              // 部门人数（查询时计算，不持久化）
  positions: string[]              // 该部门可选的职位列表
  createdAt: string
}

export interface Material {
  id: number
  projectId: number
  name: string
  category: string
  unit: string
  quantity: number
  price: number
  createdAt: string
}

export interface Expense {
  id: number
  projectId: number
  amount: number
  category: string
  description: string
  date: string
  createdAt: string
}

// 成本台账
export interface CostLedgerBatch {
  id: number
  projectId: number
  name: string
  createdAt: string
}

export interface CostLedgerMatchRule {
  keyword: string
  category: string
  direction: 'expense' | 'income'
  hitCount: number
  createdAt: string
  updatedAt: string
}

export interface CostLedgerEntry {
  id: number
  projectId: number
  batchId?: number
  voucherNo: string
  date: string
  direction: 'expense' | 'income'
  amount: number
  category: string
  summary: string
  counterparty: string
  channel: string
  linkedInvoiceId?: number
  linkedInvoiceStatus?: 'active' | 'deleted' | null
  notes?: string
  attachments: string[]
  createdAt: string
  updatedAt: string
}

export interface CostLedgerSummary {
  totalExpense: number
  totalIncome: number
  byCategory: Record<string, number>
}

export interface CostLedgerCategory {
  id: number
  code: string
  label: string
  direction: 'expense' | 'income'
  color: string
  isBuiltin: boolean
  isEnabled: boolean
  sortOrder: number
  /** 一级分类名（内置分类从 CATEGORY_HIERARCHY 派生，自定义分类创建时选定） */
  level1?: string
}

export interface AuditLogEntry {
  id: number
  action: string
  level: string
  userId: string
  userName: string
  resource: string
  resourceId: string
  details: string
  ipAddress: string
  createdAt: string
}

export interface SnapshotInfo {  timestamp: string
  fileSize: number
  dbSummary: Record<string, number>
  label?: string
}

export interface Drawing {
  id: number
  projectId: number
  name: string
  category: string
  filePath: string
  remarks: string
  position?: string
  createdAt: string
}

// ============ 合作单位 ============
export type PartnerCategory =
  | 'owner'           // 建设单位（甲方）
  | 'general_contract' // 总承包单位
  | 'professional'    // 专业分包单位
  | 'labor'           // 劳务分包单位
  | 'material'        // 材料供应商
  | 'equipment'       // 设备租赁单位
  | 'design'          // 设计单位
  | 'supervisor'      // 监理单位
  | 'survey'          // 地勘单位
  | 'testing'         // 检测单位
  | 'other'           // 其他

export interface Partner {
  id: number
  name: string
  category: PartnerCategory
  contact: string
  phone: string
  email: string
  address: string
  bankAccount: string
  bankName: string    // 开户行
  taxNumber: string
  // 新增字段
  creditCode: string              // 统一社会信用代码
  registeredAddress: string       // 注册地址
  businessScope: string           // 经营范围
  taxType: string                // 纳税资质：general=一般纳税人，small=小规模纳税人
  licenseFile: string             // 营业执照（Base64）
  licenseFileType: string         // 营业执照文件类型
  otherFiles: string              // 其他附件（Base64，多个用逗号分隔）
  otherFilesType: string          // 其他附件文件类型
  projectIds: number[]  // 关联的项目ID列表
  remarks: string
  createdAt: string
  updatedAt: string
  projectNames?: string // 关联查询时附带项目名称
}

// ============ 地区 ============
export interface Region {
  id: number
  province: string
  city: string
  district: string
  createdAt: string
}

// ============ 监管单位 ============
export type SupervisorCategory =
  | 'quality'         // 质安站
  | 'housing'         // 住建局
  | 'environmental'   // 环保局
  | 'urban'          // 城管局
  | 'fire'           // 消防大队
  | 'water'          // 自来水公司
  | 'power'          // 供电局
  | 'gas'            // 燃气公司
  | 'planning'       // 规划局
  | 'civil_defense'  // 人防办
  | 'traffic'        // 交通局
  | 'health'         // 卫健委
  | 'other'          // 其他

export interface Supervisor {
  id: number
  regionId: number
  name: string
  category: SupervisorCategory
  contact: string
  phone: string
  address: string
  projectIds: number[]  // 关联的项目ID列表
  remarks: string
  createdAt: string
  updatedAt: string
  regionName?: string   // 关联查询时附带地区名称
  projectNames?: string // 关联查询时附带项目名称
}

// ============ 收入合同 ============
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'archived'
export type PaymentMethod = 'one_time' | 'monthly' | 'by_progress' | 'by_stage'

export interface IncomeContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  amount: number                 // 合同金额（不变）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  paymentMethod: PaymentMethod
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number            // 最终结算金额（结算办理后填写）
  settlementId?: number           // 关联的结算单ID
  // 合同附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image' | 'word' | 'excel'  // 文件类型
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

export interface IncomeRecord {
  id: number
  contractId: number
  amount: number
  recordDate: string
  payer: string
  remarks: string
  createdAt: string
}

// ============ 支出合同 ============
export interface ExpenseContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  amount: number                 // 合同金额（不变）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  paymentMethod: PaymentMethod
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number            // 最终结算金额（结算办理后填写）
  settlementId?: number           // 关联的结算单ID
  // 合同附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image' | 'word' | 'excel'  // 文件类型
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

export interface ExpenseRecord {
  id: number
  contractId: number
  amount: number
  recordDate: string
  payee: string
  remarks: string
  createdAt: string
}

// ============ 其他协议 ============
export type AgreementSubType = 'cooperation' | 'framework' | 'settlement' | 'compensation' | 'personal' | 'other'

export interface AgreementContract {
  id: number
  projectId: number
  partnerId: number
  contractNo: string
  name: string
  agreementType: AgreementSubType   // 协议子类型
  amount?: number                   // 合同金额（可选，框架协议等可能无金额）
  signedDate: string
  startDate: string
  endDate: string
  status: ContractStatus
  remarks: string
  createdAt: string
  updatedAt: string
  // 结算相关
  finalAmount?: number
  settlementId?: number
  // 合同附件
  fileUrl?: string
  fileType?: 'pdf' | 'image' | 'word' | 'excel'
  // 关联查询时附带
  projectName?: string
  partnerName?: string
}

// ============ 合同看板统计 ============
export interface ContractStats {
  incomeCount: number
  incomeTotal: number
  incomeReceived: number
  expenseCount: number
  expenseTotal: number
  expensePaid: number
  agreementCount: number
  netIncome: number
  netReceived: number
  expiringSoon: ContractExpiringItem[]
}

export interface ContractExpiringItem {
  id: number
  type: 'income' | 'expense' | 'agreement'
  name: string
  contractNo: string
  amount: number
  endDate: string
  daysLeft: number
}

export interface DashboardStats {
  projectsCount: number
  membersCount: number
  materialsCount: number
  totalExpenses: number
  settlementsCount: number
  invoicesCount: number
  inventoryItemsCount: number
  inProgressProjects: number
  recentProjects: Project[]
  expenseByCategory?: Record<string, number>
}

// ============ 结算办理 ============
export type SettlementStatus = 'draft' | 'pending' | 'completed' | 'archived'
export type SettlementType = 'income' | 'expense'  // 收入结算/支出结算
export type SettlementSubType = 'material' | 'subcontract' | 'labor' | 'machinery' | 'service' | 'other'

export interface Settlement {
  id: number
  projectId: number | null  // 关联项目（可选）
  contractId: number | null
  partnerId: number | null  // 关联单位
  type: SettlementType
  subType?: SettlementSubType       // 结算细分类别
  status: SettlementStatus
  settlementNo: string          // 结算单号
  name: string                   // 结算名称
  amount: number                 // 结算金额
  settlementDate?: string       // 结算日期
  periodStart?: string           // 结算周期开始（废弃，保留兼容）
  periodEnd?: string             // 结算周期结束（废弃，保留兼容）
  submittedBy: string           // 提交人
  submittedAt: string          // 提交时间
  approvedBy: string            // 审核人
  approvedAt: string            // 审核时间
  paidAt: string               // 付款时间
  remarks: string
  items: SettlementItem[]       // 结算明细
  files?: { url: string; name: string; type: 'pdf' | 'image' | 'excel' }[]  // 结算凭证附件（多文件）
  fileUrl?: string              // 旧单文件字段（兼容）
  fileName?: string
  fileType?: 'pdf' | 'image' | 'excel'
  createdAt: string
  updatedAt: string
  projectName?: string
  partnerName?: string
  contractName?: string
}

export interface SettlementItem {
  id: number
  description: string
  quantity: number
  unit: string
  unitPrice: number
  amount: number
  remarks: string
}

// ============ 合同模板（旧版，保留兼容） ============
export type TemplateType = 'income' | 'expense' | 'labor' | 'material' | 'other'

export interface ContractTemplate {
  id: number
  name: string
  type: TemplateType
  description: string
  filePath: string
  fileName: string
  variables: TemplateVariable[]
  createdAt: string
  updatedAt: string
}

// ============ 模板管理（新版，通用模板系统） ============
export type TemplateCategory = 'contract' | 'settlement' | 'seal_application' | 'fund_application' | 'official_document' | 'letter' | 'other'

export interface Template {
  id: number
  name: string
  category: TemplateCategory
  description: string
  fileName: string
  storedFileName: string
  fileType: 'docx' | 'xlsx'
  variables: TemplateVariable[]
  createdAt: string
  updatedAt: string
}

export interface TemplateVariable {
  key: string                   // 变量名，如 {{partyA}}
  label: string                 // 显示标签
  type: 'text' | 'number' | 'date' | 'select'
  defaultValue: string
  options?: string[]            // select类型的选项
  required: boolean
}

// ============ 进销存 ============
export type InventoryTransactionType = 'purchase' | 'sale' | 'adjustment' | 'return_in' | 'return_out'

export interface InventoryItem {
  id: number
  code: string                  // 物料编码
  name: string
  category: string
  unit: string                  // 单位
  specifications: string         // 规格型号
  purchasePrice: number         // 采购单价
  salePrice: number             // 销售单价
  currentStock: number          // 当前库存
  minStock: number              // 最低库存预警
  maxStock: number              // 最高库存
  supplierId: number | null     // 默认供应商
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface InventoryTransaction {
  id: number
  itemId: number
  type: InventoryTransactionType
  quantity: number
  unitPrice: number
  totalAmount: number
  projectId: number | null      // 关联项目（可选）
  contractId: number | null     // 关联合同（可选）
  counterpartyId: number | null // 交易对方（供应商/客户）
  transactionDate: string
  documentNo: string            // 单据编号
  remarks: string
  createdAt: string
  itemName?: string
  projectName?: string
  counterpartyName?: string
}

// ============ 发票管理 ============
export type InvoiceType = 'invoice_in' | 'invoice_out'  // 收票/开票
// 发票状态：issued=已开具, partially_paid=部分收款, received=已收票/已回款, cancelled=已作废, red_flushed=已红冲
export type InvoiceStatus = 'issued' | 'partially_paid' | 'received' | 'cancelled' | 'red_flushed'
export type InvoiceTaxRate = 0 | 0.01 | 0.03 | 0.06 | 0.09 | 0.13
export type InvoiceKind = 'electronic_regular' | 'electronic_special' | 'paper_regular' | 'paper_special'  // 电子普票/电子专票/纸质普票/纸质专票

// 发票关联的收款明细
export interface InvoicePaymentDetail {
  invoiceId: number       // 关联的发票ID
  paymentAmount: number    // 本次关联金额
}

// 收款记录
export interface PaymentRecord {
  id: number
  type: InvoiceType        // 业务类型：invoice_in=收票→付款, invoice_out=开票→回款
  amount: number          // 金额
  recordDate: string       // 日期
  // 关联信息（可选）
  projectId: number | null // 关联项目
  partnerId: number | null // 关联单位（销售方/购买方）
  contractId: number | null // 关联合同
  // 关联发票
  invoiceDetails: InvoicePaymentDetail[]
  remarks: string
  createdAt: string
  // 关联查询时附带
  projectName?: string
  partnerName?: string
  contractName?: string
  // 收款凭证附件
  fileUrl?: string         // Base64 编码的文件
  fileType?: 'pdf' | 'image'  // 文件类型
}

export interface Invoice {
  id: number
  type: InvoiceType
  status: InvoiceStatus
  invoiceKind: InvoiceKind                        // 票种：电子发票/纸质发票
  invoiceNo: string              // 发票号码
  invoiceCode: string           // 发票代码
  name: string                   // 发票名称/摘要
  amount: number                 // 价税合计（含税金额）
  taxAmount: number             // 税额
  priceAmount: number           // 不含税金额
  taxRate: InvoiceTaxRate
  issueDate: string            // 开票日期
  sellerId: number | null        // 销售方（开票单位）
  buyerId: number | null         // 购买方（收票单位）
  settlementId: number | null   // 关联结算单
  projectId: number | null      // 关联项目
  contractId: number | null     // 关联合同（可选）
  receivedAmount: number        // 已收款金额
  fileUrl?: string              // 发票文件（Base64）
  fileType?: string             // 文件类型：image/pdf
  remarks: string
  createdAt: string
  updatedAt: string
  sellerName?: string            // 销售方名称
  buyerName?: string             // 购买方名称
  projectName?: string
  contractName?: string         // 关联合同名称
}

export interface InvoiceItem {
  id: number
  invoiceId: number
  description: string           // 商品/服务名称
  specifications: string         // 规格型号
  unit: string                  // 单位
  quantity: number
  unitPrice: number
  amount: number
  taxRate: InvoiceTaxRate
  taxAmount: number
}


// ============ 考勤管理 ============
export type DayStatus = 'work' | 'holiday' | 'sick_leave' | 'personal_leave'

export interface AttendanceRecord {
  id: number
  memberId: number
  projectId: number
  memberName?: string             // 冗余字段，方便显示
  yearMonth: string               // "YYYY-MM"
  workDays: number                // 实际出勤天数（由 dailyStatus 自动计算）
  daysOff: number                 // 休假天数（管理人员适用）
  isFullAttendance: boolean       // daysOff <= 4
  dailyStatus?: Record<number, DayStatus>  // 每日考勤状态，key=日(1-31)
  fileUrl?: string                // 考勤附件（照片/xlsx/PDF）- 存储文件名
  fileName?: string               // 考勤附件原始文件名（用于显示）
  createdAt: string
  updatedAt: string
}

// ============ 工资管理 ============
export interface SalaryHistoryEntry {
  id: number
  memberId: number
  effectiveDate: string            // "YYYY-MM-DD" 生效日期
  baseSalary: number
  subsidy: number                  // 补助金额
  subsidyNote: string              // 补助说明
  note: string                     // 变动备注
  createdAt: string
}

export interface WageRecord {
  id: number
  projectId: number
  memberId?: number
  projectWorkerId?: number
  yearMonth: string               // "YYYY-MM"
  dailyWage: number
  workDays: number
  bonus: number
  deduction: number
  actualWage: number
  paidAmount?: number              // 实发金额（可能不同于应发）
  paidDate?: string                // 发放日期 "YYYY-MM-DD"
  bankReceiptPath?: string        // 银行回单凭证文件路径
  paymentLocked?: boolean          // 是否已归档（锁定实发金额/日期）
  memberName?: string
  memberType?: 'worker'
  projectName?: string
  teamName?: string
  bankAccount?: string             // 银行卡号，用于回单匹配
  createdAt: string
  updatedAt: string
}

export interface WageStats {
  totalWage: number
  count: number
  projectBreakdown: { projectId: number; projectName: string; total: number; percentage: number }[]
}

export interface OverdueStats {
  totalOverdueAmount: number
  overdueWorkerCount: number
  overdueProjectCount: number
  maxOverdueDays: number
}

export interface OverdueRecord {
  id: number
  projectId: number
  memberId?: number
  projectWorkerId?: number
  yearMonth: string
  actualWage: number
  paidAmount?: number
  workerName?: string
  workerPhone?: string
  projectName?: string
  overdueDays: number
  overdueAmount: number
  paymentStatus: string
  createdAt: string
  updatedAt: string
}

export interface BankReceiptItem {
  name: string
  amount: number
  status: string
  account?: string                 // 收款账号（银行卡号），用于精确匹配
}

export interface ParsedBankReceipt {
  date: string
  totalAmount: number
  successAmount: number
  failCount: number
  items: BankReceiptItem[]
  receiptPath: string
  rawTextSnippet?: string  // 提取文本前500字符（调试用）
}

/** 批量解析结果 */
export interface BatchParseResult {
  /** 总体成功数量 */
  successCount: number
  /** 总体失败数量 */
  failCount: number
  /** 解析结果列表 */
  results: ParsedBankReceipt[]
  /** 匹配结果列表 */
  matches: BankReceiptMatch[]
  /** 解析失败的文件 */
  failedFiles: { path: string; error: string }[]
}

/** 银行回单匹配结果 */
export interface BankReceiptMatch {
  /** 回单明细索引 */
  receiptIndex: number
  /** 回单路径（用于追踪） */
  receiptPath: string
  /** 解析出的姓名 */
  parsedName: string
  /** 解析出的金额 */
  parsedAmount: number
  /** 解析出的日期 */
  parsedDate: string
  /** 匹配的工人ID */
  matchedWorkerId: number | null
  /** 匹配的工人姓名 */
  matchedWorkerName: string | null
  /** 匹配的工资记录ID */
  matchedWageId: number | null
  /** 匹配置信度：0-100 */
  confidence: number
  /** 匹配状态 */
  status: 'matched' | 'unmatched' | 'ambiguous' | 'archived'
  /** 备注 */
  remark?: string
}


// ============ 项目成员关联 ============
export interface ProjectMember {
  id: number
  projectId: number
  memberId: number
  joinedAt: string
}

// ============ SQLite 状态类型 ============
export type ReadMode = 'dual' | 'sqlite-primary' | 'json-only'

export interface SqliteStatus {
  success: boolean
  ready: boolean
  migrated: boolean
  dbPath: string | null
  dbSize: number | null  // 数据库文件大小（字节）
  summary: Record<string, number> | null
  readMode: ReadMode
  error?: string
}

export interface ElectronAPI {
  // 系统
  openDevTools: () => Promise<void>

  // 配置
  getConfig: () => Promise<{ success: boolean; data?: { dataPath: string; defaultPath: string }; error?: string }>
  setDataPath: (path: string) => Promise<{ success: boolean; message?: string; error?: string }>
  getDataPath: () => Promise<string>
  getGpuAcceleration: () => Promise<{ success: boolean; enabled: boolean }>
  setGpuAcceleration: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean; needRestart: boolean }>
  consistencyCheck: () => Promise<{ success: boolean; data?: { consistent: boolean; discrepancies: { table: string; json: number; sqlite: number }[] } }>
  integrityCheck: () => Promise<{ success: boolean; data?: { status: string; message: string } }>
  exportJson: () => Promise<{ success: boolean; message?: string }>

  // 认证
  login: (username: string, password: string) => Promise<{ success: boolean; data?: StoredAuth; error?: string }>
  getCurrentUser: (userId: string) => Promise<{ success: boolean; data?: StoredAuth; error?: string }>
  getAllUsers: () => Promise<{ success: boolean; data?: UserInfo[]; error?: string }>
  createUser: (userData: { username: string; password: string; displayName: string; roleId: string }) => Promise<{ success: boolean; data?: { id: string }; error?: string }>
  updateUser: (userId: string, updates: { displayName?: string; roleId?: string; status?: string; password?: string }) => Promise<{ success: boolean; error?: string }>
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>

  // IPC Session 同步（将登录状态同步到主进程，用于服务端权限校验）
  setSession: (session: { userId: string; username: string; roleId: string; permissions: string[] }) => Promise<{ success: boolean }>
  clearSession: () => Promise<{ success: boolean }>

  // 项目
  getProjects: () => Promise<{ success: boolean; data?: Project[]; error?: string }>
  createProject: (project: Partial<Project>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateProject: (project: Project) => Promise<{ success: boolean; error?: string }>
  deleteProject: (id: number) => Promise<{ success: boolean; error?: string }>

  // 成员
  getMembers: () => Promise<{ success: boolean; data?: Member[]; error?: string }>
  createMember: (member: Partial<Member>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateMember: (member: Member) => Promise<{ success: boolean; error?: string }>
  deleteMember: (id: number) => Promise<{ success: boolean; error?: string }>

  // 项目成员关联
  getProjectMembers: (projectId: number) => Promise<{ success: boolean; data?: (ProjectMember & { member?: Member })[]; error?: string }>
  addProjectMember: (projectId: number, memberId: number, joinedAt?: string) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateProjectMember: (id: number, updates: { leftAt?: string; joinedAt?: string }) => Promise<{ success: boolean; data?: any; error?: string }>
  removeProjectMember: (id: number) => Promise<{ success: boolean; error?: string }>

  // 农民工班组
  getWorkerTeams: () => Promise<{ success: boolean; data?: WorkerTeam[]; error?: string }>
  createWorkerTeam: (team: Partial<WorkerTeam>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWorkerTeam: (team: WorkerTeam) => Promise<{ success: boolean; error?: string }>
  deleteWorkerTeam: (id: number) => Promise<{ success: boolean; error?: string }>

  // 工人调动记录
  getWorkerTransferRecords: (workerId: number) => Promise<{ success: boolean; data?: WorkerTransferRecord[]; error?: string }>
  createWorkerTransfer: (record: Partial<WorkerTransferRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>

  // 全局工人信息库
  getWorkers: (search?: string, workerType?: string) => Promise<{ success: boolean; data?: Worker[]; error?: string }>
  createWorker: (worker: Partial<Worker>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWorker: (worker: Worker) => Promise<{ success: boolean; data?: Worker; error?: string }>
  deleteWorker: (id: number) => Promise<{ success: boolean; error?: string }>
  getWorkerStats: (workerId: number) => Promise<{ success: boolean; data?: { projectCount: number; totalEarnings: number; projectBreakdown: { projectId: number; projectName: string; total: number }[] }; error?: string }>
  getTeamWages: (projectId: number, teamId: number) => Promise<{ success: boolean; data?: { teamId: number; teamName: string; workerCount: number; teamTotal: number; details: { workerName: string; months: number; workDays: number; dailyWage: number; totalWage: number }[] }; error?: string }>
  fixWorkerData: () => Promise<{ success: boolean; data?: { clearedBank: number; filledGender: number }; error?: string }>

  // 项目用工关系
  getProjectWorkers: (projectId: number) => Promise<{ success: boolean; data?: (ProjectWorker & { worker?: Worker })[]; error?: string }>
  createProjectWorker: (pw: Partial<ProjectWorker>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateProjectWorker: (pw: ProjectWorker) => Promise<{ success: boolean; data?: ProjectWorker; error?: string }>
  deleteProjectWorker: (id: number) => Promise<{ success: boolean; error?: string }>
  batchCreateProjectWorkers: (entries: Partial<ProjectWorker>[]) => Promise<{ success: boolean; data?: { ids: number[] }; error?: string }>

  // 材料
  getMaterials: (projectId?: number) => Promise<{ success: boolean; data?: Material[]; error?: string }>
  createMaterial: (material: Partial<Material>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateMaterial: (material: Material) => Promise<{ success: boolean; error?: string }>
  deleteMaterial: (id: number) => Promise<{ success: boolean; error?: string }>

  // 费用
  getExpenses: (projectId?: number) => Promise<{ success: boolean; data?: Expense[]; error?: string }>
  createExpense: (expense: Partial<Expense>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateExpense: (expense: Expense) => Promise<{ success: boolean; error?: string }>
  deleteExpense: (id: number) => Promise<{ success: boolean; error?: string }>

  // 成本台账
  getCostLedger: (projectId: number, batchId?: number) => Promise<{ success: boolean; data?: CostLedgerEntry[]; error?: string }>
  createCostLedger: (entry: Omit<CostLedgerEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<{ success: boolean; data?: CostLedgerEntry; error?: string; warning?: string }>
  batchCreateCostLedger: (projectId: number, entries: any[], batchId: number) => Promise<{ success: boolean; count?: number; error?: string }>
  getCostLedgerSummary: (projectId: number, batchId?: number) => Promise<{ success: boolean; data?: CostLedgerSummary; error?: string }>
  getCostLedgerBatches: (projectId: number) => Promise<{ success: boolean; data?: CostLedgerBatch[]; error?: string }>
  createCostLedgerBatch: (projectId: number, name: string) => Promise<{ success: boolean; data?: CostLedgerBatch; error?: string }>
  copyCostLedgerBatch: (projectId: number, sourceBatchId: number, name: string) => Promise<{ success: boolean; data?: CostLedgerBatch; count?: number; error?: string }>
  renameCostLedgerBatch: (projectId: number, batchId: number, name: string) => Promise<{ success: boolean; error?: string }>
  deleteCostLedgerBatch: (projectId: number, batchId: number) => Promise<{ success: boolean; error?: string }>
  getCostLedgerMatchRules: () => Promise<{ success: boolean; data?: CostLedgerMatchRule[]; error?: string }>
  saveCostLedgerMatchRules: (rules: CostLedgerMatchRule[]) => Promise<{ success: boolean; count?: number; error?: string }>
  updateCostLedger: (id: number, changes: Partial<CostLedgerEntry>) => Promise<{ success: boolean; data?: CostLedgerEntry; error?: string }>
  deleteCostLedger: (id: number) => Promise<{ success: boolean; error?: string }>
  getCostLedgerCategories: (direction?: string) => Promise<{ success: boolean; data?: CostLedgerCategory[]; error?: string }>
  createCostLedgerCategory: (data: { label: string; direction: string; color?: string; level1?: string }) => Promise<{ success: boolean; data?: CostLedgerCategory; error?: string }>
  updateCostLedgerCategory: (id: number, changes: Partial<CostLedgerCategory>) => Promise<{ success: boolean; data?: CostLedgerCategory; error?: string; warning?: string }>
  deleteCostLedgerCategory: (id: number) => Promise<{ success: boolean; error?: string; warning?: string }>
  resetCostLedgerCategories: () => Promise<{ success: boolean; data?: CostLedgerCategory[]; error?: string }>

  // 图纸
  // 部门管理
  getDepartments: () => Promise<{ success: boolean; data?: Department[]; error?: string }>
  createDepartment: (data: { name: string; managerId?: number; positions?: string[] }) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateDepartment: (data: { id: number; name?: string; managerId?: number | null; positions?: string[] }) => Promise<{ success: boolean; error?: string }>
  deleteDepartment: (id: number) => Promise<{ success: boolean; error?: string }>
  // 图纸管理
  getDrawings: (projectId?: number) => Promise<{ success: boolean; data?: Drawing[]; error?: string }>
  uploadDrawing: (options: {
    projectId: number
    name: string
    category: string
    remarks: string
    position?: string
    fileName: string
    fileData: string
  }) => Promise<{ success: boolean; data?: { id: number; filePath: string }; error?: string }>
  updateDrawing: (drawing: Drawing) => Promise<{ success: boolean; error?: string }>
  deleteDrawing: (id: number) => Promise<{ success: boolean; error?: string }>

  // 合作单位
  getPartners: () => Promise<{ success: boolean; data?: Partner[]; error?: string }>
  getProjectPartners: (projectId: number) => Promise<{ success: boolean; data?: Partner[]; error?: string }>
  createPartner: (partner: Partial<Partner>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updatePartner: (partner: Partner) => Promise<{ success: boolean; error?: string }>
  deletePartner: (id: number) => Promise<{ success: boolean; error?: string }>

  // 地区
  getRegions: () => Promise<{ success: boolean; data?: Region[]; error?: string }>
  createRegion: (region: Partial<Region>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteRegion: (id: number) => Promise<{ success: boolean; error?: string }>

  // 监管单位
  getSupervisors: () => Promise<{ success: boolean; data?: Supervisor[]; error?: string }>
  createSupervisor: (supervisor: Partial<Supervisor>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateSupervisor: (supervisor: Supervisor) => Promise<{ success: boolean; error?: string }>
  deleteSupervisor: (id: number) => Promise<{ success: boolean; error?: string }>

  // 收入合同
  getIncomeContracts: (projectId?: number) => Promise<{ success: boolean; data?: IncomeContract[]; error?: string }>
  createIncomeContract: (contract: Partial<IncomeContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateIncomeContract: (contract: IncomeContract) => Promise<{ success: boolean; error?: string }>
  deleteIncomeContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 收入记录
  getIncomeRecords: (contractId: number) => Promise<{ success: boolean; data?: IncomeRecord[]; error?: string }>
  createIncomeRecord: (record: Partial<IncomeRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteIncomeRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // 支出合同
  getExpenseContracts: (projectId?: number) => Promise<{ success: boolean; data?: ExpenseContract[]; error?: string }>
  createExpenseContract: (contract: Partial<ExpenseContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateExpenseContract: (contract: ExpenseContract) => Promise<{ success: boolean; error?: string }>
  deleteExpenseContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 支出记录
  getExpenseRecords: (contractId: number) => Promise<{ success: boolean; data?: ExpenseRecord[]; error?: string }>
  createExpenseRecord: (record: Partial<ExpenseRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  deleteExpenseRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // 其他协议
  getAgreementContracts: (projectId?: number) => Promise<{ success: boolean; data?: AgreementContract[]; error?: string }>
  createAgreementContract: (contract: Partial<AgreementContract>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateAgreementContract: (contract: AgreementContract) => Promise<{ success: boolean; error?: string }>
  deleteAgreementContract: (id: number) => Promise<{ success: boolean; error?: string }>

  // 合同统计
  getContractStats: () => Promise<{ success: boolean; data?: ContractStats; error?: string }>

  // 统计
  getDashboardStats: () => Promise<{ success: boolean; data?: DashboardStats; error?: string }>
  getUploadsPath: () => Promise<string>

  // 统一文件服务
  saveFile: (options: { category: string; subCategory: string; fileData: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; data?: { fileName: string }; error?: string }>
  readFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; data?: { dataUrl: string; mimeType: string }; error?: string }>
  deleteFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; error?: string }>
  openFileExternal: (options: { category: string; subCategory: string; fileName: string; projectName?: string | null }) =>
    Promise<{ success: boolean; error?: string }>

  // 合同附件文件存储
  saveContractFile: (options: { fileData: string; fileName: string; subCategory?: string; projectName?: string | null }) => Promise<{ success: boolean; data?: { fileName: string }; error?: string }>
  readContractFile: (fileName: string, subCategory?: string, projectName?: string | null) => Promise<{ success: boolean; data?: { dataUrl: string; mimeType: string }; error?: string }>

  // ============ 结算办理 ============
  getSettlements: (projectId?: number) => Promise<{ success: boolean; data?: Settlement[]; error?: string }>
  createSettlement: (settlement: Partial<Settlement>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateSettlement: (settlement: Settlement) => Promise<{ success: boolean; error?: string }>
  deleteSettlement: (id: number) => Promise<{ success: boolean; error?: string }>
  processSettlement: (id: number) => Promise<{ success: boolean; data?: { warnings?: string[] }; error?: string }>
  unarchiveSettlement: (id: number) => Promise<{ success: boolean; error?: string }>

  // ============ 合同模板（旧版） ============
  getContractTemplates: () => Promise<{ success: boolean; data?: ContractTemplate[]; error?: string }>
  createContractTemplate: (template: Partial<ContractTemplate>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateContractTemplate: (template: ContractTemplate) => Promise<{ success: boolean; error?: string }>
  deleteContractTemplate: (id: number) => Promise<{ success: boolean; error?: string }>
  generateContractFromTemplate: (templateId: number, variables: Record<string, string>) => Promise<{ success: boolean; data?: { html: string }; error?: string }>

  // ============ 模板管理（新版） ============
  getTemplates: (category?: TemplateCategory) => Promise<{ success: boolean; data?: Template[]; error?: string }>
  createTemplate: (template: Partial<Template>) => Promise<{ success: boolean; data?: { id: number; variables?: TemplateVariable[] }; error?: string }>
  updateTemplate: (template: Template) => Promise<{ success: boolean; error?: string }>
  deleteTemplate: (id: number) => Promise<{ success: boolean; error?: string }>
  getTemplateStats: () => Promise<{ success: boolean; data?: Record<string, number>; error?: string }>
  fillTemplateDocx: (storedFileName: string, values: Record<string, string>) => Promise<{ success: boolean; data?: { dataUrl: string }; error?: string }>
  convertTemplateDocxToHtml: (storedFileName: string, category?: string) => Promise<{ success: boolean; data?: string; error?: string }>

  // ============ 进销存 ============
  getInventoryItems: () => Promise<{ success: boolean; data?: InventoryItem[]; error?: string }>
  createInventoryItem: (item: Partial<InventoryItem>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateInventoryItem: (item: InventoryItem) => Promise<{ success: boolean; error?: string }>
  deleteInventoryItem: (id: number) => Promise<{ success: boolean; error?: string }>
  getInventoryTransactions: (itemId?: number) => Promise<{ success: boolean; data?: InventoryTransaction[]; error?: string }>
  createInventoryTransaction: (transaction: Partial<InventoryTransaction>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>

  // ============ 发票管理 ============
  getInvoices: (projectId?: number, type?: InvoiceType) => Promise<{ success: boolean; data?: Invoice[]; error?: string }>
  createInvoice: (invoice: Partial<Invoice>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateInvoice: (invoice: Invoice) => Promise<{ success: boolean; error?: string }>
  deleteInvoice: (id: number) => Promise<{ success: boolean; error?: string }>
  updateInvoiceStatus: (id: number, status: InvoiceStatus) => Promise<{ success: boolean; error?: string }>

  // ============ 收款记录 ============
  getPaymentRecords: (type?: InvoiceType) => Promise<{ success: boolean; data?: PaymentRecord[]; error?: string }>
  createPaymentRecord: (record: Partial<PaymentRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updatePaymentRecord: (record: PaymentRecord) => Promise<{ success: boolean; error?: string }>
  deletePaymentRecord: (id: number) => Promise<{ success: boolean; error?: string }>

  // ============ 考勤管理 ============
  getAttendances: (projectId?: number, yearMonth?: string) => Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }>
  getAttendancesByMember: (memberId: number, yearMonth?: string) => Promise<{ success: boolean; data?: AttendanceRecord[]; error?: string }>
  createAttendance: (record: Partial<AttendanceRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateAttendance: (record: AttendanceRecord) => Promise<{ success: boolean; error?: string }>
  generateDefaultAttendances: (projectId: number, yearMonth: string, memberIds: number[]) => Promise<{ success: boolean; data?: { count: number }; error?: string }>
  generateDefaultAttendancesV2: (projectId: number, yearMonth: string, projectWorkerIds: number[]) => Promise<{ success: boolean; data?: { count: number }; error?: string }>
  batchImportAttendances: (projectId: number, yearMonth: string, records: { projectWorkerId: number; workDays: number }[]) => Promise<{ success: boolean; data?: { created: number; updated: number }; error?: string }>
  deleteAttendance: (id: number) => Promise<{ success: boolean; data?: any; error?: string }>
  batchDeleteAttendances: (ids: number[]) => Promise<{ success: boolean; data?: { deleted: number }; error?: string }>

  // ============ 薪资历史 ============
  getSalaryHistory: (memberId: number) => Promise<{ success: boolean; data?: SalaryHistoryEntry[]; error?: string }>
  createSalaryHistory: (record: Partial<SalaryHistoryEntry>) => Promise<{ success: boolean; data?: SalaryHistoryEntry; error?: string }>
  deleteSalaryHistory: (id: number) => Promise<{ success: boolean; error?: string }>
  getEffectiveSalary: (memberId: number, yearMonth: string) => Promise<{ success: boolean; data?: { baseSalary: number; subsidy: number; effectiveDate: string }; error?: string }>

  // ============ 工人日工资历史 ============
  getWageHistory: (projectWorkerId: number) => Promise<{ success: boolean; data?: { id: number; projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string; createdAt: string }[]; error?: string }>
  saveWageHistory: (record: { projectWorkerId: number; yearMonth: string; dailyWage: number; note?: string }) => Promise<{ success: boolean; error?: string }>
  deleteWageHistory: (id: number) => Promise<{ success: boolean; error?: string }>
  getEffectiveWage: (projectWorkerId: number, yearMonth: string) => Promise<{ success: boolean; data?: { dailyWage: number; yearMonth: string }; error?: string }>

  // ============ 工资管理 ============
  getWages: (projectId?: number, yearMonth?: string, memberId?: number) => Promise<{ success: boolean; data?: WageRecord[]; error?: string }>
  generateProjectWages: (projectId: number, yearMonth: string) => Promise<{ success: boolean; data?: WageRecord[]; newCount?: number; archivedSkipped?: number; error?: string }>
  createWage: (record: Partial<WageRecord>) => Promise<{ success: boolean; data?: { id: number }; error?: string }>
  updateWage: (record: WageRecord) => Promise<{ success: boolean; error?: string }>
  batchSaveWages: (records: WageRecord[]) => Promise<{ success: boolean; data?: any; error?: string }>
  deleteWage: (id: number) => Promise<{ success: boolean; error?: string }>
  batchDeleteWages: (ids: number[]) => Promise<{ success: boolean; data?: { deleted: number }; error?: string }>
  batchClearPayments: (ids: number[]) => Promise<{ success: boolean; data?: { cleared: number }; error?: string }>
  batchArchivePayments: (ids: number[]) => Promise<{ success: boolean; data?: { archived: number }; error?: string }>
  getWageStats: (yearMonth?: string, projectId?: number) => Promise<{ success: boolean; data?: WageStats; error?: string }>
  parseBankReceipt: (sourcePath: string, projectName?: string, yearMonth?: string) => Promise<{ success: boolean; data?: ParsedBankReceipt; error?: string }>
  batchParseBankReceipts: (filePaths: string[], projectId?: number, yearMonth?: string) => Promise<{ success: boolean; data?: BatchParseResult; error?: string }>
  batchConfirmMatches: (matches: BankReceiptMatch[], yearMonth?: string) => Promise<{ success: boolean; data?: { updated: number }; error?: string }>

  // ============ 工资发放记录（A3） ============
  getWagePaymentRecords: (filters?: { projectId?: number; yearMonth?: string; status?: string }) => Promise<{ success: boolean; data?: any[]; error?: string }>
  getWageOverdueStats: () => Promise<{ success: boolean; data?: OverdueStats; error?: string }>
  getWageOverdueList: () => Promise<{ success: boolean; data?: OverdueRecord[]; error?: string }>

  // ============ 审计日志 ============
  auditLog: (log: any) => Promise<{ success: boolean; error?: string }>
  queryAuditLogs: (query: any) => Promise<{ success: boolean; data?: any; error?: string }>
  getAuditStats: (days?: number) => Promise<{ success: boolean; data?: any; error?: string }>
  clearAuditLogs: (daysToKeep: number) => Promise<{ success: boolean; data?: { removedCount: number }; error?: string }>

  // ============ 快照管理 ============
  getSnapshots: () => Promise<{ success: boolean; data?: SnapshotInfo[]; error?: string }>
  createSnapshot: (label?: string) => Promise<{ success: boolean; data?: SnapshotInfo; error?: string }>
  restoreSnapshot: (timestamp: string) => Promise<{ success: boolean; error?: string }>
  deleteSnapshot: (timestamp: string) => Promise<{ success: boolean; error?: string }>
  setMaxSnapshots: (count: number) => Promise<{ success: boolean; data?: { maxCount: number }; error?: string }>
  getMaxSnapshots: () => Promise<{ success: boolean; data?: { maxCount: number }; error?: string }>

  // ============ 角色权限 ============
  getRoles: () => Promise<{ success: boolean; data?: any[]; error?: string }>
  updateRole: (roleId: string, permissions: string[]) => Promise<{ success: boolean; error?: string }>
  resetRole: (roleId: string) => Promise<{ success: boolean; error?: string }>

  // ============ 文件操作 ============
  openExternalFile: (options: { category: string; subCategory: string; fileName: string; projectName?: string }) =>
    Promise<{ success: boolean; error?: string }>

  // ============ OCR（百度在线识别，通过主进程 IPC 代理） ============
  ocrBaiduIdCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; idCard?: { number: string; name?: string; gender?: string; ethnicity?: string; birthDate?: string; address?: string; issueAuthority?: string; validDate?: string }; error?: string }>
  ocrBaiduInvoice: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; invoice?: { invoiceNum: string; invoiceCode: string; invoiceDate: string; invoiceType: string; totalAmount: number; amountWithoutTax: number; totalTax: number; taxRate: number; sellerName: string; purchaserName: string; checkCode: string; itemName: string; remarks: string }; error?: string }>
  ocrBaiduBankCard: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; bankCard?: { cardNumber: string; bankName: string; cardType: string; validDate: string }; error?: string }>
  ocrBaiduBusinessLicense: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string }; error?: string }>
  ocrBaiduBankReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; bankReceipt?: { transactionDate: string; transactionTime: string; amount: number; payerName: string; payerAccount: string; payeeName: string; payeeAccount: string; transactionNo: string; bankName: string; remarks: string }; error?: string }>
  ocrBaiduPermit: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; permit?: { companyCode: string; companyName: string; accountNumber: string; bankName: string; permitNumber: string }; error?: string }>
  ocrBaiduBankStatement: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; bankStatement?: { transactions: Array<{ date: string; time: string; amount: number; balance: number; type: string; counterparty: string; remark: string }>; accountNumber: string; bankName: string }; error?: string }>
  ocrBaiduGeneralReceipt: (imageBase64: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; generalReceipt?: { text: string; amount: number; date: string }; error?: string }>
  ocrBaiduCompanyQuery: (companyName: string, config: { apiKey: string; secretKey: string }) => Promise<{ success: boolean; text?: string; businessLicense?: { creditCode: string; companyName: string; legalPerson: string; registeredCapital: string; address: string; businessScope: string; establishDate: string; expireDate: string }; error?: string }>
  ocrCheckNetwork: () => Promise<boolean>
  ocrClearTokenCache: () => Promise<boolean>
  ocrGetStats: () => Promise<{ idCard: number; invoice: number; bankCard: number; businessLicense: number; bankReceipt: number; permit: number; bankStatement: number; generalReceipt: number; companyQuery: number; lastReset: string }>

  // ============ SQLite 状态管理 ============
  getSqliteStatus: () => Promise<{ success: boolean; ready: boolean; migrated: boolean; dbPath: string | null; dbSize: number | null; summary: Record<string, number> | null; readMode: 'dual' | 'sqlite-primary' | 'json-only'; error?: string }>
  enableSqlite: () => Promise<{ success: boolean; message: string }>
  migrateToSqlite: (force?: boolean) => Promise<{ success: boolean; migratedTables: number; totalRows: number; verificationPassed: boolean; errors: string[]; warnings: string[]; duration: number; message?: string }>
  getSqliteReadMode: () => Promise<{ success: boolean; readMode: 'dual' | 'sqlite-primary' | 'json-only' }>
  setSqliteReadMode: (mode: 'dual' | 'sqlite-primary' | 'json-only') => Promise<{ success: boolean; readMode: 'dual' | 'sqlite-primary' | 'json-only'; error?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

================
File: src/types/guards.ts
================
/**
 * 类型守卫函数库
 * 
 * 提供类型安全的类型守卫函数，用于运行时类型检查
 */

import type {
  Project,
  Member,
  Material,
  Expense,
  Drawing,
  Partner,
  Invoice,
  WorkerTeam,
  Settlement,
  InventoryItem,
} from './electron.d'

// ═══════════════════════════════════════════════════════════════════════════════
// 基础类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export function isString(val: unknown): val is string {
  return typeof val === 'string'
}

export function isNumber(val: unknown): val is number {
  return typeof val === 'number' && !isNaN(val)
}

export function isBoolean(val: unknown): val is boolean {
  return typeof val === 'boolean'
}

export function isDateString(val: unknown): val is string {
  if (!isString(val)) return false
  const date = new Date(val)
  return !isNaN(date.getTime())
}

export function isArray<T>(val: unknown, guard: (item: unknown) => item is T): val is T[] {
  return Array.isArray(val) && val.every(guard)
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object'
}

// ═══════════════════════════════════════════════════════════════════════════════
// 实体类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Project 类型守卫
 */
export function isProject(val: unknown): val is Project {
  if (!isObject(val)) return false
  const p = val as Record<string, unknown>
  
  return (
    isNumber(p.id) &&
    isString(p.name) &&
    ['planning', 'in_progress', 'completed', 'archived'].includes(p.status as string)
  )
}

/**
 * Member 类型守卫
 */
export function isMember(val: unknown): val is Member {
  if (!isObject(val)) return false
  const m = val as Record<string, unknown>
  
  return (
    isNumber(m.id) &&
    isString(m.name) &&
    ['staff', 'worker'].includes(m.memberType as string)
  )
}

/**
 * Material 类型守卫
 */
export function isMaterial(val: unknown): val is Material {
  if (!isObject(val)) return false
  const m = val as Record<string, unknown>
  
  return (
    isNumber(m.id) &&
    isNumber(m.projectId) &&
    isString(m.name)
  )
}

/**
 * Expense 类型守卫
 */
export function isExpense(val: unknown): val is Expense {
  if (!isObject(val)) return false
  const e = val as Record<string, unknown>
  
  return (
    isNumber(e.id) &&
    isNumber(e.projectId) &&
    isNumber(e.amount)
  )
}

/**
 * Drawing 类型守卫
 */
export function isDrawing(val: unknown): val is Drawing {
  if (!isObject(val)) return false
  const d = val as Record<string, unknown>
  
  return (
    isNumber(d.id) &&
    isNumber(d.projectId) &&
    isString(d.name) &&
    isString(d.filePath)
  )
}

/**
 * Partner 类型守卫
 */
export function isPartner(val: unknown): val is Partner {
  if (!isObject(val)) return false
  const p = val as Record<string, unknown>
  
  return (
    isNumber(p.id) &&
    isString(p.name) &&
    isString(p.category)
  )
}

/**
 * Contract 类型守卫
 */
export function isContract(val: unknown): val is { id: number; name: string; status: string } {
  if (!isObject(val)) return false
  const c = val as Record<string, unknown>
  
  return (
    isNumber(c.id) &&
    isString(c.name) &&
    ['draft', 'pending', 'active', 'expired', 'terminated', 'archived'].includes(c.status as string)
  )
}

/**
 * Invoice 类型守卫
 */
export function isInvoice(val: unknown): val is Invoice {
  if (!isObject(val)) return false
  const i = val as Record<string, unknown>
  
  return (
    isNumber(i.id) &&
    isString(i.invoiceNo) &&
    ['invoice_in', 'invoice_out'].includes(i.type as string)
  )
}

/**
 * WorkerTeam 类型守卫
 */
export function isWorkerTeam(val: unknown): val is WorkerTeam {
  if (!isObject(val)) return false
  const t = val as Record<string, unknown>
  
  return (
    isNumber(t.id) &&
    isString(t.name) &&
    isNumber(t.projectId)
  )
}

/**
 * Settlement 类型守卫
 */
export function isSettlement(val: unknown): val is Settlement {
  if (!isObject(val)) return false
  const s = val as Record<string, unknown>
  
  return (
    isNumber(s.id) &&
    isString(s.settlementNo) &&
    ['income', 'expense'].includes(s.type as string)
  )
}

/**
 * InventoryItem 类型守卫
 */
export function isInventoryItem(val: unknown): val is InventoryItem {
  if (!isObject(val)) return false
  const i = val as Record<string, unknown>
  
  return (
    isNumber(i.id) &&
    isString(i.code) &&
    isString(i.name)
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 数组类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export function isProjectArray(val: unknown): val is Project[] {
  return isArray(val, isProject)
}

export function isMemberArray(val: unknown): val is Member[] {
  return isArray(val, isMember)
}

export function isExpenseArray(val: unknown): val is Expense[] {
  return isArray(val, isExpense)
}

export function isPartnerArray(val: unknown): val is Partner[] {
  return isArray(val, isPartner)
}

export function isInvoiceArray(val: unknown): val is Invoice[] {
  return isArray(val, isInvoice)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Result 类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E }

export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出所有守卫
// ═══════════════════════════════════════════════════════════════════════════════

export const Guards = {
  // 基础
  isString,
  isNumber,
  isBoolean,
  isDateString,
  isArray,
  isObject,
  
  // 实体
  isProject,
  isMember,
  isMaterial,
  isExpense,
  isDrawing,
  isPartner,
  isContract,
  isInvoice,
  isWorkerTeam,
  isSettlement,
  isInventoryItem,
  
  // 数组
  isProjectArray,
  isMemberArray,
  isExpenseArray,
  isPartnerArray,
  isInvoiceArray,
  
  // Result
  isSuccess,
  isFailure,
} as const

export default Guards

================
File: src/types/index.ts
================
/**
 * 类型定义入口文件
 * 
 * 统一导出所有类型定义
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 导出 electron.d.ts 中的所有类型
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // 项目管理
  Project,
  Material,
  Expense,
  CostLedgerEntry,
  CostLedgerBatch,
  CostLedgerMatchRule,
  CostLedgerSummary,
  CostLedgerCategory,
  Drawing,
  
  // 人员管理
  Member,
  MemberType,
  WorkerType,
  WorkerTeam,
  WorkerTransferRecord,
  WorkerStatus,
  Worker,
  ProjectWorker,
  ProjectMember,

  // 部门管理
  Department,
  
  // 合作单位
  Partner,
  PartnerCategory,
  Region,
  Supervisor,
  SupervisorCategory,
  
  // 合同管理
  ContractStatus,
  PaymentMethod,
  IncomeContract,
  IncomeRecord,
  ExpenseContract,
  ExpenseRecord,
  AgreementSubType,
  AgreementContract,
  ContractStats,
  ContractExpiringItem,
  
  // 结算办理
  Settlement,
  SettlementStatus,
  SettlementType,
  SettlementItem,
  
  // 合同模板
  ContractTemplate,
  TemplateType,
  TemplateVariable,

  // 模板管理（新版）
  Template,
  TemplateCategory,
  
  // 进销存
  InventoryItem,
  InventoryTransaction,
  InventoryTransactionType,
  
  // 发票管理
  Invoice,
  InvoiceType,
  InvoiceStatus,
  InvoiceTaxRate,
  InvoiceKind,
  InvoiceItem,
  InvoicePaymentDetail,
  PaymentRecord,
  
  // 统计
  DashboardStats,

  // 考勤管理
  AttendanceRecord,
  DayStatus,

  // 工资管理
  WageRecord,
  WageStats,
  OverdueStats,
  OverdueRecord,
  BankReceiptItem,
  ParsedBankReceipt,
  BatchParseResult,
  BankReceiptMatch,

  // Electron API
  ElectronAPI,
} from './electron.d'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出公共类型
// ═══════════════════════════════════════════════════════════════════════════════

export type { Result, VoidResult, PaginatedResult } from './common/Result'
export type { Option } from './common/Result'

export { 
  isSuccess, 
  isFailure, 
  ok, 
  err,
  some,
  none,
  isSome,
  isNone,
} from './common/Result'

export { 
  AppError, 
  ErrorCode, 
  handleError,
  tryCatch,
  tryCatchAsync,
} from './common/Error'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出类型守卫
// ═══════════════════════════════════════════════════════════════════════════════

export {
  Guards,
  isString,
  isNumber,
  isBoolean,
  isDateString,
  isArray,
  isObject,
  isProject,
  isMember,
  isMaterial,
  isExpense,
  isDrawing,
  isPartner,
  isContract,
  isInvoice,
  isWorkerTeam,
  isSettlement,
  isInventoryItem,
  isProjectArray,
  isMemberArray,
  isExpenseArray,
  isPartnerArray,
  isInvoiceArray,
} from './guards'

// ═══════════════════════════════════════════════════════════════════════════════
// 常用类型别名
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 实体 ID 类型
 */
export type EntityId = number

/**
 * 日期字符串 (ISO 格式)
 */
export type DateString = string

/**
 * 可空类型
 */
export type Nullable<T> = T | null

/**
 * 可选类型
 */
export type Optional<T> = T | undefined


/**
 * 记录类型
 */
export type Record<K extends keyof any, V> = {
  [P in K]: V
}

// ═══════════════════════════════════════════════════════════════════════════════
// 导出路由类型
// ═══════════════════════════════════════════════════════════════════════════════

export type { RouteConfig } from './router'
export type { PageId, ContractView, RouteMeta } from '../routes'

// ═══════════════════════════════════════════════════════════════════════════════
// 导出权限类型
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SYSTEM_ROLES,
  getUserRole,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  isAdmin,
  hasRole,
  isAuthenticated,
  getCurrentUser,
  setCurrentUser,
} from './permissions'

export type {
  Permission,
  PermissionAction,
  PermissionResource,
  PermissionCode,
  Role,
  SystemRole,
  AuthContext,
} from './permissions'

================
File: src/types/permissions.ts
================
/**
 * 权限管理模块
 * 
 * 包含：权限定义、角色配置、权限检查
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 权限定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 权限操作类型
 */
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'approve'

/**
 * 资源类型（与页面 ID 对应）
 */
export type PermissionResource = 
  | 'dashboard'
  | 'projects'
  | 'contracts'
  | 'partners'
  | 'members'
  | 'wages'
  | 'settlement'
  | 'inventory'
  | 'invoices'
  | 'expenses'
  | 'costLedger'
  | 'drawings'
  | 'settings'
  | 'users'
  | 'roles'
  | 'audit_logs'

/**
 * 权限定义
 */
export interface Permission {
  resource: PermissionResource
  actions: PermissionAction[]
  description: string
}

/**
 * 权限编码格式: resource:action
 * 例如: projects:create, contracts:read, invoices:delete
 */
export type PermissionCode = `${PermissionResource}:${PermissionAction}`

// ═══════════════════════════════════════════════════════════════════════════════
// 角色定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 系统角色
 */
export type SystemRole = 'admin' | 'manager' | 'accountant' | 'worker'

/**
 * 角色定义
 */
export interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean  // 是否为系统内置角色
  permissions: PermissionCode[]
}

/**
 * 系统预定义角色
 */
export const SYSTEM_ROLES: Role[] = [
  {
    id: 'admin',
    name: '管理员',
    description: '系统管理员，拥有所有权限',
    isSystem: true,
    permissions: [
      // 所有资源的完全权限
      'dashboard:read', 'dashboard:export',
      'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
      'contracts:create', 'contracts:read', 'contracts:update', 'contracts:delete', 'contracts:approve', 'contracts:export', 'contracts:import',
      'partners:create', 'partners:read', 'partners:update', 'partners:delete', 'partners:export', 'partners:import',
      'members:create', 'members:read', 'members:update', 'members:delete', 'members:export', 'members:import',
      'wages:create', 'wages:read', 'wages:update', 'wages:delete', 'wages:approve', 'wages:export',
      'settlement:create', 'settlement:read', 'settlement:update', 'settlement:delete', 'settlement:approve', 'settlement:export',
      'inventory:create', 'inventory:read', 'inventory:update', 'inventory:delete', 'inventory:export', 'inventory:import',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
      'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
      'drawings:create', 'drawings:read', 'drawings:update', 'drawings:delete', 'drawings:export', 'drawings:import',
      'settings:read', 'settings:update',
      'users:create', 'users:read', 'users:update', 'users:delete',
      'roles:read', 'roles:update',
      'audit_logs:read', 'audit_logs:export',
    ],
  },
  {
    id: 'manager',
    name: '项目经理',
    description: '项目管理人员，拥有项目相关所有权限',
    isSystem: true,
    permissions: [
      'dashboard:read', 'dashboard:export',
      'projects:create', 'projects:read', 'projects:update', 'projects:delete', 'projects:export', 'projects:import',
      'contracts:create', 'contracts:read', 'contracts:update', 'contracts:approve', 'contracts:export', 'contracts:import',
      'partners:create', 'partners:read', 'partners:update', 'partners:export',
      'members:create', 'members:read', 'members:update', 'members:export',
      'wages:read', 'wages:export',
      'settlement:create', 'settlement:read', 'settlement:update', 'settlement:export',
      'inventory:create', 'inventory:read', 'inventory:update', 'inventory:export', 'inventory:import',
      'invoices:read', 'invoices:export',
      'expenses:create', 'expenses:read', 'expenses:update', 'expenses:export',
      'drawings:create', 'drawings:read', 'drawings:update', 'drawings:export', 'drawings:import',
    ],
  },
  {
    id: 'accountant',
    name: '财务人员',
    description: '财务管理人员，负责账务和发票',
    isSystem: true,
    permissions: [
      'dashboard:read', 'dashboard:export',
      'projects:read', 'projects:export',
      'contracts:read', 'contracts:approve', 'contracts:export',
      'partners:read', 'partners:export',
      'members:read', 'members:export',
      'wages:create', 'wages:read', 'wages:update', 'wages:approve', 'wages:export',
      'settlement:create', 'settlement:read', 'settlement:update', 'settlement:approve', 'settlement:export',
      'inventory:read', 'inventory:export',
      'invoices:create', 'invoices:read', 'invoices:update', 'invoices:delete', 'invoices:export',
      'expenses:create', 'expenses:read', 'expenses:update', 'expenses:delete', 'expenses:export',
      'audit_logs:read', 'audit_logs:export',
    ],
  },
  {
    id: 'worker',
    name: '普通员工',
    description: '普通员工，只有查看权限',
    isSystem: true,
    permissions: [
      'dashboard:read',
      'projects:read', 'projects:export',
      'contracts:read', 'contracts:export',
      'partners:read',
      'members:read',
      'inventory:read', 'inventory:export',
      'invoices:read',
      'expenses:read', 'expenses:export',
      'drawings:read',
    ],
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// 用户权限上下文
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 用户权限上下文
 */
export interface AuthContext {
  userId: string
  username: string
  roleId: string
  roleName: string
  permissions: PermissionCode[]
}

/**
 * 当前登录用户（简化版，可替换为真实用户系统）
 */
let currentUser: AuthContext | null = null

/**
 * 设置当前用户
 */
export function setCurrentUser(user: AuthContext | null): void {
  currentUser = user
}

/**
 * 获取当前用户
 */
export function getCurrentUser(): AuthContext | null {
  return currentUser
}

/**
 * 检查是否已登录
 */
export function isAuthenticated(): boolean {
  return currentUser !== null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 权限检查函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 检查是否拥有指定权限
 */
export function hasPermission(permission: PermissionCode): boolean {
  if (!currentUser) return false
  return currentUser.permissions.includes(permission)
}

/**
 * 检查是否拥有所有指定权限
 */
export function hasAllPermissions(permissions: PermissionCode[]): boolean {
  if (!currentUser) return false
  return permissions.every(p => currentUser!.permissions.includes(p))
}

/**
 * 检查是否拥有任一指定权限
 */
export function hasAnyPermission(permissions: PermissionCode[]): boolean {
  if (!currentUser) return false
  return permissions.some(p => currentUser!.permissions.includes(p))
}

/**
 * 检查是否为管理员
 */
export function isAdmin(): boolean {
  return currentUser?.roleId === 'admin'
}

/**
 * 检查是否拥有指定角色
 */
export function hasRole(roleId: string): boolean {
  return currentUser?.roleId === roleId
}

/**
 * 获取用户的角色定义
 */
export function getUserRole(): Role | undefined {
  if (!currentUser) return undefined
  return SYSTEM_ROLES.find(r => r.id === currentUser!.roleId)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 权限配置辅助
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 资源权限标签映射
 */
export const RESOURCE_LABELS: Record<PermissionResource, string> = {
  dashboard: '首页看板',
  projects: '项目管理',
  contracts: '合同管理',
  partners: '单位管理',
  members: '员工管理',
  wages: '工资管理',
  settlement: '结算办理',
  inventory: '仓库管理',
  invoices: '发票管理',
  expenses: '成本管理',
  costLedger: '成本台账',
  drawings: '图纸管理',
  settings: '系统设置',
  users: '用户管理',
  roles: '角色管理',
  audit_logs: '审计日志',
}

/**
 * 操作权限标签映射
 */
export const ACTION_LABELS: Record<PermissionAction, string> = {
  create: '新增',
  read: '查看',
  update: '编辑',
  delete: '删除',
  export: '导出',
  import: '导入',
  approve: '审批',
}

/**
 * 获取权限的显示名称
 */
export function getPermissionLabel(permission: PermissionCode): string {
  const [resource, action] = permission.split(':') as [PermissionResource, PermissionAction]
  return `${RESOURCE_LABELS[resource] || resource}:${ACTION_LABELS[action] || action}`
}

================
File: src/types/router.ts
================
/**
 * 路由类型定义
 * 
 * 扩展的路由配置类型
 */

/**
 * 路由配置（带组件信息）
 */
export interface RouteConfig {
  /** 路由 ID */
  id: string
  /** 显示标签 */
  label: string
  /** 组件路径 */
  component?: string
  /** 布局类型 */
  layout?: 'main' | 'blank' | 'auth'
  /** 子路由 */
  children?: RouteConfig[]
  /** 元数据 */
  meta?: {
    /** 是否需要认证 */
    requiresAuth?: boolean
    /** 权限角色 */
    roles?: string[]
    /** 页面标题 */
    title?: string
    /** 面包屑图标 */
    breadcrumbIcon?: string
  }
}

================
File: src/utils/audit.ts
================
/**
 * 操作日志审计系统
 * 
 * 记录所有 CRUD 操作，支持查询和导出
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 操作类型
 */
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout' | 'approve' | 'lock' | 'unlock'

/**
 * 操作日志级别
 */
export type AuditLevel = 'info' | 'warning' | 'error'

/**
 * 操作日志
 */
export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  username: string
  action: AuditAction
  resource: string
  resourceId?: string | number
  resourceName?: string
  level: AuditLevel
  description: string
  details?: Record<string, unknown>
  ip?: string
  userAgent?: string
}

/**
 * 查询条件
 */
export interface AuditLogQuery {
  startDate?: string
  endDate?: string
  userId?: string
  action?: AuditAction
  resource?: string
  resourceId?: string | number
  level?: AuditLevel
  keyword?: string
  page?: number
  pageSize?: number
}

/**
 * 查询结果
 */
export interface AuditLogResult {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ═══════════════════════════════════════════════════════════════════════════════
// API 适配
// ═══════════════════════════════════════════════════════════════════════════════
import { getAPI } from '@/services/api-adapter'

// ═══════════════════════════════════════════════════════════════════════════════
// 日志存储
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 日志存储键名
 */
const AUDIT_LOG_KEY = 'audit_logs'

// 启动时清理旧日志（去除 details 瘦身，超过 3000 条只保留一半）
try {
  const raw = localStorage.getItem(AUDIT_LOG_KEY)
  if (raw) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const stripped = parsed.slice(-3000).map(({ details, ...rest }: Record<string, unknown>) => rest)
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(stripped))
    }
  }
} catch { localStorage.removeItem(AUDIT_LOG_KEY) }

/**
 * 获取所有日志
 */
function getLogs(): AuditLog[] {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存日志
 * localStorage 配额有限（5-10MB），仅存摘要信息，details 只走 IPC
 */
function saveLogs(logs: AuditLog[]): void {
  // 只保留最近 3000 条，且去除 details 瘦身
  const trimmedLogs = logs.slice(-3000).map(({ details, ...rest }) => rest)
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs))
  } catch {
    // 配额超限时砍半再试
    const halved = trimmedLogs.slice(-Math.floor(trimmedLogs.length / 2))
    try { localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(halved)) } catch { /* 放弃 */ }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志记录
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 当前用户名（简化版，应从用户系统获取）
 */
let currentUsername = 'anonymous'
let currentUserId = 'unknown'

/**
 * 设置当前用户信息
 */
export function setCurrentAuditUser(userId: string | null, username: string | null): void {
  currentUserId = userId || 'unknown'
  currentUsername = username || 'anonymous'
}

/**
 * 生成日志 ID
 */
function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 记录操作日志
 * 
 * @param action 操作类型
 * @param resource 资源类型
 * @param description 操作描述
 * @param options 额外选项
 * 
 * @example
 * ```typescript
 * // 记录创建操作
 * logAudit('create', 'projects', '创建项目: 测试项目')
 * 
 * // 记录更新操作
 * logAudit('update', 'members', '更新员工: 张三', {
 *   resourceId: 123,
 *   details: { before: {...}, after: {...} }
 * })
 * ```
 */
export function logAudit(
  action: AuditAction,
  resource: string,
  description: string,
  options: {
    resourceId?: string | number
    resourceName?: string
    level?: AuditLevel
    details?: Record<string, unknown>
  } = {}
): AuditLog {
  const log: AuditLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    userId: currentUserId,
    username: currentUsername,
    action,
    resource,
    resourceId: options.resourceId,
    resourceName: options.resourceName,
    level: options.level || 'info',
    description,
    details: options.details,
  }

  // 保存日志到 localStorage
  const logs = getLogs()
  logs.push(log)
  saveLogs(logs)

  // 同步到后端 IPC（fire-and-forget）
  getAPI().then(api => api.auditLog?.(log)).catch(() => {})

  return log
}

/**
 * 记录创建操作
 */
export function logCreate(
  resource: string,
  resourceName: string,
  resourceId?: string | number,
  details?: Record<string, unknown>
): AuditLog {
  return logAudit('create', resource, `创建 ${resourceName}`, {
    resourceId,
    resourceName,
    details,
  })
}

/**
 * 记录读取操作
 */
export function logRead(
  resource: string,
  resourceName: string,
  resourceId?: string | number
): AuditLog {
  return logAudit('read', resource, `查看 ${resourceName}`, {
    resourceId,
    resourceName,
  })
}

/**
 * 记录更新操作
 */
export function logUpdate(
  resource: string,
  resourceName: string,
  resourceId: string | number,
  details?: Record<string, unknown>
): AuditLog {
  return logAudit('update', resource, `更新 ${resourceName}`, {
    resourceId,
    resourceName,
    details,
  })
}

/**
 * 记录删除操作
 */
export function logDelete(
  resource: string,
  resourceName: string,
  resourceId?: string | number,
  details?: Record<string, unknown>
): AuditLog {
  return logAudit('delete', resource, `删除 ${resourceName}`, {
    resourceId,
    resourceName,
    level: 'warning',
    details,
  })
}

/**
 * 记录导出操作
 */
export function logExport(
  resource: string,
  count: number,
  details?: Record<string, unknown>
): AuditLog {
  return logAudit('export', resource, `导出 ${count} 条 ${resource} 记录`, {
    details: { count, ...details },
  })
}

/**
 * 记录导入操作
 */
export function logImport(
  resource: string,
  count: number,
  details?: Record<string, unknown>
): AuditLog {
  return logAudit('import', resource, `导入 ${count} 条 ${resource} 记录`, {
    details: { count, ...details },
  })
}

/**
 * 记录审批操作
 */
export function logApprove(
  resource: string,
  resourceName: string,
  resourceId: string | number,
  approved: boolean,
  reason?: string
): AuditLog {
  return logAudit('approve', resource, `审批 ${resourceName}: ${approved ? '通过' : '驳回'}`, {
    resourceId,
    resourceName,
    level: approved ? 'info' : 'warning',
    details: { approved, reason },
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志查询
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 查询操作日志
 */
export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  // 尝试从后端 IPC 查询
  try {
    const api = await getAPI()
    if (api.queryAuditLogs) {
      const result = await api.queryAuditLogs(query)
      if (result.success && result.data) {
        return result.data as AuditLogResult
      }
    }
  } catch (err) { console.warn('[Audit] 后端查询失败:', err) }

  // 回退到 localStorage
  let logs = getLogs()

  // 按时间倒序
  logs = logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // 应用筛选条件
  if (query.startDate) {
    logs = logs.filter(log => log.timestamp >= query.startDate!)
  }
  if (query.endDate) {
    logs = logs.filter(log => log.timestamp <= query.endDate!)
  }
  if (query.userId) {
    logs = logs.filter(log => log.userId === query.userId)
  }
  if (query.action) {
    logs = logs.filter(log => log.action === query.action)
  }
  if (query.resource) {
    logs = logs.filter(log => log.resource === query.resource)
  }
  if (query.resourceId !== undefined) {
    logs = logs.filter(log => log.resourceId === query.resourceId)
  }
  if (query.level) {
    logs = logs.filter(log => log.level === query.level)
  }
  if (query.keyword) {
    const keyword = query.keyword.toLowerCase()
    logs = logs.filter(log =>
      log.description.toLowerCase().includes(keyword) ||
      log.username.toLowerCase().includes(keyword) ||
      log.resourceName?.toLowerCase().includes(keyword)
    )
  }

  const total = logs.length
  const page = query.page || 1
  const pageSize = query.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)

  // 分页
  const startIndex = (page - 1) * pageSize
  const items = logs.slice(startIndex, startIndex + pageSize)

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
  }
}

/**
 * 获取资源的所有操作记录
 */
export function getResourceAuditLogs(resource: string, resourceId: string | number): AuditLog[] {
  const logs = getLogs()
  return logs
    .filter(log => log.resource === resource && log.resourceId === resourceId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * 获取用户的操作记录
 */
export function getUserAuditLogs(userId: string, limit = 50): AuditLog[] {
  const logs = getLogs()
  return logs
    .filter(log => log.userId === userId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 统计
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 操作统计
 */
export interface AuditStats {
  totalCount: number
  todayCount: number
  actionCounts: Record<AuditAction, number>
  resourceCounts: Record<string, number>
  topUsers: { userId: string; username: string; count: number }[]
}

/**
 * 获取操作统计
 */
export async function getAuditStats(days = 7): Promise<AuditStats> {
  // 尝试从后端 IPC 查询
  try {
    const api = await getAPI()
    if (api.getAuditStats) {
      const result = await api.getAuditStats(days)
      if (result.success && result.data) return result.data as AuditStats
    }
  } catch (err) { console.warn('[Audit] 获取统计失败:', err) }

  // 回退到 localStorage
  const logs = getLogs()
  const today = new Date().toISOString().split('T')[0]
  
  // 筛选近 N 天
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)
  
  const actionCounts: Record<AuditAction, number> = {
    create: 0, read: 0, update: 0, delete: 0,
    export: 0, import: 0, login: 0, logout: 0, approve: 0, lock: 0, unlock: 0
  }
  
  const resourceCounts: Record<string, number> = {}
  const userCounts: Record<string, { username: string; count: number }> = {}

  for (const log of recentLogs) {
    // 统计操作类型
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    
    // 统计资源
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    
    // 统计用户
    if (!userCounts[log.userId]) {
      userCounts[log.userId] = { username: log.username, count: 0 }
    }
    userCounts[log.userId].count++
  }

  // 排序用户
  const topUsers = Object.entries(userCounts)
    .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalCount: logs.length,
    todayCount: logs.filter(log => log.timestamp.startsWith(today)).length,
    actionCounts,
    resourceCounts,
    topUsers,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志导出
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出日志到 JSON
 */
export async function exportAuditLogsToJson(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })
  const blob = new Blob([JSON.stringify(result.items, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`
  link.click()
  
  URL.revokeObjectURL(url)
}

/**
 * 导出日志到 CSV
 */
export async function exportAuditLogsToCsv(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })
  
  const headers = ['时间', '用户', '操作', '资源', '资源ID', '级别', '描述']
  const rows = result.items.map(log => [
    log.timestamp,
    log.username,
    log.action,
    log.resource,
    log.resourceId || '',
    log.level,
    log.description,
  ])
  
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  
  URL.revokeObjectURL(url)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 日志清理
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 清理旧日志
 */
export async function clearOldLogs(daysToKeep = 90): Promise<number> {
  // 同步清理后端
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) {
      const result = await api.clearAuditLogs(daysToKeep)
      if (result.success && result.data) return result.data.removedCount
    }
  } catch (err) { console.warn('[Audit] 清理旧日志失败:', err) }

  // 回退 localStorage
  const logs = getLogs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)
  const removedCount = logs.length - filteredLogs.length

  if (removedCount > 0) {
    saveLogs(filteredLogs)
  }

  return removedCount
}

/**
 * 清空所有日志（谨慎使用）
 */
export async function clearAllLogs(): Promise<void> {
  // 同步清理后端
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) await api.clearAuditLogs(1)
  } catch (err) { console.warn('[Audit] 清空日志失败:', err) }
  localStorage.removeItem(AUDIT_LOG_KEY)
}

================
File: src/utils/audit/cleanup.ts
================
/**
 * 审计日志 — 清理
 */
import { getLogs, saveLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export async function clearOldLogs(daysToKeep = 90): Promise<number> {
  // 同步清理后端
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) {
      const result = await api.clearAuditLogs(daysToKeep)
      if (result.success && result.data) return result.data.removedCount
    }
  } catch (err) { console.warn('[AuditCleanup] 清理旧日志失败:', err) }

  // 回退 localStorage
  const logs = getLogs()
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

  const filteredLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)
  const removedCount = logs.length - filteredLogs.length

  if (removedCount > 0) {
    saveLogs(filteredLogs)
  }

  return removedCount
}

export async function clearAllLogs(): Promise<void> {
  try {
    const api = await getAPI()
    if (api.clearAuditLogs) await api.clearAuditLogs(1)
  } catch (err) { console.warn('[AuditCleanup] 清空日志失败:', err) }
  localStorage.removeItem('audit_logs')
}

================
File: src/utils/audit/export.ts
================
/**
 * 审计日志 — 导出（JSON / CSV）
 */
import type { AuditLogQuery } from './types'
import { queryAuditLogs } from './query'

export async function exportAuditLogsToJson(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })
  const blob = new Blob([JSON.stringify(result.items, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.json`
  link.click()

  URL.revokeObjectURL(url)
}

export async function exportAuditLogsToCsv(query: AuditLogQuery = {}): Promise<void> {
  const result = await queryAuditLogs({ ...query, pageSize: 10000 })

  const headers = ['时间', '用户', '操作', '资源', '资源ID', '级别', '描述']
  const rows = result.items.map(log => [
    log.timestamp,
    log.username,
    log.action,
    log.resource,
    log.resourceId || '',
    log.level,
    log.description,
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
  link.click()

  URL.revokeObjectURL(url)
}

================
File: src/utils/audit/index.ts
================
/**
 * 审计日志模块 — Barrel Export
 * 所有外部 import '@/utils/audit' 或 '../utils/audit' 保持不变
 */

// ─── 类型 re-export ───
export type { AuditAction, AuditLevel, AuditLog, AuditLogQuery, AuditLogResult } from './types'

// ─── 日志记录 re-export ───
export {
  setCurrentAuditUser,
  logAudit,
  logCreate,
  logUpdate,
  logDelete,
  logExport,
  logImport,
  logLogin,
  logLogout,
  logApprove,
  logLock,
  logUnlock,
} from './logger'

// ─── 查询 re-export ───
export { queryAuditLogs } from './query'

// ─── 统计 re-export ───
export { getAuditStats } from './stats'
export type { AuditStats } from './stats'

// ─── 导出 re-export ───
export { exportAuditLogsToJson, exportAuditLogsToCsv } from './export'

// ─── 清理 re-export ───
export { clearOldLogs, clearAllLogs } from './cleanup'

================
File: src/utils/audit/logger.ts
================
/**
 * 审计日志 — 日志记录器
 */
import type { AuditAction, AuditLevel, AuditLog } from './types'
import { getLogs, saveLogs } from './storage'

let currentUsername = 'anonymous'
let currentUserId = 'unknown'

export function setCurrentAuditUser(userId: string | null, username: string | null): void {
  currentUserId = userId || 'unknown'
  currentUsername = username || 'anonymous'
}

function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 记录操作日志
 */
export async function logAudit(
  action: AuditAction,
  resource: string,
  options: {
    resourceId?: string | number
    resourceName?: string
    level?: AuditLevel
    description: string
    details?: Record<string, unknown>
  } = { description: '' }
): Promise<void> {
  const log: AuditLog = {
    id: generateLogId(),
    timestamp: new Date().toISOString(),
    userId: currentUserId,
    username: currentUsername,
    action,
    resource,
    resourceId: options.resourceId,
    resourceName: options.resourceName,
    level: options.level || 'info',
    description: options.description,
    details: options.details,
  }

  const logs = getLogs()
  logs.push(log)
  saveLogs(logs)

  // 异步发送到后端（fire-and-forget）
  import('@/services/api-adapter').then(async ({ getAPI }) => {
    try {
      const api = await getAPI()
      if (api.createAuditLog) {
        await api.createAuditLog({
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          resourceName: log.resourceName,
          level: log.level,
          description: log.description,
          details: log.details,
        })
      }
    } catch {
      // 后端发送失败不影响前端
    }
  }).catch(() => {})
}

// ─── 便捷记录函数 ───

export function logCreate(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('create', resource, { ...options, description: options.description || `创建${resource}`, level: 'info' })
}

export function logUpdate(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('update', resource, { ...options, description: options.description || `更新${resource}`, level: 'info' })
}

export function logDelete(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('delete', resource, { ...options, description: options.description || `删除${resource}`, level: 'warning' })
}

export function logExport(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('export', resource, { ...options, description: options.description || `导出${resource}`, level: 'info' })
}

export function logImport(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('import', resource, { ...options, description: options.description || `导入${resource}`, level: 'info' })
}

export function logLogin(username: string, details?: Record<string, unknown>) {
  return logAudit('login', 'auth', { description: `用户登录: ${username}`, level: 'info', details })
}

export function logLogout(username: string, details?: Record<string, unknown>) {
  return logAudit('logout', 'auth', { description: `用户登出: ${username}`, level: 'info', details })
}

export function logApprove(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('approve', resource, { ...options, description: options.description || `审批${resource}`, level: 'info' })
}

export function logLock(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('lock', resource, { ...options, description: options.description || `锁定${resource}`, level: 'warning' })
}

export function logUnlock(resource: string, options: { resourceId?: string | number; resourceName?: string; description?: string; details?: Record<string, unknown> } = { description: '' }) {
  return logAudit('unlock', resource, { ...options, description: options.description || `解锁${resource}`, level: 'info' })
}

================
File: src/utils/audit/query.ts
================
/**
 * 审计日志 — 查询
 */
import type { AuditLogQuery, AuditLogResult } from './types'
import { getLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export async function queryAuditLogs(query: AuditLogQuery = {}): Promise<AuditLogResult> {
  // 优先查询后端
  try {
    const api = await getAPI()
    if (api.getAuditLogs) {
      const result = await api.getAuditLogs(query)
      if (result.success && result.data) return result.data as AuditLogResult
    }
  } catch (err) { console.warn('[AuditQuery] 后端查询失败:', err) }

  // 回退到 localStorage 查询
  let logs = getLogs()

  // 应用过滤条件
  if (query.startDate) logs = logs.filter(log => log.timestamp >= query.startDate!)
  if (query.endDate) logs = logs.filter(log => log.timestamp <= query.endDate!)
  if (query.userId) logs = logs.filter(log => log.userId === query.userId)
  if (query.action) logs = logs.filter(log => log.action === query.action)
  if (query.resource) logs = logs.filter(log => log.resource === query.resource)
  if (query.resourceId) logs = logs.filter(log => String(log.resourceId) === String(query.resourceId))
  if (query.level) logs = logs.filter(log => log.level === query.level)
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    logs = logs.filter(log =>
      log.description.toLowerCase().includes(kw) ||
      log.resource.toLowerCase().includes(kw) ||
      log.username.toLowerCase().includes(kw)
    )
  }

  // 按时间倒序
  logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const total = logs.length
  const page = query.page || 1
  const pageSize = query.pageSize || 20
  const totalPages = Math.ceil(total / pageSize)
  const items = logs.slice((page - 1) * pageSize, page * pageSize)

  return { items, total, page, pageSize, totalPages }
}

================
File: src/utils/audit/stats.ts
================
/**
 * 审计日志 — 统计分析
 */
import type { AuditAction } from './types'
import { getLogs } from './storage'
import { getAPI } from '@/services/api-adapter'

export interface AuditStats {
  totalCount: number
  todayCount: number
  actionCounts: Record<AuditAction, number>
  resourceCounts: Record<string, number>
  topUsers: Array<{ userId: string; username: string; count: number }>
}

export async function getAuditStats(days = 30): Promise<AuditStats> {
  // 优先查询后端
  try {
    const api = await getAPI()
    if (api.getAuditStats) {
      const result = await api.getAuditStats(days)
      if (result.success && result.data) return result.data as AuditStats
    }
  } catch (err) { console.warn('[AuditStats] 后端查询失败:', err) }

  // 回退到 localStorage
  const logs = getLogs()
  const today = new Date().toISOString().split('T')[0]

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  const recentLogs = logs.filter(log => new Date(log.timestamp) >= cutoffDate)

  const actionCounts: Record<AuditAction, number> = {
    create: 0, read: 0, update: 0, delete: 0,
    export: 0, import: 0, login: 0, logout: 0, approve: 0, lock: 0, unlock: 0
  }
  const resourceCounts: Record<string, number> = {}
  const userCounts: Record<string, { username: string; count: number }> = {}

  for (const log of recentLogs) {
    actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
    resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1
    if (!userCounts[log.userId]) {
      userCounts[log.userId] = { username: log.username, count: 0 }
    }
    userCounts[log.userId].count++
  }

  const topUsers = Object.entries(userCounts)
    .map(([userId, data]) => ({ userId, username: data.username, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalCount: logs.length,
    todayCount: logs.filter(log => log.timestamp.startsWith(today)).length,
    actionCounts,
    resourceCounts,
    topUsers,
  }
}

================
File: src/utils/audit/storage.ts
================
/**
 * 审计日志 — localStorage 存储层
 */
import type { AuditLog } from './types'

export const AUDIT_LOG_KEY = 'audit_logs'

// 启动时清理旧日志（去除 details 瘦身，超过 3000 条只保留一半）
try {
  const raw = localStorage.getItem(AUDIT_LOG_KEY)
  if (raw) {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const stripped = parsed.slice(-3000).map(({ details, ...rest }: any) => rest)
      localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(stripped))
    }
  }
} catch { localStorage.removeItem(AUDIT_LOG_KEY) }

export function getLogs(): AuditLog[] {
  try {
    const data = localStorage.getItem(AUDIT_LOG_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * 保存日志
 * localStorage 配额有限（5-10MB），仅存摘要信息，details 只走 IPC
 */
export function saveLogs(logs: AuditLog[]): void {
  const trimmedLogs = logs.slice(-3000).map(({ details, ...rest }) => rest)
  try {
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmedLogs))
  } catch {
    const halved = trimmedLogs.slice(-Math.floor(trimmedLogs.length / 2))
    try { localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(halved)) } catch { /* 放弃 */ }
  }
}

================
File: src/utils/audit/types.ts
================
/**
 * 审计日志 — 类型定义
 */

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'import' | 'login' | 'logout' | 'approve' | 'lock' | 'unlock'

export type AuditLevel = 'info' | 'warning' | 'error'

export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  username: string
  action: AuditAction
  resource: string
  resourceId?: string | number
  resourceName?: string
  level: AuditLevel
  description: string
  details?: Record<string, any>
  ip?: string
  userAgent?: string
}

export interface AuditLogQuery {
  startDate?: string
  endDate?: string
  userId?: string
  action?: AuditAction
  resource?: string
  resourceId?: string | number
  level?: AuditLevel
  keyword?: string
  page?: number
  pageSize?: number
}

export interface AuditLogResult {
  items: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

================
File: src/utils/date.ts
================
/**
 * 日期工具函数
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

/**
 * 安全归一化日期显示 — 对已存库的各种脏数据容错
 * - 先用 parseDateString 尝试标准格式
 * - 再尝试宽松匹配（处理逗号代替点/多种混合分隔符）
 * - 仍失败则返回原值，不阻断显示
 */
export function normalizeDate(date: string | null | undefined): string {
  if (!date) return ''
  // 已经是标准格式
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date
  const parsed = parseDateString(date)
  if (parsed) return parsed
  // 宽松匹配：各种分隔符混用（如 2025.4,10）
  const loose = String(date).trim().match(/^(\d{4})\s*[.,/\- ]\s*(\d{1,2})\s*[.,/\- ]\s*(\d{1,2})$/)
  if (loose) {
    const y = loose[1], mo = loose[2].padStart(2, '0'), d = loose[3].padStart(2, '0')
    const mNum = parseInt(mo), dNum = parseInt(d)
    if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
      return `${y}-${mo}-${d}`
    }
  }
  return date
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm:ss
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

/**
 * 格式化日期为中文显示
 */
export function formatDateChinese(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/**
 * 计算年龄
 */
export function calculateAge(birthDate: string | Date | null | undefined): number {
  if (!birthDate) return 0
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate
  if (isNaN(birth.getTime())) return 0
  
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return Math.max(0, age)
}

/**
 * 判断日期是否有效
 */
export function isValidDate(date: string | Date | null | undefined): boolean {
  if (!date) return false
  const d = typeof date === 'string' ? new Date(date) : date
  return !isNaN(d.getTime())
}

/**
 * 解析多种日期格式为 YYYY-MM-DD
 * 支持: YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD, YYYYMMDD, YYYY年MM月DD日
 */
export function parseDateString(input: string): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null
  const patterns = [
    { regex: /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/, order: [0, 1, 2] },
    { regex: /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/, order: [2, 0, 1] },
    { regex: /^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/, order: [2, 1, 0] },
    { regex: /^(\d{4})年(\d{1,2})月(\d{1,2})日$/, order: [0, 1, 2] },
    { regex: /^(\d{4})(\d{2})(\d{2})$/, order: [0, 1, 2] },
  ]
  for (const p of patterns) {
    const m = trimmed.match(p.regex)
    if (m) {
      const parts = p.order.map(i => parseInt(m[i + 1], 10))
      const [y, mo, d] = parts
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        const dim = new Date(y, mo, 0).getDate()
        if (d <= dim) {
          // 仅对 DD/MM/YYYY 或 MM/DD/YYYY 模式做歧义消除（order[0]===2 表示年份是第一个捕获组）
          if (p.order[0] === 2) {
            const first = parseInt(m[1], 10)
            const second = parseInt(m[2], 10)
            if (first > 12 && second <= 12) return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
            if (second > 12 && first <= 12) return `${y.toString().padStart(4, '0')}-${d.toString().padStart(2, '0')}-${mo.toString().padStart(2, '0')}`
          }
          return `${y.toString().padStart(4, '0')}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`
        }
      }
    }
  }
  return null
}

/**
 * 获取相对时间描述
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffSec < 60) return '刚刚'
  if (diffMin < 60) return `${diffMin}分钟前`
  if (diffHour < 24) return `${diffHour}小时前`
  if (diffDay < 7) return `${diffDay}天前`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}周前`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)}月前`
  return `${Math.floor(diffDay / 365)}年前`
}

================
File: src/utils/export-import.ts
================
/**
 * 数据导入导出工具
 * 
 * 支持：Excel 导出/导入、JSON 备份/恢复
 */

import * as XLSX from 'xlsx'
import type { Project, Partner, Member, IncomeContract, ExpenseContract, AgreementContract, Invoice, Settlement, InventoryItem, InventoryTransaction } from '@/types'

// ═══════════════════════════════════════════════════════════════════════════════
// 类型定义
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 导出选项
 */
export interface ExportOptions {
  /** 文件名（不含扩展名） */
  fileName: string
  /** 工作表名称 */
  sheetName?: string
  /** 是否自动调整列宽 */
  autoWidth?: boolean
  /** 日期格式 */
  dateFormat?: string
}

/**
 * 导入结果
 */
export interface ImportResult<T> {
  /** 是否成功 */
  success: boolean
  /** 数据列表 */
  data: T[]
  /** 错误信息 */
  error?: string
  /** 总行数 */
  totalRows: number
  /** 有效行数 */
  validRows: number
}

/**
 * 备份数据类型
 */
export type BackupDataType = 'projects' | 'partners' | 'members' | 'contracts' | 'invoices' | 'settlements' | 'inventory' | 'all'

/**
 * 备份元数据
 */
export interface BackupMetadata {
  version: string
  createdAt: string
  createdBy: string
  dataTypes: BackupDataType[]
  recordCounts: Record<string, number>
}

/**
 * 完整备份数据
 */
export interface BackupData {
  metadata: BackupMetadata
  data: {
    projects?: Project[]
    partners?: Partner[]
    members?: Member[]
    incomeContracts?: IncomeContract[]
    expenseContracts?: ExpenseContract[]
    agreementContracts?: AgreementContract[]
    invoices?: Invoice[]
    settlements?: Settlement[]
    inventoryItems?: InventoryItem[]
    inventoryTransactions?: InventoryTransaction[]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Excel 导出
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用 Excel 导出函数
 * 
 * @param data 数据数组
 * @param columns 列配置
 * @param options 导出选项
 * 
 * @example
 * ```typescript
 * exportToExcel(users, [
 *   { key: 'name', header: '姓名' },
 *   { key: 'phone', header: '电话' },
 * ], { fileName: '用户列表' })
 * ```
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[],
  options: ExportOptions
): void {
  if (data.length === 0) {
    throw new Error('没有数据可导出')
  }

  // 转换为工作表数据
  const wsData = data.map(row => {
    const newRow: Record<string, unknown> = {}
    columns.forEach(col => {
      newRow[col.header] = row[col.key]
    })
    return newRow
  })

  // 创建工作簿
  const worksheet = XLSX.utils.json_to_sheet(wsData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Sheet1')

  // 自动调整列宽
  if (options.autoWidth !== false) {
    const colWidths = columns.map(col => ({
      wch: Math.max(
        col.header.length,
        ...data.slice(0, 100).map(row => String(row[col.key] || '').length)
      ) + 2
    }))
    worksheet['!cols'] = colWidths
  }

  // 导出文件
  const fileName = `${options.fileName}_${formatDate(new Date())}.xlsx`
  XLSX.writeFile(workbook, fileName)
}

/**
 * 导出项目列表
 */
export function exportProjects(projects: Project[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    projects,
    [
      { key: 'name', header: '项目名称' },
      { key: 'address', header: '地址' },
      { key: 'startDate', header: '开始日期' },
      { key: 'endDate', header: '结束日期' },
      { key: 'status', header: '状态' },
      { key: 'budget', header: '预算' },
      { key: 'projectManagerName', header: '项目经理' },
    ],
    { fileName: '项目列表', ...options }
  )
}

/**
 * 导出合作单位列表
 */
export function exportPartners(partners: Partner[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    partners,
    [
      { key: 'name', header: '单位名称' },
      { key: 'category', header: '类型' },
      { key: 'contact', header: '联系人' },
      { key: 'phone', header: '电话' },
      { key: 'email', header: '邮箱' },
      { key: 'creditCode', header: '信用代码' },
      { key: 'bankName', header: '开户行' },
      { key: 'bankAccount', header: '银行账号' },
    ],
    { fileName: '合作单位', ...options }
  )
}

/**
 * 导出员工列表
 */
export function exportMembers(members: Member[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    members,
    [
      { key: 'name', header: '姓名' },
      { key: 'phone', header: '电话' },
      { key: 'memberType', header: '类型' },
      { key: 'role', header: '职位/工种' },
      { key: 'idCard', header: '身份证号' },
      { key: 'teamName', header: '班组' },
      { key: 'projectName', header: '所属项目' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '员工列表', ...options }
  )
}

/**
 * 导出合同列表
 */
export function exportContracts(contracts: (IncomeContract | ExpenseContract | AgreementContract)[], type: 'income' | 'expense' | 'agreement', options?: Partial<ExportOptions>): void {
  const prefix = type === 'income' ? '收入合同' : type === 'expense' ? '支出合同' : '其他协议'
  exportToExcel(
    contracts,
    [
      { key: 'contractNo', header: '合同编号' },
      { key: 'name', header: '合同名称' },
      { key: 'partnerName', header: '合作单位' },
      { key: 'projectName', header: '关联项目' },
      { key: 'amount', header: '合同金额' },
      { key: 'signedDate', header: '签订日期' },
      { key: 'startDate', header: '开始日期' },
      { key: 'endDate', header: '结束日期' },
      { key: 'status', header: '状态' },
    ],
    { fileName: `${prefix}列表`, ...options }
  )
}

/**
 * 导出结算单列表
 */
export function exportSettlements(settlements: Settlement[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    settlements,
    [
      { key: 'settlementNo', header: '结算单号' },
      { key: 'name', header: '结算名称' },
      { key: 'type', header: '类型' },
      { key: 'partnerName', header: '合作单位' },
      { key: 'projectName', header: '关联项目' },
      { key: 'amount', header: '结算金额' },
      { key: 'periodStart', header: '结算开始' },
      { key: 'periodEnd', header: '结算结束' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '结算单列表', ...options }
  )
}

/**
 * 导出发票列表
 */
export function exportInvoices(invoices: Invoice[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    invoices,
    [
      { key: 'invoiceNo', header: '发票号码' },
      { key: 'type', header: '类型' },
      { key: 'sellerName', header: '销售方' },
      { key: 'buyerName', header: '购买方' },
      { key: 'amount', header: '价税合计' },
      { key: 'taxAmount', header: '税额' },
      { key: 'taxRate', header: '税率' },
      { key: 'issueDate', header: '开票日期' },
      { key: 'status', header: '状态' },
    ],
    { fileName: '发票列表', ...options }
  )
}

/**
 * 导出物料库存
 */
export function exportInventory(items: InventoryItem[], options?: Partial<ExportOptions>): void {
  exportToExcel(
    items,
    [
      { key: 'code', header: '物料编码' },
      { key: 'name', header: '物料名称' },
      { key: 'category', header: '分类' },
      { key: 'specifications', header: '规格型号' },
      { key: 'unit', header: '单位' },
      { key: 'purchasePrice', header: '采购单价' },
      { key: 'currentStock', header: '当前库存' },
    ],
    { fileName: '物料库存', ...options }
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Excel 导入
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 通用 Excel 导入函数
 * 
 * @param file Excel 文件
 * @param mapping 列映射配置
 * @returns 导入结果
 */
export async function importFromExcel<T extends Record<string, any>>(
  file: File,
  mapping: { key: keyof T; header: string }[]
): Promise<ImportResult<T>> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)
        
        if (jsonData.length === 0) {
          resolve({
            success: false,
            data: [],
            error: '文件为空',
            totalRows: 0,
            validRows: 0,
          })
          return
        }

        // 映射数据
        const result: T[] = []
        const headerToKey = new Map(mapping.map(m => [m.header, m.key]))
        
        for (const row of jsonData) {
          const mappedRow: Record<string, unknown> = {}
          let isValid = true
          
          for (const [header, key] of headerToKey) {
            const value = row[header]
            if (value === undefined || value === null || value === '') {
              // 非空检查（可以根据需求调整）
              // isValid = false
            }
            mappedRow[key as string] = value
          }
          
          if (isValid) {
            result.push(mappedRow as T)
          }
        }
        
        resolve({
          success: true,
          data: result,
          totalRows: jsonData.length,
          validRows: result.length,
        })
      } catch (error) {
        resolve({
          success: false,
          data: [],
          error: `解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
          totalRows: 0,
          validRows: 0,
        })
      }
    }
    
    reader.onerror = () => {
      resolve({
        success: false,
        data: [],
        error: '文件读取失败',
        totalRows: 0,
        validRows: 0,
      })
    }
    
    reader.readAsArrayBuffer(file)
  })
}

/**
 * 导入项目数据
 */
export async function importProjects(file: File): Promise<ImportResult<Record<string, unknown>>> {
  return importFromExcel(file, [
    { key: 'name', header: '项目名称' },
    { key: 'address', header: '地址' },
    { key: 'startDate', header: '开始日期' },
    { key: 'endDate', header: '结束日期' },
    { key: 'budget', header: '预算' },
  ])
}

/**
 * 导入合作单位数据
 */
export async function importPartners(file: File): Promise<ImportResult<Record<string, unknown>>> {
  return importFromExcel(file, [
    { key: 'name', header: '单位名称' },
    { key: 'category', header: '类型' },
    { key: 'contact', header: '联系人' },
    { key: 'phone', header: '电话' },
    { key: 'email', header: '邮箱' },
  ])
}

/**
 * 导入员工数据
 */
export async function importMembers(file: File): Promise<ImportResult<Record<string, unknown>>> {
  return importFromExcel(file, [
    { key: 'name', header: '姓名' },
    { key: 'phone', header: '电话' },
    { key: 'memberType', header: '类型' },
    { key: 'role', header: '职位/工种' },
    { key: 'idCard', header: '身份证号' },
  ])
}

// ═══════════════════════════════════════════════════════════════════════════════
// JSON 备份/恢复
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 生成备份数据
 */
export function createBackupData(
  data: Record<string, unknown[]>,
  createdBy: string = 'system'
): BackupData {
  const recordCounts: Record<string, number> = {}
  
  for (const [key, items] of Object.entries(data)) {
    recordCounts[key] = items?.length || 0
  }
  
  return {
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      createdBy,
      dataTypes: Object.keys(data) as BackupDataType[],
      recordCounts,
    },
    data: data as BackupData['data'],
  }
}

/**
 * 导出 JSON 备份文件
 */
export function exportBackup(data: BackupData): void {
  const fileName = `backup_${formatDate(new Date())}.json`
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  
  URL.revokeObjectURL(url)
}

/**
 * 导入 JSON 备份文件
 */
export async function importBackup(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData
        
        // 验证备份数据格式
        if (!data.metadata || !data.data) {
          throw new Error('无效的备份文件格式')
        }
        
        resolve(data)
      } catch (error) {
        reject(new Error(`备份文件解析失败: ${error instanceof Error ? error.message : '未知错误'}`))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsText(file)
  })
}

// ═══════════════════════════════════════════════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 格式化日期为文件名友好格式
 */
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}${m}${d}_${h}${min}`
}

================
File: src/utils/format.ts
================
/**
 * 格式化工具函数
 */

/**
 * 格式化金额（中文格式：千分位 + 去尾零）
 * 例：1234500 → "1,234,500"，1234.50 → "1,234.5"，1234.56 → "1,234.56"
 */
export function formatMoney(amount: number | null | undefined, decimals: number = 2): string {
  if (amount === null || amount === undefined) return '0'
  const fixed = amount.toFixed(decimals)
  // 去掉尾部多余的 0 和小数点
  const trimmed = fixed.replace(/\.?0+$/, '')
  // 添加千分位
  const [int, dec] = trimmed.split('.')
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec ? `${formatted}.${dec}` : formatted
}

/**
 * 解析金额字符串（移除千分位）
 */
export function parseMoney(str: string): number {
  if (!str) return 0
  return parseFloat(str.replace(/,/g, '')) || 0
}

/**
 * 格式化百分比
 */
export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0%'
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * 截断文本
 */
export function truncate(str: string, maxLength: number): string {
  if (!str || str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * 驼峰转短横线
 */
export function kebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 短横线转驼峰
 */
export function camelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())
}

/**
 * 生成随机ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * 下载文件
 */
export function downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType || 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

================
File: src/utils/index.ts
================
/**
 * 工具函数统一导出
 */

// 日期工具
export * from './date'

// 格式化工具
export * from './format'

// 验证工具
export * from './validate'

// 成员相关常量
export * from './member'

// 审计日志
export * from './audit'

// 数据导入导出
export * from './export-import'

// 项目健康度工具
export * from './projectHealth'

================
File: src/utils/mask.ts
================
/**
 * PII 脱敏工具（P0-3 阶段 A）
 *
 * 不修改数据库，只在 UI 展示时脱敏：
 * - 身份证：保留前 4 + 后 4，中间 * 填充
 * - 手机号：保留前 3 + 后 4，中间 * 填充
 * - 银行卡：保留前 4 + 后 4，中间 * 填充
 * - 邮箱：保留首字符 + @ + 域名
 *
 * 数据库里的明文不动，只改显示层。
 */

export function maskIdCard(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 8) return s; // 太短原样返回
  // 18 位身份证：前 4 + 10 个 * + 后 4
  // 15 位老身份证：前 4 + 7 个 * + 后 4
  return s.slice(0, 4) + '*'.repeat(Math.max(4, s.length - 8)) + s.slice(-4);
}

export function maskPhone(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 7) return s;
  // 11 位手机：前 3 + 4 个 * + 后 4
  if (s.length === 11 && s.startsWith('1')) {
    return s.slice(0, 3) + '****' + s.slice(-4);
  }
  return s.slice(0, 3) + '****' + s.slice(-4);
}

export function maskBankAccount(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length < 8) return s;
  // 银行卡：前 4 + 中间 * + 后 4
  const middleLen = Math.max(4, s.length - 8);
  return s.slice(0, 4) + '*'.repeat(middleLen) + s.slice(-4);
}

export function maskEmail(value: string | null | undefined): string {
  if (!value) return '';
  const s = String(value).trim();
  const atIdx = s.indexOf('@');
  if (atIdx <= 0) return s;
  const local = s.slice(0, atIdx);
  const domain = s.slice(atIdx);
  if (local.length <= 1) return s;
  return local[0] + '***' + domain;
}

/** 通用脱敏：自动识别类型 */
export function maskPII(type: 'idCard' | 'phone' | 'bankAccount' | 'email', value: string | null | undefined): string {
  switch (type) {
    case 'idCard': return maskIdCard(value);
    case 'phone': return maskPhone(value);
    case 'bankAccount': return maskBankAccount(value);
    case 'email': return maskEmail(value);
  }
}

================
File: src/utils/member.ts
================
/**
 * 成员相关工具函数
 * 常量已移至 src/constants/member.ts
 */

import {
  workerTypes,
  staffRoles,
  genders,
  politicalStatuses,
  maritalStatuses,
  memberStatuses,
  educationLevels,
  ethnicities
} from '../constants/member'

/**
 * 获取工人类型标签
 */
export function getWorkerTypeLabel(type: string | undefined | null): string {
  if (!type) return '未知'
  const found = workerTypes.find(t => t.value === type)
  return found?.label || type
}

/**
 * 获取角色标签
 */
export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return '未知'
  const found = staffRoles.find(r => r.value === role)
  return found?.label || role
}

// 重新导出常量，保持向后兼容
export {
  workerTypes,
  staffRoles,
  genders,
  politicalStatuses,
  maritalStatuses,
  memberStatuses,
  educationLevels,
  ethnicities
}

================
File: src/utils/printContractTemplate.ts
================
import type { ContractTemplate } from '../types/electron'
import { templateTypeConfig } from '../components/ContractTemplateFormModal'

export function printContractTemplate(
  template: ContractTemplate,
  description: string,
  generateForm: Record<string, string>
): void {
  const variables = template.variables || []
  let content = description || ''

  variables.forEach(v => {
    const value = generateForm[v.key] || v.defaultValue || ''
    content = content.replace(new RegExp(`\\{\\{${v.key}\\}\\}`, 'g'), value)
  })

  const printContent = `
<div style="padding: 40px; font-family: 'SimSun', serif; font-size: 12pt; line-height: 1.8;">
  <div style="text-align: center; font-size: 18pt; font-weight: bold; margin-bottom: 30px;">
    ${templateTypeConfig[template.type].label}
  </div>
  ${content.split('\n').map(line => `<p style="text-indent: 2em; margin: 10px 0;">${line}</p>`).join('')}
  <div style="margin-top: 60px; display: flex; justify-content: space-between;">
    <div style="text-align: center; width: 30%;">
      <p>甲方（签章）:</p>
      <p style="margin-top: 40px;">___________</p>
      <p style="margin-top: 10px;">年 月 日</p>
    </div>
    <div style="text-align: center; width: 30%;">
      <p>乙方（签章）:</p>
      <p style="margin-top: 40px;">___________</p>
      <p style="margin-top: 10px;">年 月 日</p>
    </div>
  </div>
</div>
  `

  const originalContent = document.body.innerHTML
  document.body.innerHTML = printContent
  window.print()
  document.body.innerHTML = originalContent
  window.location.reload()
}

================
File: src/utils/projectHealth.ts
================
/**
 * 项目健康度评分工具函数
 */

/**
 * 计算项目健康度评分 (0-100)
 * 维度：预算控制(40%) + 合同执行(30%) + 发票管理(30%)
 */
export function calculateHealthScore(
  project: { budget: number },
  stats: {
    totalExpenses: number
    incomeTotal: number
    receivedInTotal: number
    invoiceInTotal: number
  }
): number {
  // 1. 预算控制得分 (预算使用率越低得分越高)
  const budgetUsage = stats.totalExpenses / (project.budget || 1)
  const budgetScore = Math.max(0, Math.min(100, 100 - budgetUsage * 100))

  // 2. 合同执行得分 (收入合同执行率)
  const contractScore = stats.incomeTotal > 0
    ? Math.min(100, (stats.receivedInTotal / stats.incomeTotal) * 100)
    : 100

  // 3. 发票管理得分 (发票核销率)
  const invoiceScore = stats.invoiceInTotal > 0
    ? Math.min(100, (stats.receivedInTotal / stats.invoiceInTotal) * 100)
    : 100

  // 加权计算
  const score = budgetScore * 0.4 + contractScore * 0.3 + invoiceScore * 0.3
  return Math.round(score)
}

/**
 * 获取健康度评级
 */
export function getHealthLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) return { label: '健康', color: 'text-emerald-600', bgColor: 'bg-emerald-50' }
  if (score >= 60) return { label: '良好', color: 'text-blue-600', bgColor: 'bg-blue-50' }
  if (score >= 40) return { label: '预警', color: 'text-amber-600', bgColor: 'bg-amber-50' }
  return { label: '危险', color: 'text-red-600', bgColor: 'bg-red-50' }
}

/**
 * 人材机成本分类
 */
const LABOR_CATEGORIES = ['人工费', '工资', '劳务费', '管理人员薪酬', '社保', '公积金', '现场管理费']
const MATERIAL_CATEGORIES = ['材料费', '材料采购', '建材', '石材', '钢材', '水泥']
const MACHINERY_CATEGORIES = ['机械费', '设备租赁', '机械租赁', '台班费']

export function categorizeExpense(category: string): '人' | '材' | '机' | '其他' {
  if (LABOR_CATEGORIES.some(c => category.includes(c))) return '人'
  if (MATERIAL_CATEGORIES.some(c => category.includes(c))) return '材'
  if (MACHINERY_CATEGORIES.some(c => category.includes(c))) return '机'
  return '其他'
}

export interface CostBreakdown {
  labor: number
  material: number
  machinery: number
  other: number
  total: number
}

export function calculateCostBreakdown(expenseByCategory: Record<string, number>): CostBreakdown {
  const result: CostBreakdown = {
    labor: 0,
    material: 0,
    machinery: 0,
    other: 0,
    total: 0
  }

  const typeToKey: Record<string, keyof CostBreakdown> = {
    '人': 'labor',
    '材': 'material',
    '机': 'machinery',
    '其他': 'other'
  }

  Object.entries(expenseByCategory).forEach(([category, amount]) => {
    const type = categorizeExpense(category)
    const key = typeToKey[type]
    if (key && key !== 'total') {
      result[key] += amount
    }
    result.total += amount
  })

  return result
}

================
File: src/utils/staff-payroll-utils.ts
================
/**
 * 员工薪酬辅助函数
 */
import { computeAttendanceSummary } from '../constants/attendance'
import type { Member, AttendanceRecord } from '@/types'

/** 获取入职日期（优先 entryDate，回退到 createdAt） */
export function getEntryDate(s: Member): string | null {
  return s.entryDate || (s.createdAt ? s.createdAt.split('T')[0] : null)
}

/** 某月份最后一天 YYYY-MM-DD */
export function monthEnd(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${ym}-${String(d).padStart(2, '0')}`
}

/** 筛选符合条件的在职员工（用于生成薪酬） */
export function filteredStaffForGenerate(
  staff: Member[],
  filterDept: number | '',
  ym: string
): Member[] {
  const me = monthEnd(ym)
  const ms = `${ym}-01`
  return staff.filter((s) => {
    if (filterDept && (s.departmentId ?? -1) !== filterDept) return false
    const ed = getEntryDate(s)
    if (ed && ed > me) return false             // 尚未入职
    if (s.leaveDate && !s.reentryDate && s.leaveDate < ms) return false
    if (s.leaveDate && s.reentryDate && s.leaveDate < ms && s.reentryDate > me) return false
    return true
  })
}

/** 获取指定员工某月份的考勤记录 */
export function getAttendanceForMember(
  attendances: AttendanceRecord[],
  memberId: number,
  ym: string
): AttendanceRecord | undefined {
  return attendances.find((a) => a.memberId === memberId && a.yearMonth === ym)
}

/** 考勤是否已填写（至少有 dailyStatus） */
export function isAttendanceReady(memberId: number, ym: string, attendances: AttendanceRecord[]): boolean {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return false
  if (!att.dailyStatus || Object.keys(att.dailyStatus).length === 0) return false
  return true
}

/** 计算某员工某月份考勤天数 */
export function computeWorkDays(
  attendances: AttendanceRecord[],
  memberId: number,
  ym: string,
  entryDay: number
): { workDays: number; daysOff: number } {
  const att = getAttendanceForMember(attendances, memberId, ym)
  if (!att) return { workDays: 0, daysOff: 0 }
  const wd = new Date(Number(ym.split('-')[0]), Number(ym.split('-')[1]), 0).getDate()
  return computeAttendanceSummary(att?.dailyStatus, wd, entryDay)
}

================
File: src/utils/validate.ts
================
/**
 * 验证工具函数
 */

/**
 * 验证手机号
 */
export function isValidPhone(phone: string | null | undefined): boolean {
  if (!phone) return false
  return /^1[3-9]\d{9}$/.test(phone)
}

/**
 * 验证身份证号
 */
export function isValidIdCard(idCard: string | null | undefined): boolean {
  if (!idCard) return false
  // 15位或18位身份证
  const reg = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/
  return reg.test(idCard)
}

/**
 * 验证邮箱
 */
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * 验证统一社会信用代码
 */
export function isValidCreditCode(code: string | null | undefined): boolean {
  if (!code) return false
  // 18位统一社会信用代码
  return /^[0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}$/.test(code)
}

/**
 * 验证银行卡号（使用 Luhn 算法）
 */
export function isValidBankCard(cardNumber: string | null | undefined): boolean {
  if (!cardNumber) return false
  const digits = cardNumber.replace(/\s/g, '')
  
  if (!/^\d{16,19}$/.test(digits)) return false
  
  let sum = 0
  let isEven = false
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits[i], 10)
    
    if (isEven) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    
    sum += digit
    isEven = !isEven
  }
  
  return sum % 10 === 0
}

/**
 * 验证URL
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 验证必填
 */
export function isRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  return true
}

/**
 * 验证最小长度
 */
export function minLength(value: string, min: number): boolean {
  if (!value) return false
  return value.length >= min
}

/**
 * 验证最大长度
 */
export function maxLength(value: string, max: number): boolean {
  if (!value) return true
  return value.length <= max
}

/**
 * 验证数字范围
 */
export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max
}

================
File: src/utils/wage-export.ts
================
/**
 * 工资明细导出 & 打印工具
 */
import type { WageRecord } from '@/types'
import { COLORS } from './wageExportColors'
import { useToastStore } from '@/store/toastStore'

/** 导出工资明细为 Excel */
export async function exportWageDetailToExcel(records: WageRecord[]) {
  if (records.length === 0) return
  try {
    const XLSX = await import('xlsx')
    const data = records.map((r, i) => ({
      '序号': i + 1,
      '姓名': r.memberName || '',
      '班组': r.teamName || '',
      '项目': r.projectName || '',
      '月份': r.yearMonth,
      '出勤': r.workDays,
      '日薪': r.dailyWage,
      '应发': r.dailyWage * r.workDays,
      '实发金额': r.paidAmount || 0,
      '发放日期': r.paidDate || '',
      '差额': (r.dailyWage * r.workDays) - (Number(r.paidAmount) || 0),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [
      { wch: 6 }, { wch: 10 }, { wch: 14 }, { wch: 20 }, { wch: 8 },
      { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工资明细')
    XLSX.writeFile(wb, `工资明细_${new Date().toISOString().slice(0, 10)}.xlsx`)
  } catch (e) {
    console.error('导出失败:', e)
    useToastStore.getState().showToast('导出失败，请重试', 'error')
  }
}

/** 打印工资明细 */
export function printWageDetail(records: WageRecord[], title: string) {
  if (records.length === 0) return
  const rows = records.map(r => {
    const actualWage = (r.dailyWage || 0) * (r.workDays || 0)
    const paid = Number(r.paidAmount) || 0
    const diff = actualWage - paid
    const diffStr = diff === 0 ? '已结清' : diff > 0 ? `欠 ${diff.toFixed(2)}` : `多 ${Math.abs(diff).toFixed(2)}`
    return `<tr>
      <td style="text-align:center">${r.memberName || '-'}</td>
      <td style="text-align:center">${r.teamName || '-'}</td>
      <td style="text-align:center">${r.yearMonth}</td>
      <td style="text-align:center">${r.workDays}</td>
      <td style="text-align:right">${r.dailyWage}</td>
      <td style="text-align:right">${actualWage.toFixed(2)}</td>
      <td style="text-align:right">${paid.toFixed(2)}</td>
      <td style="text-align:center">${r.paidDate || '-'}</td>
      <td style="text-align:right;font-weight:600;color:${diff === 0 ? COLORS.settled : COLORS.pending}">${diffStr}</td>
    </tr>`
  }).join('')

  const totalWage = records.reduce((s, r) => s + (r.dailyWage || 0) * (r.workDays || 0), 0)
  const totalPaid = records.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0)
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>工资明细</title>
    <style>
      body{font-family:'Microsoft YaHei',sans-serif;padding:20px;color:${COLORS.textBody}}
      h1{text-align:center;margin-bottom:4px;font-size:18px}
      .sub{text-align:center;color:${COLORS.textSub};font-size:12px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid ${COLORS.borderTable};padding:5px 6px}
      th{background:${COLORS.bgTableHeader};font-weight:600;white-space:nowrap}
      .footer{margin-top:12px;text-align:right;font-size:11px;color:${COLORS.textFooter}}
      .summary{margin-top:10px;display:flex;gap:24px;justify-content:flex-end;font-size:13px}
      .summary strong{font-family:monospace}
      @media print{body{padding:0}@page{size:landscape;margin:10mm}}
    </style></head><body>
    <h1>${title} — 工资明细</h1>
    <p class="sub">${records.length} 人 | ${new Date().toLocaleDateString()}</p>
    <table><thead><tr>
      <th>姓名</th><th>班组</th><th>月份</th><th>出勤</th><th>日薪</th><th>应发</th><th>实发</th><th>发放日期</th><th>状态</th>
    </tr></thead><tbody>${rows}</tbody></table>
    <div class="summary">
      <span>应发总额: <strong>${totalWage.toFixed(2)}</strong></span>
      <span>实发总额: <strong style="color:${COLORS.settled}">${totalPaid.toFixed(2)}</strong></span>
      <span>未发: <strong style="color:${COLORS.pending}">${(totalWage - totalPaid).toFixed(2)}</strong></span>
    </div>
    <div class="footer">打印时间: ${new Date().toLocaleString()}</div>
    </body></html>`
  const w = window.open('', '_blank', 'width=1024,height=768')
  if (!w) { window.print(); return }
  w.document.write(content)
  w.document.close()
  w.focus()
  w.print()
  w.close()
}

================
File: src/utils/wageExportColors.ts
================
// wageExportColors.ts - 工资表导出 HTML 模板色板
// utils/wage-export.ts 生成工资结算/支付汇总表 HTML 时使用。
// 优先使用 Tailwind 类（slate/...），仅当 HTML 字符串拼接强制需要 hex 时引用本字典。

export const COLORS = {
  settled:        '#059669',  // Tailwind: emerald-600
  pending:        '#d97706',  // Tailwind: amber-600
  textBody:       '#333',     // Tailwind: slate-800 (近似)
  textSub:        '#666',     // Tailwind: slate- (近似)
  borderTable:    '#bbb',     // Tailwind: slate- (近似)
  bgTableHeader:  '#f1f5f9',  // Tailwind: slate-100
  textFooter:     '#999',     // Tailwind: slate- (近似)
} as const

export const CHART_PALETTE: readonly string[] = [
  COLORS.settled,
  COLORS.pending,
  COLORS.textBody,
  COLORS.textSub,
  COLORS.borderTable,
  COLORS.bgTableHeader,
  COLORS.textFooter,
]

================
File: src/vite-env.d.ts
================
/// <reference types="vite/client" />

// Vite define 注入的全局常量类型声明
declare const __APP_VERSION__: string

// WebView2 runtime type
declare interface Window {
  chrome?: {
    webview?: {
      postMessage: (message: unknown) => void
      addEventListener: (type: string, listener: (event: { data: unknown }) => void) => void
      removeEventListener: (type: string, listener: (event: { data: unknown }) => void) => void
    }
  }
}

================
File: src/services/__tests__/agent-client.rename.test.ts
================
/**
 * agent-client.rename.test.ts — 重命名 API 单测
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock api-client module
const mockPut = vi.hoisted(() => vi.fn())
vi.mock('../api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: mockPut,
    del: vi.fn(),
  },
}))

import { renameAgentConversation } from '../agent-client'

describe('renameAgentConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('成功时返回 true 且 put 收到正确路径和 body', async () => {
    mockPut.mockResolvedValue({ success: true, data: { success: true } })

    const result = await renameAgentConversation(42, '新标题')

    expect(result).toBe(true)
    expect(mockPut).toHaveBeenCalledWith(
      '/api/agent/conversations/42',
      { title: '新标题' },
    )
  })

  it('失败时返回 false', async () => {
    mockPut.mockResolvedValue({ success: false, error: 'not found' })

    const result = await renameAgentConversation(99, '不存在')

    expect(result).toBe(false)
  })
})

================
File: src/services/__tests__/agent-client.stream.test.ts
================
/**
 * agent-client.stream.test.ts — 流式聊天 SSE 解析单测
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sendAgentMessageStream } from '../agent-client'

function sseStream(chunks: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c))
      controller.close()
    },
  })
}

describe('sendAgentMessageStream', () => {
  beforeEach(() => {
    localStorage.setItem('jwt_token', 'test-token')
  })

  it('分发 conversation_id / content / done 并累积文本', async () => {
    const body = sseStream([
      'data: {"type":"conversation_id","conversationId":42}\n\n',
      'data: {"type":"content","text":"你好"}\n\n',
      'data: {"type":"content","text":"，世界"}\n\n',
      'data: {"type":"done","conversationId":42,"toolCalls":[]}\n\n',
    ])
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body }) as any

    const onConversationId = vi.fn()
    const onDone = vi.fn()
    let acc = ''
    await sendAgentMessageStream(
      { message: 'hi' },
      { onConversationId, onContent: (t) => (acc += t), onDone },
    )

    expect(onConversationId).toHaveBeenCalledWith(42)
    expect(acc).toBe('你好，世界')
    expect(onDone).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: 42 }),
    )
  })

  it('跨 chunk 半包的事件能被正确拼接解析', async () => {
    const body = sseStream([
      'data: {"type":"content","te', // 半包
      'xt":"拼接成功"}\n\n',
      'data: {"type":"done","conversationId":1}\n\n',
    ])
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, body }) as any

    let acc = ''
    await sendAgentMessageStream({ message: 'hi' }, { onContent: (t) => (acc += t) })
    expect(acc).toBe('拼接成功')
  })

  it('响应非 ok 时抛错以便调用方回退', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, body: null }) as any
    await expect(sendAgentMessageStream({ message: 'hi' }, {})).rejects.toThrow()
  })
})

================
File: src/services/api-adapter.ts
================
/**
 * API 适配器
 *
 * 根据运行环境自动选择 Electron 或 Tauri API。
 * 这样前端代码不需要修改，只需要使用这个适配器。
 */

// 检测运行环境
const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;
const isTauri = typeof window !== 'undefined' && ((window as any).__TAURI__ !== undefined || (window as any).__TAURI_INTERNALS__ !== undefined);

// C# API 检测
let csharpApiAvailable: boolean | null = null;

async function checkCSharpApi(): Promise<boolean> {
  if (csharpApiAvailable !== null) return csharpApiAvailable;
  try {
    // 使用相对路径，dev 模式通过 Vite 代理转发到 C# 后端
    const resp = await fetch('/api/health', { signal: AbortSignal.timeout(2000) });
    csharpApiAvailable = resp.ok;
  } catch {
    csharpApiAvailable = false;
  }
  return csharpApiAvailable;
}

// 动态导入 API（延迟加载）
let cachedAPI: any = null;

async function getCachedAPI() {
  if (cachedAPI) return cachedAPI;
  const module = await import('./tauri-bridge');
  cachedAPI = module.tauriAPI;
  return cachedAPI;
}

/**
 * 获取当前环境的 API
 * 优先使用 Electron API（向后兼容），否则使用 Tauri API
 */
export async function getAPI() {
  // 优先使用 Electron API
  if (isElectron) {
    return window.electronAPI;
  }

  // 检测 C# API（HTTP 模式）
  if (await checkCSharpApi()) {
    return await getCachedAPI();
  }

  // Tauri 环境
  if (isTauri) {
    return await getCachedAPI();
  }

  // 开发环境 fallback（浏览器中运行）
  console.warn('[API] 未检测到后端 API，使用 mock API');
  return createMockAPI();
}

/**
 * Mock API 用于浏览器开发
 */
function createMockAPI() {
  return {
    getProjects: async () => ({ success: true, data: [] }),
    createProject: async () => ({ success: true, data: { id: 1 } }),
    updateProject: async () => ({ success: true }),
    deleteProject: async () => ({ success: true }),
    getProject: async () => ({ success: true, data: null }),
    // 成员
    getMembers: async () => ({ success: true, data: [] }),
    createMember: async () => ({ success: true, data: { id: 1 } }),
    updateMember: async () => ({ success: true }),
    deleteMember: async () => ({ success: true }),
    // 工人
    getWorkers: async () => ({ success: true, data: [] }),
    getWorkerStats: async () => ({ success: true, data: {} }),
    getProjectWorkers: async () => ({ success: true, data: [] }),
    createWorker: async () => ({ success: true, data: { id: 1 } }),
    updateWorker: async () => ({ success: true }),
    deleteWorker: async () => ({ success: true }),
    createProjectWorker: async () => ({ success: true, data: { id: 1 } }),
    batchCreateProjectWorkers: async () => ({ success: true, data: { count: 0 } }),
    updateProjectWorker: async () => ({ success: true }),
    deleteProjectWorker: async () => ({ success: true }),
    // 发票
    getInvoices: async () => ({ success: true, data: [] }),
    createInvoice: async () => ({ success: true, data: { id: 1 } }),
    updateInvoice: async () => ({ success: true }),
    deleteInvoice: async () => ({ success: true }),
    updateInvoiceStatus: async () => ({ success: true }),
    // 合同
    getIncomeContracts: async () => ({ success: true, data: [] }),
    getExpenseContracts: async () => ({ success: true, data: [] }),
    getAgreementContracts: async () => ({ success: true, data: [] }),
    getContracts: async () => ({ success: true, data: [] }),
    createIncomeContract: async () => ({ success: true, data: { id: 1 } }),
    createExpenseContract: async () => ({ success: true, data: { id: 1 } }),
    createContract: async () => ({ success: true, data: { id: 1 } }),
    updateIncomeContract: async () => ({ success: true }),
    updateExpenseContract: async () => ({ success: true }),
    deleteIncomeContract: async () => ({ success: true }),
    deleteExpenseContract: async () => ({ success: true }),
    deleteContract: async () => ({ success: true }),
    getContractStats: async () => ({ success: true, data: {} }),
    // 工资历史
    getWageHistory: async () => ({ success: true, data: [] }),
    getEffectiveWage: async () => ({ success: true, data: null }),
    getTeamWages: async () => ({ success: true, data: [] }),
    getDashboardStats: async () => ({
      success: true,
      data: {
        projectsCount: 0,
        membersCount: 0,
        materialsCount: 0,
        totalExpenses: 0,
        settlementsCount: 0,
        invoicesCount: 0,
        inventoryItemsCount: 0,
        inProgressProjects: 0,
      },
    }),
    saveFile: async () => ({ success: true, data: { fileName: '' } }),
    readFile: async () => ({ success: true, data: { dataUrl: '', mimeType: '' } }),
    deleteFile: async () => ({ success: true }),
    openFileExternal: async () => ({ success: true }),
    // 考勤
    getAttendances: async () => ({ success: true, data: [] }),
    getAttendancesByMember: async () => ({ success: true, data: [] }),
    createAttendance: async () => ({ success: true, data: { id: 1 } }),
    updateAttendance: async () => ({ success: true }),
    deleteAttendance: async () => ({ success: true }),
    batchDeleteAttendances: async () => ({ success: true, data: { deleted: 0 } }),
    batchCreateAttendances: async () => ({ success: true, data: { count: 0 } }),
    generateDefaultAttendances: async () => ({ success: true, data: { count: 0 } }),
    generateDefaultAttendancesV2: async () => ({ success: true, data: { count: 0 } }),
    batchImportAttendances: async () => ({ success: true, data: { created: 0, updated: 0 } }),
    // 工资
    getWages: async () => ({ success: true, data: [] }),
    generateForProject: async () => ({ success: true, data: { newCount: 0, archivedSkipped: 0 } }),
    createWage: async () => ({ success: true, data: { id: 1 } }),
    updateWage: async () => ({ success: true }),
    deleteWage: async () => ({ success: true }),
    batchDeleteWages: async () => ({ success: true, data: { deleted: 0 } }),
    batchClearPayments: async () => ({ success: true, data: { cleared: 0 } }),
    archiveWages: async () => ({ success: true, data: { archived: 0 } }),
    getWageStats: async () => ({ success: true, data: { totalWage: 0, count: 0, projectBreakdown: [] } }),
    matchBankReceiptItems: async () => ({ success: true, data: [] }),
    batchConfirmMatches: async () => ({ success: true, data: { updated: 0 } }),
    // 审计日志
    auditLog: async () => ({ success: true }),
    auditQuery: async () => ({ success: true, data: { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 } }),
    auditStats: async () => ({ success: true, data: { totalCount: 0, todayCount: 0, actionCounts: {}, resourceCounts: {}, topUsers: [] } }),
    auditClear: async () => ({ success: true, data: { removedCount: 0 } }),
    // 角色权限
    getRoles: async () => ({ success: true, data: [] }),
    updateRole: async () => ({ success: true }),
    resetRole: async () => ({ success: true, data: { permissions: [] } }),
    // OCR
    ocrBaiduIdCard: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduInvoice: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankCard: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBusinessLicense: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankReceipt: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduPermit: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduBankStatement: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduGeneralReceipt: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrBaiduCompanyQuery: async () => ({ success: false, error: 'Mock 环境不支持 OCR' }),
    ocrCheckNetwork: async () => ({ success: true, data: false }),
    ocrClearTokenCache: async () => ({ success: true, data: true }),
    ocrGetStats: async () => ({ success: true, data: { idCard: 0, invoice: 0, bankCard: 0, businessLicense: 0, bankReceipt: 0, permit: 0, bankStatement: 0, generalReceipt: 0, companyQuery: 0, lastReset: '' } }),
    // 认证
    authLogin: async () => ({ success: true, data: { id: '1', username: 'admin', role_id: 'admin' } }),
    authGetAllUsers: async () => ({ success: true, data: [] }),
    authGetCurrentUser: async () => ({ success: true, data: null }),
    authCreateUser: async () => ({ success: true, data: { id: '1' } }),
    authUpdateUser: async () => ({ success: true }),
    authDeleteUser: async () => ({ success: true }),
    // 配置
    getConfig: async () => ({ success: true, data: { dataPath: '', defaultPath: '', gpuAcceleration: true } }),
    getDataPath: async () => ({ success: true, data: '' }),
    setDataPath: async () => ({ success: true }),
    getGpuAcceleration: async () => ({ success: true, data: true }),
    setGpuAcceleration: async () => ({ success: true }),
    // 数据健康
    dataConsistencyCheck: async () => ({ success: true, data: { tables: [], consistent: true } }),
    dataIntegrityCheck: async () => ({ success: true, data: { ok: true } }),
    dataExportJson: async () => ({ success: true, data: { exported: 0 } }),
    dataReconcile: async () => ({ success: true, data: { reconciled: true } }),
    // SQLite
    sqliteStatus: async () => ({ success: true, data: { ready: true, mode: 'sqlite' } }),
    sqliteEnable: async () => ({ success: true }),
    sqliteMigrate: async () => ({ success: true }),
    sqliteGetReadMode: async () => ({ success: true, data: 'sqlite' }),
    sqliteSetReadMode: async () => ({ success: true }),
    // 图纸
    getDrawings: async () => ({ success: true, data: [] }),
    uploadDrawing: async () => ({ success: true, data: { id: 1 } }),
    updateDrawing: async () => ({ success: true }),
    deleteDrawing: async () => ({ success: true }),
    // 费用
    getExpenses: async () => ({ success: true, data: [] }),
    createExpense: async () => ({ success: true, data: { id: 1 } }),
    updateExpense: async () => ({ success: true }),
    deleteExpense: async () => ({ success: true }),
    // 库存
    getInventoryItems: async () => ({ success: true, data: [] }),
    createInventoryItem: async () => ({ success: true, data: { id: 1 } }),
    updateInventoryItem: async () => ({ success: true }),
    deleteInventoryItem: async () => ({ success: true }),
    getInventoryTransactions: async () => ({ success: true, data: [] }),
    createInventoryTransaction: async () => ({ success: true, data: { id: 1 } }),
    // 物料
    getMaterials: async () => ({ success: true, data: [] }),
    createMaterial: async () => ({ success: true, data: { id: 1 } }),
    updateMaterial: async () => ({ success: true }),
    deleteMaterial: async () => ({ success: true }),
    // 区域
    getRegions: async () => ({ success: true, data: [] }),
    createRegion: async () => ({ success: true, data: { id: 1 } }),
    deleteRegion: async () => ({ success: true }),
    // 监管单位
    getSupervisors: async () => ({ success: true, data: [] }),
    createSupervisor: async () => ({ success: true, data: { id: 1 } }),
    updateSupervisor: async () => ({ success: true }),
    deleteSupervisor: async () => ({ success: true }),
    // 项目成员
    getProjectMembers: async () => ({ success: true, data: [] }),
    addProjectMember: async () => ({ success: true, data: { id: 1 } }),
    removeProjectMember: async () => ({ success: true }),
    updateProjectMember: async () => ({ success: true }),
    // 班组
    getWorkerTeams: async () => ({ success: true, data: [] }),
    createWorkerTeam: async () => ({ success: true, data: { id: 1 } }),
    updateWorkerTeam: async () => ({ success: true }),
    deleteWorkerTeam: async () => ({ success: true }),
    // 收付款记录
    getPaymentRecords: async () => ({ success: true, data: [] }),
    createPaymentRecord: async () => ({ success: true, data: { id: 1 } }),
    updatePaymentRecord: async () => ({ success: true }),
    deletePaymentRecord: async () => ({ success: true }),
    // 合同模板
    getContractTemplates: async () => ({ success: true, data: [] }),
    createContractTemplate: async () => ({ success: true, data: { id: 1 } }),
    updateContractTemplate: async () => ({ success: true }),
    deleteContractTemplate: async () => ({ success: true }),
    // 工资扩展
    getWagePaymentRecords: async () => ({ success: true, data: [] }),
    getWageOverdueStats: async () => ({ success: true, data: { count: 0, amount: 0 } }),
    getWageOverdueList: async () => ({ success: true, data: [] }),
    batchArchiveWages: async () => ({ success: true, data: { archived: 0 } }),
    batchSaveWages: async () => ({ success: true, data: { saved: 0 } }),
    // 成本台账匹配规则
    getCostLedgerMatchRules: async () => ({ success: true, data: [] }),
    saveCostLedgerMatchRule: async () => ({ success: true, data: { id: 1 } }),
  };
}

/**
 * 导出环境检测结果
 */
export const environment = {
  isElectron,
  isTauri,
  isBrowser: !isElectron && !isTauri,
};

================
File: src/store/authStore.ts
================
/**
 * authStore - Zustand 认证状态管理
 * 
 * 替代 AuthContext，提供登录状态管理和权限检查
 * 注意：每次打开应用都需要重新登录，不会自动恢复登录状态
 * 这是为了安全考虑，防止他人未经授权访问
 */

import { create } from 'zustand'
import { setCurrentUser as setPermissionsUser, type AuthContext as PermissionsAuthContext } from '../types/permissions'
import { getAPI } from '@/services/api-adapter'
import { setCurrentAuditUser, logAudit } from '../utils/audit'

// 存储键
const AUTH_STORAGE_KEY = 'engineering_auth'

// 认证信息
export interface StoredAuth {
  userId: string
  username: string
  displayName: string
  roleId: string
  roleName: string
  permissions: string[]
  passwordIsDefault?: boolean
}

// Auth Store 接口
interface AuthState {
  isAuthenticated: boolean
  isLocked: boolean
  currentUser: StoredAuth | null
  
  // 操作方法
  login: (userData: StoredAuth) => void
  logout: () => void
  lock: () => void
  unlock: (username: string, password: string) => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 每次打开应用都需要重新登录，不从 localStorage 恢复会话
  // 自动登录由 Login.tsx 通过保存的凭据 + electronAPI.login() 实现
  localStorage.removeItem(AUTH_STORAGE_KEY)

  return {
    isAuthenticated: false,
    isLocked: false,
    currentUser: null,
    
    login: (userData: StoredAuth) => {
      set({
        currentUser: userData,
        isAuthenticated: true,
      })
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userData))
      
      // 同步到权限模块
      const permissionsUser: PermissionsAuthContext = {
        userId: userData.userId,
        username: userData.username,
        roleId: userData.roleId,
        roleName: userData.roleName,
        permissions: userData.permissions as any
      }
      setPermissionsUser(permissionsUser)
      // 接通审计用户 + 记录登录
      setCurrentAuditUser(userData.userId, userData.username)
      logAudit('login', 'auth', `用户登录: ${userData.username}`, { resourceName: userData.username })
    },
    
    logout: () => {
      const state = get()
      // 记录登出
      if (state.currentUser) {
        logAudit('logout', 'auth', `用户登出: ${state.currentUser.username}`, { resourceName: state.currentUser.username })
      }
      
      set({
        currentUser: null,
        isAuthenticated: false,
      })
      localStorage.removeItem(AUTH_STORAGE_KEY)
      localStorage.removeItem('login-auto')
      
      // 同步到权限模块
      setPermissionsUser(null)
      // 清除审计用户
      setCurrentAuditUser(null, null)
    },
    
    lock: () => {
      const state = get()
      if (state.currentUser) {
        logAudit('lock', 'auth', `用户锁定屏幕: ${state.currentUser.username}`, { resourceName: state.currentUser.username })
      }
      set({ isLocked: true })
    },
    
    unlock: async (username: string, password: string) => {
      try {
        const api = await getAPI()
        if (!api.login) return false
        const result = await api.login(username, password)
        if (result.success) {
          set({ isLocked: false })
          logAudit('unlock', 'auth', `用户解锁屏幕: ${username}`, { resourceName: username })
          return true
        }
        return false
      } catch {
        return false
      }
    },
  }
})

// 兼容旧代码的 Hook
export function useAuth() {
  const { isAuthenticated, isLocked, currentUser, login, logout, lock, unlock } = useAuthStore()
  return { isAuthenticated, isLocked, currentUser, login, logout, lock, unlock }
}

================
File: src/utils/iconMap.ts
================
import {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowRightLeft, ArrowUpCircle,
  BadgeCheck, Ban, Banknote, BarChart3, Bot, Briefcase, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit3, Eye, EyeOff,
  File, FileCheck, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HeartPulse, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Paperclip, Phone, PieChart, Plug, Plus, Power, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, Scan, ScrollText, Search, Settings, Shield, ShieldCheck, Snowflake, Sparkles, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, User, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
  type LucideIcon,
} from 'lucide-react'

export const iconMap: Record<string, LucideIcon> = {
  Activity, AlertCircle, AlertTriangle, ArrowDownCircle, ArrowLeft, ArrowLeftRight, ArrowRightLeft, ArrowUpCircle,
  BadgeCheck, Ban, Banknote, BarChart3, Bot, Briefcase, Building2,
  Calendar, CalendarCheck, Camera, Check, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardFile: ClipboardPen, ClipboardList, ClipboardPen, Clock, Construction, CreditCard,
  Database, DollarSign, Download, Droplets,
  Edit: Edit3, Edit3, Eye, EyeOff,
  File, FileCheck, FileJson, FileSpreadsheet, FileText, Filter, FolderKanban, FolderOpen,
  Globe,
  HardHat, HeartPulse, HelpCircle, Home,
  Image, Inbox, Info,
  Key,
  Landmark, LayoutDashboard, Lightbulb, Loader, Loader2, Lock, LogOut,
  Mail, MapPin, Menu, Monitor, Moon, MoreVertical,
  Package, PaintBucket, Palette: PaintBucket, Paperclip, Phone, PieChart, Plug, Plus, Power, Printer,
  Receipt, Redo, RefreshCw, RotateCcw, Ruler,
  Save, Scan, ScrollText, Search, Settings, Shield, ShieldCheck, Snowflake, Sparkles, Stamp, Sun,
  Trash2, TrendingDown, TrendingUp, Truck,
  Undo, Upload, User, UserCheck, UserCircle, UserCog, Users,
  Wallet, WifiOff, Wrench,
  X, XCircle, Zap,
}

export function getIcon(name: string): LucideIcon | undefined {
  return iconMap[name]
}

================
File: src/services/update-client.ts
================
import { apiClient } from './api-client'

export interface UpdatePackage {
  url: string
  size: number
  sha256: string
  signature?: string
}

export interface UpdateCheck {
  hasUpdate: boolean
  current: string
  latest: string
  forced: boolean
  notesUrl?: string
  package?: UpdatePackage
}

/** SSE 推送的下载进度 */
export interface DownloadProgress {
  phase: 'idle' | 'downloading' | 'verifying' | 'done' | 'error' | 'cancelled'
  bytesReceived: number
  totalBytes?: number
  percent?: number
  speedBytesPerSec?: number
  filePath?: string
  error?: string
}

/**
 * 检查版本更新 — 后端返回 Common.Ok 包装：{ success, data }
 * apiClient 已自动拆包并蛇形→驼峰转换
 */
export const checkUpdate = async (): Promise<UpdateCheck | null> => {
  const res = await apiClient.get<UpdateCheck>('/api/update/check')
  if (!res.success) return null
  return res.data ?? null
}

/** 启动后台下载（立即返回） */
export const startDownload = async (): Promise<boolean> => {
  const res = await apiClient.post<{ accepted: boolean }>('/api/update/download', {})
  return res.success && !!res.data?.accepted
}

/**
 * 订阅下载进度（SSE）。返回 EventSource，调用方在组件卸载时 eventSource.close()
 * onProgress 收到 snake_case → camelCase 转换后的进度对象
 */
export const subscribeDownloadProgress = (
  onProgress: (p: DownloadProgress) => void
): EventSource => {
  const base = import.meta.env.VITE_API_BASE || 'http://localhost:5048'
  const es = new EventSource(`${base}/api/update/download/stream`)
  es.onmessage = (e) => {
    try {
      const raw = JSON.parse(e.data)
      // 后端返回的 camelCase 经过 JSON 序列化后是 camelCase，直接使用
      onProgress(raw as DownloadProgress)
    } catch { /* ignore parse errors */ }
  }
  es.onerror = () => {
    // EventSource 自动重连，不做特殊处理
  }
  return es
}

/** 取消下载 */
export const cancelDownload = async (): Promise<boolean> => {
  const res = await apiClient.post('/api/update/download/cancel', {})
  return res.success
}

/** 装包 + 重启 */
export const applyUpdate = async (path: string): Promise<boolean> => {
  const res = await apiClient.post('/api/update/apply', { path })
  return res.success
}

================
File: src/services/agent-client.ts
================
/**
 * Agent API 客户端
 *
 * 对应后端 /api/agent/* 端点
 * 复用 api-client.ts 的认证和请求封装
 */

import { apiClient } from './api-client'
import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentConversation,
  AgentConversationDetail,
  LlmProviderStatus,
  LlmProviderTestRequest,
  LlmProviderTestResponse,
  LlmProviderConfig,
  ToolCallResult,
} from '../types/agent'

// ═══════════════════════════════════════════════════════════════
// 聊天对话（核心功能）
// ═══════════════════════════════════════════════════════════════

/**
 * 发送消息给 Agent
 * @param request 聊天请求（message + 可选 conversationId）
 * @returns 聊天响应（含 AI 回复和工具调用结果）
 */
export async function sendAgentMessage(
  request: AgentChatRequest
): Promise<AgentChatResponse> {
  const result = await apiClient.post<AgentChatResponse>('/api/agent/chat', request)
  if (!result.success || !result.data) {
    return {
      success: false,
      conversationId: 0,
      error: result.error || '发送消息失败',
    }
  }
  return result.data
}

// ═══════════════════════════════════════════════════════════════
// 对话历史管理
// ═══════════════════════════════════════════════════════════════

/**
 * 获取用户的对话列表
 */
export async function getAgentConversations(): Promise<AgentConversation[]> {
  const result = await apiClient.get<{ success: boolean; data: AgentConversation[] }>(
    '/api/agent/conversations'
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话列表失败:', result.error)
    return []
  }
  return result.data.data || []
}

/**
 * 获取对话详情（含消息列表）
 * @param conversationId 对话 ID
 */
export async function getAgentConversationDetail(
  conversationId: number
): Promise<AgentConversationDetail | null> {
  const result = await apiClient.get<{ success: boolean; data: AgentConversationDetail }>(
    `/api/agent/conversations/${conversationId}`
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取对话详情失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 删除对话（软删除）
 * @param conversationId 对话 ID
 */
export async function deleteAgentConversation(
  conversationId: number
): Promise<boolean> {
  const result = await apiClient.del<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}`
  )
  return result.success
}

/**
 * 重命名对话
 * @param conversationId 对话 ID
 * @param title 新标题
 */
export async function renameAgentConversation(
  conversationId: number,
  title: string
): Promise<boolean> {
  const result = await apiClient.put<{ success: boolean }>(
    `/api/agent/conversations/${conversationId}`,
    { title }
  )
  return result.success
}

// ═══════════════════════════════════════════════════════════════
// LLM 配置管理
// ═══════════════════════════════════════════════════════════════

/**
 * 检查 LLM 配置状态（白名单，无需登录）
 */
export async function getLlmProviderStatus(): Promise<LlmProviderStatus | null> {
  const result = await apiClient.get<{ success: boolean; data: LlmProviderStatus }>(
    '/api/agent/setup/status'
  )
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 状态失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 测试 LLM 连接（白名单，无需登录）
 * @param request 测试请求（baseUrl + apiKey）
 */
export async function testLlmProviderConnection(
  request: LlmProviderTestRequest
): Promise<LlmProviderTestResponse> {
  const result = await apiClient.post<LlmProviderTestResponse>(
    '/api/agent/setup/test',
    request
  )
  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || '测试连接失败',
    }
  }
  return result.data
}

/**
 * 保存 LLM 配置（需 admin 权限，DPAPI 加密存储）
 * @param config LLM 配置
 */
export async function saveLlmProviderConfig(
  config: LlmProviderConfig
): Promise<{ success: boolean; error?: string }> {
  const result = await apiClient.post<{ success: boolean; message?: string }>(
    '/api/agent/setup/save',
    config
  )
  if (!result.success) {
    return {
      success: false,
      error: result.error || '保存配置失败',
    }
  }
  return { success: true }
}

/**
 * 获取当前生效的 LLM 配置（不含 apiKey）
 */
export async function getLlmProviderConfig(): Promise<{
  providerName: string
  baseUrl: string
  model: string
  useBuiltIn: boolean
  temperature: number
  maxTokens: number
  hasApiKey: boolean
} | null> {
  const result = await apiClient.get<{
    success: boolean
    data: {
      providerName: string
      baseUrl: string
      model: string
      useBuiltIn: boolean
      temperature: number
      maxTokens: number
      hasApiKey: boolean
    }
  }>('/api/agent/config')
  if (!result.success || !result.data) {
    console.warn('[AgentClient] 获取 LLM 配置失败:', result.error)
    return null
  }
  return result.data.data || null
}

/**
 * 重新加载 LLM 配置（需 admin 权限）
 */
export async function reloadLlmProviderConfig(): Promise<boolean> {
  const result = await apiClient.post<{ success: boolean }>(
    '/api/agent/config/reload',
    {}
  )
  return result.success
}

// ===================== 流式聊天 (2a) =====================

export interface AgentStreamCallbacks {
  onConversationId?: (conversationId: number) => void
  onTool?: (name: string) => void
  onContent?: (text: string) => void
  onDone?: (payload: {
    conversationId: number
    toolCalls?: ToolCallResult[]
    message?: string
  }) => void
  onError?: (error: string) => void
}

const AGENT_STREAM_BASE =
  import.meta.env.VITE_API_BASE || 'http://localhost:5048'

/**
 * 流式发送 Agent 消息。逐块回调；出错/环境不支持时抛异常，交给调用方回退到 sendAgentMessage。
 */
export async function sendAgentMessageStream(
  request: AgentChatRequest,
  callbacks: AgentStreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  if (typeof ReadableStream === 'undefined') {
    throw new Error('ReadableStream not supported')
  }

  const token = localStorage.getItem('jwt_token')
  const response = await fetch(`${AGENT_STREAM_BASE}/api/agent/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
    signal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`stream request failed: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    // 逐块读取，用空行(\n\n)切分 SSE 事件
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)
        dispatchSseEvent(rawEvent, callbacks)
      }
    }
    // 冲刷残余
    if (buffer.trim().length > 0) {
      dispatchSseEvent(buffer, callbacks)
    }
  } finally {
    reader.releaseLock()
  }
}

function dispatchSseEvent(
  rawEvent: string,
  callbacks: AgentStreamCallbacks,
): void {
  // 一个事件块可能含多行，只取 data: 行
  for (const line of rawEvent.split('\n')) {
    const trimmed = line.trimStart()
    if (!trimmed.startsWith('data:')) continue
    const jsonStr = trimmed.slice('data:'.length).trim()
    if (!jsonStr) continue

    let evt: {
      type?: string
      conversationId?: number
      name?: string
      text?: string
      toolCalls?: ToolCallResult[]
      message?: string
      error?: string
    }
    try {
      evt = JSON.parse(jsonStr)
    } catch {
      continue // 半包/坏行，跳过
    }

    switch (evt.type) {
      case 'conversation_id':
        if (typeof evt.conversationId === 'number')
          callbacks.onConversationId?.(evt.conversationId)
        break
      case 'tool':
        callbacks.onTool?.(evt.name ?? '')
        break
      case 'content':
        callbacks.onContent?.(evt.text ?? '')
        break
      case 'done':
        callbacks.onDone?.({
          conversationId: evt.conversationId ?? 0,
          toolCalls: evt.toolCalls,
          message: evt.message,
        })
        break
      case 'error':
        callbacks.onError?.(evt.error ?? 'unknown error')
        break
      default:
        break
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// OCR 图片识别（附件）
// ═══════════════════════════════════════════════════════════════

export interface OcrRecognizeResult {
  success: boolean
  text?: string
  error?: string
}

/**
 * 通用票据 OCR：识别图片中的文字（复用 /api/ocr/general-receipt，百度 accurate_basic）。
 * 后端 /api/ocr/general-receipt 用 Results.Ok 直接返回裸 body {success,text,generalReceipt}，
 * apiClient.post 也直接返回裸 body（无 .data 包裹）；失败时返回 {success:false,error}。
 * 后端会自动剥离 dataURL 前缀，可直接传 FileReader 的 dataURL。
 */
export async function recognizeReceiptText(
  imageBase64: string,
): Promise<OcrRecognizeResult> {
  const raw = (await apiClient.post<unknown>('/api/ocr/general-receipt', {
    imageBase64,
  })) as { success?: boolean; text?: string; error?: string }
  if (raw?.success && typeof raw.text === 'string') {
    return { success: true, text: raw.text }
  }
  return { success: false, error: raw?.error || 'OCR 识别失败' }
}

================
File: src/App.tsx
================
import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { getAPI } from './services/api-adapter'
import Sidebar from './components/Sidebar'
import TitleBar from './components/TitleBar'
import StatusBar from './components/StatusBar'
import { useStatusStore } from './store/statusStore'
import { UpdateBanner } from './components/UpdateBanner'
import { NAV_ITEMS, PAGE_IDS, getFilteredSidebarRoutes } from './routes'
import { MaskProvider, useUserIdSync } from './contexts/MaskContext'
import { UpdaterProvider } from './hooks/useUpdater'
import { RequirePermission, RequireAdmin } from './hooks/usePermission'
import { useAuth } from './hooks/useAuth'
import { useRowHoverOpacity } from './hooks/useRowHoverOpacity'
import { useTheme } from './hooks/useTheme'

// ── 路由级代码分割：每个页面独立 chunk ──
const Dashboard = lazy(() => import('./components/features/agent/AgentDashboard'))
const Projects = lazy(() => import('./components/Projects'))
const Contracts = lazy(() => import('./components/Contracts'))
const Members = lazy(() => import('./components/Members'))
const HRManagement = lazy(() => import('./components/HRManagement'))
const LaborManagement = lazy(() => import('./components/LaborManagement'))
const CostLedger = lazy(() => import('./components/CostLedger'))
const Drawings = lazy(() => import('./components/Drawings'))
const Partners = lazy(() => import('./components/Partners'))
const WageManagement = lazy(() => import('./components/WageManagement'))
const Settlement = lazy(() => import('./components/Settlement'))
const Templates = lazy(() => import('./components/Templates'))
const Inventory = lazy(() => import('./components/Inventory'))
const Invoices = lazy(() => import('./components/Invoices'))
const Settings = lazy(() => import('./components/Settings'))
const Users = lazy(() => import('./components/Users'))
import LockScreen from './components/LockScreen'
import SplashScreen from './components/SplashScreen'

type WebViewWindow = Window & { chrome?: { webview?: { postMessage: (msg: string) => void; addEventListener: (event: string, handler: (e: any) => void) => void; removeEventListener: (event: string, handler: (e: any) => void) => void } } };
const getWebview = () => (window as WebViewWindow).chrome?.webview;
const Login = lazy(() => import('./components/Login'))

// 加载占位 — 品牌化动画
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center gap-4" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
    <motion.div
      animate={{
        scale: [1, 1.08, 1],
        opacity: [0.5, 1, 0.5],
      }}
      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg width="40" height="40" viewBox="0 0 18 18" fill="none">
        <defs>
          <linearGradient id="loader-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.6" />
          </linearGradient>
          <mask id="loader-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask>
        </defs>
        <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#loader-grad)" mask="url(#loader-mask)" />
      </svg>
    </motion.div>
    <div className="flex gap-1.5">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accent)' }}
        />
      ))}
    </div>
  </div>
)

type Page = typeof PAGE_IDS[number]

const AppContent: React.FC = () => {
  const { isAuthenticated, isLocked, currentUser, logout, lock } = useAuth()
  useUserIdSync(currentUser?.userId) // v0.76.0: 登录后从后端拉 PII mask toggle 覆盖 localStorage
  useTheme() // 启动时从 localStorage 读取并设置 data-theme
  useRowHoverOpacity() // 初始化表格行悬停 CSS 变量

  // 启动动画状态
  const [showSplash, setShowSplash] = useState(true)

  // 全屏状态
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [showTitleBarInFullScreen, setShowTitleBarInFullScreen] = useState(false)
  const hideTitleBarTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 监听全屏状态变化（来自 C# 端）
  useEffect(() => {
    const webview = getWebview()
    if (!webview) return

    const handler = (event: any) => {
      try {
        const data = JSON.parse(event.data)
          if (data.type === 'fullScreenChange') {
            setIsFullScreen(data.isFullScreen)
            if (!data.isFullScreen) {
              setShowTitleBarInFullScreen(false)
              if (hideTitleBarTimer.current) clearTimeout(hideTitleBarTimer.current)
            }
          }
        } catch (err) { console.warn('[App] 解析webview消息失败:', err) }
    }
    webview.addEventListener('message', handler)
    return () => webview.removeEventListener('message', handler)
  }, [])

  // 全屏模式下，鼠标靠近顶部时显示标题栏
  useEffect(() => {
    if (!isFullScreen) return

    const TRIGGER_ZONE = 5 // 顶部 5px 触发区域
    const HIDE_DELAY = 2000 // 2 秒后隐藏

    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY <= TRIGGER_ZONE) {
        // 鼠标靠近顶部，显示标题栏
        setShowTitleBarInFullScreen(true)
        if (hideTitleBarTimer.current) clearTimeout(hideTitleBarTimer.current)
        hideTitleBarTimer.current = setTimeout(() => {
          setShowTitleBarInFullScreen(false)
        }, HIDE_DELAY)
      }
    }

    const handleMouseLeave = () => {
      // 鼠标离开窗口，延迟隐藏
      if (hideTitleBarTimer.current) clearTimeout(hideTitleBarTimer.current)
      hideTitleBarTimer.current = setTimeout(() => {
        setShowTitleBarInFullScreen(false)
      }, 1000)
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
      if (hideTitleBarTimer.current) clearTimeout(hideTitleBarTimer.current)
    }
  }, [isFullScreen])

  // 全屏模式下，鼠标进入标题栏时取消隐藏定时器
  const handleTitleBarMouseEnter = useCallback(() => {
    if (hideTitleBarTimer.current) {
      clearTimeout(hideTitleBarTimer.current)
      hideTitleBarTimer.current = null
    }
  }, [])

  // 全屏模式下，鼠标离开标题栏时启动隐藏定时器
  const handleTitleBarMouseLeave = useCallback(() => {
    if (isFullScreen) {
      hideTitleBarTimer.current = setTimeout(() => {
        setShowTitleBarInFullScreen(false)
      }, 1500)
    }
  }, [isFullScreen])

  // 登录成功后放大窗口
  useEffect(() => {
    if (isAuthenticated) {
      getAPI().then(api => api?.resizeForApp?.()).catch(() => {})
    }
  }, [isAuthenticated])

  const [currentPage, setCurrentPage] = useState<Page>('dashboard')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    const stored = localStorage.getItem('sidebar-collapsed')
    return stored !== 'true' // 默认展开
  })
  const [closedDefaultPwd, setClosedDefaultPwd] = useState(false)

  const refresh = () => setRefreshTrigger(prev => prev + 1)

  // 同步当前页面名到状态栏
  const setPageName = useStatusStore(s => s.setPageName)
  useEffect(() => {
    setPageName(currentPage)
  }, [currentPage, setPageName])

  // 持久化侧边栏折叠状态
  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(!sidebarOpen))
  }, [sidebarOpen])

  // 快捷键：Ctrl+B 折叠侧边栏，Ctrl+L 锁屏，F11 全屏，Esc 退出全屏
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setSidebarOpen(v => !v)
      }
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault()
        lock()
      }
      if (e.key === 'F11') {
        e.preventDefault()
        getAPI().then(api => api?.setFullScreen?.()).catch(() => {})
      }
      // Esc 退出全屏
      if (e.key === 'Escape' && isFullScreen) {
        e.preventDefault()
        getAPI().then(api => api?.setFullScreen?.()).catch(() => {})
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lock, isFullScreen])

  const navItems = useMemo(() => {
    // 权限可能是字符串 "[]" 或数组，统一解析
    let perms: string[] = []
    try {
      perms = typeof currentUser?.permissions === 'string'
        ? JSON.parse(currentUser.permissions || '[]')
        : (currentUser?.permissions || [])
    } catch { perms = [] }
    if (!perms || perms.length === 0) return NAV_ITEMS
    return getFilteredSidebarRoutes(perms)
  }, [currentUser?.permissions])

  useEffect(() => {
    const handleNavigate = (e: Event) => {
      const page = (e as CustomEvent).detail as Page
      if (PAGE_IDS.includes(page)) { setCurrentPage(page) }
    }
    window.addEventListener('navigate', handleNavigate)
    return () => window.removeEventListener('navigate', handleNavigate)
  }, [])

  const renderPage = () => {
    const props = { refresh, refreshTrigger }
    switch (currentPage) {
      case 'dashboard': return <Dashboard />
      case 'projects': return <Projects {...props} />
      case 'contracts': return <Contracts {...props} />
      case 'members': return <Members {...props} />
      case 'hr': return <HRManagement />
      case 'labor': return <LaborManagement />
      case 'expenses': return <CostLedger />
      case 'costLedger': return <CostLedger />
      case 'drawings': return <Drawings {...props} />
      case 'partners': return <Partners {...props} />
      case 'wages': return <WageManagement />
      case 'settlement': return <Settlement {...props} />
      case 'templates': return <Templates />
      case 'inventory': return <Inventory {...props} />
      case 'invoices': return <Invoices {...props} />
      case 'users': return <RequireAdmin><Users /></RequireAdmin>
      case 'settings': return <RequirePermission permission="settings:read"><Settings /></RequirePermission>
      default: return <Dashboard />
    }
  }

  // 启动动画
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />
  }

  if (!isAuthenticated) {
    return <Suspense fallback={<PageLoader />}><Login onLoginSuccess={() => {}} /></Suspense>
  }

  // 判断是否显示标题栏
  const shouldShowTitleBar = !isFullScreen || showTitleBarInFullScreen

  return (
    <div className="h-screen relative overflow-hidden select-none flex flex-col bg-slate-50"
         style={{
           boxShadow: '0 0 0 1px rgba(0,0,0,0.08), 0 0 20px rgba(0,0,0,0.08)',
         } as React.CSSProperties}>
      {/* 标题栏：正常模式始终显示，全屏模式鼠标靠近顶部时显示 */}
      <AnimatePresence>
        {shouldShowTitleBar && (
          <motion.div
            initial={isFullScreen ? { y: -36, opacity: 0 } : false}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -36, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onMouseEnter={handleTitleBarMouseEnter}
            onMouseLeave={handleTitleBarMouseLeave}
            className={isFullScreen ? 'absolute top-0 left-0 right-0 z-50' : ''}
          >
            <TitleBar collapsed={!sidebarOpen} onToggleCollapse={() => setSidebarOpen(v => !v)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        {/* 全屏时隐藏侧边栏 */}
        {!isFullScreen && (
          <Sidebar currentPage={currentPage} onNavigate={setCurrentPage}
            onSettings={() => setCurrentPage('settings')}
            onUsers={() => setCurrentPage('users')}
            onLock={lock}
            currentUser={currentUser} onLogout={logout} navItems={navItems}
            collapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen(v => !v)} />
        )}
        <AnimatePresence>
          {isLocked && <LockScreen />}
        </AnimatePresence>
        <main className="flex-1 overflow-auto">
          <UpdateBanner />
          {/* 默认密码提示 — 悬浮浮动，不挤压布局 */}
          <AnimatePresence>
            {currentUser?.passwordIsDefault && !closedDefaultPwd && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="fixed top-12 left-0 right-0 z-[200] flex justify-center pointer-events-none"
              >
                <div className="bg-amber-50 border border-amber-200 shadow-lg rounded-lg px-4 py-2.5 text-sm text-amber-800 flex items-center gap-3 pointer-events-auto">
                  <span>⚠️ 当前正在使用默认密码 admin123，为安全建议尽快在【设置 → 用户管理】中自行修改。</span>
                  <button onClick={() => setClosedDefaultPwd(true)} className="text-amber-400 hover:text-amber-600 text-lg leading-none flex-shrink-0">&times;</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait">
            <motion.div key={currentPage} className="min-h-full"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}>
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* 全屏时隐藏状态栏 */}
      {!isFullScreen && <StatusBar />}


      {/* 窗口边缘 resize 手柄 */}
      <div className="fixed top-0 left-0 right-0 h-1.5 cursor-n-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'top' })) }} />
      <div className="fixed bottom-0 left-0 right-0 h-1.5 cursor-s-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'bottom' })) }} />
      <div className="fixed top-0 left-0 bottom-0 w-1.5 cursor-w-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'left' })) }} />
      <div className="fixed top-0 right-0 bottom-0 w-1.5 cursor-e-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'right' })) }} />
      {/* 四角 */}
      <div className="fixed top-0 left-0 w-4 h-4 cursor-nw-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'top-left' })) }} />
      <div className="fixed top-0 right-0 w-4 h-4 cursor-ne-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'top-right' })) }} />
      <div className="fixed bottom-0 left-0 w-4 h-4 cursor-sw-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'bottom-left' })) }} />
      <div className="fixed bottom-0 right-0 w-4 h-4 cursor-se-resize z-50"
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); getWebview()?.postMessage(JSON.stringify({ action: 'startResize', edge: 'bottom-right' })) }} />
    </div>
  )
}

function App() {
  // v0.76.0 累计待办 #3: react-query 完整接入 — 全局 QueryClient
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    },
  }))
  return (
    <QueryClientProvider client={queryClient}>
      <MaskProvider>
        <UpdaterProvider>
          <AppContent />
        </UpdaterProvider>
      </MaskProvider>
    </QueryClientProvider>
  )
}

export default App

================
File: src/version.ts
================
// 此文件由 scripts/sync-version.mjs 自动生成，请勿手动修改
export const APP_VERSION = '0.82.1'

================
File: src/constants/changelog.ts
================
/**
 * 工程管家 更新日志数据（v1.0.0 拆分自 src/components/SettingsChangelog.tsx）
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │  更新日志写作规范（v0.81.0 起，必读）                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │ 1. 语言：大白话，普通人能看懂                                  │
 * │    ✅ "安装时选的数据存放位置，装完发现没被用上？修好了"         │
 * │    ❌ "修复 JsonElement 类型匹配导致 dataPath 读取失败"        │
 * │                                                              │
 * │ 2. 格式：所有版本统一用 groups 分组格式（与 GitHub Release 一致）│
 * │    常用分组标题：                                              │
 * │    - "🐛 Bug 修复"    — 修好的问题                            │
 * │    - "✨ 体验优化"    — 改善但不算新功能的                     │
 * │    - "🚀 新功能"      — 用户能用上的新东西                    │
 * │    - "🔧 技术优化"    — 用户无感但更稳定的（尽量少写或合并）    │
 * │                                                              │
 * │ 3. 条目写法：**粗体标题** + 大白话描述                         │
 * │    示例：'**默认密码提示改密后不消失**：改了密码但提示还在？   │
 * │           现在改完密码提示会自动消失'                          │
 * │                                                              │
 * │ 4. 同步：更新日志内容必须与 GitHub Release notes 保持一致      │
 * │    写完 changelog.ts → 同步到 GitHub Release 描述             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * 版本号规则（遵循 SemVer 2.0.0）：
 * - 当前阶段：0.y.z（初始开发阶段，API 不稳定）
 * - 0.y.z → 0.y+1.0：每次发布都递增次版本号
 * - 1.0.0：当项目稳定下来、准备对外承诺向后兼容时才发布
 *
 * 版本号变更历史：
 * - 项目早期采用了 1.x/2.x/3.x 的版本方案
 * - 2026-05-27 按 SemVer 规范重置为 0.y.z
 * - 从最初的 v1.0.0（2026-05-01）开始累计
 * - 54 个历史版本从 v1.0.0（0.1.0）到 v3.1.0（0.54.0）
 */

export interface ChangelogGroup {
  /** 分组标题，如 "🐛 Bug 修复" */
  label: string
  items: string[]
}

export interface ChangelogVersion {
  v: string
  date: string
  /** 扁平列表（旧格式兼容） */
  items?: string[]
  /** 分组列表（与 GitHub Release 一致） */
  groups?: ChangelogGroup[]
}
export const versions: ChangelogVersion[] = [
  { v: 'v0.82.1', date: '2026-07-05', groups: [
    { label: '✨ 体验优化', items: [
      '**启动速度大幅提升**：去掉了启动动画的固定等待时间（从 2.8 秒缩短到 0.8 秒），动画还在、只是快多了',
      '**窗口打开更快**：以前双击后要先等后端启动完才弹窗口，现在窗口和后端同时启动，省掉了一段干等时间',
      '**启动中不再白屏**：后端启动慢时窗口会显示"正在启动…"带 Logo 动画的占位页，不再是空白窗口',
    ] },
  ] },
  { v: 'v0.82.0', date: '2026-07-04', groups: [
    { label: '🚀 新功能', items: [
      '**支持从 Windows「程序和功能」卸载**：现在工程管家会像正常软件一样出现在「控制面板 → 程序和功能」列表里，可以从那里一键卸载（之前卸载器虽然装进去了，但没登记到系统卸载列表，得自己手动找）',
    ] },
    { label: '✨ 体验优化', items: [
      '**卸载更干净彻底**：点卸载后程序会先把自己复制到临时目录再运行删除，避免"程序删不掉自己"的问题，卸载后不留残留文件；你设置的数据存放文件夹永远不会被删',
    ] },
  ] },
  { v: 'v0.81.7', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**设置页下载更新无进度条**：根因是设置页和顶部通知条各自独立管理更新状态，互不共享。现已改为全局共享状态，在设置页下载更新时也能看到进度条和暂停/取消按钮',
    ] },
  ] },
  { v: 'v0.81.6', date: '2026-07-02', groups: [
    { label: '✨ 体验优化', items: [
      '**下载更新支持暂停/继续**：下载进度条现在有暂停和取消两个按钮（之前两个都是取消，重复了），暂停后可以继续下载，利用断点续传不丢进度',
    ] },
  ] },
  { v: 'v0.81.5', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**更新后版本号仍显示旧版**：三个根因一次性修复：①安装器更新时自动杀旧进程确保 C# 程序文件被正确覆盖；②版本号同步提前到编译之前解决 exe 版本滞后问题；③WebView2 改用版本化缓存目录，每个版本独立缓存，从根源杜绝旧前端残留',
    ] },
  ] },
  { v: 'v0.81.4', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**更新后前端版本号和日志仍显示旧版**：根因是 WebView2 浏览器内核缓存了旧前端文件，现在软件启动时检测版本变化会自动清理缓存，确保加载最新界面',
    ] },
  ] },
  { v: 'v0.81.3', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**更新后版本号和更新日志不刷新**：安装更新后打开软件发现版本号还是旧的、更新日志也没变？这是浏览器缓存了旧页面导致的，现在装更新时会自动清理旧文件，服务器也加了禁止缓存',
    ] },
  ] },
  { v: 'v0.81.2', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**下载完成后文件被占用导致崩溃**：杀毒软件短暂锁住文件时，下载收尾的改名操作会失败崩溃，现在会自动重试几次',
      '**快速连点更新按钮启动多个下载**：现在同一个下载只会跑一个，重复点击不会冲突',
      '**代理服务器只连不回时下载永久卡死**：加了 10 秒连接超时，超时自动切到下一个下载源',
      '**健康检查接口版本号不同步**：改成自动读程序集版本，不再手动维护',
    ] },
    { label: '✨ 体验优化', items: [
      '**下载可以取消了**：下载过程中可以随时点取消，不用干等',
    ] },
    { label: '🔧 技术优化', items: [
      '**防止下载多写垃圾数据**：源服务器多吐的尾部数据会被裁掉，保证文件大小精确',
    ] },
  ] },
  { v: 'v0.81.1', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**自动更新下载链接失效**：之前用的两个下载加速链接挂了，现在去掉了，换成了新的加速源',
    ] },
    { label: '🔧 技术优化', items: [
      '**下载加速源改为自动管理**：以前每个版本的下载链接都要手写一遍，现在只需要维护加速地址前缀，版本号自动拼接，发版更省事了',
    ] },
  ] },
  { v: 'v0.81.0', date: '2026-07-02', groups: [
    { label: '🐛 Bug 修复', items: [
      '**安装器设置「数据存储路径」不生效**：安装时选的数据存放位置，装完发现没被用上？修好了，现在装完就用你选的路径',
      '**默认密码提示改密后不消失**：改了密码但提示还在？现在改完密码提示会自动消失',
      '**默认密码提示挤压界面 + 没居中**：提示条改成悬浮显示，不再把页面往下挤了',
      '**安装器路径覆盖 bug**：安装器内部逻辑修复，不再覆盖你选的路径',
    ] },
    { label: '✨ 体验优化', items: [
      '**发现新版本提示**：改成悬浮显示在最顶层，不管你怎么切换页面或滚动都能看到，不会挤压界面，还加了关闭按钮——不想现在更新？点 × 就行',
    ] },
  ] },
  { v: 'v0.80.0', date: '2026-06-30', groups: [
    { label: '🚀 新功能', items: [
      '**应用内自动更新**：发现新版本自动提示，一键下载安装重启，不用手动下载安装包',
      '**强制更新**：关键安全更新会强制更新，不能跳过',
    ] },
    { label: '✨ 体验优化', items: [
      '**下载进度条**：下载有进度条，显示百分比和速度',
      '**多源下载**：优先国内 CDN，不行再走 GitHub，下载更快更稳',
      '**版本号统一**：版本号全局统一，安装包文件名改为英文',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**工人地址字段脱敏**：不同角色看到的信息范围更精确了',
      '**AI 助手安全修复**：AI 助手数据库查询修复了 3 个安全问题',
    ] },
  ] },
  { v: 'v0.79.0', date: '2026-06-29', groups: [
    { label: '🚀 新功能', items: [
      '**AI 查询工具箱**：新增 13 个智能查询工具，可以用口语问项目、查发票、查成本，不用自己翻菜单',
      '**AI 自定义 SQL**：高级用户可以让 AI 写 SQL 查数据库，有 10 重安全护栏保护，不怕 AI 乱来',
      '**模型切换**：管理员可以配置 AI 用哪个模型，不用改代码',
    ] },
    { label: '✨ 体验优化', items: [
      '**AI 逐字回复**：AI 回复现在逐字显示，不用等一整段生成完才看到',
      '**AI 更聪明**：系统提示里加了业务术语字典和工具选择指引，问话选工具更准',
      '**AI 查询更安全**：所有查询只能读不能改，敏感信息自动打码，不同角色看不同数据',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**AI 查询工具用不了**：修复了工人、库存的 AI 查询工具有权限但用不了的问题',
      '**首页数据越权**：修复了首页概览数据跨公司越权的问题（不同公司只能看到自己的数据）',
      '**成本汇总安全问题**：修复了成本汇总 SQL 字符串拼接的安全问题',
      '**新建部门报错**：修复了新建部门总报"操作失败"的问题（岗位列表传参格式不一致）',
      '**安装器浏览按钮**：安装器现在可以正常用"浏览"按钮选择安装目录了',
      '**合同模板崩溃**：合同模板页面不再崩溃了（修复了空模板数据的兼容问题）',
      '**工人班组 key 警告**：工人班组列表页面不再报 key 警告',
    ] },
    { label: '🔧 技术优化', items: [
      '**编辑部门接口补充**：之前只支持新建和删除，现在补上了编辑功能',
    ] },
  ] },
  { v: 'v0.78.3', date: '2026-06-26', groups: [
    { label: '🚀 新功能', items: [
      '**AI 助手入驻**：内置智能查询助手，可以用口语问项目、查发票、看成本，不用翻菜单',
    ] },
    { label: '✨ 体验优化', items: [
      '**登录提示中文化**：密码输错现在显示中文提示，不再是看不懂的错误码',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**6 处页面崩溃修复**：修复了数据回滚、审计日志、密码输入等 6 处页面崩溃问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**清理调试日志**：清除了大量旧的调试日志和测试文件，软件跑起来更轻快',
    ] },
  ] },
  { v: 'v0.78.2', date: '2026-06-24', groups: [
    { label: '🔧 技术优化', items: [
      '**按钮样式统一**：98 个文件的按钮样式统一、颜色值集中管理',
      '**大文件拆分**：200 多个大文件拆分成小模块，页面加载更快',
      '**清理废弃文件**：清理了近 2000 行废弃设计稿文件',
      '**类型安全加固**：去掉了 300 多处类型强制（as any），代码更健壮',
      '**颜色常量化**：所有颜色的十六进制色号统一抽成了有名字的常量，换主题更容易',
    ] },
  ] },
  { v: 'v0.78.1', date: '2026-06-21', groups: [
    { label: '✨ 体验优化', items: [
      '**敏感信息重新加密更快**：后台分批处理，不会卡住界面',
    ] },
  ] },
  { v: 'v0.78.0', date: '2026-06-21', groups: [
    { label: '🚀 新功能', items: [
      '**密钥轮换**：管理员可以一键用新密钥重新加密所有已存数据，密钥轮换不影响使用',
    ] },
    { label: '✨ 体验优化', items: [
      '**密钥轮换进度条**：设置页显示重新加密的实时进度条',
      '**加密断点续传**：加密过程中即使中途中断，重启后也能继续，不会丢数据',
    ] },
  ] },
  { v: 'v0.77.2', date: '2026-06-21', groups: [
    { label: '🐛 Bug 修复', items: [
      '**错误信息泄露修复**：系统报错时不再泄露内部路径信息，错误提示更友好',
    ] },
  ] },
  { v: 'v0.77.1', date: '2026-06-21', groups: [
    { label: '🐛 Bug 修复', items: [
      '**OCR 误判修复**：修复了扫描识别功能的误判问题，不再错误提示"识别成功"但实际没识别出来',
    ] },
  ] },
  { v: 'v0.77.0', date: '2026-06-21', groups: [
    { label: '🔧 技术优化', items: [
      '**数据同步准备**：后端架构升级，为后续云同步功能打好基础',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**18 处错误信息泄露**：现在不会在报错时暴露内部路径和堆栈信息了',
      '**企业查询假成功**：修复了 2 处企业查询返回假成功的问题（之前有时报"成功"但实际没查到数据）',
      '**OCR 假成功**：修复了 OCR 识别的 8 处假成功问题（之前有时报"识别成功"但实际没识别出内容）',
    ] },
  ] },
  { v: 'v0.76.0', date: '2026-06-20', groups: [
    { label: '🚀 新功能', items: [
      '**敏感信息加密存储**：身份证、手机号、银行账号等敏感字段存储时自动加密，即使数据库泄露也看不到明文',
      '**密钥轮换**：管理员可以更换加密密钥，旧数据旧密钥加密的会自动重新加密',
      '**项目管理负责人**：项目管理新增"负责人"字段，可以指定项目由谁负责',
      '**合同对方单位**：合同管理新增"对方单位"字段，合同关联单位更清晰',
      '**合作单位税号**：合作单位新增税号字段',
    ] },
    { label: '✨ 体验优化', items: [
      '**页面加载更流畅**：全面采用 react-query 数据缓存技术，翻页、切换不再重复加载',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**页面白屏修复**：修复了多处页面加载时短暂白屏的问题',
    ] },
  ] },
  { v: 'v0.75.3', date: '2026-06-20', groups: [
    { label: '🐛 Bug 修复', items: [
      '**模板提示不显示**：修复了模板卡片鼠标悬停提示信息不显示的问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**内部结构优化**：代码内部结构进一步优化，运行更稳定',
    ] },
  ] },
  { v: 'v0.75.2', date: '2026-06-19', groups: [
    { label: '🐛 Bug 修复', items: [
      '**84 处前端错误修复**：页面崩溃问题大幅减少',
    ] },
    { label: '🔧 技术优化', items: [
      '**代码检查机制**：新增每次构建自动检测类型错误',
    ] },
  ] },
  { v: 'v0.75.1', date: '2026-06-19', groups: [
    { label: '🐛 Bug 修复', items: [
      '**表格崩溃修复**：修复了表格组件的 3 个关键崩溃问题（空数据、特殊字符等场景）',
      '**工具提示修复**：修复了工具提示在部分场景下显示原生浏览器提示的问题',
    ] },
  ] },
  { v: 'v0.75.0', date: '2026-06-19', groups: [
    { label: '🐛 Bug 修复', items: [
      '**登录状态更稳定**：解决了之前偶尔要重新登录的问题',
      '**84 个前端类型错误修复**：页面更稳定',
      '**表格崩溃修复**：修复了表格组件在几种特殊情况下的崩溃问题（空数据、特殊字符等）',
      '**工具提示不显示**：修复了多处工具提示不显示的问题',
    ] },
  ] },
  { v: 'v0.74.0', date: '2026-06-19', groups: [
    { label: '🔧 技术优化', items: [
      '**版本号历史整理**：清理了之前混乱的版本号，现在版本号增长更有规律',
      '**代码质量大扫除**：重构了多处代码，运行更稳定',
    ] },
  ] },
  { v: 'v0.73.0', date: '2026-06-19', groups: [
    { label: '🚀 新功能', items: [
      '**数据归属隔离**：所有列表页面新增"归属人"过滤和权限控制，每个人只能看到和管理自己创建的数据（管理员不受限制，还是能看到全部）',
    ] },
    { label: '🔧 技术优化', items: [
      '**后端权限加固**：后端接口做了全面的权限加固，确保数据隔离',
    ] },
  ] },
  { v: 'v0.72.0', date: '2026-06-18', groups: [
    { label: '🚀 新功能', items: [
      '**敏感信息加密**：身份证号、手机号、银行卡号等敏感信息从今起自动加密保存，就算有人拿到数据库文件也看不到真实信息',
      '**权限更细**：每个人只能管理自己建的资料，不再被别人误删（管理员不受影响）',
    ] },
    { label: '✨ 体验优化', items: [
      '**老用户密码迁移**：从老版本升级过来的用户，密码会自动迁移，第一次登录只需按提示改一个新密码',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**登录报错**：之前双击启动偶尔会报"系统错误"，现在修好了',
      '**财务统计算错**：首页的收入/支出金额之前偶尔算错，现在修复了',
      '**财务分类加载报错**：财务页面的分类列表之前偶尔会报错，现在修好了',
    ] },
  ] },
  { v: 'v0.71.0', date: '2026-06-18', groups: [
    { label: '🔧 技术优化', items: [
      '**数据归属标记**：所有业务数据增加了"谁创建的"标记，为后续权限隔离打好基础',
      '**敏感信息自动打码**：列表中的身份证、手机号、银行卡号中间自动显示为 ****',
      '**未授权访问拒绝**：所有写操作统一拒绝未授权访问，不再返回"不存在"来泄露信息',
      '**审计日志完善**：管理员操作记录更完整',
      '**清理重复端点**：清理了 6 个废弃的端点文件（29 个重复路由）',
    ] },
  ] },
  { v: 'v0.70.0', date: '2026-06-06', groups: [
    { label: '🚀 新功能', items: [
      '**全新安装器**：可选择安装位置和数据存储位置',
      '**卸载器**：安全卸载，数据完整保留',
      '**安装器设置页面**：查看版本信息和安装日志',
      '**登录界面设置**：数据库备份恢复、健康检查',
    ] },
    { label: '✨ 体验优化', items: [
      '**安装包瘦身**：安装包体积从 244MB 缩小到 198MB',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**首次安装白屏**：修复首次安装后页面空白的问题',
      '**登录密码错误**：修复登录提示密码错误的问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**数据安全加固**：数据安全性全面加固',
    ] },
  ] },
  { v: 'v0.69.0', date: '2026-06-05', groups: [
    { label: '🐛 Bug 修复', items: [
      '**安装程序图标**：从"两个三角形框架"改为与软件一致的单层蓝紫渐变三角形',
      '**安装器资源缺失**：修复安装器 payload.zip 打包路径丢失前缀的问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**构建脚本优化**：直接输出到 release/，不再需要中间文件夹',
      '**清理废弃文件**：清理大量旧脚本、备份、临时文件、构建污染等',
    ] },
  ] },
  { v: 'v0.68.0', date: '2026-06-04', groups: [
    { label: '✨ 体验优化', items: [
      '**列表样式统一**：44 个文件迁移到统一的 DataTable 组件',
      '**列头排序+筛选**：列头支持排序和筛选',
      '**月份选择器**：MonthPicker 组件替换原生月份选择器',
      '**AI 识别通知动画**：扫描线、弹出、自动消失动画',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**百度 OCR 修复**：修复 API Key 读取、JSON 反序列化、字段映射等问题',
      '**工人/考勤/工资数据**：修复数据读取问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**班组工资汇总**：班组工资汇总 API 实现',
    ] },
  ] },
  { v: 'v0.67.0', date: '2026-06-02', groups: [
    { label: '✨ 体验优化', items: [
      '**启动动画**：软件打开时不再是白屏，而是粒子流动 + Logo 呼吸灯动画，跟随主题色变化',
      '**锁屏界面升级**：背景改为粒子动画，输入框和按钮有交互反馈，三个主题各有特色',
      '**加载动画统一**：全站 12 个页面的加载圈圈替换为品牌化 Logo 呼吸动画',
      '**恢复默认路径弹窗**：改为统一风格，不再弹出浏览器原生对话框',
    ] },
    { label: '🚀 新功能', items: [
      '**Ctrl+L 锁屏**：新增快捷键锁定屏幕',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**更改数据存储位置白屏**：现在能正常弹出文件夹选择对话框了',
    ] },
  ] },
  { v: 'v0.66.0', date: '2026-06-01', groups: [
    { label: '🔧 技术优化', items: [
      '**后端迁移到 C#**：从 Electron 迁移到 C#，软件体积从 ~150MB 降至 ~5MB',
      '**数据库零迁移**：直接读取之前的数据，无需迁移',
      '**API 全覆盖**：197 个 API 端点全部覆盖，功能无损',
    ] },
  ] },
  { v: 'v0.65.0', date: '2026-05-31', groups: [
    { label: '🚀 新功能', items: [
      '**AI 智能识别**：支持 9 种百度 OCR 功能（身份证、发票、银行卡、营业执照、银行回单等）',
      '**自动填表**：发票/银行卡/营业执照/银行回单上传后自动识别并填入表单',
      '**发票重复检测**：发票录入时自动检测重复，列表页可一键查看所有重复发票',
      '**OCR 调用统计**：设置页显示本月各功能调用次数',
      '**数据健康检查**：智能数据引擎新增数据健康检查',
    ] },
  ] },
  { v: 'v0.64.0', date: '2026-05-31', groups: [
    { label: '✨ 体验优化', items: [
      '**滚动条重写**：改用 JS 驱动，风格改为终端风格（极细半透明，靠近变大），推广到 15 个列表页面',
      '**状态栏功能化**：显示当前页面名+记录数，新增主题和字号弹出选择器',
    ] },
  ] },
  { v: 'v0.63.1', date: '2026-05-30', groups: [
    { label: '✨ 体验优化', items: [
      '**悬浮滚动条**：鼠标移到页面右侧边缘时滚动条自动变粗，方便点按和拖拽，平时不占页面空间',
      '**滚动条跟随主题**：切换主题时滚动条颜色会跟着变',
    ] },
  ] },
  { v: 'v0.63.0', date: '2026-05-30', groups: [
    { label: '✨ 体验优化', items: [
      '**界面全面统一**：所有页面的布局、头部、表格、弹窗、按钮、筛选器样式完全一致，学会一个模块就能上手其他模块',
      '**确认弹窗统一**：删除操作的确认弹窗样式统一，不再有的是浏览器原生弹窗、有的是自定义弹窗',
      '**状态标签统一**：进行中、已完工、在职、离场等状态标签颜色和样式全站统一',
      '**加载动画统一**：不再有的地方转圈、有的地方闪方块',
      '**Tooltip 统一**：鼠标悬停图标按钮时显示统一风格的提示文字',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**班组管理工人不显示**：修复了班组管理中工人不显示的问题',
      '**工资模块崩溃**：修复了工资模块多处数据为空时页面崩溃的问题',
      '**数据路径指向空目录**：修复了升级后数据路径指向空目录、看不到之前数据的问题',
    ] },
  ] },
  { v: 'v0.62.0', date: '2026-05-29', groups: [
    { label: '✨ 体验优化', items: [
      '**数据库快照备份**：快照现在同时备份 SQLite 文件，还原时两边一起恢复',
      '**GPU 硬件加速开关**：新增 GPU 硬件加速开关，解决部分显卡兼容问题',
      '**数据存储设置优化**：移除了多余的「默认路径」显示，「重新迁移数据」按钮在数据正常时自动禁用',
    ] },
    { label: '🔧 技术优化', items: [
      '**数据存储引擎升级**：写入顺序改为 SQLite 优先，JSON 作为备份，数据更安全',
      '**数据库完整性检查**：启动时自动检查数据库完整性，发现问题自动切换到安全模式',
      '**数据库原子写入**：数据库写入改为原子操作，断电不坏库',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**班组添加工人不显示**：修复了班组管理添加工人后不显示的问题',
      '**工资发放记录姓名为空**：修复了工资发放记录中工人姓名为空的问题',
      '**审计日志保存失败**：修复了审计日志保存失败的问题',
    ] },
  ] },
  { v: 'v0.61.0', date: '2026-05-29', groups: [
    { label: '🚀 新功能', items: [
      '**百度 OCR 上线**：上传身份证自动识别姓名、身份证号、性别、出生日期、民族、住址全部信息',
      '**离线 OCR**：离线模式只认数字，提取身份证号后自动算出性别和出生日期',
      '**人事管理删除人员**：人员档案列表加了删除按钮',
      '**粘贴图片 OCR**：员工管理页面粘贴身份证图片不再失效了',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**提示弹窗修复**：保存成功/失败、OCR 识别结果等提示现在能正常显示了',
    ] },
  ] },
  { v: 'v0.60.0', date: '2026-05-28', groups: [
    { label: '🚀 新功能', items: [
      '**全新登录界面**：小巧窗口 + 记住密码 + 自动登录，再也不用每次输入账号密码',
    ] },
    { label: '✨ 体验优化', items: [
      '**三主题全面修复**：深色/暖色/浅色主题下，按钮、输入框、表格、弹窗的文字都能看清了',
      '**图表适配主题**：图表悬停提示框适配主题色，不再出现白底白字看不见的问题',
      '**首页柱状图优化**：去掉了悬停时的多余背景色，视觉更干净',
      '**切换主题不闪烁**：切换主题不再闪烁，打开设置不再自动跳到其他主题',
      '**页面切换动画**：更平滑，去掉了从底部弹起的突兀感',
      '**图标统一**：标题栏、任务栏、桌面快捷方式图标一致',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**强制改密码**：修复了登录时每次都强制改密码的问题',
      '**深色主题下拉菜单**：修复了下拉菜单在深色主题下的文字颜色',
    ] },
  ] },
  { v: 'v0.59.0', date: '2026-05-28', groups: [
    { label: '✨ 体验优化', items: [
      '**深色主题横幅**：深色主题下首页横幅更清晰了，不再有朦胧感',
      '**暖色主题横幅**：暖色主题的顶部横幅颜色更舒适，文字看得清了',
      '**项目概览样式统一**：项目投资组合概览的样式跟其他页面统一了',
      '**更新日志入口**：设置页的更新日志入口更简洁了',
    ] },
  ] },
  { v: 'v0.58.0', date: '2026-05-28', groups: [
    { label: '🚀 新功能', items: [
      '**全新登录界面**：小巧窗口 + 记住密码 + 自动登录，再也不用每次输入账号密码',
    ] },
    { label: '✨ 体验优化', items: [
      '**三主题全面修复**：深色/暖色/浅色主题下，按钮、输入框、表格、弹窗的文字都能看清了',
      '**图表适配主题**：图表悬停提示框适配主题色，不再出现白底白字看不见的问题',
      '**首页柱状图优化**：去掉了悬停时的多余背景色，视觉更干净',
      '**切换主题不闪烁**：切换主题不再闪烁，打开设置不再自动跳到其他主题',
      '**页面切换动画**：更平滑，去掉了从底部弹起的突兀感',
      '**图标统一**：标题栏、任务栏、桌面快捷方式图标一致',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**强制改密码**：修复了登录时每次都强制改密码的问题',
      '**深色主题下拉菜单**：修复了下拉菜单在深色主题下的文字颜色',
    ] },
  ] },
  { v: 'v0.57.0', date: '2026-05-27', groups: [
    { label: '✨ 体验优化', items: [
      '**图纸分类图标**：结构图、电气图、暖通图、装饰图各有专属图标，更直观',
      '**新增图标**：补充了电源、收支切换等缺失图标',
    ] },
    { label: '🔧 技术优化', items: [
      '**代码大扫除**：清理了 30 多处临时标记，去掉了调试日志，修复了几个数据类型的小问题',
    ] },
  ] },
  { v: 'v0.56.0', date: '2026-05-27', groups: [
    { label: '🚀 新功能', items: [
      '**全新窗口外观**：去掉了系统原生边框，标题栏更简洁美观',
      '**三主题上线**：新增明亮（White）、深灰（Graphite）、暖灰（Sandstone）三种主题，在设置里切换',
      '**侧边栏可折叠**：点左上角图标或按 Ctrl+B 折叠，给内容区更多空间',
      '**底部状态栏**：显示版本号和数据存储状态',
    ] },
    { label: '✨ 体验优化', items: [
      '**金额滚动动画**：金额数字滚动动画更快更流畅',
      '**发票加载更稳定**：单条数据出错不影响其他',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**发票回款/付款显示不全**：修复了显示不全的问题',
      '**图标显示问号**：修复了多处图标显示为问号的问题',
      '**工人管理文字乱码**：修复了工人管理页面文字乱码的问题',
      '**窗口按钮点不动**：修复了窗口按钮偶尔点不动的问题',
    ] },
  ] },
  { v: 'v0.55.0', date: '2026-05-27', groups: [
    { label: '🔧 技术优化', items: [
      '**版本号方案升级**：从 1.x/2.x/3.x 改为遵循 SemVer 2.0.0 规范的 0.y.z，版本号增长更有规律',
    ] },
  ] },
  { v: 'v0.54.0', date: '2026-05-26', groups: [
    { label: '✨ 体验优化', items: [
      '**按钮动画优化**：去掉了"浮动"的感觉，操作更跟手',
      '**页面切换不闪白**：切换更流畅',
      '**小窗口数字截断**：合同价等数字卡片会自动截断，不会超出卡片',
      '**按钮和表头统一**：统一了所有按钮和表格表头的样式',
      '**登录页面动画**：优化了动画，不再有延迟感',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**页面内容被压窄**：修复了页面内容"被压窄"的问题，现在显示完整了',
      '**页面滚不动**：修复了单位管理、人事管理、图纸管理等部分页面"滚不动"的问题',
    ] },
  ] },
  { v: 'v0.53.0', date: '2026-05-21', groups: [
    { label: '✨ 体验优化', items: [
      '**启动更快**：软件启动更快了，打开页面不卡了',
      '**设置页数据存储**：设置页面新增"数据存储"卡片，可以查看数据库状态',
      '**安装包更小**：软件体积更小，安装更快',
    ] },
    { label: '🔧 技术优化', items: [
      '**数据存储更稳定**：不容易丢数据',
      '**核心功能更流畅**：工资、考勤、成本台账运行更流畅',
      '**数据保护**：数据多了一层保护，出问题可以恢复',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**若干小 bug**：修复了若干小 bug，用起来更顺手',
    ] },
  ] },
  { v: 'v0.52.0', date: '2026-05-18', groups: [
    { label: '🚀 新功能', items: [
      '**凭证号支持字符串**：如「3-1」「5-181」「税-12」「已附」等，不再丢失连字符后内容',
      '**版本复制**：一键复制当前版本全部数据到新版本，方便改了再对比',
      '**版本重命名**：版本名旁点铅笔图标即可改名',
      '**列表缩放**：Ctrl+滚轮放大缩小，工具栏也有 +/- 按钮',
      '**学习规则管理**：学习规则可查看/删除了，管理分类弹窗新增学习规则标签页',
    ] },
    { label: '✨ 体验优化', items: [
      '**AI 分类匹配改进**：现在会看摘要+备注+往来单位三个字段，还能自动尝试反方向分类',
      '**硬编码规则**：社保、开票、税局等关键词加入硬编码规则，更多条目自动分对',
      '**自动学习**：列表编辑保存时如果改了分类，系统自动学习',
      '**显示优化**：汇总行加大加深、日期显示统一格式、版本默认打开最新有数据的',
    ] },
    { label: '🔧 技术优化', items: [
      '**批量生成学习规则**：从 656 条手工确认数据批量生成了 138 条无冲突学习规则',
    ] },
  ] },
  { v: 'v0.51.0', date: '2026-06-10', groups: [
    { label: '🚀 新功能', items: [
      '**图纸批量上传**：一次拖拽或选择多个图纸文件，进度实时显示',
      '**图纸分类存储**：每个图纸必填部位，自动按项目→图纸→部位→类型分文件夹',
      '**图纸部位筛选**：图纸列表新增部位列和部位筛选',
      '**数据回滚系统**：每次保存自动备份，管理员可一键还原到任意时间点',
      '**审计日志全覆盖**：图纸/考勤/工资/台账/HR 所有操作都有记录',
    ] },
    { label: '✨ 体验优化', items: [
      '**拖拽弹窗**：工人导入 Excel 和工资导入回单改用拖拽弹窗，更方便',
      '**首页支出图表**：改一级分类显示，不再挤在一起',
    ] },
    { label: '🔧 技术优化', items: [
      '**数据库原子写入**：断电不坏库',
    ] },
  ] },
  { v: 'v0.50.0', date: '2026-05-17', groups: [
    { label: '🚀 新功能', items: [
      '**成本台账多版本**：新建/切换/删除版本，导入可指定版本，版本间对比差异一目了然',
      '**Excel 导入**：列自动映射，从摘要+备注智能匹配分类，预览可逐行调整',
      '**分类自动学习**：修正的分类自动学习，下次导入自动命中',
    ] },
    { label: '✨ 体验优化', items: [
      '**导入默认选中当前版本**：极大减少误导入',
    ] },
    { label: '🔧 技术优化', items: [
      '**项目瘦身**：清理测试残留文件、死依赖',
    ] },
  ] },
  { v: 'v0.49.0', date: '2026-05-16', groups: [
    { label: '🚀 新功能', items: [
      '**员工离职/重新入职**：填写离职日期后自动识别为离职状态，考勤和薪酬不再生成；重新入职只需填写日期，空缺期自动跳过',
      '**项目人员管理升级**：记录每个人加入和调离项目的时间，支持调离到其他项目，误操作可恢复',
      '**薪资历史双向同步**：编辑人员的月基本工资会自动同步到薪资历史，反之亦然',
      '**表格悬停高亮全局化**：所有表格自动有悬停效果，在设置里可以调节透明度',
    ] },
    { label: '✨ 体验优化', items: [
      '**薪酬管理表格优化**：年份/月份筛选都支持"全部"，可按姓名搜索，按项目过滤，底部有应发/实发/差额汇总',
      '**人员档案离职日期列**：没有离职的显示横杠',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**身份证照片预览**：编辑员工资料时，之前上传的身份证照片可以正常预览了',
      '**工资去重**：同一月份多名员工的工资都能正确显示，不会再被覆盖',
      '**工人管理人数统计**：各班组人数和卡片上的统计数据保持一致了',
      '**列表滚动修复**：薪酬管理列表、考勤管理、人员档案列表滚动修复',
    ] },
    { label: '🔧 技术优化', items: [
      '**更新日志全部改写**：从 v1.0.0 到现在的每个版本都用人话重写了一遍，普通人也看得懂',
    ] },
  ] },
  { v: 'v0.48.0', date: '2026-05-16', groups: [
    { label: '🚀 新功能', items: [
      '**工人日工资按月查看**：工人每天工资的变化记录，现在可以按月查看和修改了',
      '**考勤历史按年分组**：每个工人的全部考勤记录一目了然',
      '**项目工资汇总三级展开**：年份→月份→班组，查看更方便',
      '**工资明细筛选统一**：底部加了一行应发/实发差额汇总',
      '**工资归档**：归档前自动保存金额，已归档的不再参与后续计算，生成工资表时自动跳过已归档月份',
    ] },
    { label: '✨ 体验优化', items: [
      '**表格独立滚动**：工人库、考勤管理、工资明细的表格可以独立滚动查看',
      '**银行回单去重**：上传后自动去重，匹配/已归档/未匹配数量分别统计',
      '**班组长选择**：选择班组长时只显示本班组的工人，不会选错',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**工人资料编辑**：修复了修改后能正常保存的问题',
      '**菜单弹窗层级**：调整了显示层级，不再被其他内容挡住',
    ] },
    { label: '🔧 技术优化', items: [
      '**工人性别自动识别**：工种支持直接输入文字',
    ] },
  ] },
  { v: 'v0.47.0', date: '2026-05-15', groups: [
    { label: '✨ 体验优化', items: [
      '**工人管理页面改版**：看板、工人库、班组管理、工资管理四个分区更清晰',
      '**琥珀色主题**：工人管理用琥珀色主题，和人事管理的蓝色系区分开，不会搞混',
      '**操作确认框**：改为弹窗样式，比系统默认的更好看',
      '**独立月份选择**：考勤管理和项目工资表各自有了独立的月份选择',
      '**页面打开速度优化**：页面打开更快了',
    ] },
  ] },
  { v: 'v0.46.0', date: '2026-05-14', groups: [
    { label: '🚀 新功能', items: [
      '**银行回单识别**：上传银行代发回单（PDF）后，系统自动识别发放日期、金额、明细，按姓名+银行卡号匹配后填入实发金额',
      '**多银行支持**：支持工行、农行、建行、农商行、中行等常见银行回单格式',
      '**发放记录归档**：归档后金额和日期被锁定不能修改；清除归档可以重新编辑',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**实发金额小数点**：修复了实发金额无法输入小数点的问题',
    ] },
  ] },
  { v: 'v0.45.0', date: '2026-05-14', groups: [
    { label: '🚀 新功能', items: [
      '**合同「其他协议」**：除了收入合同和支出合同，还可以记录框架协议、合作协议、和解协议、赔偿协议等',
      '**框架协议免金额**：框架协议可以不填金额，不参与收支统计',
      '**看板新增其他协议**：收支饼图增加第三块区域',
      '**工人考勤 Excel 导入**：可以直接上传 Excel 工资表或花名册导入，系统自动识别姓名、身份证号和出勤天数',
      '**考勤按月切换**：考勤管理可以切换不同月份查看和导入',
    ] },
  ] },
  { v: 'v0.44.0', date: '2026-05-14', groups: [
    { label: '🐛 Bug 修复', items: [
      '**Excel 导入数据错位**：修复了合并单元格导致工种、银行卡号等数据错位的问题',
      '**工种保存错误**：工种直接保存中文名称，不会再出现"安装工"变成"其他工种"的情况',
      '**导入设置丢失**：导入时"不导入"的设置会记住，切换工作表不会丢失',
      '**工人资料同步**：工人资料更新后，项目内显示的工种和日工资会立即同步',
      '**看板工资统计**：按选中月份显示，数据更准确',
    ] },
  ] },
  { v: 'v0.43.0', date: '2026-05-14', groups: [
    { label: '✨ 体验优化', items: [
      '**工人库表格调整**：去掉班组/状态/进场日期列，新增年龄（超过 60 岁红色提醒）和银行卡号列',
      '**从班组添加工人简化**：批量设置更方便',
      '**导入字段增加**：工资卡号、开户行、联行号、工种、日工资',
    ] },
    { label: '🔧 技术优化', items: [
      '**导入自动更新**：导入工人时如果已经存在，会用新数据自动更新，不再跳过',
    ] },
  ] },
  { v: 'v0.42.0', date: '2026-05-14', groups: [
    { label: '✨ 体验优化', items: [
      '**工人导入精简**：只保留姓名、身份证号等基本身份信息，班组分配和工资设置在导入后单独操作',
      '**空行自动跳过**：Excel 导入时会自动跳过姓名和身份证都为空的行',
    ] },
  ] },
  { v: 'v0.41.0', date: '2026-05-14', groups: [
    { label: '✨ 体验优化', items: [
      '**工资管理纯工人模式**：去掉了管理人员相关的薪资计算，逻辑更清晰',
      '**工人库界面整洁**：不再显示虚线拖拽上传区，改为工具栏按钮导入',
    ] },
  ] },
  { v: 'v0.40.0', date: '2026-05-13', groups: [
    { label: '✨ 体验优化', items: [
      '**工人管理合并**：班组管理、工人库、工资管理合并为同级页面，切换更方便',
      '**班组内直接管理工人**：支持调换班组或移出',
      '**批量添加工人**：从工人库添加时，可以一键设置班组、工种、日工资',
      '**工人库简化**：只保留身份信息',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**工人管理数据不显示**：修复了工人管理数据显示不出来的问题',
    ] },
  ] },
  { v: 'v0.39.0', date: '2026-05-13', groups: [
    { label: '🚀 新功能', items: [
      '**考勤日历模式**：点击进入日历模式逐天标记出勤或休假，可按年份查看',
      '**薪资历史记录**：每次调薪的时间、金额都有据可查，算工资时自动匹配对应月份的标准',
      '**入职前禁打考勤**：入职日期之前的日期不能打考勤，月中入职的工资会自动按比例计算',
      '**考勤详情删除**：考勤详情页新增删除按钮，可以直接删除整月考勤',
    ] },
    { label: '✨ 体验优化', items: [
      '**薪酬生成检查**：考勤没打齐的员工，生成薪酬时会自动跳过，不影响其他人',
      '**职位编辑简化**：操作更方便',
    ] },
  ] },
  { v: 'v0.38.0', date: '2026-05-13', groups: [
    { label: '✨ 体验优化', items: [
      '**考勤管理改版**：列表优先展示，点击进入详情页，支持单条删除、批量删除，未入职的人自动屏蔽',
      '**薪酬生成检查**：生成薪酬前自动检查考勤是否已就绪，谁成功谁失败看得很清楚',
      '**看板增加在岗人数**：看板增加了今日在岗人数和月度薪酬实际值（节省或超出都有提示）',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**薪酬计算读错字段**：修复了薪酬计算读错字段的问题',
      '**OCR 填写失效**：修复了 OCR 识别后自动填写失效的问题',
      '**考勤保存无提示**：修复了考勤保存失败没有提示的问题',
      '**未入职也能打考勤**：修复了未入职也能打考勤的问题',
    ] },
  ] },
  { v: 'v0.37.0', date: '2026-05-12', groups: [
    { label: '🚀 新功能', items: [
      '**全新人事管理模块**：看板、人员档案、考勤管理、薪酬管理、部门管理五个分区',
      '**部门管理**：可以创建、编辑、删除部门，每个部门可以设置职位列表',
    ] },
    { label: '✨ 体验优化', items: [
      '**员工管理改名**：员工管理改名工人管理，工人和员工分开管理，各用各的功能',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**图纸上传不显示**：修复了图纸上传后界面不显示的问题',
    ] },
  ] },
  { v: 'v0.36.0', date: '2026-05-12', groups: [
    { label: '🚀 新功能', items: [
      '**工人信息库**：建立工人信息库，一个工人可以跨多个项目工作',
      '**从工人库添加**：班组管理新增"从工人库添加"功能，可以搜索、批量选择、逐行设置',
    ] },
    { label: '🔧 技术优化', items: [
      '**身份证号自动识别**：导入工人时自动识别身份证号，重复的工人会标记出来',
      '**旧数据自动迁移**：工资和考勤记录都不受影响',
    ] },
  ] },
  { v: 'v0.35.0', date: '2026-05-12', groups: [
    { label: '🚀 新功能', items: [
      '**工人 Excel 批量导入**：自动识别列对应关系，有进度条显示',
    ] },
    { label: '✨ 体验优化', items: [
      '**工人列表表格化**：姓名、身份证号、班组、工种、日工资一目了然',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**弹窗不弹出**：修复了添加工人、编辑班组、工人调组时弹窗不弹出的问题',
    ] },
  ] },
  { v: 'v0.34.0', date: '2026-05-12', groups: [
    { label: '✨ 体验优化', items: [
      '**首页重新设计**：去掉了从未使用过的任务模块，换上发票和结算摘要',
      '**项目健康度优化**：从 4 个维度调整为 3 个维度',
      '**项目详情页精简**：从 7 个标签精简为 6 个',
    ] },
  ] },
  { v: 'v0.33.0', date: '2026-05-12', groups: [
    { label: '🚀 新功能', items: [
      '**成本台账导出 Excel**：按筛选结果导出',
      '**成本台账打印**：新窗口显示表格+收支汇总',
      '**凭证附件预览**：点击放大预览图片，非图片文件调用系统默认程序打开',
    ] },
  ] },
  { v: 'v0.32.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**表格行悬停统一**：所有表格的行悬停高亮效果统一了',
      '**悬停强度滑块**：在设置→外观主题里可以调节悬停透明度，从 10% 到 100% 随意调节',
    ] },
  ] },
  { v: 'v0.31.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**合计行固定**：成本台账列表最底部的合计行现在固定了，不会跟着滚动条跑',
      '**支出分类两行显示**：长分类名称不会被截断',
      '**柱状图文字两行显示**：Dashboard 支出分类柱状图 X 轴文字改成两行显示，不会重叠',
    ] },
  ] },
  { v: 'v0.30.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**日期筛选升级**：年月日三级树形折叠，按年份展开月份，按月份展开日期，搜索时自动切平铺',
      '**金额筛选精度**：保留到分',
    ] },
  ] },
  { v: 'v0.29.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**成本台账筛选升级**：7 列都支持搜索+勾选筛选，分类筛选改成一二级联动',
    ] },
  ] },
  { v: 'v0.28.0', date: '2026-05-11', groups: [
    { label: '🚀 新功能', items: [
      '**成本台账分类大升级**：支出分为 5 组 18 类，收入分为 4 组 7 类，分类选择改为一二级联动',
      '**分类管理界面**：可以查看一级分组和二级子项，支持新建、编辑、删除',
    ] },
  ] },
  { v: 'v0.27.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**分类视图切换**：成本台账分类可以在一级和二级视图之间切换了，一级视图带分组色点',
    ] },
  ] },
  { v: 'v0.26.0', date: '2026-05-11', groups: [
    { label: '✨ 体验优化', items: [
      '**表格列间距**：稍微调宽了一点，阅读更舒适',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**版本号不一致**：版本号在多处显示不一致的问题已修复',
      '**更新日志格式**：更新日志显示格式修复了',
      '**成本台账分类弹窗**：修复了成本台账分类管理弹窗的问题',
    ] },
    { label: '🔧 技术优化', items: [
      '**版本号机制加固**：版本号更新机制加固了',
    ] },
  ] },
  { v: 'v0.25.0', date: '2026-05-11', groups: [
    { label: '🔧 技术优化', items: [
      '**页面加载速度优化**：大文件拆分成小模块，按需加载',
      '**代码质量提升**：清理了冗余文件',
    ] },
  ] },
  { v: 'v0.24.0', date: '2026-05-10', groups: [
    { label: '🚀 新功能', items: [
      '**成本台账分类自定义**：新增/编辑/删除分类，内置 12 种常用分类',
      '**分类管理弹窗**：支持恢复默认分类',
      '**成本台账备注列**：列表新增备注列',
    ] },
    { label: '✨ 体验优化', items: [
      '**列表列宽优化**：大屏上显示更协调',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**分类按钮点不开**：修复了管理分类按钮在项目详情页点不开的问题',
    ] },
  ] },
  { v: 'v0.23.0', date: '2026-05-10', groups: [
    { label: '🚀 新功能', items: [
      '**全新成本台账**：追踪项目真实成本，支持 9 种支出和 2 种收入分类',
    ] },
    { label: '🔧 技术优化', items: [
      '**旧模块替换**：旧成本管理模块已替换',
    ] },
  ] },
  { v: 'v0.22.0', date: '2026-05-10', groups: [
    { label: '🔧 技术优化', items: [
      '**版本号自动升级**：根据改动大小自动判断主版本、次版本还是修订版本',
    ] },
  ] },
  { v: 'v0.21.0', date: '2026-05-08', groups: [
    { label: '✨ 体验优化', items: [
      '**侧边栏整理**：系统设置和用户管理移到头像菜单里，侧边栏更清爽',
    ] },
    { label: '🚀 新功能', items: [
      '**锁屏功能**：离开时可以锁屏，输入密码才能解锁',
    ] },
  ] },
  { v: 'v0.20.0', date: '2026-05-07', groups: [
    { label: '🚀 新功能', items: [
      '**模板生成文件**：可以从模板生成合同和结算文件了',
    ] },
  ] },
  { v: 'v0.19.0', date: '2026-05-07', groups: [
    { label: '🚀 新功能', items: [
      '**模板管理独立模块**：支持 7 种分类',
      '**模板变量系统**：可以在模板里插入日期、数字、选择框等变量，自动替换',
    ] },
    { label: '✨ 体验优化', items: [
      '**结算看板重新设计**：跟项目管理风格统一',
      '**合同管理视图精简**：视图更简洁',
    ] },
  ] },
  { v: 'v0.18.0', date: '2026-05-07', groups: [
    { label: '✨ 体验优化', items: [
      '**合同管理改版**：看板首页+子页面模式，跟项目管理一样',
      '**结算办理全面改版**：6 种结算类型、材料明细表、Excel 导入、多文件上传、流程状态管理',
      '**审计日志更好读**：详情弹窗带对比表格，金额格式化，状态翻译成中文',
      '**发票统计重新设计**：开票和收票合并统计，新增专票税额和普票税额',
      '**回款/付款统计重新设计**：统计更清晰',
    ] },
  ] },
  { v: 'v0.17.0', date: '2026-05-07', groups: [
    { label: '🐛 Bug 修复', items: [
      '**付款凭证预览**：修复了付款凭证预览问题，关联单位下拉显示全部合作单位',
      '**审计日志数量限制**：超出上限自动清理旧数据',
    ] },
    { label: '✨ 体验优化', items: [
      '**发票状态标签**：按收票/开票区分显示',
      '**合同 Word 预览**：合同支持 Word 预览了',
      '**发票税额手编**：发票税额可以手动编辑',
    ] },
  ] },
  { v: 'v0.16.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**工资管理改版**：类似项目管理的看板+详情模式',
      '**工资发放记录升级**：新增实发金额和发放日期，差额自动计算',
      '**首页工资汇总卡片**：首页新增项目工资汇总卡片',
    ] },
  ] },
  { v: 'v0.15.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**表头固定**：发票、回款、费用、图纸四个列表的表格表头固定了，滚动时不会跟着跑',
      '**图纸列表视图**：图纸管理从卡片视图改为列表视图',
    ] },
  ] },
  { v: 'v0.14.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**发票类型细化**：细化为 4 种——纸质普票、纸质专票、电子普票、电子专票',
      '**收付款术语统一**：全站统一了收付款的叫法',
      '**金额显示统一**：统一保留 2 位小数',
    ] },
  ] },
  { v: 'v0.13.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**页面切换动画**：更流畅了',
    ] },
    { label: '🚀 新功能', items: [
      '**版本号自动记录**：版本号自动更新系统上线，每次更新自动记录',
      '**设置页版本日志**：设置页面新增版本号和更新日志',
    ] },
  ] },
  { v: 'v0.12.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**全站交互动画升级**：侧边栏入场动效、标签页滑动切换、数字滚动动画',
      '**图表入场动画**：图表加入入场动画',
      '**组件反馈效果**：按钮、卡片等组件加了悬停和按下的反馈效果',
      '**Toast 提示美化**：改用 SVG 图标和弹簧动画',
    ] },
  ] },
  { v: 'v0.11.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**侧边栏配色**：从蓝色改为深灰色系，更专业',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**单位管理白屏**：修复了单位管理页面白屏的问题',
    ] },
  ] },
  { v: 'v0.10.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**项目管理全面改版**：健康度环形图、投资组合概览、自动检测告警',
      '**图表全面升级**：使用了新的图表组件库',
    ] },
  ] },
  { v: 'v0.9.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**管理人员列表表格化**：从卡片改为 7 列表格，状态可以直接切换',
      '**批量删除**：考勤、工资表、工资记录支持批量选择删除',
    ] },
    { label: '🐛 Bug 修复', items: [
      '**离职员工数据**：离职员工可以正常查看考勤和工资记录了',
    ] },
  ] },
  { v: 'v0.8.0', date: '2026-05-06', groups: [
    { label: '✨ 体验优化', items: [
      '**全站设计语言统一**：颜色系统改为 slate 色系',
      '**深色模式**：在设置→外观主题里切换',
      '**首页重新设计**：更清晰直观',
      '**标签栏弹簧动画**：切换更流畅',
      '**侧边栏重新设计**：固定宽度、深色渐变 Logo、圆角导航项',
    ] },
  ] },
  { v: 'v0.7.0', date: '2026-05-05', groups: [
    { label: '🚀 新功能', items: [
      '**考勤系统上线**：每天可以标记 5 种状态，支持日历模式逐天操作，Shift 批量设置，右键循环切换',
      '**多项目成员**：项目管理支持添加多名项目成员',
    ] },
  ] },
  { v: 'v0.6.0', date: '2026-05-05', groups: [
    { label: '🚀 新功能', items: [
      '**权限系统上线**：管理员可以分配不同角色和权限，实现分级管理',
      '**操作日志**：谁在什么时间做了什么操作都有记录',
      '**用户管理页面**：用户管理独立成单独页面',
      '**路由权限控制**：无权限的页面自动隐藏',
    ] },
  ] },
  { v: 'v0.5.0', date: '2026-05-05', groups: [
    { label: '✨ 体验优化', items: [
      '**页面宽度统一**：所有页面保持一致的布局风格',
    ] },
  ] },
  { v: 'v0.4.0', date: '2026-05-04', groups: [
    { label: '🚀 新功能', items: [
      '**工资管理模块上线**：支持工人日薪制和管理人员月薪制',
      '**考勤系统全面升级**：考勤数据持久化保存',
    ] },
  ] },
  { v: 'v0.3.0', date: '2026-05-03', groups: [
    { label: '🔧 技术优化', items: [
      '**文件存储改造**：上传的文件按项目分类存储在磁盘上，打开更快',
      '**数据库瘦身**：从 18MB 瘦身到 1.4MB，系统运行更流畅',
    ] },
  ] },
  { v: 'v0.2.0', date: '2026-05-02', groups: [
    { label: '🚀 新功能', items: [
      '**全局提示系统**：操作成功/失败会有弹窗提示',
    ] },
    { label: '✨ 体验优化', items: [
      '**登录页重新设计**：品牌展示区+登录表单双栏布局',
      '**全站图标统一**：统一替换为专业 SVG 图标',
    ] },
  ] },
  { v: 'v0.1.0', date: '2026-05-01', groups: [
    { label: '🚀 新功能', items: [
      '**🎉 工程管家第一个版本正式发布！**：核心功能包括项目管理、合同管理、发票管理、员工管理、仓库管理、单位管理，基于 Electron 桌面应用，支持 Windows 系统',
    ] },
  ] },
]





================================================================
End of Codebase
================================================================

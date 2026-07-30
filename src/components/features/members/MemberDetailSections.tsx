import { Icon } from '../../ui/Icon'
import { Card } from '@/components/ui/Card'
import { TABLE } from '@/constants/table'
import type { Member } from '@/types'
import type { AttendanceRecord } from '@/types/electron'
import { getWorkerTypeLabel } from './memberFormTypes'

type MaskFn = (type: 'idCard' | 'phone' | 'bankAccount' | 'email', value: string | null | undefined) => string

// S23 Stitch: 左栏档案卡的 label/value 行
function AsideRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center gap-3">
      <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] shrink-0">{label}</span>
      <span className={`text-sm text-[color:var(--fg)] text-right truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{value || '-'}</span>
    </div>
  )
}

export interface MemberProfileAsideProps {
  member: Member
  deptName?: string
  isWorker: boolean
  isLeft: boolean
  masked: MaskFn
  showIdCard: boolean
  onToggleIdCard: () => void
}

// S23 Stitch: 左窄档案栏（头像卡 + 联系与身份信息卡）
export function MemberProfileAside({
  member, deptName, isWorker, isLeft, masked, showIdCard, onToggleIdCard,
}: MemberProfileAsideProps) {
  return (
    <aside className="w-[320px] shrink-0 flex flex-col gap-4">
      {/* 档案卡：头像 + 姓名 + 职位药丸 + 关键信息行 */}
      <Card className="border border-[color:var(--border)] p-4 flex flex-col items-center">
        <div className="relative mb-2.5">
          <div className="w-24 h-24 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center text-3xl font-bold text-[color:var(--fg-2)]">
            {(member.name || '?').charAt(0)}
          </div>
          <span
            className={`absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full border-2 border-[color:var(--card)] ${isLeft ? 'bg-[color:var(--border-strong)]' : 'bg-success-500'}`}
            title={isLeft ? (isWorker ? '已离场' : '离职') : '在职'}
          />
        </div>
        <h4 className="text-base font-semibold text-[color:var(--fg)] mb-1.5">{member.name}</h4>
        <span className="font-mono text-xs text-[color:var(--muted)] bg-[color:var(--panel-2)] px-2.5 py-0.5 rounded-full mb-3">
          {isWorker ? getWorkerTypeLabel(member.workerType || 'other') : (member.position || member.role || '其他')}
        </span>
        <div className="w-full h-px bg-[color:var(--border)] mb-3" />
        <div className="w-full flex flex-col gap-2.5">
          {isWorker ? (
            <>
              <AsideRow label="所属项目" value={member.projectName} />
              <AsideRow label="所属班组" value={member.teamName} />
              <AsideRow label="进场日期" value={member.entryDate} mono />
              {isLeft && <AsideRow label="实际离场" value={member.actualLeaveDate} mono />}
            </>
          ) : (
            <>
              <AsideRow label="部门" value={deptName} />
              <AsideRow label="职位" value={member.position || member.role} />
              <AsideRow label="入职日期" value={member.entryDate} mono />
              {isLeft && <AsideRow label="离职日期" value={member.leaveDate} mono />}
            </>
          )}
        </div>
      </Card>

      {/* 联系与身份信息卡 */}
      <Card className="border border-[color:var(--border)] p-4">
        <h5 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-3.5">联系与身份信息</h5>
        <div className="flex flex-col gap-2.5">
          <div className="flex justify-between items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-[color:var(--fg-2)] shrink-0">
              <Icon name="Phone" size={15} className="text-[color:var(--muted)]" /> 手机
            </span>
            <span className="text-sm font-mono tabular-nums text-[color:var(--fg)]">{masked('phone', member.phone) || '-'}</span>
          </div>
          <div className="flex justify-between items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-[color:var(--fg-2)] shrink-0">
              <Icon name="Mail" size={15} className="text-[color:var(--muted)]" /> 邮箱
            </span>
            <span className="text-sm text-[color:var(--fg)] truncate">{member.email || '-'}</span>
          </div>
          <div className="w-full h-px bg-[color:var(--border)] my-1" />
          <div className="flex justify-between items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm text-[color:var(--fg-2)] shrink-0">
              <Icon name="CreditCard" size={15} className="text-[color:var(--muted)]" /> 身份证
            </span>
            <span className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-mono tabular-nums text-[color:var(--fg)] tracking-wider truncate">
                {member.idCard ? (showIdCard ? member.idCard : masked('idCard', member.idCard)) : '-'}
              </span>
              {member.idCard && (
                <button
                  onClick={onToggleIdCard}
                  aria-label={showIdCard ? '隐藏身份证号' : '显示身份证号'}
                  className="p-0.5 rounded text-[color:var(--muted)] hover:text-[color:var(--fg)] transition-colors shrink-0"
                >
                  <Icon name={showIdCard ? 'Eye' : 'EyeOff'} size={15} />
                </button>
              )}
            </span>
          </div>
        </div>
      </Card>
    </aside>
  )
}

// S23 Stitch: 考勤记录 Tab 的月度考勤表
export function MemberAttendanceTable({ records }: { records: AttendanceRecord[] }) {
  return (
    <div className={TABLE.container}>
      <table className={TABLE.table}>
        <thead className={TABLE.headerRow}>
          <tr>
            <th className={TABLE.headerCell}>月份</th>
            <th className={`${TABLE.headerCell} text-right`}>出勤天数</th>
            <th className={`${TABLE.headerCell} text-right`}>休假天数</th>
            <th className={TABLE.headerCell}>全勤</th>
          </tr>
        </thead>
        <tbody>
          {records.map(a => (
            <tr key={a.id} className={TABLE.bodyRow}>
              <td className={`${TABLE.bodyCell} font-mono tabular-nums text-[color:var(--fg)]`}>{a.yearMonth}</td>
              <td className={`${TABLE.bodyCell} text-right font-mono tabular-nums text-[color:var(--fg)]`}>{a.workDays}</td>
              <td className={`${TABLE.bodyCell} text-right font-mono tabular-nums`}>{a.daysOff}</td>
              <td className={TABLE.bodyCell}>
                {a.isFullAttendance ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-500/10 text-success-600 border border-success-500/20">全勤</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]">非全勤</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

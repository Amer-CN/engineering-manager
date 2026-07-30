import { useState, useEffect } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'
import Spinner from '../../ui/Spinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Member } from '@/types'
import type { AttendanceRecord } from '@/types/electron'
import { calculateAge } from './memberFormTypes'
import { useMemberFileUrls } from './useMemberFileUrls'
import { PreviewModal, InfoItem, Tag, IdCardImages, ManagerSalaryCard } from './MemberDetailParts'
import { MemberProfileAside, MemberAttendanceTable } from './MemberDetailSections'
import { WorkerDetailCards } from './WorkerDetailCards'
import { useMaskedFn } from '@/hooks/useMaskedValue'
import { getAPI } from '@/services/api-adapter'
import { Card } from '@/components/ui/Card'
import { Button } from '../../ui/Button'

export interface MemberDetailProps {
  member: Member
  deptName?: string
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTransfer?: () => void
  onLeave?: () => void
  onReEntry?: () => void
}

type DetailTab = 'profile' | 'attendance' | 'salary'

export function MemberDetail({
  member,
  deptName,
  onClose,
  onEdit,
  onDelete,
  onTransfer,
  onLeave,
  onReEntry
}: MemberDetailProps) {
  const masked = useMaskedFn()
  const [previewData, setPreviewData] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const fileUrls = useMemberFileUrls(member)

  const isWorker = member.memberType === 'worker'
  const isLeft = member.status === 'left'

  // S23 Stitch: 右侧 Tab（基本档案 / 考勤记录 / 薪酬明细）
  const [activeTab, setActiveTab] = useState<DetailTab>('profile')
  const [attendances, setAttendances] = useState<AttendanceRecord[] | null>(null)
  // S23 Stitch: PII 默认脱敏，可点击临时显真
  const [showIdCard, setShowIdCard] = useState(false)

  useEffect(() => {
    if (activeTab !== 'attendance' || attendances !== null) return
    let cancelled = false
    getAPI()
      .then(api => api.getAttendancesByMember(member.id))
      .then(r => { if (!cancelled) setAttendances(r.success ? (r.data ?? []) : []) })
      .catch(() => { if (!cancelled) setAttendances([]) })
    return () => { cancelled = true }
  }, [activeTab, attendances, member.id])

  const handlePreview = (data: string, type: 'image' | 'pdf', title: string) => {
    setPreviewData({ data, type, title })
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'profile', label: '基本档案' },
    { key: 'attendance', label: '考勤记录' },
    ...(!isWorker ? [{ key: 'salary' as DetailTab, label: '薪酬明细' }] : []),
  ]

  const sortedAttendances = (attendances ?? []).slice()
    .sort((a, b) => (b.yearMonth || '').localeCompare(a.yearMonth || ''))

  const detailTitle = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-semibold text-[color:var(--fg)]">
        {isWorker ? <><Icon name="Construction" size={20} className="inline-block" /> 农民工详情</> : <><Icon name="UserCircle" size={20} className="inline-block" /> 管理人员详情</>}
      </span>
      {isWorker && (
        <Tag
          label={isLeft ? '已离场' : '在职'}
          variant={isLeft ? 'warning' : 'success'}
        />
      )}
      {member.isTeamLeader && <Tag label="班组长" variant="info" />}
    </div>
  )

  return (
    <Modal isOpen onClose={onClose} title={detailTitle} size="full"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-sm text-[color:var(--muted)]">
            创建时间: {member.createdAt ? new Date(member.createdAt).toLocaleString() : '未知'}
          </div>
          <div className="flex items-center gap-3">
            {onDelete && (
              <Button onClick={onDelete}  variant="danger" size="sm">删除</Button>
            )}
            {isWorker && !isLeft && (
              <>
                {onTransfer && (
                  <Button onClick={onTransfer}  variant="ghost" size="sm" className="text-[color:var(--accent)]">调组</Button>
                )}
                {onLeave && (
                  <Button onClick={onLeave}  variant="ghost" size="sm">离场</Button>
                )}
              </>
            )}
            {isWorker && isLeft && onReEntry && (
              <Button onClick={onReEntry}  variant="ghost" size="sm" className="text-success-600">重新入场</Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} variant={isWorker ? 'warning' : 'primary'} size="sm">编辑</Button>
            )}
            <Button onClick={onClose} variant="secondary" size="sm">关闭</Button>
          </div>
        </div>
      }
    >
      {/* S23 Stitch: 左窄档案栏 + 右 Tab 面板 */}
      <div className="flex gap-6 items-start">
        <MemberProfileAside
          member={member}
          deptName={deptName}
          isWorker={isWorker}
          isLeft={isLeft}
          masked={masked}
          showIdCard={showIdCard}
          onToggleIdCard={() => setShowIdCard(v => !v)}
        />

        {/* 右侧 Tab 面板 */}
        <section className="flex-1 min-w-0 bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg overflow-hidden flex flex-col">
          <div className="flex px-4 pt-2 border-b border-[color:var(--border)] bg-[color:var(--panel-2)] shrink-0">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={activeTab === t.key
                  ? 'px-4 py-2.5 text-sm font-semibold text-[color:var(--fg)] bg-[color:var(--card)] border-b-2 border-[color:var(--fg)] -mb-px rounded-t-md relative z-10'
                  : 'px-4 py-2.5 text-sm text-[color:var(--fg-2)] hover:text-[color:var(--fg)] border-b-2 border-transparent rounded-t-md transition-colors'}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6">
            {activeTab === 'profile' && (
              <>
                {/* 身份证信息卡片 */}
                <Card className="border border-[color:var(--border)] p-6 mb-6">
                  <h3 className="text-lg font-medium text-[color:var(--fg)] mb-4 flex items-center">
                    <span className="mr-2">🪪</span>
                    身份证信息
                  </h3>

                  <div className="grid grid-cols-2 gap-y-3 mb-4">
                    <InfoItem icon={<Icon name="Key" size={16} />} label="身份证号" value={masked('idCard', member.idCard)} />
                    <InfoItem icon={<Icon name="UserCircle" size={16} />} label="性别" value={member.gender} />
                    <InfoItem icon={<Icon name="Users" size={16} />} label="民族" value={member.ethnicity} />
                    <InfoItem icon={<Icon name="Calendar" size={16} />} label="出生日期" value={member.birthDate} />
                    {member.birthDate && (
                      <InfoItem icon={<Icon name="LayoutDashboard" size={16} />} label="年龄" value={calculateAge(member.birthDate)} />
                    )}
                  </div>

                  <div className="mt-4">
                    <InfoItem icon={<Icon name="Home" size={16} />} label="身份证住址" value={masked('idCard', member.idCardAddress)} />
                  </div>

                  <IdCardImages
                    idCardFront={member.idCardFront}
                    idCardBack={member.idCardBack}
                    fileUrls={fileUrls}
                    onPreview={handlePreview}
                  />
                </Card>

                {/* 农民工专属信息 */}
                {isWorker && (
                  <WorkerDetailCards member={member} onPreview={handlePreview} />
                )}

                {/* 合同信息卡片 */}
                {member.contractFile && fileUrls.contractFile && (
                  <Card className="border border-[color:var(--border)] p-6 mb-6">
                    <h3 className="text-lg font-medium text-[color:var(--fg)] mb-4 flex items-center">
                      <Icon name="FileText" size={18} className="mr-2" />
                      劳动合同
                    </h3>
                    <button
                      onClick={() => handlePreview(fileUrls.contractFile!, member.contractFileType === 'pdf' ? 'pdf' : 'image', '劳动合同')}
                      className="text-[color:var(--accent)] hover:opacity-70 underline"
                    >
                      {member.contractFileType === 'pdf' ? <><Icon name="FileText" size={14} className="inline-block" /> 查看PDF合同</> : <><Icon name="Image" size={14} className="inline-block" />查看合同图片</>}
                    </button>
                  </Card>
                )}

                {/* 备注卡片 */}
                {member.remarks && (
                  <Card className="border border-[color:var(--border)] p-6 mb-6">
                    <h3 className="text-lg font-medium text-[color:var(--fg)] mb-4 flex items-center">
                      <span className="mr-2">📝</span>
                      备注
                    </h3>
                    <p className="text-[color:var(--fg-2)] whitespace-pre-wrap">{member.remarks}</p>
                  </Card>
                )}
              </>
            )}

            {activeTab === 'attendance' && (
              attendances === null ? (
                <Spinner size="md" text="加载考勤记录..." />
              ) : sortedAttendances.length === 0 ? (
                <EmptyState icon="CalendarX" title="暂无考勤记录" description="该人员还没有任何月度考勤数据。" />
              ) : (
                <MemberAttendanceTable records={sortedAttendances} />
              )
            )}

            {activeTab === 'salary' && !isWorker && (
              <ManagerSalaryCard member={member} />
            )}
          </div>
        </section>
      </div>

      {previewData && <PreviewModal data={previewData.data} type={previewData.type} title={previewData.title} onClose={() => setPreviewData(null)} />}
    </Modal>
  )
}

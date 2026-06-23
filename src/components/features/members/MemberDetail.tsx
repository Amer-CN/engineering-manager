import { useState } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { getWorkerTypeLabel, calculateAge } from './memberFormTypes'
import { useMemberFileUrls } from './useMemberFileUrls'
import { PreviewModal, InfoItem, Tag, IdCardImages, ManagerSalaryCard } from './MemberDetailParts'
import { WorkerDetailCards } from './WorkerDetailCards'
import { useMaskedFn } from '@/hooks/useMaskedValue'
import { Card } from '@/components/ui/Card'
import { Button } from '../../ui/Button'

export interface MemberDetailProps {
  member: Member
  onClose: () => void
  onEdit?: () => void
  onDelete?: () => void
  onTransfer?: () => void
  onLeave?: () => void
  onReEntry?: () => void
}

export function MemberDetail({
  member,
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

  const handlePreview = (data: string, type: 'image' | 'pdf', title: string) => {
    setPreviewData({ data, type, title })
  }

  const detailTitle = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-semibold text-slate-800">
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
          <div className="text-sm text-slate-500">
            创建时间: {member.createdAt ? new Date(member.createdAt).toLocaleString() : '未知'}
          </div>
          <div className="flex items-center gap-3">
            {onDelete && (
              <Button onClick={onDelete}  variant="danger" size="sm" className="btn">删除</Button>
            )}
            {isWorker && !isLeft && (
              <>
                {onTransfer && (
                  <Button onClick={onTransfer}  variant="ghost" size="sm" className="btn text-primary-600">调组</Button>
                )}
                {onLeave && (
                  <Button onClick={onLeave}  variant="ghost" size="sm" className="btn">离场</Button>
                )}
              </>
            )}
            {isWorker && isLeft && onReEntry && (
              <Button onClick={onReEntry}  variant="ghost" size="sm" className="btn text-success-600">重新入场</Button>
            )}
            {onEdit && (
              <Button onClick={onEdit} variant={isWorker ? 'warning' : 'primary'} size="sm">编辑</Button>
            )}
            <Button onClick={onClose} variant="secondary" size="sm">关闭</Button>
          </div>
        </div>
      }
    >
      {/* 基本信息卡片 */}
      <Card className="border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
          <span className="mr-2">📋</span>
          基本信息
        </h3>

        <div className="flex items-start mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mr-6 ${
            isWorker
              ? 'bg-gradient-to-br from-orange-400 to-orange-600'
              : 'bg-gradient-to-br from-primary-400 to-primary-600'
          } text-white`}>
            {isWorker ? <Icon name="Construction" size={32} /> : <Icon name="UserCircle" size={32} />}
          </div>

          <div className="flex-1">
            <h4 className="text-2xl font-bold text-slate-800">{member.name}</h4>
            <p className="text-slate-500 mt-1">
              {isWorker
                ? getWorkerTypeLabel(member.workerType || 'other')
                : member.role || '其他'
              }
            </p>
            {isWorker && member.teamName && (
              <p className="text-sm text-slate-500 mt-1">
                {member.projectName} / {member.teamName}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-3">
          <InfoItem icon={<Icon name="Phone" size={16} />} label="联系电话" value={member.phone} />
          <InfoItem icon={<Icon name="Mail" size={16} />} label="电子邮箱" value={member.email} />
          <InfoItem icon={<Icon name="Calendar" size={16} />} label="进场日期" value={member.entryDate} />
          {isWorker && (
            <InfoItem icon={<Icon name="Calendar" size={16} />} label="预计退场" value={member.expectedLeaveDate} />
          )}
          {isLeft && member.actualLeaveDate && (
            <InfoItem icon={<Icon name="HelpCircle" size={16} />} label="实际离场" value={member.actualLeaveDate} highlight />
          )}
        </div>
      </Card>

      {/* 身份证信息卡片 */}
      <Card className="border border-slate-200 p-6 mb-6">
        <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
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

      {/* 管理人员专属信息 */}
      {!isWorker && (
        <ManagerSalaryCard member={member} />
      )}

      {/* 合同信息卡片 */}
      {member.contractFile && fileUrls.contractFile && (
        <Card className="border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
            <Icon name="FileText" size={18} className="mr-2" />
            劳动合同
          </h3>
          <button
            onClick={() => handlePreview(fileUrls.contractFile!, member.contractFileType === 'pdf' ? 'pdf' : 'image', '劳动合同')}
            className="text-primary-600 hover:text-primary-700 underline"
          >
            {member.contractFileType === 'pdf' ? <><Icon name="FileText" size={14} className="inline-block" /> 查看PDF合同</> : <><Icon name="Image" size={14} className="inline-block" />查看合同图片</>}
          </button>
        </Card>
      )}

      {/* 备注卡片 */}
      {member.remarks && (
        <Card className="border border-slate-200 p-6 mb-6">
          <h3 className="text-lg font-medium text-slate-800 mb-4 flex items-center">
            <span className="mr-2">📝</span>
            备注
          </h3>
          <p className="text-slate-600 whitespace-pre-wrap">{member.remarks}</p>
        </Card>
      )}

      {previewData && <PreviewModal data={previewData.data} type={previewData.type} title={previewData.title} onClose={() => setPreviewData(null)} />}
    </Modal>
  )
}

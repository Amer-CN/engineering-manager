import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { FilePreviewItem, InfoItem, Tag } from './MemberDetailParts'
import { Card } from '@/components/ui/Card'

interface WorkerDetailCardsProps {
  member: Member
  onPreview: (data: string, type: 'image' | 'pdf', title: string) => void
}

export function WorkerDetailCards({ member, onPreview }: WorkerDetailCardsProps) {
  return (
    <>
      {/* 工资信息卡片 */}
      <Card className="border border-[color:var(--border)] p-6 mb-6">
        <h3 className="text-lg font-medium text-[color:var(--fg)] mb-4 flex items-center">
          <span className="mr-2">💰</span>
          工资信息
        </h3>

        <div className="grid grid-cols-2 gap-y-3">
          <InfoItem icon={<Icon name="DollarSign" size={16} />} label="日工资" value={member.dailyWage ? `${member.dailyWage} 元/天` : null} highlight />
          <InfoItem icon={<Icon name="CreditCard" size={16} />} label="工资卡号" value={member.wageBankAccount} />
          <InfoItem icon={<Icon name="Building2" size={16} />} label="开户行" value={member.wageBankName} />
        </div>
      </Card>

      {/* 安全档案卡片 */}
      <Card className="border border-[color:var(--border)] p-6 mb-6">
        <h3 className="text-lg font-medium text-[color:var(--fg)] mb-4 flex items-center">
          <span className="mr-2">📁</span>
          安全档案
        </h3>

        <div className="flex flex-wrap gap-2 mb-4">
          <Tag
            label={member.threeLevelEducation
              ? <><Icon name="Check" size={12} className="inline-block" />三级安全教育已完成</>
              : <><Icon name="X" size={12} className="inline-block" />三级安全教育未完成</>}
            variant={member.threeLevelEducation ? 'success' : 'warning'}
          />
        </div>

        {/* 证件文件 */}
        <div className="grid grid-cols-1 gap-2">
          <FilePreviewItem
            label="安全培训记录"
            file={member.safetyTrainingFile || ''}
            onPreview={() => onPreview(member.safetyTrainingFile!, 'image', '安全培训记录')}
          />
          <FilePreviewItem
            label="健康报告"
            file={member.healthReportFile || ''}
            onPreview={() => onPreview(member.healthReportFile!, 'image', '健康报告')}
          />
          <FilePreviewItem
            label="特种作业证"
            file={member.specialCertificateFile || ''}
            onPreview={() => onPreview(member.specialCertificateFile!, 'image', '特种作业证')}
          />
        </div>
      </Card>
    </>
  )
}

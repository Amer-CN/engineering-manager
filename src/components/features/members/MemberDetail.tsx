import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { getWorkerTypeLabel, calculateAge } from './memberFormTypes'
import { readUploadedFile, FILE_CATEGORIES } from '../../../services/fileService'
import { PreviewModal, FilePreviewItem, InfoItem, Tag } from './MemberDetailParts'

export interface MemberDetailProps {
    member: Member
    onClose: () => void
    onEdit?: () => void
    onDelete?: () => void
    onTransfer?: () => void
    onLeave?: () => void
    onReEntry?: () => void
}

// MemberDetail 组件
export function MemberDetail({
  member,
  onClose,
  onEdit,
  onDelete,
  onTransfer,
  onLeave,
  onReEntry
}: MemberDetailProps) {
  const [previewData, setPreviewData] = useState<{ data: string; type: 'image' | 'pdf'; title: string } | null>(null)
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadFiles = async () => {
      const urls: Record<string, string> = {}
      const fileFields = [
        { key: 'idCardFront', cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
        { key: 'idCardBack', cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
        { key: 'contractFile', cfg: FILE_CATEGORIES.MEMBER_CONTRACT },
        { key: 'safetyTrainingFile', cfg: FILE_CATEGORIES.MEMBER_TRAINING },
        { key: 'healthReportFile', cfg: FILE_CATEGORIES.MEMBER_HEALTH },
        { key: 'specialCertificateFile', cfg: FILE_CATEGORIES.MEMBER_CERTIFICATE },
      ] as const
      await Promise.all(fileFields.map(async ({ key, cfg }) => {
        const value = (member as any)[key]
        if (value) {
          urls[key] = await readUploadedFile(cfg.category, cfg.subCategory, value, member.projectName)
        }
      }))
      setFileUrls(urls)
    }
    loadFiles()
  }, [member])
  
  const isWorker = member.memberType === 'worker'
  const isLeft = member.status === 'left'

  // 处理预览
  const handlePreview = (data: string, type: 'image' | 'pdf', title: string) => {
    setPreviewData({ data, type, title })
  }
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        {/* 头部 */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-slate-800">
              {isWorker ? '<Icon name="Construction" size={20} className="inline-block" /> 农民工详情' : '<Icon name="UserCircle" size={20} className="inline-block" /> 管理人员详情'}
            </h2>
            {isWorker && (
              <Tag 
                label={isLeft ? '已离场' : '在职'} 
                variant={isLeft ? 'warning' : 'success'} 
              />
            )}
            {member.isTeamLeader && <Tag label="班组长" variant="info" />}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><Icon name="X" size={20} /></button>
        </div>

        <div className="p-6">
          {/* 基本信息卡片 */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <span className="mr-2">📋</span>
              基本信息
            </h3>
            
            <div className="flex items-start mb-6">
              {/* 头像 */}
              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mr-6 ${
                isWorker 
                  ? 'bg-gradient-to-br from-orange-400 to-orange-600' 
                  : 'bg-gradient-to-br from-primary-400 to-primary-600'
              } text-white`}>
                {isWorker ? <Icon name="Construction" size={32} /> : <Icon name="UserCircle" size={32} />}
              </div>
              
              <div className="flex-1">
                <h4 className="text-2xl font-bold text-slate-800">{member.name}</h4>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                  {isWorker 
                    ? getWorkerTypeLabel(member.workerType || 'other')
                    : member.role || '其他'
                  }
                </p>
                {isWorker && member.teamName && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
          </div>

          {/* 身份证信息卡片*/}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
              <span className="mr-2">🪪</span>
              身份证信息            </h3>
            
            <div className="grid grid-cols-2 gap-y-3 mb-4">
              <InfoItem icon={<Icon name="Key" size={16} />} label="身份证号" value={member.idCard} />
              <InfoItem icon={<Icon name="UserCircle" size={16} />} label="性别" value={member.gender} />
              <InfoItem icon={<Icon name="Users" size={16} />} label="民族" value={member.ethnicity} />
              <InfoItem icon={<Icon name="Calendar" size={16} />} label="出生日期" value={member.birthDate} />
              {member.birthDate && (
                <InfoItem icon={<Icon name="LayoutDashboard" size={16} />} label="年龄" value={calculateAge(member.birthDate)} />
              )}
            </div>
            
            <div className="mt-4">
              <InfoItem icon={<Icon name="Home" size={16} />} label="身份证住址" value={member.idCardAddress} />
            </div>

            {/* 身份证图片*/}
            {(member.idCardFront || member.idCardBack) && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-600 mb-3">身份证图片</p>
                <div className="grid grid-cols-2 gap-4">
                  {member.idCardFront && fileUrls.idCardFront && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">人像面</p>
                      <div
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 cursor-pointer hover:border-primary-400 transition-colors"
                        onClick={() => handlePreview(fileUrls.idCardFront!, 'image', '身份证人像面')}
                      >
                        <img
                          src={fileUrls.idCardFront}
                          alt="人像面"
                          className="max-h-32 mx-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                  {member.idCardBack && fileUrls.idCardBack && (
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">国徽面</p>
                      <div
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-2 cursor-pointer hover:border-primary-400 transition-colors"
                        onClick={() => handlePreview(fileUrls.idCardBack!, 'image', '身份证国徽面')}
                      >
                        <img
                          src={fileUrls.idCardBack}
                          alt="国徽面"
                          className="max-h-32 mx-auto rounded"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 农民工专属信息*/}
          {isWorker && (
            <>
              {/* 工资信息卡片 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  <span className="mr-2">💰</span>
                  工资信息
                </h3>
                
                <div className="grid grid-cols-2 gap-y-3">
                  <InfoItem icon={<Icon name="DollarSign" size={16} />} label="日工资" value={member.dailyWage ? `${member.dailyWage} 元/天` : null} highlight />
                  <InfoItem icon={<Icon name="CreditCard" size={16} />} label="工资卡号" value={member.wageBankAccount} />
                  <InfoItem icon={<Icon name="Building2" size={16} />} label="开户行" value={member.wageBankName} />
                </div>
              </div>

              {/* 安全档案卡片 */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                  <span className="mr-2">📁</span>
                  安全档案
                </h3>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  <Tag 
                    label={member.threeLevelEducation ? '<Icon name="Check" size={12} className="inline-block" />三级安全教育已完成' : '<Icon name="X" size={12} className="inline-block" />三级安全教育未完成'} 
                    variant={member.threeLevelEducation ? 'success' : 'warning'} 
                  />
                </div>

                {/* 证件文件 */}
                <div className="grid grid-cols-1 gap-2">
                  <FilePreviewItem
                    label="安全培训记录"
                    file={member.safetyTrainingFile || ''}
                    onPreview={() => handlePreview(member.safetyTrainingFile!, 'image', '安全培训记录')}
                  />
                  <FilePreviewItem
                    label="健康报告"
                    file={member.healthReportFile || ''}
                    onPreview={() => handlePreview(member.healthReportFile!, 'image', '健康报告')}
                  />
                  <FilePreviewItem
                    label="特种作业证"
                    file={member.specialCertificateFile || ''}
                    onPreview={() => handlePreview(member.specialCertificateFile!, 'image', '特种作业证')}
                  />
                </div>
              </div>
            </>
          )}

          {/* 管理人员专属信息 */}
          {!isWorker && (
            <>
              {/* 薪酬信息卡片 */}
              {member.baseSalary !== undefined && (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                  <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                    <span className="mr-2">💵</span>
                    薪酬信息
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 rounded-lg p-4">
                      <p className="text-sm text-slate-500">基本工资</p>
                      <p className="text-xl font-bold text-green-600">
                        {member.baseSalary?.toLocaleString() || '0'} 元月                      </p>
                    </div>
                    {member.socialSecurityPersonal !== undefined && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500">社保（个人）</p>
                        <p className="text-lg font-medium text-blue-600">
                          {member.socialSecurityPersonal?.toLocaleString() || '0'} 元月                        </p>
                      </div>
                    )}
                    {member.socialSecurityCompany !== undefined && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500">社保（单位）</p>
                        <p className="text-lg font-medium text-purple-600">
                          {member.socialSecurityCompany?.toLocaleString() || '0'} 元月                        </p>
                      </div>
                    )}
                    {member.housingFund !== undefined && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500">公积金</p>
                        <p className="text-lg font-medium text-orange-600">
                          {member.housingFund?.toLocaleString() || '0'} 元月                        </p>
                      </div>
                    )}
                    {member.otherAllowances !== undefined && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-sm text-slate-500">其他补贴</p>
                        <p className="text-lg font-medium text-slate-600">
                          {member.otherAllowances?.toLocaleString() || '0'} 元月                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* 合同信息卡片 */}
          {member.contractFile && fileUrls.contractFile && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                <Icon name="FileText" size={18} className="mr-2" />
                劳动合同
              </h3>
              <button
                onClick={() => handlePreview(fileUrls.contractFile!, member.contractFileType === 'pdf' ? 'pdf' : 'image', '劳动合同')}
                className="text-primary-600 hover:text-primary-700 underline"
              >
                {member.contractFileType === 'pdf' ? <><Icon name="FileText" size={14} className="inline-block" /> 查看PDF合同</> : <><Icon name="Image" size={14} className="inline-block" />查看合同图片</>}
              </button>
            </div>
          )}

          {/* 备注卡片 */}
          {member.remarks && (
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4 flex items-center">
                <span className="mr-2">📝</span>
                备注
              </h3>
              <p className="text-slate-600 whitespace-pre-wrap">{member.remarks}</p>
            </div>
          )}
        </div>

        {/* 底部操作核*/}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-800 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            创建时间: {member.createdAt ? new Date(member.createdAt).toLocaleString() : '未知'}
          </div>
          <div className="flex items-center gap-3">
            {/* 删除按钮 */}
            {onDelete && (
              <button
                onClick={onDelete}
                className="btn btn-danger btn-sm"
              >
                删除
              </button>
            )}
            
            {/* 农民工专属操低*/}
            {isWorker && !isLeft && (
              <>
                {onTransfer && (
                  <button
                    onClick={onTransfer}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    调组
                  </button>
                )}
                {onLeave && (
                  <button
                    onClick={onLeave}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    离场
                  </button>
                )}
              </>
            )}
            
            {/* 已离场工人操低*/}
            {isWorker && isLeft && onReEntry && (
              <button
                onClick={onReEntry}
                className="px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                重新入场
              </button>
            )}
            
            {/* 编辑按钮 */}
            {onEdit && (
              <button
                onClick={onEdit}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors ${
                  isWorker 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                编辑
              </button>
            )}
            
            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </motion.div>

      {/* 预览模态框 */}
      {previewData && <PreviewModal data={previewData.data} type={previewData.type} title={previewData.title} onClose={() => setPreviewData(null)} />}
    </div>
  )
}


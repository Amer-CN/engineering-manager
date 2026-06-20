import { useState, useEffect } from 'react'
import { readUploadedFile, FILE_CATEGORIES } from '@/services/fileService'
import type { Member } from '@/types'

const FILE_FIELDS = [
  { key: 'idCardFront', cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
  { key: 'idCardBack', cfg: FILE_CATEGORIES.MEMBER_ID_CARD },
  { key: 'contractFile', cfg: FILE_CATEGORIES.MEMBER_CONTRACT },
  { key: 'safetyTrainingFile', cfg: FILE_CATEGORIES.MEMBER_TRAINING },
  { key: 'healthReportFile', cfg: FILE_CATEGORIES.MEMBER_HEALTH },
  { key: 'specialCertificateFile', cfg: FILE_CATEGORIES.MEMBER_CERTIFICATE },
] as const

/**
 * 加载 Member 关联的 6 个文件 (身份证 / 合同 / 安全培训 / 健康证 / 特殊工种证) 为 dataURL
 * @returns key → dataURL 映射, 文件不存在则该 key 不在结果中
 */
export function useMemberFileUrls(member: Member): Record<string, string> {
  const [fileUrls, setFileUrls] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadFiles = async () => {
      const urls: Record<string, string> = {}
      await Promise.all(FILE_FIELDS.map(async ({ key, cfg }) => {
        const value = (member as any)[key]
        if (value) {
          urls[key] = await readUploadedFile(cfg.category, cfg.subCategory, value, member.projectName)
        }
      }))
      setFileUrls(urls)
    }
    loadFiles()
  }, [member])

  return fileUrls
}
import { useCallback } from 'react'
import { recognizeIdCard, getOCRConfig, OCRProvider } from '../services/ocr'
import { useToastStore } from '../store/toastStore'
import { StaffFormData, WorkerFormData } from '../components/features/members'

interface UseMembersOCROptions {
  setOcrMode: React.Dispatch<React.SetStateAction<OCRProvider>>
}

export function useMembersOCR({ setOcrMode }: UseMembersOCROptions) {
  const showToast = useToastStore(state => state.showToast)

  const processFileForIdCard = useCallback(async (file: File, field: 'idCardFront' | 'idCardBack', setFormData: React.Dispatch<React.SetStateAction<StaffFormData | WorkerFormData>>) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      setFormData(prev => ({ ...prev, [field]: base64 }))
      setOcrMode(getOCRConfig().provider)
      if (field === 'idCardFront') {
        try {
          const result = await recognizeIdCard(base64)
          if (result.success && result.idCard) {
            const { number, gender, birthDate, name, ethnicity, address } = result.idCard
            setFormData(prev => ({
              ...prev,
              name: name || prev.name,
              gender: gender || prev.gender,
              ethnicity: ethnicity || prev.ethnicity,
              birthDate: birthDate || prev.birthDate,
              idCard: number || prev.idCard,
              idCardAddress: address || prev.idCardAddress
            }))
            const filled: string[] = []
            if (name) filled.push('姓名')
            if (number) filled.push('身份证号')
            if (gender) filled.push('性别')
            if (birthDate) filled.push('出生日期')
            if (ethnicity) filled.push('民族')
            if (address) filled.push('地址')
            showToast(filled.length > 0 ? `识别成功！已自动填充：${filled.join('、')}` : '身份证识别成功', 'success')
          }
        } catch (err) { console.error('OCR 识别失败:', err) }
      }
    }
    reader.readAsDataURL(file)
  }, [showToast, setOcrMode])

  const processUploadFile = useCallback(async (file: File, field: string, setFormData: React.Dispatch<React.SetStateAction<any>>) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      setFormData((prev: any) => ({
        ...prev,
        [field]: e.target?.result as string,
        [`${field}Type`]: file.type === 'application/pdf' ? 'pdf' : 'image'
      }))
    }
    reader.readAsDataURL(file)
  }, [])

  return { processFileForIdCard, processUploadFile }
}

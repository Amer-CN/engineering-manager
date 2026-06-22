/**
 * 银行回单批量解析 - 批量上传组件
 *
 * 功能：
 * 1. 支持拖拽/选择多个银行回单文件（jpg/png/pdf）
 * 2. 实时显示解析进度（已解析 X/总数）
 * 3. 解析失败自动重试（最多 3 次）
 * 4. 解析完成后跳转到匹配确认界面
 */
import { useState, useCallback } from 'react'
import { useToastStore } from '@/store/toastStore'
import type { BatchParseResult } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { useBankReceiptFiles } from './useBankReceiptFiles'
import BankReceiptDropZone from './BankReceiptDropZone'
import BankReceiptParseStatus from './BankReceiptParseStatus'

interface BankReceiptBatchProps {
  projectId?: number
  projectName?: string
  yearMonth?: string
  onParseComplete: (result: BatchParseResult) => void
  onCancel: () => void
}

type ParseStatus = 'idle' | 'parsing' | 'completed' | 'error'

export default function BankReceiptBatch({
  projectId,
  projectName,
  yearMonth,
  onParseComplete,
  onCancel,
}: BankReceiptBatchProps) {
  const showToast = useToastStore(state => state.showToast)
  const { files, isDragOver, fileInputRef, fileInputProps, dropZoneProps, removeFile, clearFiles } = useBankReceiptFiles()

  const [status, setStatus] = useState<ParseStatus>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [parseResult, setParseResult] = useState<BatchParseResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveFileToUploads = async (
    file: File,
    projectName?: string,
    yearMonth?: string
  ): Promise<string | null> => {
    try {
      const fileData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          const base64 = result.split(',')[1] || result
          resolve(base64)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const fileName = `${yearMonth || 'unknown'}_${file.name}`
      const result = await (await getAPI()).saveFile({
        category: 'wages',
        subCategory: 'bank-receipts',
        fileData: `data:${file.type};base64,${fileData}`,
        fileName: fileName,
        projectName: projectName || '未分类',
      })

      if (result.success && result.data) {
        return result.data.fileName
      }

      return null
    } catch (error) {
      console.error('保存文件失败:', error)
      return null
    }
  }

  const startParsing = useCallback(async () => {
    if (files.length === 0) {
      showToast('请先选择文件', 'warning')
      return
    }

    setStatus('parsing')
    setProgress({ current: 0, total: files.length })
    setError(null)

    try {
      const filePaths: string[] = []

      for (const file of files) {
        const filePath = await saveFileToUploads(file, projectName, yearMonth)
        if (filePath) {
          filePaths.push(filePath)
        }
      }

      if (filePaths.length === 0) {
        throw new Error('文件保存失败')
      }

      const result = await (await getAPI()).batchParseBankReceipts(
        filePaths,
        projectId,
        yearMonth
      )

      if (!result.success || !result.data) {
        throw new Error(result.error || '批量解析失败')
      }

      setParseResult(result.data)
      setProgress({ current: files.length, total: files.length })
      setStatus('completed')

      showToast(
        `解析完成！成功 ${result.data.successCount} 个，失败 ${result.data.failCount} 个`,
        result.data.failCount === 0 ? 'success' : 'warning'
      )

      onParseComplete(result.data)
    } catch (err: any) {
      setStatus('error')
      setError(err.message || '解析过程中发生错误')
      showToast(err.message || '解析失败', 'error')
    }
  }, [files, projectId, projectName, yearMonth, showToast, onParseComplete])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">银行回单批量解析</h2>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
        >
          返回
        </button>
      </div>

      <BankReceiptDropZone
        files={files}
        isDragOver={isDragOver}
        fileInputRef={fileInputRef}
        fileInputProps={fileInputProps}
        dropZoneProps={dropZoneProps}
        removeFile={removeFile}
        clearFiles={() => { clearFiles(); setParseResult(null) }}
        isParsing={status === 'parsing'}
      />

      <BankReceiptParseStatus
        status={status}
        progress={progress}
        parseResult={parseResult}
        error={error}
      />

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
        >
          取消
        </button>
        <button
          onClick={startParsing}
          disabled={files.length === 0 || status === 'parsing'}
          className={`
            px-6 py-2 text-sm font-medium text-white rounded-md
            ${(files.length === 0 || status === 'parsing')
              ? 'bg-slate-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
            }
          `}
        >
          {status === 'parsing' ? '解析中...' : '开始解析'}
        </button>
      </div>
    </div>
  )
}

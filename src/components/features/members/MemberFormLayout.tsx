import React from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'
import { OCRProvider } from '@/services/ocr'
import { Button } from '../../ui/Button'

interface Props {
  type: 'staff' | 'worker'; editingMember: any; ocrMode: OCRProvider
  ocrLoading: boolean; submitting: boolean
  onClose: () => void; onSubmit: (e: React.FormEvent) => void; children: React.ReactNode
}

export const MemberFormLayout: React.FC<Props> = ({ type, editingMember, ocrMode, ocrLoading, submitting, onClose, onSubmit, children }) => {
  const title = editingMember ? `编辑${type === 'staff' ? '管理人员' : '工人'}` : `添加${type === 'staff' ? '管理人员' : '工人'}`
  return (
    <Modal isOpen onClose={onClose} title={title} size="xl"
      footer={
        <>
          <Button type="button" onClick={onClose}  disabled={submitting} variant="secondary">取消</Button>
          <button type="submit" form="member-form" disabled={submitting} className={`btn ${type === 'staff' ? 'btn-primary' : 'btn-warning'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{submitting ? '提交中..' : (editingMember ? '保存' : '添加')}</button>
        </>
      }
    >
      <form id="member-form" onSubmit={onSubmit}>
        <div className={`mb-4 p-3 rounded-lg text-sm ${type === 'staff' ? 'bg-primary-50 text-primary-700' : 'bg-amber-50 text-amber-700'}`}><Icon name="Lightbulb" size={16} className="inline-block" /> <strong>提示</strong>上传图片或PDF时，可直接<strong>拖拽文件</strong>到上传区域，或按 <kbd className={`px-1 py-0.5 rounded text-xs ${type === 'staff' ? 'bg-primary-200' : 'bg-amber-200'}`}>Ctrl+V</kbd> 粘贴</div>
        <div className="mb-4 flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-full ${ocrMode === 'baidu' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{ocrMode === 'baidu' ? <><Icon name="Globe" size={14} className="inline-block" /> 百度OCR</> : <><Icon name="WifiOff" size={14} className="inline-block" /> 离线OCR</>}</span>{ocrLoading && <span className="text-xs text-primary-600">识别中..</span>}</div>
        {children}
      </form>
    </Modal>
  )
}

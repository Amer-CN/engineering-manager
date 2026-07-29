import React from 'react'
import { Drawer } from '../../ui/Drawer'
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
    <Drawer open onClose={onClose} icon={type === 'staff' ? 'UserCog' : 'HardHat'} title={title} width={560}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose}  disabled={submitting} variant="secondary">取消</Button>
          <button type="submit" form="member-form" disabled={submitting} className={`${type === 'staff' ? 'bg-[color:var(--accent)] hover:opacity-90 text-[color:var(--on-accent)]' : 'bg-warning-500 hover:bg-warning-600 text-white'} ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}>{submitting ? '提交中..' : (editingMember ? '保存' : '添加')}</button>
        </div>
      }
    >
      <form id="member-form" onSubmit={onSubmit} className="px-6 py-4">
        <div className={`mb-4 p-3 rounded-lg text-sm ${type === 'staff' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'bg-warning-50 text-warning-700'}`}><Icon name="Lightbulb" size={16} className="inline-block" /> <strong>提示</strong>上传图片或PDF时，可直接<strong>拖拽文件</strong>到上传区域，或按 <kbd className={`px-1 py-0.5 rounded text-xs ${type === 'staff' ? 'bg-[color:var(--panel-2)]' : 'bg-warning-200'}`}>Ctrl+V</kbd> 粘贴</div>
        <div className="mb-4 flex items-center gap-2"><span className={`text-xs px-2 py-1 rounded-full ${ocrMode === 'baidu' ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'}`}>{ocrMode === 'baidu' ? <><Icon name="Globe" size={14} className="inline-block" /> 百度OCR</> : <><Icon name="WifiOff" size={14} className="inline-block" /> 离线OCR</>}</span>{ocrLoading && <span className="text-xs text-[color:var(--accent)]">识别中..</span>}</div>
        {children}
      </form>
    </Drawer>
  )
}

import React from 'react'
import { Modal } from '../../ui/Modal/Modal'

export interface FilePreviewData {
  data: string
  type: 'image' | 'pdf' | 'xml' | 'ofd'
  title: string
}

export const FilePreviewModal: React.FC<{
  file: FilePreviewData
  onClose: () => void
}> = ({ file, onClose }) => (
  <Modal isOpen onClose={onClose} title={file.title} size="full">
    <div className="rounded-lg p-4" style={{ minHeight: '70vh', background: 'var(--panel-2)' }}>
      {file.type === 'pdf' ? (
        <iframe src={file.data} className="w-full h-full border-0 rounded" />
      ) : file.type === 'image' ? (
        <img src={file.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" loading="lazy" />
      ) : (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <p className="text-sm text-[color:var(--muted)]">该格式不支持在线预览，请下载查看</p>
          <a href={file.data} download={file.title} className="px-4 py-2 rounded-lg text-sm text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)]">
            下载文件
          </a>
        </div>
      )}
    </div>
  </Modal>
)

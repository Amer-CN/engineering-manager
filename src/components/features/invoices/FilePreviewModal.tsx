import React from 'react'
import { Modal } from '../../ui/Modal/Modal'

export interface FilePreviewData {
  data: string
  type: 'image' | 'pdf'
  title: string
}

export const FilePreviewModal: React.FC<{
  file: FilePreviewData
  onClose: () => void
}> = ({ file, onClose }) => (
  <Modal isOpen onClose={onClose} title={file.title} size="full">
    <div className="bg-slate-100 rounded-lg p-4" style={{ minHeight: '70vh' }}>
      {file.type === 'pdf' ? (
        <iframe src={file.data} className="w-full h-full border-0 rounded" />
      ) : (
        <img src={file.data} alt="预览" className="max-w-full max-h-full object-contain mx-auto" />
      )}
    </div>
  </Modal>
)

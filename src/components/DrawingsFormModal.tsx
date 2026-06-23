import React from 'react'
import type { Drawing, Project } from '@/types/electron'
import { Modal } from './ui/Modal/Modal'
import { Input } from './ui/Input/Input'
import { DrawingUploadForm } from './DrawingsUploadForm'
import { categories } from './drawingsConstants'
import { Button } from './ui/Button'

export interface FormDataState {
  projectId: number | ''
  name: string
  category: string
  remarks: string
  position: string
  files: File[]
}

interface DrawingsFormModalProps {
  showModal: boolean
  editingDrawing: Drawing | null
  formData: FormDataState
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>
  projects: Project[]
  uploading: boolean
  uploadProgress: { current: number; total: number }
  handleSubmit: (e: React.FormEvent) => void
  handleFilesAdd: (files: FileList | File[]) => void
  handleFileRemove: (index: number) => void
  setShowModal: (b: boolean) => void
  resetForm: () => void
}

export const DrawingsFormModal: React.FC<DrawingsFormModalProps> = ({
  showModal,
  editingDrawing,
  formData,
  setFormData,
  projects,
  uploading,
  uploadProgress,
  handleSubmit,
  handleFilesAdd,
  handleFileRemove,
  setShowModal,
  resetForm
}) => {
  return (
    <Modal isOpen={showModal} onClose={() => { if (!uploading) { setShowModal(false); resetForm() } }}
      title={editingDrawing ? '编辑图纸' : '上传图纸'} size="md"
      footer={<>
        <Button type="button" onClick={() => { if (uploading) return; setShowModal(false); resetForm() }}
          disabled={uploading}  variant="secondary" className="btn disabled:opacity-50">取消</Button>
        <Button type="submit" form="drawing-form" disabled={uploading}
           variant="primary" className="btn disabled:opacity-50 disabled:cursor-not-allowed">
          {uploading ? `上传中 ${uploadProgress.current}/${uploadProgress.total}...` : editingDrawing ? '保存' : formData.files.length > 1 ? `上传 (${formData.files.length})` : '上传'}
        </Button>
      </>}>
      <form id="drawing-form" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">所属项目*</label>
            <select value={formData.projectId} onChange={e => setFormData({ ...formData, projectId: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" required>
              <option value="">请选择项目</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <Input label="图纸名称" size="sm" type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">图纸类型</label>
            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
              <option value="">请选择类型</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {editingDrawing ? '替换文件 (可选)' : '选择文件 *'}
            </label>
            <DrawingUploadForm files={formData.files} uploading={uploading} uploadProgress={uploadProgress}
              editingMode={!!editingDrawing} onFilesAdd={handleFilesAdd} onFileRemove={handleFileRemove} />
          </div>
          <Input label="部位" size="sm" type="text" required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}
            placeholder="请输入图纸所属部位..." />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">备注说明</label>
            <textarea value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              rows={3} placeholder="请输入图纸的备注说明..." />
          </div>
        </div>
      </form>
    </Modal>
  )
}

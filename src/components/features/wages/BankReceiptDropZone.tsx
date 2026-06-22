import { motion, AnimatePresence } from 'framer-motion'
import { HoverScrollbar } from '../../ui/HoverScrollbar'

interface BankReceiptDropZoneProps {
  files: File[]
  isDragOver: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  fileInputProps: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }
  dropZoneProps: {
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  }
  removeFile: (index: number) => void
  clearFiles: () => void
  isParsing: boolean
}

export default function BankReceiptDropZone({
  files,
  isDragOver,
  fileInputRef,
  fileInputProps,
  dropZoneProps,
  removeFile,
  clearFiles,
  isParsing,
}: BankReceiptDropZoneProps) {
  return (
    <>
      {/* 拖拽上传区域 */}
      <div
        onDrop={dropZoneProps.onDrop}
        onDragOver={dropZoneProps.onDragOver}
        onDragLeave={dropZoneProps.onDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
          transition-colors duration-200
          ${isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:bg-slate-100'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.pdf"
          onChange={fileInputProps.onChange}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="text-6xl">📄</div>
          <div>
            <p className="text-lg font-medium text-slate-900">
              拖拽文件到此处，或 <span className="text-blue-600">点击选择</span>
            </p>
            <p className="text-sm text-slate-500 mt-1">
              支持 jpg、png、pdf 格式，可多选
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-slate-900">
              已选择 {files.length} 个文件
            </h3>
            <button
              onClick={clearFiles}
              className="text-sm text-red-600 hover:text-red-800"
            >
              清空列表
            </button>
          </div>

          <HoverScrollbar className="flex-1 max-h-60"><div className="space-y-2">
            <AnimatePresence>
              {files.map((file, index) => (
                <motion.div
                  key={`${file.name}-${index}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, x: 100 }}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                    disabled={isParsing}
                  >
                    ✕
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div></HoverScrollbar>
        </div>
      )}
    </>
  )
}

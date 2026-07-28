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
            ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)]'
            : 'border-[color:var(--border)] bg-[color:var(--panel-2)] hover:bg-[color:var(--panel-2)]'
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
            <p className="text-lg font-medium text-[color:var(--fg)]">
              拖拽文件到此处，或 <span className="text-[color:var(--accent)]">点击选择</span>
            </p>
            <p className="text-sm text-[color:var(--muted)] mt-1">
              支持 jpg、png、pdf 格式，可多选
            </p>
          </div>
        </div>
      </div>

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="bg-[color:var(--card)] rounded-lg border border-[color:var(--border)] p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-[color:var(--fg)]">
              已选择 {files.length} 个文件
            </h3>
            <button
              onClick={clearFiles}
              className="text-sm text-danger-600 hover:text-danger-800"
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
                  className="flex items-center justify-between p-3 bg-[color:var(--panel-2)] rounded-md"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-[color:var(--fg)]">{file.name}</p>
                      <p className="text-xs text-[color:var(--muted)]">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => removeFile(index)}
                    className="text-danger-500 hover:text-danger-700"
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

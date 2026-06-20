import { useState, useCallback } from 'react'

/**
 * 通用拖拽上传区域（render-props 模式）
 * 子组件通过 children 函数拿到 dragging 状态, 自己渲染任意 UI
 */
export function DropZone({ onFile, children }: {
  onFile: (f: File) => void
  children: (dragging: boolean) => React.ReactNode
}) {
  const [dragging, setDragging] = useState(false)
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const handleDragLeave = useCallback(() => setDragging(false), [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])
  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
      {children(dragging)}
    </div>
  )
}

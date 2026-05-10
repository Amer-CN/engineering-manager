interface FileUploaderProps {
  files: string[]
  onChange: (files: string[]) => void
  projectName?: string
}

export function FileUploader({ files, onChange, projectName }: FileUploaderProps) {
  const handleAdd = () => {
    // 文件上传通过电子 API 处理，这里仅记录文件名
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true
    input.onchange = () => {
      const newFiles = Array.from(input.files || []).map(f => f.name)
      onChange([...files, ...newFiles.filter(n => !files.includes(n))])
    }
    input.click()
  }

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">
              <span className="flex-1 truncate">{f}</span>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={handleAdd}
        className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600"
      >
        + 上传凭证（可选）
      </button>
    </div>
  )
}

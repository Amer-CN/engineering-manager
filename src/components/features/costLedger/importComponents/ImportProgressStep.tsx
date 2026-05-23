/**
 * 步骤三：导入中（进度）
 */
interface Props {
  progress: { current: number; total: number }
}

export function ImportProgressStep({ progress }: Props) {
  return (
    <div className="py-10 text-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent mx-auto" />
      <p className="text-slate-600 dark:text-slate-300">
        正在导入 {progress.total} 条数据……
      </p>
      <div className="w-full max-w-md mx-auto bg-slate-200 rounded-full h-2">
        <div
          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
        />
      </div>
    </div>
  )
}

import { Spinner } from '../../../ui/Loading/Loading'

/**
 * 步骤三：导入中（进度）
 */
interface Props {
  progress: { current: number; total: number }
}

export function ImportProgressStep({ progress }: Props) {
  return (
  <div className="py-10 text-center space-y-4">
  <Spinner size="lg" className="mx-auto" />
  <p className="text-[color:var(--fg-2)]">
  正在导入 {progress.total} 条数据……
  </p>
  <div className="w-full max-w-md mx-auto bg-[color:var(--panel-2)] rounded-full h-2">
  <div
  className="bg-[color:var(--accent)] h-2 rounded-full transition-[width] duration-300"
  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
  />
  </div>
  </div>
  )
}

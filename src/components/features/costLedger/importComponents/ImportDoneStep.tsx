/**
 * 步骤四：导入完成
 */
import { Icon } from '@/components/ui/Icon'

interface Props {
  count: number
  learnedMsg: string | null
}

export function ImportDoneStep({ count, learnedMsg }: Props) {
  return (
    <div className="py-10 text-center space-y-3">
      <Icon name="CheckCircle" size={48} className="mx-auto text-emerald-500" />
      <p className="text-lg font-medium text-slate-700 dark:text-slate-200">导入完成</p>
      <p className="text-sm text-slate-500">成功导入 {count} 条台账记录</p>
      {learnedMsg && (
        <p className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-lg inline-block">
          🧠 {learnedMsg}，下次导入自动生效
        </p>
      )}
    </div>
  )
}

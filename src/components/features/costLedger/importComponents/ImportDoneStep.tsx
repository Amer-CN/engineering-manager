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
  <Icon name="CheckCircle" size={48} className="mx-auto text-success-500" />
  <p className="text-lg font-medium text-[color:var(--fg-2)]">导入完成</p>
  <p className="text-sm text-[color:var(--muted)]">成功导入 {count} 条台账记录</p>
  {learnedMsg && (
  <p className="text-sm text-success-600 bg-success-50 px-4 py-2 rounded-lg inline-block">
  🧠 {learnedMsg}，下次导入自动生效
  </p>
  )}
  </div>
  )
}

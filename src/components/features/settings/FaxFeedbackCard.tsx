import { Button } from '../../ui/Button'
import { openFaxFeedback } from '@/lib/crash'

/**
 * 设置 → 关于与帮助：「反馈专线」入口卡（v0.92.0 新增）
 * 样本主面板通用页 Feedback 卡同构（小标签 / 标题 / 描述 / 「打开…」），
 * 皮肤用工程管家自身组件规范（card + Button）——只有点开后弹出的传真机才是样本配色。
 */
export function FaxFeedbackCard() {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wider text-[color:var(--accent)]">Feedback</span>
            <h3 className="text-base font-semibold text-[color:var(--fg)]">反馈专线</h3>
            <p className="text-sm text-[color:var(--fg-2)]">在应用内直接发送错误报告或功能建议。</p>
          </div>
          <Button onClick={openFaxFeedback} variant="outline" size="sm">打开…</Button>
        </div>
      </div>
    </div>
  )
}
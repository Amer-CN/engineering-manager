import { Icon } from './Icon'
import { Button } from './Button'

interface NoAccessStateProps {
  /** 提示标题，默认"无访问权限" */
  title?: string
  /** 补充说明文案 */
  description?: string
  /** 返回按钮点击回调（默认派发 navigate 事件回工作台） */
  onBack?: () => void
}

/**
 * S38 错误/无权限页 — Stitch Bedrock
 * 整块居中：图标 + 标题 + 说明 + 返回按钮，中性色不吓人
 */
export function NoAccessState({
  title = '无访问权限',
  description = '当前账号没有查看此页面的权限，如需访问请联系管理员分配。',
  onBack,
}: NoAccessStateProps) {
  const handleBack = () => {
    if (onBack) { onBack(); return }
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }))
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center mb-4">
        <Icon name="Lock" size={24} className="text-[color:var(--muted)]" />
      </div>
      <h2 className="text-base font-semibold text-[color:var(--fg)] mb-1.5">{title}</h2>
      <p className="text-sm text-[color:var(--muted)] max-w-sm mb-6">{description}</p>
      <Button variant="secondary" size="sm" onClick={handleBack} leftIcon="ArrowLeft">
        返回工作台
      </Button>
    </div>
  )
}

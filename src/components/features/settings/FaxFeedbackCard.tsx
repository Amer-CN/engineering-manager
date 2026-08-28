import { useState } from 'react'
import { Button } from '../../ui/Button'
import { openFaxFeedback, DEFAULT_ENDPOINT, ENDPOINT_OVERRIDE_KEY } from '@/lib/crash'

/**
 * 设置 → 关于与帮助：「反馈专线」入口卡（v0.92.0 新增）
 * 样本主面板通用页 Feedback 卡同构（小标签 / 标题 / 描述 / 「打开…」），
 * 皮肤用工程管家自身组件规范（card + Button）——只有点开后弹出的传真机才是样本配色。
 * 卡片下方为「自定义上报地址」输入框：填合法 http(s) URL 写入 localStorage 后所有上报走该地址；
 * 失焦或回车时校验，非法值不写入并恢复当前生效值；清空即移除键恢复默认官方地址。
 */
function readStoredEndpoint(): string {
  try {
    return localStorage.getItem(ENDPOINT_OVERRIDE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function FaxFeedbackCard() {
  const [endpoint, setEndpoint] = useState(readStoredEndpoint)

  /** 失焦或回车时统一走这里校验并落盘 */
  const commitEndpoint = (): void => {
    const v = endpoint.trim()
    try {
      if (v === '') {
        localStorage.removeItem(ENDPOINT_OVERRIDE_KEY)
        return
      }
      const url = new URL(v)
      if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol')
      localStorage.setItem(ENDPOINT_OVERRIDE_KEY, v)
    } catch {
      // 非法地址或 localStorage 不可用：不写入，输入框恢复当前生效值
      setEndpoint(readStoredEndpoint())
    }
  }

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
        <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-[color:var(--fg-2)]">自定义上报地址</span>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              onBlur={commitEndpoint}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              placeholder={DEFAULT_ENDPOINT}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            />
            <p className="text-xs text-[color:var(--muted)]">留空使用官方默认地址；填写后所有报错上报走此地址</p>
          </div>
        </div>
      </div>
    </div>
  )
}
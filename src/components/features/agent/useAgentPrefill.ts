// useAgentPrefill.ts — S31B：消费外部预填提问（如知识库"问 AI 关于本文"）
// 两条通道：
//  - sessionStorage('agent:prefill') + 'agent:prefill' 事件（detail 为空/字符串）→ 替换输入框
//    （其他页面调用方零影响，向后兼容）
//  - CustomEvent('agent:prefill') 携 { text, append?: boolean } 对象 detail：
//    append=true → 追加到当前草稿之后（函数式更新，不覆盖未发送草稿）；false/缺省 → 替换
import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'

export interface AgentPrefillDetail {
  text: string
  append?: boolean
}

export function useAgentPrefill(
  setInputValue: Dispatch<SetStateAction<string>>,
  focus: () => void,
) {
  useEffect(() => {
    /** sessionStorage 路径（替换语义，保持不变） */
    const consume = () => {
      const prefill = sessionStorage.getItem('agent:prefill')
      if (prefill) {
        sessionStorage.removeItem('agent:prefill')
        setInputValue(prefill)
        setTimeout(focus, 100)
      }
    }
    const consumeEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail as AgentPrefillDetail | undefined
      // 对象 detail → 追加/替换模式（不读 sessionStorage）
      if (detail && typeof detail === 'object' && typeof detail.text === 'string') {
        if (detail.append) {
          setInputValue((prev) => (prev ? `${prev}\n\n${detail.text}` : detail.text))
        } else {
          setInputValue(detail.text)
        }
        setTimeout(focus, 100)
        return
      }
      // 无 detail（plain Event）/字符串 detail → 走 sessionStorage 替换（向后兼容）
      consume()
    }
    consume()
    window.addEventListener('agent:prefill', consumeEvent)
    return () => window.removeEventListener('agent:prefill', consumeEvent)
  }, [setInputValue, focus])
}

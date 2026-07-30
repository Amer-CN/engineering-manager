// useAgentPrefill.ts — S31B：消费外部预填提问（如知识库"问 AI 关于本文"）
// 通过 sessionStorage('agent:prefill') + 'agent:prefill' 事件传入，避免跨页 props 透传
import { useEffect } from 'react'

export function useAgentPrefill(
  setInputValue: (v: string) => void,
  focus: () => void,
) {
  useEffect(() => {
    const consume = () => {
      const prefill = sessionStorage.getItem('agent:prefill')
      if (prefill) {
        sessionStorage.removeItem('agent:prefill')
        setInputValue(prefill)
        setTimeout(focus, 100)
      }
    }
    consume()
    window.addEventListener('agent:prefill', consume)
    return () => window.removeEventListener('agent:prefill', consume)
  }, [setInputValue, focus])
}

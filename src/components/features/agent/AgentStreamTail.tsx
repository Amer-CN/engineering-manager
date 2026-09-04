/**
 * AgentStreamTail — 消息流尾部组合件（AgentDashboard 行数门禁拆分件）
 * 来源：TurboKach/ai-native-react-components（Beautiful UI 第一批接线，MIT）。
 *
 * PixelLoader（思考占位，替代基线 Loader2 转圈）+ ToolCallChips（在途/终态工具行）。
 * showLoader 由 Dashboard 的 showThinking 推导；工具行在完成后保留终态作为本轮摘要，
 * 下一轮 send 时由 flow 重置。
 */

import PixelLoader from './PixelLoader'
import ToolCallChips from './ToolCallChips'
import type { InFlightTool } from './ToolCallChips'

interface AgentStreamTailProps {
  /** 是否显示思考占位（Dashboard 的 showThinking） */
  showLoader: boolean
  /** 工具调用条目（空数组不渲染） */
  tools: InFlightTool[]
}

const AgentStreamTail: React.FC<AgentStreamTailProps> = ({ showLoader, tools }) => {
  if (!showLoader && tools.length === 0) return null
  return (
    <div className="ml-12 mb-4 flex flex-col gap-2">
      {showLoader && <PixelLoader />}
      <ToolCallChips tools={tools} />
    </div>
  )
}

export default AgentStreamTail

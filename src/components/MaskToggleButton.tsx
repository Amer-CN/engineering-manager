// v1.2.0 阶段 C: MaskToggleButton — 右下角浮动 Eye/EyeOff 按钮
// 位置 fixed, 避开 WinForms StatusBar (4 次 revert 根因)

import { Eye, EyeOff } from "lucide-react"
import { useMask } from "../contexts/MaskContext"

export function MaskToggleButton() {
  const { masked, toggleMask } = useMask()
  return (
    <button
      onClick={toggleMask}
      title={masked ? "显示完整 PII" : "脱敏 PII"}
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9999,
        width: 44,
        height: 44,
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.2)",
        background: "var(--card, #fff)",
        color: "var(--text, #333)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      {masked ? <EyeOff size={20} /> : <Eye size={20} />}
    </button>
  )
}

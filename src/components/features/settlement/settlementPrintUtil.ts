import type { RefObject } from 'react'

/**
 * 打印结算单 (复制 printRef 节点 innerHTML 到 body, 调 window.print, 恢复)
 * ⚠️ 会触发 window.location.reload() 恢复页面状态
 */
export function printSettlement(printRef: RefObject<HTMLDivElement>): void {
  const printContent = printRef.current
  if (!printContent) return
  const originalContent = document.body.innerHTML
  const printSection = printContent.querySelector('.print-content')
  if (printSection) {
    document.body.innerHTML = printSection.innerHTML
    window.print()
    document.body.innerHTML = originalContent
    window.location.reload()
  }
}

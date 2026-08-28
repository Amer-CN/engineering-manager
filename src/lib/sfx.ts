/**
 * 界面音效全局开关（任务 3/3 —— 音效体系预留入口）
 * ─────────────────────────────────────────────
 * 本任务只做报错传真机（crash fax）音效门控 + 设置页开关；全局音效体系是后续大工程，
 * 这里先立一个可全局查询的开关模块供其接入。
 * 纯函数、无 React 依赖；无 window 环境安全（isSfxEnabled 返回默认 true，setSfxEnabled 为 no-op）。
 */

const SFX_KEY = 'ui-sfx-enabled'

/** 界面音效是否开启：缺省（键不存在）= 开；'0' = 关；其余 = 开。 */
export function isSfxEnabled(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(SFX_KEY) !== '0'
}

/** 写入开关：开 = '1'，关 = '0'。无 window 环境 no-op。 */
export function setSfxEnabled(v: boolean): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SFX_KEY, v ? '1' : '0')
}

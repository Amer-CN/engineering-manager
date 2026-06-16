/**
 * PII 脱敏切换按钮（浮动在右上角，2026-06-16）
 *
 * 设计：固定位置 + z-50，浮在 React 应用右上角
 * 状态：
 *   - 明文（默认）：显示 👁 图标 + "明文"
 *   - 脱敏：显示 🔒 图标 + "已脱敏"
 * 切换：点击 toggle 按钮
 */

import { useMask } from '@/contexts/MaskContext';

export function MaskToggle() {
  const { mode, toggle } = useMask();
  const isMasked = mode === 'masked';

  return (
    <button
      onClick={toggle}
      title={isMasked ? '当前：已脱敏（点击显示明文）' : '当前：明文（点击隐藏敏感数据）'}
      className={`fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-md ${
        isMasked
          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`}
    >
      <span className="text-sm" aria-hidden="true">
        {isMasked ? '🔒' : '👁'}
      </span>
      <span>{isMasked ? '已脱敏（点击显示明文）' : '明文（点击隐藏）'}</span>
    </button>
  );
}

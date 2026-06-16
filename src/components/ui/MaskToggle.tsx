import { useMask } from '@/contexts/MaskContext';

export function MaskToggle() {
  const { mode, toggle } = useMask();
  const isMasked = mode === 'masked';

  return (
    <button
      onClick={toggle}
      title={isMasked ? '当前：已脱敏（点击显示明文）' : '当前：明文（点击隐藏敏感数据）'}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
        isMasked
          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      }`}
    >
      <span className="text-sm" aria-hidden="true">
        {isMasked ? '🔒' : '👁'}
      </span>
      <span>{isMasked ? '已脱敏' : '明文'}</span>
    </button>
  );
}

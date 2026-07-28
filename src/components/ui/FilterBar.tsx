import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
  /** 无背景模式（原始行为） */
  bare?: boolean;
}

/**
 * FilterBar — Stitch S21 contained filter/action bar.
 * 默认: bg + border + rounded-lg + p-2.5 容器
 * bare=true: 无背景，仅 flex 布局
 */
const FilterBar: React.FC<FilterBarProps> = ({ children, className = '', bare = false }) => {
  if (bare) {
    return (
      <div className={`flex items-center gap-4 flex-wrap ${className}`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`flex items-center justify-between bg-[color:var(--panel-2)] p-2.5 rounded-lg border border-[color:var(--border)] ${className}`}>
      {children}
    </div>
  );
};

export default FilterBar;

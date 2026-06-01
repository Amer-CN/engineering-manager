import React from 'react';

interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 flex items-center gap-4 flex-wrap ${className}`}>
      {children}
    </div>
  );
};

export default FilterBar;

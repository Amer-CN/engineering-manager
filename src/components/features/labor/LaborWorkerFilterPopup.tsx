/**
 * 工人库列筛选弹出菜单
 * 通过 React Portal 渲染到 document.body，避免 overflow 裁剪
 */
import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { workerTypes } from '../../../constants/member'

type FilterCol = 'name' | 'idcard' | 'age' | 'gender' | 'workertype' | 'dailywage' | 'bank'

const COL_FILTER_LABELS: Record<FilterCol, string> = {
  name: '姓名',
  idcard: '身份证号',
  age: '年龄',
  gender: '性别',
  workertype: '工种',
  dailywage: '日工资',
  bank: '银行卡号',
}

interface FilterAnchor {
  col: FilterCol
  rect: DOMRect
}

interface FilterPopupProps {
  anchor: FilterAnchor | null
  anchorRef: React.RefObject<HTMLButtonElement | null>
  onClose: () => void
  // 各列当前值
  nameFilter: string
  idCardFilter: string
  ageMin: number | ''
  ageMax: number | ''
  checkedGenders: Set<string>
  checkedWorkerTypes: Set<string>
  wageMin: number | ''
  wageMax: number | ''
  bankFilter: string
  // setters
  onNameChange: (v: string) => void
  onIdCardChange: (v: string) => void
  onAgeMinChange: (v: number | '') => void
  onAgeMaxChange: (v: number | '') => void
  onGendersChange: (v: Set<string>) => void
  onWorkerTypesChange: (v: Set<string>) => void
  onWageMinChange: (v: number | '') => void
  onWageMaxChange: (v: number | '') => void
  onBankChange: (v: string) => void
}

export function FilterPopup({
  anchor, anchorRef, onClose,
  nameFilter, idCardFilter, ageMin, ageMax,
  checkedGenders, checkedWorkerTypes,
  wageMin, wageMax, bankFilter,
  onNameChange, onIdCardChange,
  onAgeMinChange, onAgeMaxChange,
  onGendersChange, onWorkerTypesChange,
  onWageMinChange, onWageMaxChange, onBankChange,
}: FilterPopupProps) {
  // 点击外部关闭
  useEffect(() => {
    if (!anchor) return
    const handler = (e: MouseEvent) => {
      if (anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        const popup = document.getElementById('filter-popup')
        if (popup && !popup.contains(e.target as Node)) onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [anchor, anchorRef, onClose])

  if (!anchor) return null
  const { col, rect } = anchor

  const renderContent = () => (
    <div className="flex items-center justify-between px-3 pb-1.5 border-b border-slate-100">
      <span className="text-xs font-semibold text-slate-500">{COL_FILTER_LABELS[col]}</span>
      <button type="button" onClick={onClose} className="text-slate-300 hover:text-slate-500">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M8.5 3.5L3.5 8.5M3.5 3.5l5 5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
      </button>
    </div>
  )

  return createPortal(
    <div
      id="filter-popup"
      className="fixed z-[100] min-w-[170px] max-w-[240px] rounded-lg border border-slate-200 bg-white shadow-xl py-1.5"
      style={{ top: rect.bottom + 4, left: Math.min(rect.left, window.innerWidth - 250) }}
      onClick={e => e.stopPropagation()}
    >
      {renderContent()}
      <div className="max-h-[220px] overflow-y-auto px-1 py-1">
        {col === 'name' && (
          <div className="px-2 py-1">
            <input type="text" placeholder="搜索姓名..." value={nameFilter}
              onChange={e => onNameChange(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500" autoFocus />
          </div>
        )}
        {col === 'idcard' && (
          <div className="px-2 py-1">
            <input type="text" placeholder="搜索身份证号..." value={idCardFilter}
              onChange={e => onIdCardChange(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500" autoFocus />
          </div>
        )}
        {col === 'bank' && (
          <div className="px-2 py-1">
            <input type="text" placeholder="搜索银行卡号..." value={bankFilter}
              onChange={e => onBankChange(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-primary-500" autoFocus />
          </div>
        )}
        {col === 'gender' && (
          <div className="space-y-0.5">
            {['男', '女'].map(v => (
              <label key={v} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded text-sm cursor-pointer">
                <input type="checkbox" checked={checkedGenders.has(v)}
                  onChange={() => {
                    const n = new Set(checkedGenders);
                    if (n.has(v)) n.delete(v);
                    else n.add(v);
                    onGendersChange(n);
                  }}
                  className="rounded" />
                <span className="text-slate-700">{v}</span>
              </label>
            ))}
          </div>
        )}
        {col === 'workertype' && (
          <div className="space-y-0.5">
            {workerTypes.map(t => (
              <label key={t.value} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded text-sm cursor-pointer">
                <input type="checkbox" checked={checkedWorkerTypes.has(t.value)}
                  onChange={() => {
                    const n = new Set(checkedWorkerTypes);
                    if (n.has(t.value)) n.delete(t.value);
                    else n.add(t.value);
                    onWorkerTypesChange(n);
                  }}
                  className="rounded" />
                <span className="text-slate-700">{t.label}</span>
              </label>
            ))}
          </div>
        )}
        {col === 'age' && (
          <div className="flex items-center gap-2 px-2 py-1">
            <input type="number" min={0} max={120} placeholder="最小" value={ageMin}
              onChange={e => onAgeMinChange(e.target.value ? Number(e.target.value) : '')}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500" />
            <span className="text-slate-400">~</span>
            <input type="number" min={0} max={120} placeholder="最大" value={ageMax}
              onChange={e => onAgeMaxChange(e.target.value ? Number(e.target.value) : '')}
              className="w-16 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500" />
          </div>
        )}
        {col === 'dailywage' && (
          <div className="flex items-center gap-2 px-2 py-1">
            <input type="number" min={0} step={10} placeholder="最低" value={wageMin}
              onChange={e => onWageMinChange(e.target.value ? Number(e.target.value) : '')}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500" />
            <span className="text-slate-400">~</span>
            <input type="number" min={0} step={10} placeholder="最高" value={wageMax}
              onChange={e => onWageMaxChange(e.target.value ? Number(e.target.value) : '')}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-center focus:ring-2 focus:ring-primary-500" />
          </div>
        )}
      </div>
      {/* 底部按钮 */}
      {(col === 'gender' || col === 'workertype') && (
        <div className="flex items-center gap-1 px-2 pt-1.5 border-t border-slate-100">
          <button type="button" onClick={() => {
            if (col === 'gender') onGendersChange(new Set(['男', '女']))
            else onWorkerTypesChange(new Set(workerTypes.map(t => t.value)))
          }} className="text-xs text-blue-600 hover:text-blue-800 px-1">全选</button>
          <button type="button" onClick={() => {
            if (col === 'gender') onGendersChange(new Set())
            else onWorkerTypesChange(new Set())
          }} className="text-xs text-slate-400 hover:text-slate-600 px-1">清除</button>
        </div>
      )}
      {(col === 'name' || col === 'idcard' || col === 'bank') && (
        <div className="flex items-center gap-1 px-2 pt-1.5 border-t border-slate-100">
          <button type="button" onClick={() => {
            if (col === 'name') onNameChange('')
            else if (col === 'idcard') onIdCardChange('')
            else onBankChange('')
          }} className="text-xs text-slate-400 hover:text-slate-600 px-1">清除</button>
        </div>
      )}
      {(col === 'age' || col === 'dailywage') && (
        <div className="flex items-center gap-1 px-2 pt-1.5 border-t border-slate-100">
          <button type="button" onClick={() => {
            if (col === 'age') { onAgeMinChange(''); onAgeMaxChange('') }
            else { onWageMinChange(''); onWageMaxChange('') }
          }} className="text-xs text-slate-400 hover:text-slate-600 px-1">清除</button>
        </div>
      )}
    </div>,
    document.body
  )
}

export { COL_FILTER_LABELS }
export type { FilterCol }

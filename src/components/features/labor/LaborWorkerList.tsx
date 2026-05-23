// LaborWorkerList.tsx - 工人库Tab

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { LaborWorkerRow } from './LaborWorkerRow'
import { WorkerWageModal } from './WorkerWageModal'
import { FilterPopup, COL_FILTER_LABELS } from './LaborWorkerFilterPopup'
import type { FilterCol } from './LaborWorkerFilterPopup'

interface LaborWorkerListProps {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  onRefresh: () => void
  onAddWorker: () => void
  onEditWorker: (worker: any) => void
  onDeleteWorker: (workerId: number) => void
  onImportClick: () => void
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

interface FilterAnchor {
  col: FilterCol
  rect: DOMRect
}

const LaborWorkerList: React.FC<LaborWorkerListProps> = ({
  members,
  projects,
  workerTeams,
  onRefresh,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onImportClick,
}) => {
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)

  // 列筛选状态 — 每列独立
  const [nameFilter, setNameFilter] = useState('')
  const [idCardFilter, setIdCardFilter] = useState('')
  const [ageMin, setAgeMin] = useState<number | ''>('')
  const [ageMax, setAgeMax] = useState<number | ''>('')
  const [checkedGenders, setCheckedGenders] = useState<Set<string>>(new Set())
  const [checkedWorkerTypes, setCheckedWorkerTypes] = useState<Set<string>>(new Set())
  const [wageMin, setWageMin] = useState<number | ''>('')
  const [wageMax, setWageMax] = useState<number | ''>('')
  const [bankFilter, setBankFilter] = useState('')

  // ── 排序状态 ──
  const [sortField, setSortField] = useState<'name' | 'age' | 'dailywage' | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const toggleSort = useCallback((field: 'name' | 'age' | 'dailywage') => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }, [sortField])

  const SortIcon = ({ field }: { field: 'name' | 'age' | 'dailywage' }) => {
    if (sortField !== field) {
      return <span className="ml-0.5 text-slate-200 inline-block align-middle"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3.5L5 1.5 7 3.5M7 6.5L5 8.5 3 6.5"/></svg></span>
    }
    return (
      <span className="ml-0.5 inline-block align-middle text-amber-600">
        {sortDir === 'asc'
          ? <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 2l3 4H2z"/></svg>
          : <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M5 8L2 4h6z"/></svg>
        }
      </span>
    )
  }

  // 弹出菜单：当前激活的列 + 按钮位置
  const [anchor, setAnchor] = useState<FilterAnchor | null>(null)

  // 工资统计弹窗
  const [wageModalWorker, setWageModalWorker] = useState<{ id: number; name: string } | null>(null)
  const anchorRef = useRef<HTMLButtonElement | null>(null)

  const openFilter = useCallback((col: FilterCol, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setAnchor(prev => prev?.col === col ? null : { col, rect })
  }, [])

  // 各列是否有激活筛选
  const filterActive: Partial<Record<FilterCol, boolean>> = {
    name: !!nameFilter,
    idcard: !!idCardFilter,
    age: ageMin !== '' || ageMax !== '',
    gender: checkedGenders.size > 0,
    workertype: checkedWorkerTypes.size > 0,
    dailywage: wageMin !== '' || wageMax !== '',
    bank: !!bankFilter,
  }
  const activeFilterCount = Object.values(filterActive).filter(Boolean).length

  // 综合筛选
  const filteredWorkers = useMemo(() => members.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    if (nameFilter && !(w.name || '').toLowerCase().includes(nameFilter.toLowerCase())) return false
    if (idCardFilter && !(w.idCard || '').toLowerCase().includes(idCardFilter.toLowerCase())) return false
    if (ageMin !== '' || ageMax !== '') {
      const age = w.birthDate ? calcAge(w.birthDate) : null
      if (age !== null) {
        if (ageMin !== '' && age < Number(ageMin)) return false
        if (ageMax !== '' && age > Number(ageMax)) return false
      }
    }
    if (checkedGenders.size > 0 && !checkedGenders.has(w.gender || '')) return false
    if (checkedWorkerTypes.size > 0 && !checkedWorkerTypes.has(w.workerType || '')) return false
    if (wageMin !== '' || wageMax !== '') {
      const dw = w.dailyWage || 0
      if (wageMin !== '' && dw < Number(wageMin)) return false
      if (wageMax !== '' && dw > Number(wageMax)) return false
    }
    if (bankFilter && !((w as any).bankAccount || '').toLowerCase().includes(bankFilter.toLowerCase())) return false
    return true
  }), [members, filterProject, filterTeam, nameFilter, idCardFilter, ageMin, ageMax, checkedGenders, checkedWorkerTypes, wageMin, wageMax, bankFilter])

  // 排序
  const sortedWorkers = useMemo(() => [...filteredWorkers].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    if (sortField === 'name') {
      return dir * (a.name || '').localeCompare(b.name || '', 'zh-CN')
    }
    if (sortField === 'age') {
      const ageA = a.birthDate ? calcAge(a.birthDate) : 0
      const ageB = b.birthDate ? calcAge(b.birthDate) : 0
      return dir * (ageA - ageB)
    }
    if (sortField === 'dailywage') {
      return dir * ((a.dailyWage || 0) - (b.dailyWage || 0))
    }
    return 0
  }), [filteredWorkers, sortField, sortDir])

  // ── 漏斗按钮组件 ──
  const FilterBtn = ({ col }: { col: FilterCol }) => {
    const isActive = filterActive[col]
    return (
      <button
        type="button"
        ref={anchor?.col === col ? anchorRef : undefined}
        onClick={e => openFilter(col, e)}
        className={`ml-0.5 inline-flex items-center rounded p-0.5 align-middle transition-colors ${
          isActive ? 'bg-amber-100 text-amber-600' : 'text-slate-300 hover:text-slate-500'
        }`}
        title={`筛选${COL_FILTER_LABELS[col]}`}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor"><path d="M0 0h10L6 4.5V9L4 10V4.5L0 0z" /></svg>
      </button>
    )
  }

  return (
    <div className="flex flex-col max-h-[calc(100vh-200px)]">
      {/* 筛选器 */}
      <div className="shrink-0 bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <span className="text-slate-600 font-medium">筛选：</span>
        <select
          value={filterProject || ''}
          onChange={e => {
            setFilterProject(e.target.value ? Number(e.target.value) : null)
            setFilterTeam(null)
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterTeam || ''}
          onChange={e => setFilterTeam(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          disabled={!filterProject}
        >
          <option value="">全部班组</option>
          {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {activeFilterCount > 0 && (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
            {activeFilterCount} 列筛选
          </span>
        )}
        <button
          onClick={onAddWorker}
          className="ml-auto bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Icon name="Plus" size={18} className="mr-1" />添加工人
        </button>
        <button
          onClick={onImportClick}
          className="bg-primary-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Icon name="Upload" size={18} className="mr-1" />导入Excel
        </button>
      </div>

      {/* 工人表格 */}
      {sortedWorkers.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-auto">
          <div className="min-w-[900px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('name')}>
                    姓名<SortIcon field="name" /><FilterBtn col="name" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">
                    身份证号<FilterBtn col="idcard" />
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('age')}>
                    年龄<SortIcon field="age" /><FilterBtn col="age" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">
                    性别<FilterBtn col="gender" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">
                    工种<FilterBtn col="workertype" />
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('dailywage')}>
                    日工资<SortIcon field="dailywage" /><FilterBtn col="dailywage" />
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">
                    银行卡号<FilterBtn col="bank" />
                  </th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedWorkers.map(worker => (
                  <LaborWorkerRow
                    key={worker.id}
                    worker={worker}
                    onEdit={onEditWorker}
                    onDelete={onDeleteWorker}
                    onWageModal={(id, name) => setWageModalWorker({ id, name })}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无工人</h3>
          <p className="text-slate-500 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
          <button
            onClick={onAddWorker}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            添加工人
          </button>
        </div>
      )}

      {/* 弹出菜单 */}
      <FilterPopup
        anchor={anchor}
        anchorRef={anchorRef}
        onClose={() => setAnchor(null)}
        nameFilter={nameFilter} idCardFilter={idCardFilter}
        ageMin={ageMin} ageMax={ageMax}
        checkedGenders={checkedGenders} checkedWorkerTypes={checkedWorkerTypes}
        wageMin={wageMin} wageMax={wageMax} bankFilter={bankFilter}
        onNameChange={setNameFilter} onIdCardChange={setIdCardFilter}
        onAgeMinChange={setAgeMin} onAgeMaxChange={setAgeMax}
        onGendersChange={setCheckedGenders} onWorkerTypesChange={setCheckedWorkerTypes}
        onWageMinChange={setWageMin} onWageMaxChange={setWageMax} onBankChange={setBankFilter}
      />

      {/* 工人工资统计弹窗 */}
      {wageModalWorker && (
        <WorkerWageModal
          show={!!wageModalWorker}
          workerId={wageModalWorker.id}
          workerName={wageModalWorker.name}
          onClose={() => setWageModalWorker(null)}
        />
      )}
    </div>
  )
}

export default LaborWorkerList

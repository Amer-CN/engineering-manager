import React, { useState, useRef } from 'react'
import { useToastStore } from '@/store/toastStore'
import { Input } from '../../ui/Input/Input'
import { Button } from '../../ui/Button'

interface PositionEditorProps {
  positions: string[]
  onChange: (p: string[]) => void
}

const MAX_POSITIONS = 30
const MAX_CHAR = 20

const PositionEditor: React.FC<PositionEditorProps> = ({ positions, onChange }) => {
  const showToast = useToastStore(state => state.showToast)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    const v = inputValue.trim()
    if (!v) return
    if (v.length < 2) { showToast('职位名称至少2个字符', 'error'); return }
    if (v.length > MAX_CHAR) { showToast(`职位名称最多${MAX_CHAR}个字符`, 'error'); return }
    if (positions.length >= MAX_POSITIONS) { showToast(`最多${MAX_POSITIONS}个职位`, 'error'); return }
    if (positions.includes(v)) { showToast('职位已存在', 'error'); return }
    onChange([...positions, v])
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd() }
  }

  const handleRemove = (i: number) => {
    onChange(positions.filter((_, j) => j !== i))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">职位列表</label>

      {positions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {positions.map((p, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 text-primary-700 text-xs rounded-full">
              {p}
              <button type="button" onClick={() => handleRemove(i)}
                className="hover:text-red-500 transition-colors">&times;</button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input ref={inputRef} size="sm" type="text" value={inputValue}
          onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
          containerClassName="flex-1"
          placeholder="输入职位名称，如：部门经理" maxLength={MAX_CHAR} />
          <Button type="button" onClick={handleAdd}
             variant="ghost" size="sm" className="text-primary-600 whitespace-nowrap">添加</Button>
      </div>
    </div>
  )
}

export default PositionEditor

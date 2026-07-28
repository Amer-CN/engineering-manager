import { useState, useCallback } from 'react'

const RECENT_CHANNELS_KEY = 'costLedger_recentChannels'
const MAX_RECENT = 8

interface ChannelInputProps {
  value: string
  onChange: (value: string) => void
  direction?: string
}

export function ChannelInput({ value, onChange, direction }: ChannelInputProps) {
  const isExpense = direction !== 'income'
  const placeholder = isExpense ? '如"鑫图施工-9324"或"孙家英-微信"' : '如"张琼英-5395"或"对公账户-6200"'
  const [recentChannels, setRecentChannels] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(RECENT_CHANNELS_KEY) || '[]')
    } catch { return [] }
  })
  const [showRecent, setShowRecent] = useState(false)

  const handleChange = useCallback((v: string) => {
    onChange(v)
    if (v && !recentChannels.includes(v)) {
      const updated = [v, ...recentChannels.filter(c => c !== v)].slice(0, MAX_RECENT)
      setRecentChannels(updated)
      localStorage.setItem(RECENT_CHANNELS_KEY, JSON.stringify(updated))
    }
  }, [recentChannels, onChange])

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => setShowRecent(true)}
        onBlur={() => setTimeout(() => setShowRecent(false), 200)}
        placeholder={placeholder}
        maxLength={100}
        className="w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-3 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
      />
      {showRecent && recentChannels.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg">
          {recentChannels.map((ch, i) => (
            <button
              key={i}
              type="button"
              className="block w-full px-3 py-1.5 text-left text-xs text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]"
              onMouseDown={() => { onChange(ch); setShowRecent(false) }}
            >
              {ch}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

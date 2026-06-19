import { motion } from 'framer-motion'

type Theme = 'white' | 'graphite' | 'sandstone'

const THEMES: { id: Theme; color: string; label: string }[] = [
  { id: 'white',     color: '#2563eb', label: 'White' },
  { id: 'graphite',  color: '#ff8c32', label: 'Graphite' },
  { id: 'sandstone', color: '#d97706', label: 'Sandstone' },
]

interface Props {
  current: Theme
  onChange: (theme: Theme) => void
}

export default function ThemeSwitcher({ current, onChange }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        right: 16,
        display: 'flex',
        gap: 6,
        zIndex: 200,
        padding: '6px 10px',
        borderRadius: 20,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.3s ease',
      }}
    >
      {THEMES.map((t) => (
        <motion.button
          key={t.id}
          className={`theme-btn ${current === t.id ? 'active' : ''}`}
          style={{
            background: t.color,
            borderColor: current === t.id ? t.color : 'var(--border)',
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(t.id)}
          title={t.label}
        />
      ))}
    </div>
  )
}

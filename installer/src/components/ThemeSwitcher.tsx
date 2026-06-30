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
  onClose?: () => void
}

export default function ThemeSwitcher({ current, onChange, onClose }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 8,
        right: 12,
        display: 'flex',
        gap: 4,
        zIndex: 200,
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: 20,
        background: 'var(--panel)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        transition: 'all 0.3s ease',
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      } as React.CSSProperties}
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
      {onClose && (
        <>
          <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }} />
          <motion.button
            onClick={onClose}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: 'var(--muted)',
              fontSize: 14,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            whileHover={{ background: 'var(--danger)', color: 'white', scale: 1.1 }}
          >
            ×
          </motion.button>
        </>
      )}
    </div>
  )
}

import React from 'react'
import { Icon } from './ui/Icon'
import { useMask } from '../contexts/MaskContext'

const MaskToggleButton: React.FC = () => {
  const { masked, setMasked } = useMask()

  return (
    <button
      onClick={() => setMasked(!masked)}
      title={masked ? '显示完整信息' : '隐藏敏感信息'}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 30,
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--panel, #fff)',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        color: 'var(--text-secondary, #64748b)',
        transition: 'all 0.2s',
      }}
    >
      <Icon name={masked ? 'EyeOff' : 'Eye'} size={16} />
    </button>
  )
}

export default MaskToggleButton
import React from 'react'
import { getIcon } from '../../utils/iconMap'

export interface IconProps {
  name: string
  size?: number
  className?: string
  strokeWidth?: number
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, className = '', strokeWidth }) => {
  const LucideIcon = getIcon(name)
  if (!LucideIcon) {
    // Fallback: render name as text if icon not found
    return <span className={`inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>?</span>
  }
  return <LucideIcon size={size} className={className} strokeWidth={strokeWidth} />
}

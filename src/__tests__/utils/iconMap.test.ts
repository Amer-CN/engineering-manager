import React from 'react'
import { iconMap, getIcon } from '../../utils/iconMap'

// Mock lucide-react 以避免加载大量图标组件
// 注: 列表需覆盖 src/utils/iconMap.ts 从 lucide-react 导入的全部图标名
vi.mock('lucide-react', () => {
  const icons: Record<string, React.FC> = {}
  const iconNames = [
    'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDownCircle', 'ArrowLeft',
    'ArrowLeftRight', 'ArrowRight', 'ArrowRightLeft', 'ArrowUpCircle', 'BadgeCheck', 'Ban', 'Banknote',
    'BarChart3', 'Bell', 'Bold', 'Bot', 'Braces', 'Briefcase', 'Building2', 'Calendar', 'CalendarCheck', 'CalendarX', 'Camera',
    'Check', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
    'ChevronUp', 'ClipboardList', 'ClipboardPen', 'Clock', 'Construction', 'Copy',
    'CreditCard', 'Database', 'DollarSign', 'Download', 'Droplets', 'Edit3', 'Eye', 'EyeOff',
    'File', 'FileCheck', 'FileJson', 'FileSpreadsheet', 'FileText', 'Filter', 'FolderKanban', 'FolderOpen',
    'Globe', 'GripVertical', 'HardHat', 'Heading2', 'HeartPulse', 'HelpCircle', 'Home', 'Image', 'Inbox', 'Info', 'Italic', 'Key', 'Landmark',
    'LayoutDashboard', 'Library', 'Lightbulb', 'List', 'Loader', 'Loader2', 'Lock', 'LogOut', 'Mail',
    'MapPin', 'Menu', 'Mic', 'Minus', 'Monitor', 'Moon', 'MoreVertical', 'Package',
    'PaintBucket', 'Paperclip', 'Pause', 'Phone', 'PieChart', 'Play', 'Plug', 'Plus', 'Power', 'Printer',
    'Receipt', 'Redo', 'RefreshCw', 'RotateCcw', 'Ruler', 'Save', 'Scan',
    'ScrollText', 'Search', 'Settings', 'Shield', 'ShieldCheck', 'Snowflake', 'Sparkles', 'Square', 'Stamp',
    'Sun', 'Trash2', 'TrendingDown', 'TrendingUp', 'Truck', 'ThumbsUp', 'ThumbsDown', 'Undo',
    'Upload', 'User', 'UserCheck', 'UserCircle', 'UserCog', 'Users', 'Wallet',
    'WifiOff', 'Wrench', 'X', 'XCircle', 'Zap',
  ]

  for (const name of iconNames) {
    icons[name] = () => null
  }

  return {
    ...icons,
    LucideIcon: undefined as any,
  }
})

describe('iconMap', () => {
  it('应包含图标条目', () => {
    expect(Object.keys(iconMap).length).toBeGreaterThan(0)
  })

  it('Home 应在 iconMap 中', () => {
    expect(iconMap.Home).toBeDefined()
  })

  it('别名 ClipboardFile 应映射到 ClipboardPen', () => {
    expect(iconMap.ClipboardFile).toBe(iconMap.ClipboardPen)
  })

  it('别名 Edit 应映射到 Edit3', () => {
    expect(iconMap.Edit).toBe(iconMap.Edit3)
  })

  it('别名 Palette 应映射到 PaintBucket', () => {
    expect(iconMap.Palette).toBe(iconMap.PaintBucket)
  })
})

describe('getIcon', () => {
  it('已注册名称应返回图标', () => {
    const icon = getIcon('Home')
    expect(icon).toBeDefined()
  })

  it('未注册名称应返回 undefined', () => {
    const icon = getIcon('NonExistentIcon')
    expect(icon).toBeUndefined()
  })

  it('别名应正确解析', () => {
    expect(getIcon('Edit')).toBe(getIcon('Edit3'))
    expect(getIcon('ClipboardFile')).toBe(getIcon('ClipboardPen'))
    expect(getIcon('Palette')).toBe(getIcon('PaintBucket'))
  })
})

import React from 'react'
import { iconMap, getIcon } from '../../utils/iconMap'

// Mock lucide-react 以避免加载大量图标组件
vi.mock('lucide-react', () => {
  // 为每个导出的图标创建简单组件模拟
  const icons: Record<string, React.FC> = {}
  const iconNames = [
    'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDownCircle', 'ArrowLeft',
    'ArrowLeftRight', 'ArrowUpCircle', 'BadgeCheck', 'Ban', 'Banknote',
    'BarChart3', 'Building2', 'Calendar', 'CalendarCheck', 'Camera',
    'Check', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
    'ChevronUp', 'ClipboardList', 'ClipboardPen', 'Clock', 'Construction',
    'CreditCard', 'DollarSign', 'Download', 'Edit3', 'Eye', 'EyeOff',
    'File', 'FileText', 'Filter', 'FolderKanban', 'Globe', 'HardHat',
    'HelpCircle', 'Home', 'Image', 'Inbox', 'Info', 'Key', 'Landmark',
    'LayoutDashboard', 'Lightbulb', 'Loader2', 'Lock', 'LogOut', 'Mail',
    'MapPin', 'Menu', 'Monitor', 'Moon', 'MoreVertical', 'Package',
    'PaintBucket', 'Paperclip', 'Phone', 'PieChart', 'Plus', 'Printer',
    'Receipt', 'Redo', 'RefreshCw', 'RotateCcw', 'Ruler', 'Save',
    'ScrollText', 'Search', 'Settings', 'Shield', 'Sparkles', 'Stamp',
    'Sun', 'Trash2', 'TrendingDown', 'TrendingUp', 'Truck', 'Undo',
    'Upload', 'UserCheck', 'UserCircle', 'UserCog', 'Users', 'Wallet',
    'WifiOff', 'Wrench', 'X', 'XCircle',
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

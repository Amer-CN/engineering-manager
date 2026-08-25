import React from 'react'
import { iconMap, getIcon } from '../../utils/iconMap'

// Mock lucide-react 以避免加载大量图标组件
// 注: 列表需覆盖 src/utils/iconMap.ts 从 lucide-react 导入的全部图标名
vi.mock('lucide-react', () => {
  const icons: Record<string, React.FC> = {}
  const iconNames = [
    'Activity', 'AlertCircle', 'AlertTriangle', 'ArrowDownCircle', 'ArrowLeft',
    'ArrowLeftRight', 'ArrowRight', 'ArrowRightLeft', 'ArrowUpCircle', 'BadgeCheck', 'Ban', 'Banknote',
    'BarChart3', 'Bell', 'Bold', 'Bot', 'Braces', 'Brain', 'Briefcase', 'Building2', 'Calculator', 'Calendar', 'CalendarCheck', 'CalendarDays', 'CalendarRange', 'CalendarX', 'Camera',
    'Check', 'CheckCircle', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
    'ChevronUp', 'ClipboardCheck', 'ClipboardList', 'ClipboardPen', 'Clock', 'Construction', 'Copy', 'CornerDownLeft', 'Cpu',
    'CreditCard', 'Code', 'Database', 'DollarSign', 'Download', 'Droplets', 'Edit3', 'Eraser', 'Eye', 'EyeOff',
    'File', 'FileBarChart', 'FileCheck', 'FileDown', 'FileJson', 'FileSearch', 'FileSpreadsheet', 'FileText', 'Filter', 'Folder', 'FolderKanban', 'FolderOpen', 'FolderTree',
    'GitFork', 'Globe', 'GripVertical', 'HardHat', 'Heading1', 'Heading2', 'Heading3', 'HeartPulse', 'HelpCircle', 'Home', 'Image', 'Inbox', 'Info', 'Italic', 'Key', 'KeyRound', 'Landmark',
    'LayoutDashboard', 'Library', 'Lightbulb', 'Link', 'List', 'ListOrdered', 'Loader', 'Loader2', 'Lock', 'LogOut', 'Mail',
    'MapPin', 'Maximize2', 'Menu', 'MessageSquare', 'Mic', 'Minimize2', 'Minus', 'Monitor', 'Moon', 'MoreVertical', 'Package',
    'PaintBucket', 'Palette', 'Paperclip', 'Pause', 'Pencil', 'PenLine', 'Phone', 'PieChart', 'Play', 'Plug', 'Plus', 'Power', 'Presentation', 'Printer',
    'Quote',
    'Receipt', 'Redo', 'Redo2', 'RefreshCcw', 'RefreshCw', 'RotateCcw', 'RotateCw', 'Ruler', 'Save', 'Scan',
    'ScrollText', 'Search', 'SearchX', 'Settings', 'Shield', 'ShieldCheck', 'Snowflake', 'Sparkles', 'Square', 'SquareCheck', 'Stamp',
    'Sun', 'Table', 'Target', 'Trash2', 'TrendingDown', 'TrendingUp', 'Truck', 'ThumbsUp', 'ThumbsDown', 'Undo', 'Undo2',
    'Upload', 'User', 'UserCheck', 'UserCircle', 'UserCog', 'Users', 'Wallet', 'Wand2',
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

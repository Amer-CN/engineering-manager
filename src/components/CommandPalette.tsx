import { useCallback, useEffect, useState } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from '@/components/ui/command'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS, type PageId } from '@/routes'
import { useTheme, type ThemeScheme } from '@/hooks/useTheme'

/**
 * Bedrock ⌘K 全局命令面板（shadcn Command 落地首件）。
 * 导航 / AI 操作 / 快捷三组；⌘K 用捕获阶段监听 + stopImmediatePropagation，
 * 避免与 AgentDashboard 页内 ⌘K 双触发，作为全站唯一命令入口。
 */
const THEME_ORDER: ThemeScheme[] = ['white', 'graphite', 'sandstone']
const THEME_LABEL: Record<ThemeScheme, string> = {
  white: 'Titanium 亮',
  graphite: 'Blueprint 暗',
  sandstone: 'Kiln 暖',
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const { scheme, setScheme } = useTheme()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        e.stopImmediatePropagation()
        setOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [])

  const run = useCallback((fn: () => void) => {
    setOpen(false)
    fn()
  }, [])

  const navigate = useCallback(
    (page: PageId) => run(() => window.dispatchEvent(new CustomEvent('navigate', { detail: page }))),
    [run],
  )

  const cycleTheme = useCallback(
    () => run(() => setScheme(THEME_ORDER[(THEME_ORDER.indexOf(scheme) + 1) % THEME_ORDER.length])),
    [run, scheme, setScheme],
  )

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="搜索页面、执行操作，或直接问 AI…" />
      <CommandList>
        <CommandEmpty>没有匹配结果</CommandEmpty>

        <CommandGroup heading="导航">
          {NAV_ITEMS.map((item) => (
            <CommandItem
              key={item.id}
              value={`导航 ${item.label}`}
              onSelect={() => navigate(item.id)}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
              {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="AI 操作">
          <CommandItem value="AI 超支风险扫描" onSelect={() => navigate('dashboard')}>
            <Icon name="Sparkles" size={16} />
            <span>问 AI：本月哪些项目有超支风险？</span>
          </CommandItem>
          <CommandItem value="AI 逾期回款" onSelect={() => navigate('dashboard')}>
            <Icon name="Sparkles" size={16} />
            <span>问 AI：列出逾期未回款的发票</span>
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="快捷">
          <CommandItem value="切换主题" onSelect={cycleTheme}>
            <Icon name="Palette" size={16} />
            <span>切换主题（当前：{THEME_LABEL[scheme]}）</span>
          </CommandItem>
          <CommandItem value="系统设置" onSelect={() => navigate('settings')}>
            <Icon name="Settings" size={16} />
            <span>系统设置</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export default CommandPalette

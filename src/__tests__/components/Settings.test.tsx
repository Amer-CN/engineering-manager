import { render, screen, cleanup } from '@testing-library/react'

// Mock all hooks used by Settings.tsx
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}))

vi.mock('@/hooks/useRowHoverOpacity', () => ({
  useRowHoverOpacity: () => ({ opacity: 50, setOpacity: vi.fn() }),
}))

vi.mock('@/hooks/useDataPath', () => ({
  useDataPath: () => ({
    dataPath: '/data/path',
    defaultPath: '/data/path',
    loading: false,
    migrating: false,
    message: null,
    handleChangeDataPath: vi.fn(),
    handleResetToDefault: vi.fn(),
  }),
}))

vi.mock('@/hooks/useOCRConfig', () => ({
  useOCRConfig: () => ({
    ocrConfig: { provider: 'baidu', apiKey: '', secretKey: '' },
    setOCRConfig: vi.fn(),
    ocrStatus: 'unconfigured',
    testingOCR: false,
    ocrMessage: null,
    handleSaveOCRConfig: vi.fn(),
    handleTestOCR: vi.fn(),
  }),
}))

vi.mock('@/hooks/useSqliteSettings', () => ({
  useSqliteSettings: () => ({
    status: 'disabled',
    loading: false,
    enabling: false,
    migrating: false,
    switching: false,
    message: null,
    handleEnable: vi.fn(),
    handleMigrate: vi.fn(),
    handleRemigrate: vi.fn(),
    handleSetReadMode: vi.fn(),
  }),
}))

// Mock sub-components
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, size, className }: any) => (
    <span data-testid={`icon-${name}`} className={className}>{name}</span>
  ),
}))

vi.mock('@/components/SettingsOCRSection', () => ({
  SettingsOCRSection: () => <div data-testid="ocr-section">OCR</div>,
}))

vi.mock('@/components/SettingsSqliteSection', () => ({
  SettingsSqliteSection: () => <div data-testid="sqlite-section">SQLite</div>,
}))

vi.mock('@/components/SettingsChangelog', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="changelog">
      Changelog
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

import { default as Settings } from '@/components/Settings'

describe('Settings.tsx', () => {
  beforeEach(() => { localStorage.clear() })
  afterEach(() => cleanup())

  test('应显示页面标题', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText('系统设置')).toBeTruthy()
  }, 15000)

  test('应显示页面描述', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/管理应用程序设置/)).toBeTruthy()
  }, 15000)

  test('应显示数据存储设置卡片', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/数据存储设置/)).toBeTruthy()
  }, 15000)

  test('应显示外观主题卡片', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/外观主题/)).toBeTruthy()
  }, 15000)

  test('应显示浅色模式按钮', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/浅色模式/)).toBeTruthy()
  }, 15000)

  test('应显示深色模式按钮', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/深色模式/)).toBeTruthy()
  }, 15000)

  test('应显示开发工具卡片', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/开发工具/)).toBeTruthy()
  }, 15000)

  test('应显示打开控制台按钮', async () => {
    render(<Settings refresh={undefined} />)
    expect(await screen.findByText(/打开控制台/)).toBeTruthy()
  }, 15000)
})

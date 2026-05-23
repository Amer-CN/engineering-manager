/**
 * ProjectDetail 简化测试
 * 只做 smoke test，确保组件能渲染不报错
 */
import { render } from '@testing-library/react'
import React from 'react'

// ════════════════════════════════════════
// Mock：window.electronAPI（正确写法）
// ════════════════════════════════════════
beforeEach(() => {
  vi.clearAllMocks()
  // 正确写法：不替换整个对象，只覆写方法
  const mockSuccess = (data: any = []) => Promise.resolve({ success: true, data })
  
  if (!window.electronAPI) window.electronAPI = {} as any
  
  ;(window.electronAPI as any).getInvoices = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getIncomeContracts = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getExpenseContracts = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getPartners = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getWorkerTeams = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getProjectWorkers = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getMaterials = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getSettlements = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getWagePaymentRecords = vi.fn().mockImplementation(mockSuccess)
  ;(window.electronAPI as any).getCostLedger = vi.fn().mockImplementation(mockSuccess)
})

// ════════════════════════════════════════
// Mock：react-router-dom
// ════════════════════════════════════════
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...(actual as any),
    useParams: () => ({ id: '1' }),
    useNavigate: () => vi.fn(),
  }
})

// ════════════════════════════════════════
// Mock：framer-motion（避免动画问题）
// ════════════════════════════════════════
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, { get: () => (props: any) => React.createElement('div', props) }),
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}))

// ════════════════════════════════════════
// 懒加载导入（避免 memo 陷阱）
// ════════════════════════════════════════
const importModule = async () => {
  const mod = await import('@/components/features/projects/ProjectDetail')
  return { ProjectDetail: mod.ProjectDetail }
}

// ════════════════════════════════════════
// Mock 数据
// ════════════════════════════════════════
const mockProject = {
  id: '1',
  name: '测试项目',
  status: 'in_progress',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  location: '测试地点',
  description: '测试描述',
}

// ════════════════════════════════════════
// 测试
// ════════════════════════════════════════
describe('ProjectDetail', () => {
  it('smoke: 渲染不报错', async () => {
    const { ProjectDetail } = await importModule()
    render(<ProjectDetail project={mockProject} members={[]} onBack={vi.fn()} onEdit={vi.fn()} />)
    expect(true).toBe(true)
  }, 10000)

  it('smoke: 传入 members 后渲染', async () => {
    const { ProjectDetail } = await importModule()
    render(<ProjectDetail project={mockProject} members={[{ id: 1, name: '张三', role: 'worker', createdAt: '' }]} onBack={vi.fn()} onEdit={vi.fn()} />)
    expect(true).toBe(true)
  }, 10000)
})

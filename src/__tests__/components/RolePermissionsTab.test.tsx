/**
 * RolePermissionsTab 测试（S32B 角色权限矩阵）
 * 重点回归：后端 /api/roles 的 permissions 为 JSON 字符串（TEXT 列）时不得崩溃
 * （历史缺陷 role.permissions.slice(...).map is not a function）
 */
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'

const mockGetRoles = vi.fn()
vi.mock('@/services/api-adapter', () => ({
  getAPI: async () => ({ getRoles: mockGetRoles }),
}))
vi.mock('@/components/ui/Icon', () => ({
  Icon: ({ name }: any) => <span data-testid={`icon-${name}`}>{name}</span>,
}))
vi.mock('@/store/toastStore', () => ({
  useToastStore: (sel: any) => sel({ showToast: vi.fn() }),
}))
vi.mock('@/hooks/useConfirm', () => ({
  useConfirm: () => ({ confirm: async () => true, ConfirmDialog: null }),
}))

const importModule = () => import('@/components/RolePermissionsTab')

describe('RolePermissionsTab (S32B)', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => cleanup())

  it('permissions 为 JSON 字符串时正常渲染（回归崩溃缺陷）', async () => {
    mockGetRoles.mockResolvedValue({
      success: true,
      data: [
        { id: 'admin', name: '系统管理员', permissions: '["dashboard:read","projects:read","projects:create"]', is_system: 1 },
      ],
    })
    const { RolePermissionsTab } = await importModule()
    render(<RolePermissionsTab />)
    await waitFor(() => expect(screen.getByText('系统管理员')).toBeInTheDocument())
    // 权限 chip 正常渲染，未抛错
    expect(screen.getByText('系统')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '编辑权限' })).toBeInTheDocument()
  })

  it('permissions 为数组时也正常', async () => {
    mockGetRoles.mockResolvedValue({
      success: true,
      data: [{ id: 'finance', name: '财务人员', description: '财务', permissions: ['invoices:read'], isSystem: true }],
    })
    const { RolePermissionsTab } = await importModule()
    render(<RolePermissionsTab />)
    await waitFor(() => expect(screen.getByText('财务人员')).toBeInTheDocument())
  })

  it('permissions 为非法字符串时降级为空数组不崩溃', async () => {
    mockGetRoles.mockResolvedValue({
      success: true,
      data: [{ id: 'x', name: '测试角色', permissions: 'not-json', is_system: 0 }],
    })
    const { RolePermissionsTab } = await importModule()
    render(<RolePermissionsTab />)
    await waitFor(() => expect(screen.getByText('测试角色')).toBeInTheDocument())
  })

  it('进入编辑态渲染资源×操作勾选矩阵', async () => {
    mockGetRoles.mockResolvedValue({
      success: true,
      data: [{ id: 'admin', name: '系统管理员', permissions: '["projects:read"]', is_system: 1 }],
    })
    const { RolePermissionsTab } = await importModule()
    render(<RolePermissionsTab />)
    await waitFor(() => expect(screen.getByText('系统管理员')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '编辑权限' }))
    await waitFor(() => expect(screen.getByText(/编辑权限/)).toBeInTheDocument())
    // 矩阵勾选框存在（15 资源 × 7 操作）
    const checkboxes = document.querySelectorAll('input[type="checkbox"]')
    expect(checkboxes.length).toBeGreaterThan(50)
    expect(screen.getByRole('button', { name: '保存权限' })).toBeInTheDocument()
  })
})

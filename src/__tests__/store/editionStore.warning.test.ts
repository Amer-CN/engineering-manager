import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEditionStore } from '@/store/editionStore'

// Shared mock function (must be outside vi.mock factory for reference sharing)
const mockShowToast = vi.fn()

// Mock getAPI
vi.mock('@/services/api-adapter', () => ({
  getAPI: vi.fn(),
}))

// Mock toastStore - use shared mockShowToast so test can assert on it
vi.mock('@/store/toastStore', () => ({
  useToastStore: {
    getState: () => ({
      showToast: (...args: any[]) => mockShowToast(...args),
    }),
  },
}))

import { getAPI } from '@/services/api-adapter'

describe('editionStore warning (24.1)', () => {
  beforeEach(() => {
    useEditionStore.setState({ features: null, loaded: false, warning: null })
    vi.clearAllMocks()
  })

  it('shows toast.error when config response contains warning', async () => {
    const mockApi = {
      getConfig: vi.fn().mockResolvedValue({
        edition: 'personal',
        features: [],
        warning: 'config read failed, running as personal',
      }),
    }
    vi.mocked(getAPI).mockResolvedValue(mockApi as any)

    await useEditionStore.getState().fetchFeatures()

    // Flush microtask queue (dynamic import .then is fire-and-forget)
    await new Promise(r => setTimeout(r, 10))

    const state = useEditionStore.getState()
    expect(state.warning).toBe('config read failed, running as personal')
    expect(state.loaded).toBe(true)
    expect(state.features).toEqual([])

    // toast.error should have been called
    expect(mockShowToast).toHaveBeenCalledTimes(1)
    expect(mockShowToast).toHaveBeenCalledWith(
      'config read failed, running as personal',
      'error'
    )
  })

  it('does NOT show toast when config response has no warning', async () => {
    const mockApi = {
      getConfig: vi.fn().mockResolvedValue({
        edition: 'enterprise',
        features: ['userManagement', 'roleManagement'],
      }),
    }
    vi.mocked(getAPI).mockResolvedValue(mockApi as any)

    await useEditionStore.getState().fetchFeatures()
    await new Promise(r => setTimeout(r, 10))

    const state = useEditionStore.getState()
    expect(state.warning).toBeNull()
    expect(state.loaded).toBe(true)
    expect(state.features).toEqual(['userManagement', 'roleManagement'])

    // toast should NOT have been called
    expect(mockShowToast).not.toHaveBeenCalled()
  })
})

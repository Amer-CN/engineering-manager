import { useToastStore } from '../../store/toastStore'

describe('toastStore', () => {
  beforeEach(() => {
    // 重置 store
    useToastStore.setState({ toasts: [] })
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ─── showToast ────────────────────────────────────────────
  describe('showToast', () => {
    it('应添加新 toast 到列表', () => {
      useToastStore.getState().showToast('测试消息', 'info', 3000)

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(1)
      expect(toasts[0].message).toBe('测试消息')
      expect(toasts[0].type).toBe('info')
    })

    it('应支持多种类型', () => {
      const { showToast } = useToastStore.getState()
      showToast('成功消息', 'success', 3000)
      showToast('错误消息', 'error', 5000)
      showToast('警告消息', 'warning', 4000)

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(3)
      expect(toasts[0].type).toBe('success')
      expect(toasts[1].type).toBe('error')
      expect(toasts[2].type).toBe('warning')
    })

    it('应在指定时间后自动移除', () => {
      useToastStore.getState().showToast('自动消失', 'info', 3000)

      expect(useToastStore.getState().toasts).toHaveLength(1)

      // 快进 3 秒
      vi.advanceTimersByTime(3100)

      expect(useToastStore.getState().toasts).toHaveLength(0)
    })
  })

  // ─── 快捷方法 ────────────────────────────────────────────
  describe('快捷方法', () => {
    it('success 应创建 success 类型 toast', () => {
      useToastStore.getState().success('操作成功')
      const toast = useToastStore.getState().toasts[0]
      expect(toast.type).toBe('success')
      expect(toast.message).toBe('操作成功')
    })

    it('error 应创建 error 类型 toast', () => {
      useToastStore.getState().error('操作失败')
      const toast = useToastStore.getState().toasts[0]
      expect(toast.type).toBe('error')
    })

    it('info 应创建 info 类型 toast', () => {
      useToastStore.getState().info('提示信息')
      const toast = useToastStore.getState().toasts[0]
      expect(toast.type).toBe('info')
    })

    it('warning 应创建 warning 类型 toast', () => {
      useToastStore.getState().warning('警告信息')
      const toast = useToastStore.getState().toasts[0]
      expect(toast.type).toBe('warning')
    })
  })

  // ─── removeToast ─────────────────────────────────────────
  describe('removeToast', () => {
    it('应按 ID 移除 toast', () => {
      useToastStore.getState().showToast('消息1', 'info', 30000)
      useToastStore.getState().showToast('消息2', 'info', 30000)

      const toasts = useToastStore.getState().toasts
      expect(toasts).toHaveLength(2)

      // 移除第一个
      useToastStore.getState().removeToast(toasts[0].id)

      const remaining = useToastStore.getState().toasts
      expect(remaining).toHaveLength(1)
      expect(remaining[0].message).toBe('消息2')
    })
  })
})

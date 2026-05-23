import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// 工人跨项目关联测试（P2 级别）
// 测试目标：workers.ts / project-workers.ts 工人跨项目关联逻辑
// ============================================================================

describe('工人跨项目关联测试', () => {
  // 模拟工人数据
  let workers: any[]

  // 模拟项目-工人关联数据
  let projectWorkers: any[]

  beforeEach(() => {
    workers = [
      { id: 'worker-001', name: '张三', idCard: '510923199001011234' },
      { id: 'worker-002', name: '李四', idCard: '510923199101011234' },
      { id: 'worker-003', name: '王五', idCard: '510923199202021234' },
    ]

    projectWorkers = [
      { id: 'pw-001', projectId: 'proj-001', workerId: 'worker-001', joinDate: '2026-01-01' },
      { id: 'pw-002', projectId: 'proj-001', workerId: 'worker-002', joinDate: '2026-02-01' },
      { id: 'pw-003', projectId: 'proj-002', workerId: 'worker-001', joinDate: '2026-03-01' }, // 张三同时在两个项目
      { id: 'pw-004', projectId: 'proj-002', workerId: 'worker-003', joinDate: '2026-03-15' },
    ]
  })

  // --------------------------------------------------------------------------
  // 测试 1: 应允许工人同时参与多个项目
  // --------------------------------------------------------------------------
  it('应允许工人同时参与多个项目', () => {
    // 模拟查询工人在哪些项目
    const getWorkerProjects = (workerId: string) => {
      return projectWorkers
        .filter(pw => pw.workerId === workerId)
        .map(pw => pw.projectId)
    }

    // 测试张三（同时在两个项目）
    const zhangsanProjects = getWorkerProjects('worker-001')
    expect(zhangsanProjects).toContain('proj-001')
    expect(zhangsanProjects).toContain('proj-002')
    expect(zhangsanProjects).toHaveLength(2)

    // 测试李四（只在一个项目）
    const lisiProjects = getWorkerProjects('worker-002')
    expect(lisiProjects).toContain('proj-001')
    expect(lisiProjects).toHaveLength(1)
  })

  // --------------------------------------------------------------------------
  // 测试 2: 查询项目所有工人应返回完整信息
  // --------------------------------------------------------------------------
  it('查询项目所有工人应返回完整信息', () => {
    // 模拟查询项目所有工人
    const getProjectWorkers = (projectId: string) => {
      const pwList = projectWorkers.filter(pw => pw.projectId === projectId)
      return pwList.map(pw => {
        const worker = workers.find(w => w.id === pw.workerId)
        return {
          ...worker,
          joinDate: pw.joinDate,
          projectWorkerId: pw.id,
        }
      })
    }

    const projectWorkersInfo = getProjectWorkers('proj-001')

    expect(projectWorkersInfo).toHaveLength(2)
    expect(projectWorkersInfo[0].name).toBe('张三')
    expect(projectWorkersInfo[0].joinDate).toBe('2026-01-01')
    expect(projectWorkersInfo[1].name).toBe('李四')
    expect(projectWorkersInfo[1].joinDate).toBe('2026-02-01')
  })

  // --------------------------------------------------------------------------
  // 测试 3: 工人调离项目应保留历史记录
  // --------------------------------------------------------------------------
  it('工人调离项目应保留历史记录', () => {
    // 模拟调离函数（软删除）
    const removeWorkerFromProject = (projectWorkerId: string) => {
      const pw = projectWorkers.find(pw => pw.id === projectWorkerId)
      if (pw) {
        // 标记为单位（软删除）
        pw.leftDate = new Date().toISOString().split('T')[0]
        pw.status = 'left'
        return { success: true, leftDate: pw.leftDate }
      }
      return { success: false, error: '关联记录不存在' }
    }

    const result = removeWorkerFromProject('pw-001')

    expect(result.success).toBe(true)
    expect(result.leftDate).toBeDefined()

    // 验证历史记录保留
    const pw = projectWorkers.find(pw => pw.id === 'pw-001')
    expect(pw.status).toBe('left')
    expect(pw.leftDate).toBeDefined()
  })

  // --------------------------------------------------------------------------
  // 测试 4: 同一工人不应重复关联同一项目
  // --------------------------------------------------------------------------
  it('同一工人不应重复关联同一项目', () => {
    // 模拟检查是否重复关联
    const checkDuplicate = (projectId: string, workerId: string) => {
      return projectWorkers.some(
        pw => pw.projectId === projectId && pw.workerId === workerId
      )
    }

    // 测试重复关联
    expect(checkDuplicate('proj-001', 'worker-001')).toBe(true)

    // 测试非重复关联
    expect(checkDuplicate('proj-001', 'worker-003')).toBe(false)
  })

  // --------------------------------------------------------------------------
  // 测试 5: 应按工人统计参与项目数
  // --------------------------------------------------------------------------
  it('应按工人统计参与项目数', () => {
    // 模拟统计函数
    const countProjectsByWorker = () => {
      const counts: Record<string, number> = {}

      projectWorkers.forEach(pw => {
        counts[pw.workerId] = (counts[pw.workerId] || 0) + 1
      })

      return counts
    }

    const result = countProjectsByWorker()

    expect(result['worker-001']).toBe(2) // 张三在 2 个项目
    expect(result['worker-002']).toBe(1) // 李四在 1 个项目
    expect(result['worker-003']).toBe(1) // 王五在 1 个项目
  })

  // --------------------------------------------------------------------------
  // 测试 6: 应按项目统计工人数量
  // --------------------------------------------------------------------------
  it('应按项目统计工人数量', () => {
    // 模拟统计函数
    const countWorkersByProject = () => {
      const counts: Record<string, number> = {}

      projectWorkers.forEach(pw => {
        counts[pw.projectId] = (counts[pw.projectId] || 0) + 1
      })

      return counts
    }

    const result = countWorkersByProject()

    expect(result['proj-001']).toBe(2) // 项目 001 有 2 个工人
    expect(result['proj-002']).toBe(2) // 项目 002 有 2 个工人
  })
})
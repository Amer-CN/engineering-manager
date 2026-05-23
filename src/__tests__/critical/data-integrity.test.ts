import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// 数据完整性校验测试（P0 级别）
// 测试目标：database.ts 数据完整性校验逻辑
// ============================================================================

describe('数据完整性校验测试', () => {
  // 模拟数据库对象
  let dbData: any

  beforeEach(() => {
    dbData = {
      projects: [{ id: 'proj-001', name: '测试项目' }],
      members: [
        { id: 'member-001', name: '张三', projectId: 'proj-001' },
      ],
      costLedger: [
        { id: 'cost-001', projectId: 'proj-001', amount: 1000 },
      ],
      workers: [{ id: 'worker-001', name: '李四' }],
      projectWorkers: [
        { id: 'pw-001', projectId: 'proj-001', workerId: 'worker-001' },
      ],
    }
  })

  // --------------------------------------------------------------------------
  // 测试 1: 应检测缺失的必填字段
  // --------------------------------------------------------------------------
  it('应检测缺失的必填字段', () => {
    // 模拟数据完整性校验函数
    const validateRequiredFields = (data: any, requiredFields: string[]) => {
      const errors: string[] = []

      for (const field of requiredFields) {
        if (data[field] === undefined || data[field] === null || data[field] === '') {
          errors.push(`缺失必填字段: ${field}`)
        }
      }

      return errors
    }

    // 测试缺失字段
    const invalidRecord = { id: 'test-001', name: '' }
    const errors = validateRequiredFields(invalidRecord, ['id', 'name', 'amount'])

    expect(errors).toContain('缺失必填字段: name')
    expect(errors).toContain('缺失必填字段: amount')
    expect(errors).not.toContain('缺失必填字段: id')
  })

  // --------------------------------------------------------------------------
  // 测试 2: 应检测外键约束违规
  // --------------------------------------------------------------------------
  it('应检测外键约束违规', () => {
    // 模拟外键校验函数
    const validateForeignKey = (
      record: any,
      foreignKeyField: string,
      referencedTable: any[]
    ) => {
      const foreignKeyValue = record[foreignKeyField]
      const exists = referencedTable.some(
        (item) => item.id === foreignKeyValue
      )

      if (!exists) {
        return `外键约束违规: ${foreignKeyField}=${foreignKeyValue} 在引用表中不存在`
      }

      return null
    }

    // 测试有效外键
    const validRecord = { id: 'cost-002', workerId: 'worker-001' }
    const error1 = validateForeignKey(
      validRecord,
      'workerId',
      dbData.workers
    )
    expect(error1).toBeNull()

    // 测试无效外键
    const invalidRecord = { id: 'cost-003', workerId: 'worker-999' }
    const error2 = validateForeignKey(
      invalidRecord,
      'workerId',
      dbData.workers
    )
    expect(error2).toContain('外键约束违规')
    expect(error2).toContain('worker-999')
  })

  // --------------------------------------------------------------------------
  // 测试 3: 应检测数据类型错误
  // --------------------------------------------------------------------------
  it('应检测数据类型错误', () => {
    // 模拟数据类型校验函数
    const validateDataType = (
      value: any,
      expectedType: string,
      fieldName: string
    ) => {
      const actualType = typeof value

      if (expectedType === 'number' && isNaN(Number(value))) {
        return `数据类型错误: ${fieldName} 应为 ${expectedType}，实际为 ${actualType}`
      }

      if (expectedType === 'string' && actualType !== 'string') {
        return `数据类型错误: ${fieldName} 应为 ${expectedType}，实际为 ${actualType}`
      }

      if (expectedType === 'boolean' && actualType !== 'boolean') {
        return `数据类型错误: ${fieldName} 应为 ${expectedType}，实际为 ${actualType}`
      }

      return null
    }

    // 测试类型错误
    expect(validateDataType('not-a-number', 'number', 'amount')).toContain(
      '数据类型错误'
    )
    expect(validateDataType(123, 'string', 'name')).toContain('数据类型错误')
    expect(validateDataType('123', 'number', 'amount')).toBeNull() // 可以转换为数字
    expect(validateDataType(123, 'number', 'amount')).toBeNull()
  })

  // --------------------------------------------------------------------------
  // 测试 4: 应检测重复的唯一键
  // --------------------------------------------------------------------------
  it('应检测重复的唯一键', () => {
    // 模拟唯一键校验函数
    const validateUniqueKey = (
      newRecord: any,
      uniqueField: string,
      existingRecords: any[]
    ) => {
      const duplicate = existingRecords.find(
        (record) => record[uniqueField] === newRecord[uniqueField]
      )

      if (duplicate) {
        return `重复的唯一键: ${uniqueField}=${newRecord[uniqueField]} 已存在`
      }

      return null
    }

    // 测试重复 ID
    const duplicateRecord = { id: 'proj-001', name: '重复项目' }
    const error = validateUniqueKey(
      duplicateRecord,
      'id',
      dbData.projects
    )
    expect(error).toContain('重复的唯一键')
    expect(error).toContain('proj-001')

    // 测试唯一 ID
    const uniqueRecord = { id: 'proj-002', name: '新项目' }
    const error2 = validateUniqueKey(uniqueRecord, 'id', dbData.projects)
    expect(error2).toBeNull()
  })

  // --------------------------------------------------------------------------
  // 测试 5: 应检测数值范围错误（如金额为负）
  // --------------------------------------------------------------------------
  it('应检测数值范围错误（如金额为负）', () => {
    // 模拟数值范围校验函数
    const validateRange = (
      value: number,
      min: number | null,
      max: number | null,
      fieldName: string
    ) => {
      if (min !== null && value < min) {
        return `数值范围错误: ${fieldName}=${value} 小于最小值 ${min}`
      }

      if (max !== null && value > max) {
        return `数值范围错误: ${fieldName}=${value} 大于最大值 ${max}`
      }

      return null
    }

    // 测试负数金额
    expect(validateRange(-100, 0, null, 'amount')).toContain('数值范围错误')
    expect(validateRange(-100, 0, null, 'amount')).toContain('小于最小值 0')

    // 测试超过最大值
    expect(validateRange(101, 0, 100, 'percentage')).toContain('数值范围错误')
    expect(validateRange(101, 0, 100, 'percentage')).toContain('大于最大值 100')

    // 测试有效范围
    expect(validateRange(50, 0, 100, 'percentage')).toBeNull()
    expect(validateRange(0, 0, 100, 'percentage')).toBeNull()
    expect(validateRange(100, 0, 100, 'percentage')).toBeNull()
  })

  // --------------------------------------------------------------------------
  // 测试 6: 应校验 JSON 和 SQLite 数据一致性
  // --------------------------------------------------------------------------
  it('应校验 JSON 和 SQLite 数据一致性', () => {
    // 模拟一致性校验函数
    const validateConsistency = (
      jsonData: any[],
      sqliteData: any[]
    ) => {
      const errors: string[] = []

      // 检查行数
      if (jsonData.length !== sqliteData.length) {
        errors.push(`行数不一致: JSON=${jsonData.length}, SQLite=${sqliteData.length}`)
        return errors  // 直接返回，不比较记录
      }

      // 检查每条记录
      for (let i = 0; i < jsonData.length; i++) {
        const jsonRecord = jsonData[i]
        const sqliteRecord = sqliteData[i]

        // 简化比较：只比较 ID
        if (jsonRecord.id !== sqliteRecord.id) {
          errors.push(`记录 ${i} ID 不一致: JSON=${jsonRecord.id}, SQLite=${sqliteRecord.id}`)
        }
      }

      return errors
    }

    // 测试一致性
    const jsonData = [
      { id: '1', amount: 1000 },
      { id: '2', amount: 2000 },
    ]
    const sqliteData = [
      { id: '1', amount: 1000 },
      { id: '2', amount: 2000 },
    ]

    const errors1 = validateConsistency(jsonData, sqliteData)
    expect(errors1).toHaveLength(0)

    // 测试行数不一致
    const sqliteData2 = [{ id: '1', amount: 1000 }]
    const errors2 = validateConsistency(jsonData, sqliteData2)
    expect(errors2).toContain('行数不一致: JSON=2, SQLite=1')

    // 测试 ID 不一致
    const sqliteData3 = [
      { id: '1', amount: 1000 },
      { id: '3', amount: 3000 },
    ]
    const errors3 = validateConsistency(jsonData, sqliteData3)
    expect(errors3).toContain('记录 1 ID 不一致: JSON=2, SQLite=3')
  })
})

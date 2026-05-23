import {
  isString,
  isNumber,
  isBoolean,
  isDateString,
  isArray,
  isObject,
  isProject,
  isMember,
  isPartner,
  isInvoice,
  isSuccess,
  isFailure,
  isMaterial,
  isExpense,
  isDrawing,
  isContract,
  isWorkerTeam,
  isSettlement,
  isInventoryItem,
  isProjectArray,
  isMemberArray,
  isExpenseArray,
  isPartnerArray,
  isInvoiceArray,
  Guards,
} from '../../types/guards'

describe('guards.ts', () => {
  // ─── 基础类型守卫 ────────────────────────────────────────────
  describe('基础类型守卫', () => {
    it('isString', () => {
      expect(isString('hello')).toBe(true)
      expect(isString(123)).toBe(false)
      expect(isString(null)).toBe(false)
      expect(isString(undefined)).toBe(false)
    })

    it('isNumber', () => {
      expect(isNumber(42)).toBe(true)
      expect(isNumber(0)).toBe(true)
      expect(isNumber(-1)).toBe(true)
      expect(isNumber(NaN)).toBe(false)
      expect(isNumber('42')).toBe(false)
      expect(isNumber(null)).toBe(false)
    })

    it('isBoolean', () => {
      expect(isBoolean(true)).toBe(true)
      expect(isBoolean(false)).toBe(true)
      expect(isBoolean(0)).toBe(false)
      expect(isBoolean('true')).toBe(false)
    })

    it('isDateString', () => {
      expect(isDateString('2025-03-15')).toBe(true)
      expect(isDateString('invalid')).toBe(false)
      expect(isDateString(123)).toBe(false)
      expect(isDateString(null)).toBe(false)
    })

    it('isObject', () => {
      expect(isObject({})).toBe(true)
      expect(isObject({ a: 1 })).toBe(true)
      expect(isObject(null)).toBe(false)  // null 不是 object
      expect(isObject([])).toBe(true)     // 数组也是 object
      expect(isObject('string')).toBe(false)
    })

    it('isArray', () => {
      const isStringArray = (val: unknown): val is string[] => isArray(val, isString)
      expect(isStringArray(['a', 'b'])).toBe(true)
      expect(isStringArray([1, 2])).toBe(false)
      expect(isStringArray([])).toBe(true)   // 空数组也通过
      expect(isStringArray(null)).toBe(false)
    })
  })

  // ─── 实体类型守卫 ────────────────────────────────────────────
  describe('实体类型守卫', () => {
    describe('isProject', () => {
      it('应识别有效的 Project 对象', () => {
        expect(isProject({ id: 1, name: '测试项目', status: 'in_progress' })).toBe(true)
      })

      it('应拒绝无效的 Project 对象', () => {
        expect(isProject(null)).toBe(false)
        expect(isProject({})).toBe(false)
        expect(isProject({ id: '1', name: '测试项目', status: 'in_progress' })).toBe(false) // id 非数字
        expect(isProject({ id: 1, name: '测试项目', status: 'unknown' })).toBe(false) // 非法 status
      })
    })

    describe('isMember', () => {
      it('应识别有效的 Member 对象', () => {
        expect(isMember({ id: 1, name: '张三', memberType: 'staff' })).toBe(true)
        expect(isMember({ id: 1, name: '李四', memberType: 'worker' })).toBe(true)
      })

      it('应拒绝无效的 Member 对象', () => {
        expect(isMember({ id: 1, name: '张三', memberType: 'unknown' })).toBe(false)
      })
    })

    describe('isPartner', () => {
      it('应识别有效的 Partner 对象', () => {
        expect(isPartner({ id: 1, name: '测试公司', category: 'cooperation' })).toBe(true)
      })

      it('应拒绝无效对象', () => {
        expect(isPartner(null)).toBe(false)
        expect(isPartner({ id: '1', name: '测试公司', category: 'cooperation' })).toBe(false)
      })
    })

    describe('isInvoice', () => {
      it('应识别有效的 Invoice 对象', () => {
        expect(isInvoice({ id: 1, invoiceNo: 'FP2025001', type: 'invoice_in' })).toBe(true)
        expect(isInvoice({ id: 1, invoiceNo: 'FP2025002', type: 'invoice_out' })).toBe(true)
      })

      it('应拒绝无效类型', () => {
        expect(isInvoice({ id: 1, invoiceNo: 'FP2025001', type: 'invalid' })).toBe(false)
      })
    })
  })

  // ─── 更多实体类型守卫 ─────────────────────────────────────────
  describe('isMaterial', () => {
    it('应识别有效的 Material 对象', () => {
      expect(isMaterial({ id: 1, projectId: 10, name: '水泥' })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isMaterial(null)).toBe(false)
      expect(isMaterial({})).toBe(false)
      expect(isMaterial({ id: '1', projectId: 10, name: '水泥' })).toBe(false)
      expect(isMaterial({ id: 1, projectId: '10', name: '水泥' })).toBe(false)
      expect(isMaterial({ id: 1, projectId: 10 })).toBe(false) // 缺 name
    })
  })

  describe('isExpense', () => {
    it('应识别有效的 Expense 对象', () => {
      expect(isExpense({ id: 1, projectId: 10, amount: 5000 })).toBe(true)
      expect(isExpense({ id: 1, projectId: 10, amount: 0 })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isExpense(null)).toBe(false)
      expect(isExpense({ id: 1, projectId: 10 })).toBe(false) // 缺 amount
      expect(isExpense({ id: 1, projectId: 10, amount: '5000' })).toBe(false)
    })
  })

  describe('isDrawing', () => {
    it('应识别有效的 Drawing 对象', () => {
      expect(isDrawing({ id: 1, projectId: 10, name: '基础图', filePath: '/a.png' })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isDrawing(null)).toBe(false)
      expect(isDrawing({ id: 1, projectId: 10, name: '基础图' })).toBe(false) // 缺 filePath
      expect(isDrawing({ id: 1, projectId: 10, name: 123, filePath: '/a.png' })).toBe(false)
    })
  })

  describe('isContract', () => {
    it('应识别有效的 Contract 对象', () => {
      const validStatuses = ['draft', 'pending', 'active', 'expired', 'terminated', 'archived']
      validStatuses.forEach(status => {
        expect(isContract({ id: 1, name: '合同', status })).toBe(true)
      })
    })

    it('应拒绝无效对象', () => {
      expect(isContract(null)).toBe(false)
      expect(isContract({ id: 1, name: '合同', status: 'unknown' })).toBe(false)
      expect(isContract({ id: 1, status: 'active' })).toBe(false) // 缺 name
    })
  })

  describe('isWorkerTeam', () => {
    it('应识别有效的 WorkerTeam 对象', () => {
      expect(isWorkerTeam({ id: 1, name: '钢筋班', projectId: 10 })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isWorkerTeam(null)).toBe(false)
      expect(isWorkerTeam({ id: 1, name: '钢筋班' })).toBe(false) // 缺 projectId
      expect(isWorkerTeam({ id: 1, name: 123, projectId: 10 })).toBe(false)
    })
  })

  describe('isSettlement', () => {
    it('应识别有效的 Settlement 对象', () => {
      expect(isSettlement({ id: 1, settlementNo: 'JS2025001', type: 'income' })).toBe(true)
      expect(isSettlement({ id: 1, settlementNo: 'JS2025002', type: 'expense' })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isSettlement(null)).toBe(false)
      expect(isSettlement({ id: 1, settlementNo: 'JS2025001', type: 'invalid' })).toBe(false)
      expect(isSettlement({ id: 1, type: 'income' })).toBe(false) // 缺 settlementNo
    })
  })

  describe('isInventoryItem', () => {
    it('应识别有效的 InventoryItem 对象', () => {
      expect(isInventoryItem({ id: 1, code: 'M001', name: '钢筋' })).toBe(true)
    })

    it('应拒绝无效对象', () => {
      expect(isInventoryItem(null)).toBe(false)
      expect(isInventoryItem({ id: 1, code: 'M001' })).toBe(false) // 缺 name
      expect(isInventoryItem({ id: 1, code: 123, name: '钢筋' })).toBe(false)
    })
  })

  // ─── 数组类型守卫 ──────────────────────────────────────────────
  describe('数组类型守卫', () => {
    it('isProjectArray', () => {
      expect(isProjectArray([{ id: 1, name: '项目A', status: 'in_progress' }])).toBe(true)
      expect(isProjectArray([])).toBe(true)
      expect(isProjectArray([{ id: '1', name: '项目A', status: 'in_progress' }])).toBe(false)
      expect(isProjectArray(null)).toBe(false)
      expect(isProjectArray('not array')).toBe(false)
    })

    it('isMemberArray', () => {
      expect(isMemberArray([{ id: 1, name: '张三', memberType: 'staff' }])).toBe(true)
      expect(isMemberArray([{ id: 1, name: '张三', memberType: 'invalid' }])).toBe(false)
      expect(isMemberArray(null)).toBe(false)
    })

    it('isExpenseArray', () => {
      expect(isExpenseArray([{ id: 1, projectId: 10, amount: 5000 }])).toBe(true)
      expect(isExpenseArray([{ id: 1, projectId: 10 }])).toBe(false)
    })

    it('isPartnerArray', () => {
      expect(isPartnerArray([{ id: 1, name: '公司A', category: 'cooperation' }])).toBe(true)
      expect(isPartnerArray([{ id: '1', name: '公司A', category: 'cooperation' }])).toBe(false)
    })

    it('isInvoiceArray', () => {
      expect(isInvoiceArray([{ id: 1, invoiceNo: 'FP001', type: 'invoice_in' }])).toBe(true)
      expect(isInvoiceArray([{ id: 1, invoiceNo: 'FP001', type: 'bad' }])).toBe(false)
    })
  })

  // ─── Guards 汇总对象 ───────────────────────────────────────────
  describe('Guards 汇总对象', () => {
    it('应包含所有守卫函数', () => {
      expect(typeof Guards.isString).toBe('function')
      expect(typeof Guards.isNumber).toBe('function')
      expect(typeof Guards.isBoolean).toBe('function')
      expect(typeof Guards.isDateString).toBe('function')
      expect(typeof Guards.isArray).toBe('function')
      expect(typeof Guards.isObject).toBe('function')
      expect(typeof Guards.isProject).toBe('function')
      expect(typeof Guards.isMember).toBe('function')
      expect(typeof Guards.isMaterial).toBe('function')
      expect(typeof Guards.isExpense).toBe('function')
      expect(typeof Guards.isDrawing).toBe('function')
      expect(typeof Guards.isPartner).toBe('function')
      expect(typeof Guards.isContract).toBe('function')
      expect(typeof Guards.isInvoice).toBe('function')
      expect(typeof Guards.isWorkerTeam).toBe('function')
      expect(typeof Guards.isSettlement).toBe('function')
      expect(typeof Guards.isInventoryItem).toBe('function')
      expect(typeof Guards.isProjectArray).toBe('function')
      expect(typeof Guards.isMemberArray).toBe('function')
      expect(typeof Guards.isExpenseArray).toBe('function')
      expect(typeof Guards.isPartnerArray).toBe('function')
      expect(typeof Guards.isInvoiceArray).toBe('function')
      expect(typeof Guards.isSuccess).toBe('function')
      expect(typeof Guards.isFailure).toBe('function')
    })
  })

  // ─── Result 类型守卫 ────────────────────────────────────────
  describe('Result 类型守卫', () => {
    it('isSuccess', () => {
      const success = { success: true as const, data: 'hello' }
      const failure = { success: false as const, error: 'something went wrong' }
      expect(isSuccess(success)).toBe(true)
      expect(isSuccess(failure)).toBe(false)
    })

    it('isFailure', () => {
      const success = { success: true as const, data: 'hello' }
      const failure = { success: false as const, error: 'something went wrong' }
      expect(isFailure(failure)).toBe(true)
      expect(isFailure(success)).toBe(false)
    })
  })
})

# 测试覆盖率提升 - Package D（P3 低优先级）

**目标**：覆盖工具函数边界测试  
**预计提升**：~2-3%  
**创建时间**：2026-05-23
**完成时间**：2026-05-23 ✅

---

## ⚪ 优先级说明

**P3 = 低优先级**——纯函数好查：
- 工具函数错误 → 界面显示错，但数据不错
- 纯函数测试 → 写起来快，但覆盖率提升有限

---

## 📋 任务清单

### 任务 D1：日期辅助函数测试 ✅

**文件**：`src/utils/date.ts` (~155行)  
**优先级**：P3 ⚪  
**测试文件**：`src/__tests__/utils/date.test.ts`（42个测试，全部通过）

#### 已测试的函数
```ts
// 1. formatDate(date) - 格式化日期为 YYYY-MM-DD
export function formatDate(date: string | Date | null | undefined): string

// 2. normalizeDate(date) - 归一化各种日期格式
export function normalizeDate(date: string | null | undefined): string

// 3. formatDateTime(date) - 格式化日期时间为 YYYY-MM-DD HH:mm:ss
export function formatDateTime(date: string | Date | null | undefined): string

// 4. formatDateChinese(date) - 格式化日期为中文显示
export function formatDateChinese(date: string | Date | null | undefined): string

// 5. calculateAge(birthDate) - 计算年龄
export function calculateAge(birthDate: string | Date | null | undefined): number

// 6. isValidDate(date) - 判断日期是否有效
export function isValidDate(date: string | Date | null | undefined): boolean

// 7. parseDateString(input) - 解析多种日期格式为 YYYY-MM-DD
export function parseDateString(input: string): string | null

// 8. getRelativeTime(date) - 获取相对时间描述
export function getRelativeTime(date: string | Date | null | undefined): string
```

#### 完成标准
- ✅ 所有导出函数都有测试覆盖
- ✅ 边界情况已测试（闰年、月末、周末、生日未到、周/月/年范围）
- ✅ 运行 `npx vitest run src/__tests__/utils/date.test.ts` 全部通过（42/42）
- ✅ 分支覆盖率 83.51%（修复了死代码后提升）

---

### 任务 D2：格式化函数测试 ✅

**文件**：`src/utils/format.ts` (~92行)  
**优先级**：P3 ⚪  
**测试文件**：`src/__tests__/utils/format.test.ts`（26个测试，全部通过）

#### 已测试的函数
```ts
// 1. formatMoney(amount, decimals?) - 格式化金额（添加千分位）
export function formatMoney(amount: number | null | undefined, decimals: number = 2): string

// 2. parseMoney(str) - 解析金额字符串（移除千分位）
export function parseMoney(str: string): number

// 3. formatPercent(value, decimals?) - 格式化百分比
export function formatPercent(value: number | null | undefined, decimals: number = 2): string

// 4. truncate(str, maxLength) - 截断字符串
export function truncate(str: string, maxLength: number): string

// 5. capitalize(str) - 首字母大写
export function capitalize(str: string): string

// 6. kebabCase(str) - 驼峰转短横线
export function kebabCase(str: string): string

// 7. camelCase(str) - 短横线转驼峰
export function camelCase(str: string): string

// 8. generateId() - 生成随机ID
export function generateId(): string

// 9. copyToClipboard(text) - 复制文本到剪贴板
export async function copyToClipboard(text: string): Promise<boolean>

// 10. downloadFile(content, filename, mimeType?) - 下载文件
export function downloadFile(content: string | Blob, filename: string, mimeType?: string): void
```

#### 完成标准
- ✅ 所有导出函数都有测试覆盖
- ✅ 边界情况已测试（0、负数、null、超长字符串、Clipboard API 成功/失败）
- ✅ 运行 `npx vitest run src/__tests__/utils/format.test.ts` 全部通过（26/26）
- ✅ 语句覆盖率 100%，分支覆盖率 95.83%

---

### 任务 D3：验证函数测试 ✅

**文件**：`src/utils/validate.ts` (~112行)  
**优先级**：P3 ⚪  
**测试文件**：`src/__tests__/utils/validate.test.ts`（20个测试，全部通过）

#### 已测试的函数
```ts
// 1. isValidPhone(phone) - 验证手机号
export function isValidPhone(phone: string | null | undefined): boolean

// 2. isValidIdCard(idCard) - 验证身份证号
export function isValidIdCard(idCard: string | null | undefined): boolean

// 3. isValidEmail(email) - 验证邮箱
export function isValidEmail(email: string | null | undefined): boolean

// 4. isValidCreditCode(code) - 验证统一社会信用代码
export function isValidCreditCode(code: string | null | undefined): boolean

// 5. isValidBankCard(cardNumber) - 验证银行卡号（使用 Luhn 算法）
export function isValidBankCard(cardNumber: string | null | undefined): boolean

// 6. isValidUrl(url) - 验证URL
export function isValidUrl(url: string | null | undefined): boolean

// 7. isRequired(value) - 验证必填
export function isRequired(value: any): boolean

// 8. minLength(value, min) - 验证最小长度
export function minLength(value: string, min: number): boolean

// 9. maxLength(value, max) - 验证最大长度
export function maxLength(value: string, max: number): boolean

// 10. inRange(value, min, max) - 验证数字范围
export function inRange(value: number, min: number, max: number): boolean
```

#### 完成标准
- ✅ 所有导出函数都有测试覆盖
- ✅ 边界情况已测试（有效/无效输入、null/undefined、Luhn 算法）
- ✅ 运行 `npx vitest run src/__tests__/utils/validate.test.ts` 全部通过（20/20）
- ✅ 语句覆盖率 100%，分支覆盖率 100%

---

### 任务 D4：项目健康度计算函数测试 ✅

**文件**：`src/utils/projectHealth.ts` (~96行)  
**优先级**：P3 ⚪  
**测试文件**：`src/__tests__/utils/projectHealth.test.ts`（49个测试，全部通过）

#### 已测试的函数
```ts
// 1. calculateHealthScore(project, stats) - 计算项目健康度评分 (0-100)
export function calculateHealthScore(
  project: { budget: number },
  stats: { totalExpenses: number; incomeTotal: number; receivedInTotal: number; invoiceInTotal: number }
): number

// 2. getHealthLevel(score) - 根据评分获取健康等级
export function getHealthLevel(score: number): { label: string; color: string; bgColor: string }

// 3. categorizeExpense(category) - 人材机成本分类
export function categorizeExpense(category: string): '人' | '材' | '机' | '其他'

// 4. calculateCostBreakdown(expenseByCategory) - 计算成本分解
export function calculateCostBreakdown(expenseByCategory: Record<string, number>): CostBreakdown
```

#### 完成标准
- ✅ 所有导出函数都有测试覆盖
- ✅ 边界情况已测试（空项目、极端值、预算为0、收入为0）
- ✅ 运行 `npx vitest run src/__tests__/utils/projectHealth.test.ts` 全部通过（49/49）
- ✅ 语句覆盖率 100%，分支覆盖率 95.45%

---

## 🔧 统一 Mock 规范

### 工具函数测试（纯函数，无需 Mock）
```ts
// 工具函数测试无需 Mock，直接导入测试
import { describe, it, expect } from 'vitest'
import { functionName } from '@/utils/xxx'

describe('utils/xxx', () => {
  it('should ...', () => {
    expect(functionName(input)).toBe(expectedOutput)
  })
})
```

---

## ✅ 验证步骤

每个任务完成后：

1. **运行单个测试文件**：
   ```bash
   cd E:/测试
   npx vitest run src/__tests__/utils/xxx.test.ts --reporter=verbose
   ```

2. **运行完整测试套件**（确保无回归）：
   ```bash
   cd E:/测试
   npx vitest run --reporter=verbose
   ```

3. **运行覆盖率测试**（查看提升）：
   ```bash
   cd E:/测试
   npx vitest run --coverage
   ```

4. **更新主任务清单**（`deliverables/testing-master-plan.md` 的"完成进度"部分）

---

## 🆘 遇到问题？

常见问题：
- **测试失败**：检查函数输入输出是否符合预期
- **导入错误**：检查函数是否已正确导出（export function）
- **边界情况**：考虑 null、undefined、0、负数、空字符串等

---

## 📊 执行结果（2026-05-23）

| 任务 | 源文件 | 测试文件 | 测试数 | 语句覆盖率 | 分支覆盖率 | 状态 |
|------|---------|----------|--------|------------|------------|------|
| D1 | `src/utils/date.ts` | `date.test.ts` | 42 | 93.87% | 83.51% | ✅ 通过 |
| D2 | `src/utils/format.ts` | `format.test.ts` | 26 | 100% | 95.83% | ✅ 通过 |
| D3 | `src/utils/validate.ts` | `validate.test.ts` | 20 | 100% | 100% | ✅ 通过 |
| D4 | `src/utils/projectHealth.ts` | `projectHealth.test.ts` | 49 | 100% | 95.45% | ✅ 通过 |

### 额外修复
- ✅ 修复 `date.ts` 第118行死代码（`p.regex.source.startsWith(...)` 永远为 false）→ 改为检查 `p.order[0] === 2`
- ✅ 修复 `test-setup.ts` 第86行 `globalThis.window` 在 Node.js 环境为 undefined 的错误 → 改为直接使用 `window`

---

**创建者**：AI Assistant  
**最后更新**：2026-05-23（任务全部完成）

const fs = require('fs')
const filePath = 'E:/测试/src/__tests__/components/features/costLedger/CostLedgerList.test.tsx'

let content = fs.readFileSync(filePath, 'utf-8')

// 修复 mock 路径：相对路径 → 别名路径
content = content.replace(
  /vi\.mock\(['"]\.\.\/\.\.\/\.\.\/\.\.\/components\/features\/costLedger\/CostLedgerRow['"]/g,
  "vi.mock('@/components/features/costLedger/CostLedgerRow'"
)

// 修复 data-test-id → data-testid
content = content.replace(/data-test-id=/g, 'data-testid=')

fs.writeFileSync(filePath, content, 'utf-8')
console.log('✓ 修复完成')

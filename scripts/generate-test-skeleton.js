#!/usr/bin/env node
/**
 * generate-test-skeleton.js
 * 为指定组件自动生成测试骨架文件（.test.tsx）
 * 用法：node generate-test-skeleton.js <组件路径>
 *
 * 示例：
 *   node generate-test-skeleton.js src/components/features/wages/WageDetailTab.tsx
 */

const fs = require('fs')
const path = require('path')

const COMPONENT_PATH = process.argv[2]
if (!COMPONENT_PATH) {
  console.error('用法: node generate-test-skeleton.js <组件路径>')
  process.exit(1)
}

const absPath = path.resolve(COMPONENT_PATH)
if (!fs.existsSync(absPath)) {
  console.error('文件不存在:', absPath)
  process.exit(1)
}

const content = fs.readFileSync(absPath, 'utf-8')

// 提取 export function/const 名称
const exportMatches = [
  ...content.matchAll(/export\s+(?:function|const|class)\s+([a-zA-Z0-9_$]+)/g),
]
const exportNames = exportMatches.map(m => m[1])
if (exportNames.length === 0) {
  console.error('未找到 export，手动编写测试。')
  process.exit(1)
}

// 提取 interface/type Props
const propsMatch = content.match(/(?:interface|type)\s+(\w*Props)/)
const propsTypeName = propsMatch ? propsMatch[1] : null

// 计算测试文件路径
const parsed = path.parse(absPath)
const dirName = parsed.dir
const baseName = parsed.name

// 测试文件放到 src/__tests__/components/features/<feature>/ 下
const featuresMatch = absPath.match(/[\\/]features[\\/]([^\\/]+)[\\/]/)
const featureName = featuresMatch ? featuresMatch[1] : null

let testDir
if (featureName) {
  testDir = path.join('src', '__tests__', 'components', 'features', featureName)
} else {
  testDir = path.join(parsed.dir, '__tests__')
}
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true })
}

const testFilePath = path.join(testDir, `${baseName}.test.tsx`)

if (fs.existsSync(testFilePath)) {
  console.log('测试文件已存在，跳过:', testFilePath)
  process.exit(0)
}

// 生成 mock 导入路径（相对路径）
const relativeComponentPath = path.relative(testDir, absPath).replace(/\\/g, '/').replace(/\.tsx?$/, '')

// 生成测试骨架
const testContent = `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ═════════════════════════════════════
// Mock：依赖的子组件和 hook
// ═════════════════════════════════════

// TODO：根据组件实际依赖取消注释并修改
// vi.mock('@/utils/xxx', () => ({ ... }))
// vi.mock('@/components/xxx', () => ({ default: vi.fn(() => <div />) }))

// ═════════════════════════════════════
// 导入被测组件（lazy import 避免 memo 陷阱）
// ═════════════════════════════════════
const importModule = async () => {
  const m = await import('${relativeComponentPath}')
  return { ${exportNames.join(', ')} }
}

// ═════════════════════════════════════
// Mock：window.electronAPI（项目 test-setup.ts 已全局 mock）
// ═════════════════════════════════════
const setupElectronAPIMocks = () => {
  // TODO：根据组件实际使用的 IPC 通道覆写 mock
  // 示例：
  // ;(window as any).electronAPI = {
  //   ...window.electronAPI,
  //   someMethod: vi.fn(() => Promise.resolve({ success: true, data: {} })),
  // }
}

// ═════════════════════════════════════
// 辅助：创建默认 props
// ═════════════════════════════════════
${propsTypeName ? `
interface TestProps extends Partial<${propsTypeName}> {}
const createDefaultProps = (): ${propsTypeName} => (${content.match(/interface\s+\w*Props\s*\{/)? `{
  // TODO：根据 Props 接口填写默认值
}` : '// TODO：根据组件 Props 接口填写默认值'
}` : '// TODO：根据组件实际 props 填写默认值'})

// ═════════════════════════════════════
// 测试
// ═════════════════════════════════════

describe('${exportNames[0]}', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupElectronAPIMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染正常（smoke test）', async () => {
    const { ${exportNames[0]} } = await importModule()
    const props = createDefaultProps()
    render(<${exportNames[0]} {...props} />)
    // TODO：添加存在性断言
    // expect(screen.getByText(/.../i)).toBeInTheDocument()
  })

  it('快照匹配', async () => {
    const { ${exportNames[0]} } = await importModule()
    const props = createDefaultProps()
    const { container } = render(<${exportNames[0]} {...props} />)
    expect(container).toMatchSnapshot()
  })

  // TODO：添加更多测试用例
  // - 用户交互（点击、输入、选择）
  // - 条件渲染（loading、空状态、错误状态）
  // - 回调触发验证（onClick、onSubmit 等）
})
`

fs.writeFileSync(testFilePath, testContent, 'utf-8')
console.log('✅ 测试骨架已生成:', testFilePath)
console.log('   请编辑文件，补全 TODO 部分。')

const fs = require('fs')
const path = require('path')

// 查找所有测试文件
const testDir = 'E:/测试/src/__tests__'
const files = []

function walkDir(dir) {
  const items = fs.readdirSync(dir)
  for (const item of items) {
    const fullPath = path.join(dir, item)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      walkDir(fullPath)
    } else if (item.endsWith('.test.ts') || item.endsWith('.test.tsx')) {
      files.push(fullPath)
    }
  }
}

walkDir(testDir)

console.log(`找到 ${files.length} 个测试文件`)

let fixed = 0
for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8')
  const original = content
  
  // 移除从 'vitest' 导入的行
  content = content.split('\n').filter(line => {
    const trimmed = line.trim()
    // 匹配各种 import from 'vitest' 或 "vitest" 的模式
    return !/^import\s+.*\s+from\s+['"]vitest['"]\s*$/.test(trimmed)
  }).join('\n')
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf-8')
    fixed++
    console.log(`已修复: ${file.replace('E:/测试/', '')}`)
  }
}

console.log(`\n完成！修复了 ${fixed} 个文件`)

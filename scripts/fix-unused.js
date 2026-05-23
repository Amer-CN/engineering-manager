/**
 * 自动修复 TypeScript noUnusedLocals/noUnusedParameters 错误
 * 使用方法: node scripts/fix-unused.js
 */

const fs = require('fs')
const path = require('path')

// 解析 tsc 错误输出
function parseTscErrors(output) {
  const errors = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    // 匹配错误格式: file(line,col): error TSxxxx: message
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/)
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        col: parseInt(match[3]),
        code: match[4],
        message: match[5]
      })
    }
  }
  
  return errors
}

// 读取文件内容
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8')
}

// 写入文件内容
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf-8')
}

// 修复未使用的导入
function fixUnusedImports(content, unusedImports) {
  const lines = content.split('\n')
  
  for (const { line, message } of unusedImports) {
    // TS6192: All imports in import declaration are unused.
    // TS6196: 'X' is declared but never used.
    // TS6133: 'X' is declared but its value is never read.
    
    if (message.includes('All imports in import declaration are unused')) {
      // 删除整行导入
      lines[line - 1] = null
    } else {
      // 部分导入未使用，需要从导入语句中移除
      const nameMatch = message.match(/'([^']+)' is declared but/)
      if (nameMatch) {
        const name = nameMatch[1]
        const lineContent = lines[line - 1]
        
        // 匹配 import { a, b, c } from 'x'
        const importMatch = lineContent.match(/import\s*\{(.+)\}\s*from/)
        if (importMatch) {
          const specs = importMatch[1].split(',').map(s => s.trim()).filter(s => s && !s.includes(`'${name}'`) && s !== name)
          
          if (specs.length === 0) {
            // 所有导入都未使用
            lines[line - 1] = null
          } else {
            // 替换导入列表
            lines[line - 1] = lineContent.replace(/\{.+}\s*from/, `{ ${specs.join(', ')} } from`)
          }
        }
      }
    }
  }
  
  return lines.filter(l => l !== null).join('\n')
}

// 修复未使用的变量/参数
function fixUnusedLocals(content, unusedVars) {
  const lines = content.split('\n')
  
  for (const { line, message } of unusedVars) {
    const nameMatch = message.match(/'([^']+)' is declared but/)
    if (!nameMatch) continue
    
    const name = nameMatch[1]
    const lineContent = lines[line - 1]
    
    if (!lineContent) continue
    
    // 如果是函数参数，添加 _ 前缀
    if (lineContent.includes('(') && lineContent.includes(')')) {
      const paramRegex = new RegExp(`\\b${name}\\b`, 'g')
      lines[line - 1] = lineContent.replace(paramRegex, `_${name}`)
    } else {
      // 如果是变量声明，删除整行
      // 但要小心，可能有多行声明
      lines[line - 1] = lineContent.replace(/^(\s*).+$/, '$1// TODO: 删除未使用变量: ' + name)
    }
  }
  
  return lines.join('\n')
}

// 主函数
function main() {
  const output = fs.readFileSync(process.argv[2] || '/tmp/tsc-unused.log', 'utf-8')
  const errors = parseTscErrors(output)
  
  console.log(`找到 ${errors.length} 个错误`)
  
  // 按文件分组
  const byFile = {}
  for (const err of errors) {
    if (!byFile[err.file]) byFile[err.file] = []
    byFile[err.file].push(err)
  }
  
  // 修复每个文件
  for (const [file, fileErrors] of Object.entries(byFile)) {
    console.log(`修复 ${file} (${fileErrors.length} 个错误)`)
    
    let content = readFile(file)
    
    // 分类错误
    const unusedImports = fileErrors.filter(e => e.code === 'TS6192' || e.code === 'TS6196')
    const unusedVars = fileErrors.filter(e => e.code === 'TS6133')
    
    // 修复
    if (unusedImports.length > 0) {
      content = fixUnusedImports(content, unusedImports)
    }
    
    if (unusedVars.length > 0) {
      content = fixUnusedLocals(content, unusedVars)
    }
    
    writeFile(file, content)
  }
  
  console.log('修复完成！')
}

main()

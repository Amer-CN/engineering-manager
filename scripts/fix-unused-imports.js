#!/usr/bin/env node
/**
 * 自动修复 TypeScript noUnusedLocals/noUnusedParameters 错误
 * 使用方法: node scripts/fix-unused-imports.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// 运行 tsc 获取错误列表
function getTscErrors() {
  try {
    const output = execSync('npx tsc --noEmit 2>&1', {
      encoding: 'utf-8',
      cwd: process.cwd(),
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    })
    return output
  } catch (error) {
    // tsc 返回非零退出码时会抛出错误，但 stderr/stdout 在 error.stdout 中
    return error.stdout || error.message
  }
}

// 解析 tsc 错误输出
function parseErrors(output) {
  const errors = []
  const lines = output.split('\n')
  
  for (const line of lines) {
    // 匹配: file(line,col): error TSxxxx: message
    const match = line.match(/^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/)
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        col: parseInt(match[3]),
        code: match[4],
        message: match[5].trim()
      })
    }
  }
  
  return errors
}

// 按文件分组错误
function groupByFile(errors) {
  const groups = {}
  for (const err of errors) {
    if (!groups[err.file]) {
      groups[err.file] = []
    }
    groups[err.file].push(err)
  }
  return groups
}

// 从 import 语句中移除未使用的导入项
function removeUnusedImports(content, unusedNames) {
  const lines = content.split('\n')
  const namesToRemove = new Set(unusedNames)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // 匹配 import { a, b, c } from 'module'
    const importMatch = line.match(/^(\s*)import\s*\{(.+)\}\s*from\s*['"](.+)['"].*$/)
    if (importMatch) {
      const indent = importMatch[1]
      const specs = importMatch[2]
      const module = importMatch[3]
      
      // 解析导入项
      const items = specs.split(',').map(s => {
        const trimmed = s.trim()
        // 处理 `a as b` 格式
        const nameMatch = trimmed.match(/^(\w+)(?:\s+as\s+(\w+))?$/)
        if (nameMatch) {
          return {
            original: trimmed,
            name: nameMatch[2] || nameMatch[1], // 实际使用的名称
            alias: nameMatch[1] // 导出的原始名称
          }
        }
        return { original: trimmed, name: trimmed, alias: trimmed }
      })
      
      // 过滤掉未使用的项
      const usedItems = items.filter(item => !namesToRemove.has(item.name))
      
      if (usedItems.length === 0) {
        // 所有导入都未使用，删除整行
        lines[i] = null
      } else {
        // 重新构建导入语句
        const newSpecs = usedItems.map(item => item.original).join(', ')
        lines[i] = `${indent}import { ${newSpecs} } from '${module}'`
      }
    }
    
    // 匹配 import type { ... } (TypeScript type import)
    const typeImportMatch = line.match(/^(\s*)import\s+type\s*\{(.+)\}\s*from\s*['"](.+)['"].*$/)
    if (typeImportMatch) {
      const indent = typeImportMatch[1]
      const specs = typeImportMatch[2]
      const module = typeImportMatch[3]
      
      const items = specs.split(',').map(s => {
        const trimmed = s.trim()
        const nameMatch = trimmed.match(/^(\w+)(?:\s+as\s+(\w+))?$/)
        if (nameMatch) {
          return {
            original: trimmed,
            name: nameMatch[2] || nameMatch[1]
          }
        }
        return { original: trimmed, name: trimmed }
      })
      
      const usedItems = items.filter(item => !namesToRemove.has(item.name))
      
      if (usedItems.length === 0) {
        lines[i] = null
      } else {
        const newSpecs = usedItems.map(item => item.original).join(', ')
        lines[i] = `${indent}import type { ${newSpecs} } from '${module}'`
      }
    }
  }
  
  return lines.filter(l => l !== null).join('\n')
}

// 修复未使用的变量（添加 _ 前缀）
function fixUnusedVariables(content, unusedVars) {
  const lines = content.split('\n')
  const nameSet = new Set(unusedVars)
  
  for (let i = 0; i < lines.length; i++) {
    for (const name of nameSet) {
      // 匹配 const/let/var 声明
      const varRegex = new RegExp(`\\b(const|let|var)\\s+${name}\\b`, 'g')
      if (lines[i].match(varRegex)) {
        // 未使用的变量，注释掉或添加 _ 前缀
        lines[i] = lines[i].replace(new RegExp(`\\b${name}\\b`, 'g'), `_${name}`)
        break
      }
      
      // 匹配函数参数
      const paramRegex = new RegExp(`\\(.*\\b${name}\\b.*\\)`, 'g')
      if (lines[i].match(paramRegex) && lines[i].includes('(') && lines[i].includes(')')) {
        // 函数参数，添加 _ 前缀
        lines[i] = lines[i].replace(new RegExp(`\\b${name}\\b`, 'g'), `_${name}`)
        break
      }
    }
  }
  
  return lines.join('\n')
}

// 主函数
function main() {
  console.log('🔍 运行 tsc 检查...')
  const output = getTscErrors()
  
  if (!output || output.trim().length === 0) {
    console.log('✅ 没有发现错误！')
    return
  }
  
  const errors = parseErrors(output)
  console.log(`📋 发现 ${errors.length} 个错误`)
  
  // 分类错误
  const unusedImportErrors = errors.filter(e => 
    e.code === 'TS6133' || e.code === 'TS6192' || e.code === 'TS6196'
  )
  const unusedVarErrors = errors.filter(e => 
    e.code === 'TS6133' || e.code === 'TS6138'
  )
  
  console.log(`  - 未使用的导入: ${unusedImportErrors.length}`)
  console.log(`  - 未使用的变量: ${unusedVarErrors.length}`)
  
  // 按文件分组
  const byFile = groupByFile(errors)
  
  // 修复每个文件
  let fixedCount = 0
  
  for (const [file, fileErrors] of Object.entries(byFile)) {
    console.log(`\n📝 处理文件: ${file}`)
    
    if (!fs.existsSync(file)) {
      console.log(`  ⚠️  文件不存在，跳过`)
      continue
    }
    
    let content = fs.readFileSync(file, 'utf-8')
    let modified = false
    
    // 修复未使用的导入
    const importErrors = fileErrors.filter(e => 
      e.message.includes('declared but never used') || 
      e.message.includes('declared but its value is never read')
    )
    
    if (importErrors.length > 0) {
      const unusedNames = importErrors
        .map(e => {
          const match = e.message.match(/'([^']+)'/)
          return match ? match[1] : null
        })
        .filter(Boolean)
      
      console.log(`  🔧 修复未使用的导入: ${unusedNames.join(', ')}`)
      content = removeUnusedImports(content, unusedNames)
      modified = true
    }
    
    // 修复未使用的变量
    const varErrors = fileErrors.filter(e => 
      e.message.includes('declared but its value is never read') ||
      e.message.includes('declared but never used')
    )
    
    if (varErrors.length > 0 && varErrors.length === importErrors.length) {
      // 已经是导入错误，跳过
    } else if (varErrors.length > 0) {
      const unusedVars = varErrors
        .map(e => {
          const match = e.message.match(/'([^']+)'/)
          return match ? match[1] : null
        })
        .filter(Boolean)
      
      console.log(`  🔧 修复未使用的变量: ${unusedVars.join(', ')}`)
      content = fixUnusedVariables(content, unusedVars)
      modified = true
    }
    
    if (modified) {
      fs.writeFileSync(file, content, 'utf-8')
      fixedCount++
      console.log(`  ✅ 已修复`)
    }
  }
  
  console.log(`\n🎉 完成！修复了 ${fixedCount} 个文件`)
  console.log('\n请运行 `npx tsc --noEmit` 验证修复结果')
}

main()

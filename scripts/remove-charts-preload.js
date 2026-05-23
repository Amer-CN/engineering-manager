// scripts/remove-charts-preload.js
// 在 Vite 构建完成后，移除 dist/index.html 中 vendor-charts 的 modulepreload 标签
const fs = require('fs')
const path = require('path')

const htmlPath = path.resolve(__dirname, '..', 'dist', 'index.html')

if (!fs.existsSync(htmlPath)) {
  console.error('❌ 未找到 dist/index.html')
  process.exit(1)
}

let html = fs.readFileSync(htmlPath, 'utf-8')
const originalLen = html.length

// 方案1：简单正则，匹配包含 vendor-charts 的 link 标签
html = html.replace(/<link[^>]*vendor-charts[^>]*>\s*\n?/gi, '')

// 方案2：如果方案1没生效，用更精确的正则
if (html.length === originalLen) {
  html = html.replace(
    /<link[^>]+rel=["']modulepreload["'][^>]*href=["'][^"']*vendor-charts[^"']*["'][^>]*>\s*\n?/gi,
    ''
  )
}

if (html.length < originalLen) {
  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log('✓ 已移除 vendor-charts 的 preload 标签，首屏不再加载 523KB 图表库')
} else {
  console.log('ℹ️  未找到 vendor-charts 的 preload 标签（可能已被移除或格式不匹配）')
}

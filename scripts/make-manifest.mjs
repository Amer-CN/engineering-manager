import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
const version = pkg.version

const releaseBase = process.env.EM_RELEASE_BASE
if (!releaseBase) {
  console.error('[make-manifest] 错误：缺少环境变量 EM_RELEASE_BASE（二进制下载根地址）')
  process.exit(1)
}

// 读现有 manifest（保留 notesUrl）
let existingNotesUrl = ''
const manifestPath = 'update/manifest.json'
if (fs.existsSync(manifestPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    if (existing.notesUrl) existingNotesUrl = existing.notesUrl
  } catch { /* ignore */ }
}

// minForced: 环境变量覆盖，否则用现 manifest 的值，否则 "0.0.0"
const minForced = process.env.EM_MIN_FORCED
  ?? (() => {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      return existing.minForced || '0.0.0'
    } catch { return '0.0.0' }
  })()

// 安装包路径
const setupFile = `release/EngineeringManager-Setup-${version}.exe`
if (!fs.existsSync(setupFile)) {
  console.error(`[make-manifest] 错误：安装包不存在 ${setupFile}（请先 iscc 编译）`)
  process.exit(1)
}

// 计算 SHA256 + size
const buf = fs.readFileSync(setupFile)
const sha256 = createHash('sha256').update(buf).digest('hex').toUpperCase()
const size = buf.length

const url = `${releaseBase.replace(/\/+$/, '')}/EngineeringManager-Setup-${version}.exe`

// 防呆检查
if (url.includes('example.cn')) {
  console.error(`[make-manifest] 错误：URL 仍含 example.cn 占位符：${url}`)
  process.exit(1)
}
if (!sha256 || sha256.length < 64) {
  console.error(`[make-manifest] 错误：SHA256 无效：${sha256}`)
  process.exit(1)
}

const manifest = {
  latest: version,
  minForced,
  releasedAt: new Date().toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-').replace(',', 'T') + '+08:00',
  notesUrl: existingNotesUrl || '',
  package: {
    url,
    size,
    sha256,
    signature: '',
  },
}

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
console.log(`[make-manifest] 已生成 ${manifestPath}`)
console.log(`[make-manifest] 版本: ${version}`)
console.log(`[make-manifest] URL:  ${url}`)
console.log(`[make-manifest] Size: ${(size / 1024 / 1024).toFixed(2)} MB`)
console.log(`[make-manifest] SHA256: ${sha256}`)

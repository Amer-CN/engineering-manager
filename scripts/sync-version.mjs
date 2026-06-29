import fs from 'node:fs'
const v = JSON.parse(fs.readFileSync('package.json', 'utf-8')).version

// 1) 前端运行时版本（保留 version.ts 因为可能有 import）
const versionTs = `// 此文件由 scripts/sync-version.mjs 自动生成，请勿手动修改
export const APP_VERSION = '${v}'
`
fs.writeFileSync('src/version.ts', versionTs)
console.log(`[sync-version] 已写入 src/version.ts → ${v}`)

// 2) Inno Setup 版本 include
fs.mkdirSync('installer', { recursive: true })
fs.writeFileSync('installer/version.iss', `#define VERSION "${v}"\n`)
console.log(`[sync-version] 已写入 installer/version.iss → ${v}`)

// 3) .csproj <Version>
const csproj = 'EngineeringManager.Api/EngineeringManager.Api.csproj'
let xml = fs.readFileSync(csproj, 'utf-8')
if (xml.includes('<Version>')) {
  xml = xml.replace(/<Version>.*?<\/Version>/, `<Version>${v}</Version>`)
} else {
  // 写进第一个 PropertyGroup 末尾
  xml = xml.replace('</PropertyGroup>', `  <Version>${v}</Version>\n  </PropertyGroup>`)
}
fs.writeFileSync(csproj, xml)
console.log(`[sync-version] 已写入 .csproj <Version> → ${v}`)

console.log(`[sync-version] 完成：版本号 ${v} 已同步至 3 个位置`)

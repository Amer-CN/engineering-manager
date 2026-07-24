import fs from 'node:fs'
const v = JSON.parse(fs.readFileSync('package.json', 'utf-8')).version

// 1) 前端运行时版本（保留 version.ts 因为可能有 import）
const versionTs = `// 此文件由 scripts/sync-version.mjs 自动生成，请勿手动修改
export const APP_VERSION = '${v}'
`
fs.writeFileSync('src/version.ts', versionTs)
console.log(`[sync-version] 已写入 src/version.ts → ${v}`)

// 2) .csproj <Version>
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

// 3) installer/package.json
const installerPkg = 'installer/package.json'
if (fs.existsSync(installerPkg)) {
  const pkg = JSON.parse(fs.readFileSync(installerPkg, 'utf-8'))
  pkg.version = v
  fs.writeFileSync(installerPkg, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`[sync-version] 已写入 installer/package.json → ${v}`)
}

// 4) installer/src/App.tsx — version prop
const installerApp = 'installer/src/App.tsx'
if (fs.existsSync(installerApp)) {
  let content = fs.readFileSync(installerApp, 'utf-8')
  content = content.replace(/version="[\d.]+"/, `version="${v}"`)
  fs.writeFileSync(installerApp, content)
  console.log(`[sync-version] 已写入 installer/src/App.tsx → ${v}`)
}

console.log(`[sync-version] 完成：版本号 ${v} 已同步至所有位置`)

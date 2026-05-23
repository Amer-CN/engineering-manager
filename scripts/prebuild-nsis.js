/**
 * 构建前生成 NSIS include 片段，注入正确路径
 */
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');
const assetsDir = path.join(projectRoot, 'public', 'installer-assets');
const outFile = path.join(projectRoot, 'public', 'installer-brands.nsh');

const content = `; 自动生成——不要手动编辑
!define MUI_WELCOMEFINISHPAGE_BITMAP "${assetsDir.replace(/\\/g, '\\\\')}\\\\welcome.bmp"
!define MUI_WELCOMEFINISHPAGE_BITMAP_NOSTRETCH
`;

fs.writeFileSync(outFile, content, 'utf8');
console.log('✓ Generated NSIS brand include:', outFile);

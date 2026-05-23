const fs = require('fs');
const path = require('path');

const BAK_FILE = 'F:\\Company Database\\engineering.bak.json.before-fix';
const BASE_FILE = process.env.APPDATA + '\\engineering-manager\\engineering.json';
const DST_FILE = 'F:\\Company Database\\engineering.json';

console.log('=== 数据合并脚本 ===');
console.log('主文件(before-fix):', BAK_FILE);
console.log('增量文件(APPDATA):', BASE_FILE);
console.log('输出到:', DST_FILE);
console.log('');

// 读取两个文件
let bakData, baseData;
try {
  bakData = JSON.parse(fs.readFileSync(BAK_FILE, 'utf8'));
  console.log('✅ before-fix 读取成功');
} catch(e) {
  console.error('❌ before-fix 读取失败:', e.message);
  process.exit(1);
}
try {
  baseData = JSON.parse(fs.readFileSync(BASE_FILE, 'utf8'));
  console.log('✅ APPDATA 文件读取成功');
} catch(e) {
  console.error('❌ APPDATA 文件读取失败:', e.message);
  process.exit(1);
}

// 合并策略：对于每个数组字段，合并（按 id 去重，优先保留 bakData）
const result = {};
const allKeys = new Set([...Object.keys(bakData), ...Object.keys(baseData)]);

for (const key of allKeys) {
  const bakVal = bakData[key];
  const baseVal = baseData[key];
  
  // 如果都是数组，合并去重
  if (Array.isArray(bakVal) && Array.isArray(baseVal)) {
    const merged = {};
    // 先放 base（旧数据）
    for (const item of baseVal) {
      const id = item.id || JSON.stringify(item);
      merged[id] = item;
    }
    // 再放 bak（新数据，覆盖）
    for (const item of bakVal) {
      const id = item.id || JSON.stringify(item);
      merged[id] = item;
    }
    result[key] = Object.values(merged);
    console.log('  合并 ' + key + ': ' + baseVal.length + ' + ' + bakVal.length + ' = ' + result[key].length + ' 条');
  } else if (bakVal !== undefined && baseVal !== undefined) {
    // 都不是数组，优先 bak
    result[key] = bakVal;
  } else {
    result[key] = bakVal !== undefined ? bakVal : baseVal;
  }
}

// 写回
try {
  fs.writeFileSync(DST_FILE + '.merge-tmp', JSON.stringify(result, null, 2), 'utf8');
  console.log('');
  console.log('✅ 合并完成，临时文件已写入');
  console.log('   大小:', (fs.statSync(DST_FILE + '.merge-tmp').size / 1024 / 1024).toFixed(2), 'MB');
  
  // 备份当前文件后再覆盖
  if (fs.existsSync(DST_FILE)) {
    const bakName = DST_FILE + '.bak-' + new Date().toISOString().slice(0,10);
    fs.copyFileSync(DST_FILE, bakName);
    console.log('   已备份当前文件到:', bakName);
  }
  
  fs.renameSync(DST_FILE + '.merge-tmp', DST_FILE);
  console.log('✅ 已写入:', DST_FILE);
} catch(e) {
  console.error('❌ 写入失败:', e.message);
  process.exit(1);
}

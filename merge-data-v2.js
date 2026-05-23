const fs = require('fs');

// 两个备份文件
const BEFORE_FIX = 'F:\\Company Database\\engineering.bak.json.before-fix';  // 5月17日，较新，数据更多
const APPDATA = process.env.APPDATA + '\\engineering-manager\\engineering.json';  // 5月6日，较旧
const DST = 'F:\\Company Database\\engineering.json';

console.log('=== 重新合并（以 before-fix 为主）===');
console.log('主文件 (before-fix):', BEFORE_FIX);
console.log('增量文件 (APPDATA):', APPDATA);
console.log('输出到:', DST);
console.log('');

// 读取
let main, inc;
try {
  main = JSON.parse(fs.readFileSync(BEFORE_FIX, 'utf8'));
  console.log('✅ before-fix 读取成功');
} catch(e) { console.error('❌ before-fix 读取失败:', e.message); process.exit(1); }
try {
  inc = JSON.parse(fs.readFileSync(APPDATA, 'utf8'));
  console.log('✅ APPDATA 读取成功');
} catch(e) { console.error('❌ APPDATA 读取失败:', e.message); process.exit(1); }

// 合并：以 before-fix 为主，APPDATA 作为增量补充
const result = {};
const allKeys = new Set([...Object.keys(main), ...Object.keys(inc)]);

for (const key of allKeys) {
  const mainVal = main[key];
  const incVal = inc[key];
  if (Array.isArray(mainVal) && Array.isArray(incVal)) {
    // 按 id 合并，main (before-fix) 优先
    const merged = {};
    for (const item of incVal) {
      const id = item.id || JSON.stringify(item);
      merged[id] = item;  // APPDATA 旧数据先放
    }
    for (const item of mainVal) {
      const id = item.id || JSON.stringify(item);
      merged[id] = item;  // before-fix 新数据覆盖
    }
    result[key] = Object.values(merged);
    console.log('  合并 ' + key + ': ' + result[key].length + ' 条');
  } else if (mainVal !== undefined) {
    result[key] = mainVal;
  } else {
    result[key] = incVal;
  }
}

// 写回
try {
  // 先备份
  const bak = DST + '.bak-' + new Date().toISOString().slice(0,10);
  if (fs.existsSync(DST)) fs.copyFileSync(DST, bak);
  console.log('  已备份当前文件到:', bak);
  
  fs.writeFileSync(DST + '.tmp', JSON.stringify(result, null, 2), 'utf8');
  fs.renameSync(DST + '.tmp', DST);
  console.log('');
  console.log('✅ 合并完成，已写入:', DST);
  console.log('   大小:', (fs.statSync(DST).size / 1024 / 1024).toFixed(2), 'MB');
} catch(e) {
  console.error('❌ 写入失败:', e.message);
  process.exit(1);
}

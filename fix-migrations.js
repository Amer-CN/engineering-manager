const fs = require('fs');
const path = require('path');

const JSON_PATH = 'F:\\Company Database\\engineering.json';
const BAK_PATH = JSON_PATH + '.before-fix-' + new Date().toISOString().slice(0,10);

// 1. 备份
fs.copyFileSync(JSON_PATH, BAK_PATH);
console.log('✅ 已备份到:', BAK_PATH);

// 2. 读取
let data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
console.log('读取成功，顶层键:', Object.keys(data).join(', '));

// 3. 添加/修复 _migrations
if (!data._migrations) {
  data._migrations = {};
  console.log('✅ 添加 _migrations 字段');
}

// 确保两个迁移标记都存在
let changed = false;
if (!data._migrations.fileStorageV1) {
  data._migrations.fileStorageV1 = true;
  changed = true;
  console.log('✅ 设置 fileStorageV1 = true');
}
if (!data._migrations.salaryHistoryBackfillV1) {
  data._migrations.salaryHistoryBackfillV1 = true;
  changed = true;
  console.log('✅ 设置 salaryHistoryBackfillV1 = true');
}

if (!changed && data._migrations.fileStorageV1) {
  console.log('ℹ️ _migrations 已正确设置，无需修改');
} else {
  // 4. 写回
  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ 已写回:', JSON_PATH);
  console.log('文件大小:', (fs.statSync(JSON_PATH).size / 1024 / 1024).toFixed(2), 'MB');
}

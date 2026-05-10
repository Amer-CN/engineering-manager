// rebuild.mjs - 清除缓存并重新构建
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const rootDir = 'E:/测试';

// 清除缓存
const viteCache = join(rootDir, 'node_modules/.vite');
const dist = join(rootDir, 'dist');

console.log('清除缓存...');
if (existsSync(viteCache)) {
  rmSync(viteCache, { recursive: true, force: true });
  console.log('已删除 .vite 缓存');
}
if (existsSync(dist)) {
  rmSync(dist, { recursive: true, force: true });
  console.log('已删除 dist 目录');
}

// 执行 vite build
console.log('执行构建...');
const { execSync } = await import('child_process');

try {
  execSync('"D:/Program Files/nodejs/node.exe" "E:/测试/node_modules/vite/bin/vite.js" build', {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('构建完成!');
} catch (e) {
  console.error('构建失败:', e.message);
}

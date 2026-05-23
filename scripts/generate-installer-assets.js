/**
 * 工程管家 NSIS 安装包视觉升级 v2
 * 设计系统: Minimalism & Swiss 基底 + 科技感光影
 * 配色: Primary #2563EB · Accent #059669 · Dark #0F172A
 * 风格: 干净、科技感、有层次、深色渐变 + 辉光
 */
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'public', 'installer-assets');
fs.mkdirSync(OUT, { recursive: true });

// ===== 配色 =====
const C = {
  slate950: [0x02, 0x06, 0x10],
  slate900: [0x0F, 0x17, 0x2A],
  slate800: [0x1E, 0x29, 0x3B],
  slate700: [0x33, 0x41, 0x55],
  slate600: [0x47, 0x55, 0x69],
  slate400: [0x94, 0xA3, 0xB8],
  slate200: [0xE2, 0xE8, 0xF0],
  primary:  [0x25, 0x63, 0xEB],
  primaryL: [0x3B, 0x82, 0xF6],
  primaryD: [0x1D, 0x4E, 0xD8],
  accent:   [0x05, 0x96, 0x69],
  accentL:  [0x10, 0xB9, 0x81],
  white:    [0xFF, 0xFF, 0xFF],
};

// ===== 工具 =====
function create(w, h, color) {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i*4]=color[0]; data[i*4+1]=color[1]; data[i*4+2]=color[2]; data[i*4+3]=0xFF;
  }
  return new Jimp({ data, width: w, height: h });
}

function px(img, x, y, r, g, b, a) {
  a = a !== undefined ? a : 255;
  if (x < 0 || x >= img.bitmap.width || y < 0 || y >= img.bitmap.height) return;
  const idx = (Math.round(y) * img.bitmap.width + Math.round(x)) * 4;
  if (a < 255) {
    const t = a / 255;
    img.bitmap.data[idx]   = Math.round(img.bitmap.data[idx]   * (1-t) + r * t);
    img.bitmap.data[idx+1] = Math.round(img.bitmap.data[idx+1] * (1-t) + g * t);
    img.bitmap.data[idx+2] = Math.round(img.bitmap.data[idx+2] * (1-t) + b * t);
  } else {
    img.bitmap.data[idx]=r; img.bitmap.data[idx+1]=g; img.bitmap.data[idx+2]=b; img.bitmap.data[idx+3]=255;
  }
}

// ===== 画安全帽（精细版） =====
function drawHat(img, cx, cy, size, r, g, b, a) {
  const rr = size * 0.35;
  // 帽顶半圆（用多层模糊实现抗锯齿）
  for (let x = -rr-1; x <= rr+1; x++) {
    for (let y = -rr-1; y <= 1; y++) {
      const dist = Math.sqrt(x*x + y*y);
      if (dist <= rr + 0.5) {
        const alpha = Math.max(0, Math.min(1, (rr + 0.5 - dist)));
        if (y <= 0 || (y <= 1 && Math.abs(x) <= size * 0.48)) {
          px(img, cx+x, cy+y, r, g, b, Math.round(a * alpha));
        }
      }
    }
  }
  // 帽顶脊线（科技感装饰）
  const ridgeR = rr * 1.1;
  for (let x = -ridgeR; x <= ridgeR; x++) {
    const yy = -rr * 0.15;
    const dist = Math.abs(x);
    if (dist <= ridgeR) {
      const alpha = Math.max(0, 1 - dist/ridgeR) * 0.3;
      px(img, cx+x, cy+yy, C.primaryL[0], C.primaryL[1], C.primaryL[2], Math.round(a * alpha));
    }
  }
  // 顶饰（更精细）
  const pr = rr * 0.22;
  for (let x = -pr-1; x <= pr+1; x++) {
    for (let y = -pr*1.8; y <= 0; y++) {
      const dist = Math.sqrt(x*x + (y+pr*0.3)*(y+pr*0.3));
      if (dist <= pr + 0.5) {
        const alpha = Math.max(0, Math.min(1, (pr + 0.5 - dist)));
        px(img, cx+x, cy+y-rr*0.55, r, g, b, Math.round(a * alpha));
      }
    }
  }
  // 帽檐
  const bw = size * 0.55, bh = size * 0.1;
  for (let x = -bw-1; x <= bw+1; x++) {
    for (let y = -1; y <= bh+1; y++) {
      if (y < 0) continue;
      const edgeDist = bw - Math.abs(x);
      if (edgeDist < bh*0.5 && y > bh*0.7 - (bh*0.5 - edgeDist)) continue;
      px(img, cx+x, cy+y, r, g, b, a);
    }
  }
}

// ===== 背景科技网格 =====
function drawGrid(img, w, h, color, alpha, spacing) {
  spacing = spacing || 16;
  for (let x = 0; x < w; x += spacing) {
    for (let y = 0; y < h; y++) {
      px(img, x, y, color[0], color[1], color[2], Math.round(alpha * 255));
    }
  }
  for (let y = 0; y < h; y += spacing) {
    for (let x = 0; x < w; x++) {
      px(img, x, y, color[0], color[1], color[2], Math.round(alpha * 255));
    }
  }
}

// ===== 辉光效果 =====
function drawGlow(img, cx, cy, radius, r, g, b, maxA) {
  for (let x = -radius; x <= radius; x++) {
    for (let y = -radius; y <= radius; y++) {
      const dist = Math.sqrt(x*x + y*y);
      if (dist <= radius) {
        const alpha = Math.max(0, 1 - dist/radius) * maxA;
        px(img, cx+x, cy+y, r, g, b, Math.round(alpha * 255));
      }
    }
  }
}

// ===== 保存 =====
async function saveBMP(img, fp) { fs.writeFileSync(fp, await img.getBuffer('image/bmp')); }
async function savePNG(img, fp) { fs.writeFileSync(fp, await img.getBuffer('image/png')); }

// ===== 1. HEADER 150x57 =====
async function genHeader() {
  const img = create(150, 57, C.slate900);
  // 渐变 slate900 → slate800
  for (let y = 0; y < 57; y++) {
    const t = y / 57;
    const rr = Math.round(15 + t * 15), gg = Math.round(23 + t * 18), bb = Math.round(42 + t * 17);
    for (let x = 0; x < 150; x++) px(img, x, y, rr, gg, bb);
  }
  // 底部粗蓝线 + 辉光
  for (let x = 0; x < 150; x++) {
    for (let d = -1; d <= 2; d++) {
      const y = 55 + d;
      if (d === 0 || d === 1) px(img, x, y, C.primaryL[0], C.primaryL[1], C.primaryL[2]);
      else px(img, x, y, C.primary[0], C.primary[1], C.primary[2], 80);
    }
  }
  // 左侧安全帽
  drawHat(img, 32, 30, 28, 255, 255, 255, 230);
  // 安全帽旁边的小蓝点装饰
  drawGlow(img, 50, 28, 3, C.primaryL[0], C.primaryL[1], C.primaryL[2], 0.4);
  drawGlow(img, 50, 38, 2, C.accentL[0], C.accentL[1], C.accentL[2], 0.3);
  
  await saveBMP(img, path.join(OUT, 'header.bmp'));
  console.log('✓ header.bmp');
}

// ===== 2. WELCOME/FINISH SIDEBAR 164x314 =====
async function genWelcome() {
  const w=164, h=314;
  const img = create(w, h, C.slate950);
  
  // 复杂渐变多层
  for (let y = 0; y < h; y++) {
    const t = y / h;
    // 从深到浅再到深的微妙渐变（有呼吸感）
    const wave = 1 - 0.15 * Math.sin(t * Math.PI * 1.5);
    const rr = Math.round((10 + t * 12) * wave);
    const gg = Math.round((16 + t * 16) * wave);
    const bb = Math.round((30 + t * 20) * wave);
    for (let x = 0; x < w; x++) px(img, x, y, rr, gg, bb);
  }
  
  // 科技网格（半透明）
  drawGrid(img, w, h, C.primary, 0.04, 18);
  drawGrid(img, w, h, C.primaryL, 0.03, 36);
  
  // 右侧蓝色辉光条
  for (let y = 0; y < h; y++) {
    for (let x = w-12; x < w; x++) {
      const d = Math.abs(x - (w-4));
      const a = Math.max(0, 1 - d/12) * 0.3;
      px(img, x, y, C.primary[0], C.primary[1], C.primary[2], Math.round(a * 255));
    }
  }
  
  // 中心安全帽大图标 + 辉光
  drawGlow(img, w/2, 75, 40, C.primary[0], C.primary[1], C.primary[2], 0.15);
  drawHat(img, w/2, 80, 60, 255, 255, 255, 235);
  
  // 安全帽上方蓝色弧线装饰（科技感 HUD 元素）
  for (let a = -60; a <= 60; a += 3) {
    const rad = a * Math.PI / 180;
    const rx = w/2 + 50 * Math.sin(rad);
    const ry = 35 - 15 * Math.cos(rad);
    px(img, rx, ry, C.primaryL[0], C.primaryL[1], C.primaryL[2], 120);
  }
  
  // 底部蓝色辉光线（呼吸灯效果用静态表示）
  for (let x = 20; x < w-20; x++) {
    const d = Math.abs(x - w/2) / (w/2 - 20);
    const a = Math.max(0, 1 - d) * 0.35;
    for (let dy = -2; dy <= 2; dy++) {
      px(img, x, h-12+dy, C.primary[0], C.primary[1], C.primary[2], Math.round(a * 255));
      if (dy === 0) px(img, x, h-12+dy, C.primaryL[0], C.primaryL[1], C.primaryL[2], Math.round(a * 255));
    }
  }
  
  // 角落科技装饰（HUD 风格角标）
  for (let i = 0; i < 12; i++) {
    px(img, 10+i, 8, C.primaryL[0], C.primaryL[1], C.primaryL[2], 100);
    px(img, 8, 10+i, C.primaryL[0], C.primaryL[1], C.primaryL[2], 100);
    px(img, w-10-i, 8, C.primaryL[0], C.primaryL[1], C.primaryL[2], 100);
    px(img, w-8, 10+i, C.primaryL[0], C.primaryL[1], C.primaryL[2], 100);
  }
  
  await saveBMP(img, path.join(OUT, 'welcome.bmp'));
  console.log('✓ welcome.bmp');
}

// ===== 3. APP ICON 512x512 =====
async function genIcon() {
  const s = 512, cr = 90;
  const data = Buffer.alloc(s * s * 4, 0);
  for (let x = 0; x < s; x++) {
    for (let y = 0; y < s; y++) {
      let inShape = true;
      if (x < cr && y < cr) inShape = (x-cr)**2 + (y-cr)**2 <= cr*cr;
      else if (x >= s-cr && y < cr) inShape = (x-(s-cr))**2 + (y-cr)**2 <= cr*cr;
      else if (x < cr && y >= s-cr) inShape = (x-cr)**2 + (y-(s-cr))**2 <= cr*cr;
      else if (x >= s-cr && y >= s-cr) inShape = (x-(s-cr))**2 + (y-(s-cr))**2 <= cr*cr;
      if (inShape) {
        const d = Math.sqrt((x-s/2)**2 + (y-s/2)**2) / (s/2);
        const idx = (y * s + x) * 4;
        // 中心亮、边缘暗的渐变
        const bright = 1 - d * 0.15;
        // 添加细微的蓝色辉光
        const glow = d < 0.6 ? 1 + 0.15 * Math.cos(d/0.6 * Math.PI) : 1;
        data[idx]   = Math.round(37 * bright * glow);
        data[idx+1] = Math.round(99 * bright * glow);
        data[idx+2] = Math.round(235 * bright * glow);
        data[idx+3] = 0xFF;
      }
    }
  }
  const img = new Jimp({ data, width: s, height: s });
  // 图标内的安全帽
  drawHat(img, s/2, s/2 + 15, s * 0.38, 255, 255, 255, 240);
  // 安全帽辉光
  drawGlow(img, s/2, s/2 - 20, s * 0.25, C.primaryL[0], C.primaryL[1], C.primaryL[2], 0.1);
  
  await savePNG(img, path.join(OUT, 'app-icon.png'));
  console.log('✓ app-icon.png');
}

(async () => {
  try {
    await genHeader();
    await genWelcome();
    await genIcon();
    console.log('\n✓ Done →', OUT);
  } catch (e) { console.error(e); process.exit(1); }
})();

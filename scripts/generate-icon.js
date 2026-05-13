const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SIZES = [256, 128, 64, 48, 32, 16];

async function generateIcon() {
  const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
  const icoPath = path.join(__dirname, '..', 'public', 'icon.ico');
  const pngPath = path.join(__dirname, '..', 'public', 'icon.png');

  const svgBuffer = fs.readFileSync(svgPath);

  // Generate PNGs at each size
  const pngs = await Promise.all(
    SIZES.map(size =>
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer()
        .then(data => ({ size, data }))
    )
  );

  // Save 256x256 as icon.png for electron-builder fallback
  const png256 = pngs.find(p => p.size === 256);
  fs.writeFileSync(pngPath, png256.data);
  console.log('Saved icon.png (256x256)');

  // Build ICO file (ICO can contain PNG-compressed images)
  const imageEntries = [];
  const imageDatas = [];
  let offset = 6 + 16 * pngs.length; // header + directory entries

  for (const { size, data } of pngs) {
    const w = size >= 256 ? 0 : size; // 0 means 256 in ICO spec
    const h = size >= 256 ? 0 : size;
    imageEntries.push({
      width: w,
      height: h,
      colors: 0,
      reserved: 0,
      planes: 1,
      bpp: 32,
      size: data.length,
      offset,
    });
    imageDatas.push(data);
    offset += data.length;
  }

  // Write ICO
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);  // reserved
  header.writeUInt16LE(1, 2);  // type: ICO
  header.writeUInt16LE(pngs.length, 4); // image count

  const dirEntries = Buffer.alloc(16 * pngs.length);
  for (let i = 0; i < pngs.length; i++) {
    const e = imageEntries[i];
    const off = i * 16;
    dirEntries.writeUInt8(e.width, off);
    dirEntries.writeUInt8(e.height, off + 1);
    dirEntries.writeUInt8(e.colors, off + 2);
    dirEntries.writeUInt8(e.reserved, off + 3);
    dirEntries.writeUInt16LE(e.planes, off + 4);
    dirEntries.writeUInt16LE(e.bpp, off + 6);
    dirEntries.writeUInt32LE(e.size, off + 8);
    dirEntries.writeUInt32LE(e.offset, off + 12);
  }

  const ico = Buffer.concat([header, dirEntries, ...imageDatas]);
  fs.writeFileSync(icoPath, ico);
  console.log(`Saved icon.ico with ${pngs.length} sizes: ${SIZES.join(', ')}`);
}

generateIcon().catch(err => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});

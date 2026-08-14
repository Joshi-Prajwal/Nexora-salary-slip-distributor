const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);

// Construct a valid 32x32 32-bit ICO file for Windows rc.exe
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved
icoHeader.writeUInt16LE(1, 2); // Type 1 (ICO)
icoHeader.writeUInt16LE(1, 4); // 1 Image

const width = 32;
const height = 32;
const imageSize = 40 + (width * height * 4) + (width * height / 8); // Header + XOR + AND mask

const icoDir = Buffer.alloc(16);
icoDir.writeUInt8(width, 0);
icoDir.writeUInt8(height, 1);
icoDir.writeUInt8(0, 2); // Color palette
icoDir.writeUInt8(0, 3); // Reserved
icoDir.writeUInt16LE(1, 4); // Planes
icoDir.writeUInt16LE(32, 6); // Bits per pixel
icoDir.writeUInt32LE(imageSize, 8); // Size of image data
icoDir.writeUInt32LE(22, 12); // Offset to image data (6 + 16 = 22)

const bmiHeader = Buffer.alloc(40);
bmiHeader.writeUInt32LE(40, 0); // Header size
bmiHeader.writeInt32LE(width, 4); // Width
bmiHeader.writeInt32LE(height * 2, 8); // Height x 2 for ICO DIB
bmiHeader.writeUInt16LE(1, 12); // Planes
bmiHeader.writeUInt16LE(32, 14); // BPP
bmiHeader.writeUInt32LE(0, 16); // Compression (BI_RGB)
bmiHeader.writeUInt32LE(width * height * 4, 20); // Image size

const xorMask = Buffer.alloc(width * height * 4);
for (let i = 0; i < xorMask.length; i += 4) {
  xorMask[i] = 0xd8;     // B
  xorMask[i + 1] = 0x84; // G
  xorMask[i + 2] = 0x02; // R
  xorMask[i + 3] = 0xff; // A
}

const andMask = Buffer.alloc((width * height) / 8, 0); // All 0s (opaque)

const icoData = Buffer.concat([icoHeader, icoDir, bmiHeader, xorMask, andMask]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoData);

console.log('Valid DIB icon.ico and PNG icons generated in src-tauri/icons/');

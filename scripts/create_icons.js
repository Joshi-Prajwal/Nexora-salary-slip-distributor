const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../src-tauri/icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 transparent PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const pngBuffer = Buffer.from(pngBase64, 'base64');

// Minimal 1x1 ICO file header and bitmap
// ICO Header: 00 00 01 00 01 00 01 01 00 00 01 00 20 00 ...
// We can use a simple valid ICO or write pngBuffer as icon files.
fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);

// For Windows icon.ico, write a simple valid ICO format containing 1 image
const icoHeader = Buffer.from([
  0x00, 0x00, // Reserved
  0x01, 0x00, // Type 1 (ICO)
  0x01, 0x00, // 1 Image
  0x01, 0x01, // Width: 1, Height: 1
  0x00, 0x00, // Color count
  0x00, // Reserved
  0x01, 0x00, // Color planes
  0x20, 0x00, // Bits per pixel (32)
  pngBuffer.length & 0xff, (pngBuffer.length >> 8) & 0xff, (pngBuffer.length >> 16) & 0xff, (pngBuffer.length >> 24) & 0xff, // Image size
  0x16, 0x00, 0x00, 0x00 // Offset (22 bytes)
]);

const icoFile = Buffer.concat([icoHeader, pngBuffer]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoFile);

console.log('Icons generated successfully in src-tauri/icons/');

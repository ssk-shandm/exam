// Generate placeholder icons for Tauri
// Run: node scripts/generate-icons.cjs

const fs = require("fs");
const path = require("path");

// Minimal 32x32 4-byte-per-pixel RGBA PNG generator
// Creates a simple solid-color icon (blue #4A90D9)
function createPNG(size) {
  const width = size;
  const height = size;

  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);  // width
  ihdrData.writeUInt32BE(height, 4); // height
  ihdrData.writeUInt8(8, 8);         // bit depth
  ihdrData.writeUInt8(6, 9);         // color type (RGBA)
  ihdrData.writeUInt8(0, 10);        // compression
  ihdrData.writeUInt8(0, 11);        // filter
  ihdrData.writeUInt8(0, 12);        // interlace
  const ihdr = createChunk("IHDR", ihdrData);

  // IDAT chunk - raw pixel data (filter byte + RGBA per row)
  const rawData = [];
  const r = 0x4a, g = 0x90, b = 0xd9, a = 0xff; // blue color
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte (none)
    for (let x = 0; x < width; x++) {
      // Simple rounded-rect effect: darken edges near border
      const margin = 2;
      const nearEdge = x < margin || x >= width - margin || y < margin || y >= height - margin;
      rawData.push(nearEdge ? Math.round(r * 0.7) : r);
      rawData.push(nearEdge ? Math.round(g * 0.7) : g);
      rawData.push(nearEdge ? Math.round(b * 0.7) : b);
      rawData.push(a);
    }
  }

  const zlib = require("zlib");
  const compressed = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk("IDAT", compressed);

  // IEND chunk
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Output directory
const iconsDir = path.join(__dirname, "..", "src-tauri", "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate icons at required sizes
const sizes = [
  { name: "32x32.png", size: 32 },
  { name: "128x128.png", size: 128 },
  { name: "128x128@2x.png", size: 256 },
  { name: "icon.png", size: 512 },
];

for (const { name, size } of sizes) {
  const png = createPNG(size);
  fs.writeFileSync(path.join(iconsDir, name), png);
  console.log(`Created ${name} (${size}x${size})`);
}

// Create a simple .ico file (just embed 32x32 PNG as first frame)
const iconPng = createPNG(32);
// ICO header: reserved(2) + type(2=ico) + count(2)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);    // reserved
icoHeader.writeUInt16LE(1, 2);    // type = ICO
icoHeader.writeUInt16LE(1, 4);    // count = 1

// ICO directory entry: w, h, colors, reserved, planes, bpp, size, offset
const entry = Buffer.alloc(16);
entry.writeUInt8(32, 0);          // width
entry.writeUInt8(32, 1);          // height
entry.writeUInt8(0, 2);           // colors
entry.writeUInt8(0, 3);           // reserved
entry.writeUInt16LE(1, 4);        // planes
entry.writeUInt16LE(32, 6);       // bpp
entry.writeUInt32LE(iconPng.length, 8);  // size
entry.writeUInt32LE(22, 12);      // offset (6 + 16)

const ico = Buffer.concat([icoHeader, entry, iconPng]);
fs.writeFileSync(path.join(iconsDir, "icon.ico"), ico);
console.log("Created icon.ico");

// Create a placeholder .icns file (just copy the 256x256 PNG - macOS will use it)
// Actually, for simplicity, create a minimal valid icns with one ic07 (128x128 PNG) entry
const icnsPng = createPNG(128);
const icnsType = Buffer.from("icns", "ascii");
const icnsData = Buffer.concat([
  Buffer.from("ic07", "ascii"),            // icon type
  u32(icnsPng.length + 8),                // entry size
  icnsPng
]);
const totalSize = 8 + icnsData.length;
const icns = Buffer.concat([
  icnsType,                               // magic 'icns'
  u32(totalSize),                          // total file size
  icnsData
]);
fs.writeFileSync(path.join(iconsDir, "icon.icns"), icns);
console.log("Created icon.icns");

function u32(v) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(v, 0);
  return b;
}

console.log("All icons generated in", iconsDir);

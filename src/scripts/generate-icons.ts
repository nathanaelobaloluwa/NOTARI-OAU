import fs from "fs/promises";
import path from "path";
import zlib from "zlib";

/**
 * Creates an uncompressed/deflated raw RGBA PNG buffer
 */
function createPng(width: number, height: number, rgbaBuffer: Buffer): Buffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk("IHDR", ihdr);

  // Scanlines with filter byte 0
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (width * 4 + 1);
    scanlines[rowOffset] = 0; // filter type 0 (None)
    const srcOffset = y * width * 4;
    rgbaBuffer.copy(scanlines, rowOffset + 1, srcOffset, srcOffset + width * 4);
  }

  const deflated = zlib.deflateSync(scanlines);
  const idatChunk = createChunk("IDAT", deflated);
  const iendChunk = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, "ascii");
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate NOTARI brand emblem pixels
function renderNotariEmblem(width: number, height: number): Buffer {
  const buf = Buffer.alloc(width * height * 4);

  // Colors:
  // Midnight Navy: #151C35 (21, 28, 53)
  // Electric Blue: #4169E1 (65, 105, 225)
  // Campus Teal: #20BFA9 (32, 191, 169)
  // White: #FFFFFF (255, 255, 255)

  const radius = Math.floor(width * 0.22);
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Rounded rectangle test for squircle background
      const dx = Math.max(0, Math.abs(x - cx) - (cx - radius));
      const dy = Math.max(0, Math.abs(y - cy) - (cy - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Outside squircle: transparent
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Inside: Background Midnight Navy (#151C35) with subtle border
      let r = 21;
      let g = 28;
      let b = 53;
      const a = 255;

      // Subtle gradient from top to bottom
      const grad = y / height;
      r = Math.min(255, Math.floor(r + grad * 12));
      g = Math.min(255, Math.floor(g + grad * 16));
      b = Math.min(255, Math.floor(b + grad * 35));

      // Geometric N Monogram rendering (normalized -1 to 1 space inside emblem)
      const nx = (x - cx) / (width * 0.34);
      const ny = (y - cy) / (height * 0.38);

      // Left Pillar: -0.85 <= nx <= -0.35 && -0.85 <= ny <= 0.85
      const inLeftPillar = nx >= -0.75 && nx <= -0.28 && ny >= -0.75 && ny <= 0.75;
      // Right Pillar: 0.28 <= nx <= 0.75 && -0.75 <= ny <= 0.75
      const inRightPillar = nx >= 0.28 && nx <= 0.75 && ny >= -0.75 && ny <= 0.75;
      // Diagonal Crossbar: connects left pillar to right pillar
      const diagDist = Math.abs(ny - nx * 1.05);
      const inDiagonal = diagDist <= 0.32 && nx >= -0.75 && nx <= 0.75 && ny >= -0.75 && ny <= 0.75;

      if (inLeftPillar) {
        // Electric Blue (#4169E1)
        r = 65;
        g = 105;
        b = 225;
      } else if (inRightPillar) {
        // Campus Teal (#20BFA9)
        r = 32;
        g = 191;
        b = 169;
      } else if (inDiagonal) {
        // Dynamic Blend / White Chamfer Highlight
        const blend = (nx + 0.75) / 1.5;
        r = Math.floor(65 * (1 - blend) + 32 * blend);
        g = Math.floor(105 * (1 - blend) + 191 * blend);
        b = Math.floor(225 * (1 - blend) + 169 * blend);

        // Core white chamfer line
        if (diagDist < 0.08) {
          r = 255;
          g = 255;
          b = 255;
        }
      }

      buf[idx] = r;
      buf[idx + 1] = g;
      buf[idx + 2] = b;
      buf[idx + 3] = a;
    }
  }

  return buf;
}

async function main() {
  const iconsDir = path.join(process.cwd(), "public", "icons");
  await fs.mkdir(iconsDir, { recursive: true });

  console.log("🎨 Generating NOTARI branded notification and application icons...");

  // 1. Generate 192x192 PNG
  const pixels192 = renderNotariEmblem(192, 192);
  const png192 = createPng(192, 192, pixels192);
  await fs.writeFile(path.join(iconsDir, "notari-notification-icon.png"), png192);
  await fs.writeFile(path.join(iconsDir, "icon-192x192.png"), png192);

  // 2. Generate 512x512 PNG
  const pixels512 = renderNotariEmblem(512, 512);
  const png512 = createPng(512, 512, pixels512);
  await fs.writeFile(path.join(iconsDir, "icon-512x512.png"), png512);

  // 3. Generate 72x72 Badge PNG
  const pixels72 = renderNotariEmblem(72, 72);
  const png72 = createPng(72, 72, pixels72);
  await fs.writeFile(path.join(iconsDir, "badge-72x72.png"), png72);

  // 4. Generate SVG format for high DPI
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#151C35"/>
      <stop offset="100%" stop-color="#0E1326"/>
    </linearGradient>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4169E1"/>
      <stop offset="50%" stop-color="#3B82F6"/>
      <stop offset="100%" stop-color="#20BFA9"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="44" fill="url(#bgGrad)"/>
  <rect x="2" y="2" width="188" height="188" rx="42" fill="none" stroke="rgba(65, 105, 225, 0.4)" stroke-width="2"/>
  <g transform="translate(46, 32) scale(1)">
    <path d="M0,0 L95,93 L95,66 L71,39 L72,0 L100,37 L100,138 L5,45 L5,72 L29,99 L28,138 L0,101 Z" fill="url(#brandGrad)"/>
    <path d="M5,45 L100,138 L100,37 L72,0 L71,39 L95,66 L95,93 Z" fill="#20BFA9"/>
    <path d="M0,0 L95,93" stroke="#FFFFFF" stroke-width="4" stroke-linecap="round"/>
  </g>
</svg>`;

  await fs.writeFile(path.join(iconsDir, "notari-notification-icon.svg"), svgContent, "utf-8");

  console.log("✅ All NOTARI branded icons generated successfully in public/icons/");
}

main().catch(console.error);

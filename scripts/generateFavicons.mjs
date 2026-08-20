/**
 * Gera favicon.ico (16/32/48, PNG-in-ICO) e apple-touch-icon.png (180x180)
 * a partir do public/favicon.svg (SimboloColorido, quadrado).
 * Uso: node scripts/generateFavicons.mjs
 */
import sharp from "sharp";
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "public", "favicon.svg");
const svg = readFileSync(svgPath);

// O viewBox do SVG é 2953x3150 (ligeiramente mais alto que largo).
// Renderiza em alta resolução e deixa o sharp reduzir (lanczos3).
const base = sharp(svg, { density: 384 });

// ── favicon.ico: entradas PNG (válido desde o Vista; suporte universal) ──
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(
  icoSizes.map((size) =>
    base
      .clone()
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  ),
);

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(icoSizes.length, 4);

const entries = Buffer.alloc(16 * icoSizes.length);
let offset = 6 + 16 * icoSizes.length;
pngs.forEach((png, i) => {
  const size = icoSizes[i];
  entries.writeUInt8(size === 256 ? 0 : size, i * 16); // width
  entries.writeUInt8(size === 256 ? 0 : size, i * 16 + 1); // height
  entries.writeUInt8(0, i * 16 + 2); // palette
  entries.writeUInt8(0, i * 16 + 3); // reserved
  entries.writeUInt16LE(1, i * 16 + 4); // color planes
  entries.writeUInt16LE(32, i * 16 + 6); // bpp
  entries.writeUInt32LE(png.length, i * 16 + 8); // data size
  entries.writeUInt32LE(offset, i * 16 + 12); // data offset
  offset += png.length;
});

writeFileSync(join(root, "public", "favicon.ico"), Buffer.concat([header, entries, ...pngs]));

// ── apple-touch-icon.png: 180x180, fundo branco, safe zone ~12% ──
const appleSize = 180;
const symbol = await base
  .clone()
  .resize(Math.round(appleSize * 0.76), Math.round(appleSize * 0.76), {
    fit: "contain",
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  })
  .png()
  .toBuffer();

const appleIcon = await sharp({
  create: {
    width: appleSize,
    height: appleSize,
    channels: 4,
    background: { r: 255, g: 255, b: 255, alpha: 1 },
  },
})
  .composite([{ input: symbol, gravity: "center" }])
  .flatten({ background: { r: 255, g: 255, b: 255 } })
  .png()
  .toBuffer();

writeFileSync(join(root, "public", "apple-touch-icon.png"), appleIcon);

console.log("favicon.ico + apple-touch-icon.png gerados em public/");

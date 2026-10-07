/**
 * Generate the KYRO logo files, favicons and PWA icons from the source artwork
 * in assets/brand/.
 *
 * Run: node scripts/generate-brand-icons.mjs
 */
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const markSrc = join(root, "assets", "brand", "kyro-mark-source.webp");
const logoSrc = join(root, "assets", "brand", "kyro-logo-source.png");
const outLogo = join(root, "public", "logo");
const outIcons = join(root, "public", "icons");

mkdirSync(outLogo, { recursive: true });
mkdirSync(outIcons, { recursive: true });

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** The artwork already has a transparent background - trim it to the shape. */
async function trimmed(src) {
  return sharp(src).trim({ threshold: 1 }).png().toBuffer();
}

/** Centre the mark in a square, `padRatio` of the side as margin on each edge. */
async function square(buf, size, padRatio, background) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  let img = sharp(buf)
    .resize(inner, inner, { fit: "contain", background: CLEAR })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: CLEAR });
  if (background) img = img.flatten({ background });
  return img.png().toBuffer();
}

/** Recolour the dark navy wordmark letters to white for dark backgrounds. */
async function whiteWordmark(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a === 0) continue;
    // Letters are near #0B1238; the purple mark is far brighter in red/blue.
    const isInk = r < 70 && g < 70 && b < 110;
    if (isInk) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }
  return sharp(data, { raw: info }).png().toBuffer();
}

/** Minimal .ico container holding PNG images (supported by every modern browser). */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const mark = await trimmed(markSrc);
const logo = await trimmed(logoSrc);

// Logos used inside the app, the website and invoice PDFs
await sharp(await square(mark, 1024, 0.04)).toFile(join(outLogo, "kyro-icon.png"));
const logoSized = await sharp(logo).resize({ height: 240 }).png().toBuffer();
await sharp(logoSized)
  .extend({ top: 12, bottom: 12, left: 12, right: 12, background: CLEAR })
  .png()
  .toFile(join(outLogo, "kyro-full.png"));
await sharp(await whiteWordmark(logoSized))
  .extend({ top: 12, bottom: 12, left: 12, right: 12, background: CLEAR })
  .png()
  .toFile(join(outLogo, "kyro-full-white.png"));
console.log("wrote public/logo/kyro-icon.png, kyro-full.png, kyro-full-white.png");

// Browser tab icons: transparent, tight padding so the mark reads at 16px
const tab = async (size) => square(mark, size, 0.04);
for (const [file, size] of [
  [join(root, "public", "favicon-16x16.png"), 16],
  [join(root, "public", "favicon-32x32.png"), 32],
  [join(outIcons, "icon-16.png"), 16],
  [join(outIcons, "icon-32.png"), 32],
  [join(root, "src", "app", "icon.png"), 512],
]) {
  writeFileSync(file, await tab(size));
}
writeFileSync(
  join(root, "src", "app", "favicon.ico"),
  buildIco([
    { size: 16, data: await tab(16) },
    { size: 32, data: await tab(32) },
    { size: 48, data: await tab(48) },
  ])
);
console.log("wrote favicons");

// Home-screen / PWA icons: solid white plate with a safe-zone margin (maskable)
for (const [file, size] of [
  [join(root, "public", "apple-touch-icon.png"), 180],
  [join(outIcons, "icon-180.png"), 180],
  [join(outIcons, "icon-192.png"), 192],
  [join(outIcons, "icon-512.png"), 512],
]) {
  writeFileSync(file, await square(mark, size, 0.2, WHITE));
}
console.log("wrote app icons");

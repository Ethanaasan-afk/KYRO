/**
 * Generate NovaFlow logo, favicon and PWA icons from the source artwork.
 * Run: node scripts/generate-novaflow-icons.mjs <icon-source> <full-logo-source>
 */
import sharp from "sharp";
import { mkdirSync, existsSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outLogo = join(root, "public", "logo");
const outIcons = join(root, "public", "icons");
const iconOut = join(outLogo, "novaflow-icon.png");
const fullOut = join(outLogo, "novaflow-full.png");

const [iconArg, fullArg] = process.argv.slice(2);
const iconSrc = iconArg ?? iconOut;
const fullSrc = fullArg ?? fullOut;

for (const src of [iconSrc, fullSrc]) {
  if (!existsSync(src)) {
    console.error("Missing", src);
    process.exit(1);
  }
}

mkdirSync(outLogo, { recursive: true });
mkdirSync(outIcons, { recursive: true });

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

/** Trim the white margin off the artwork, then pad to a square with breathing room. */
async function squareIcon(src, size) {
  const trimmed = await sharp(src).trim({ background: "#ffffff", threshold: 12 }).toBuffer();
  const pad = Math.round(size * 0.1);
  return sharp(trimmed)
    .resize(size - pad * 2, size - pad * 2, { fit: "contain", background: WHITE })
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toBuffer();
}

if (iconSrc !== iconOut) {
  await sharp(await squareIcon(iconSrc, 1024)).toFile(iconOut);
  console.log("wrote", iconOut);
}

if (fullSrc !== fullOut) {
  const trimmed = await sharp(fullSrc).trim({ background: "#ffffff", threshold: 12 }).toBuffer();
  await sharp(trimmed)
    .resize({ height: 240 })
    .extend({ top: 24, bottom: 24, left: 24, right: 24, background: WHITE })
    .flatten({ background: WHITE })
    .png()
    .toFile(fullOut);
  console.log("wrote", fullOut);
}

const sizes = [
  { file: join(outIcons, "icon-16.png"), size: 16 },
  { file: join(outIcons, "icon-32.png"), size: 32 },
  { file: join(outIcons, "icon-180.png"), size: 180 },
  { file: join(outIcons, "icon-192.png"), size: 192 },
  { file: join(outIcons, "icon-512.png"), size: 512 },
  { file: join(root, "public", "favicon-16x16.png"), size: 16 },
  { file: join(root, "public", "favicon-32x32.png"), size: 32 },
  { file: join(root, "public", "apple-touch-icon.png"), size: 180 },
  { file: join(root, "public", "favicon.ico"), size: 32 },
  { file: join(root, "src", "app", "favicon.ico"), size: 32 },
  { file: join(root, "src", "app", "icon.png"), size: 512 },
];

for (const { file, size } of sizes) {
  await sharp(iconOut).resize(size, size, { fit: "contain", background: WHITE }).png().toFile(file);
  console.log("wrote", file);
}

copyFileSync(fullOut, join(root, "public", "novaflow-full.png"));
copyFileSync(iconOut, join(root, "public", "novaflow-icon.png"));
console.log("wrote public copies");

// Task 4 — Install user-uploaded Battlora emblem as the site-wide main logo
// 1. Trim transparent padding from the uploaded PNG
// 2. Save tight-cropped full-res emblem -> public/images/logo.png
// 3. Generate 512x512 favicon (emblem ~88% of canvas) -> src/app/icon.png
import sharp from "sharp";
import { unlink } from "fs/promises";

const SRC = "/home/z/my-project/upload/ChatGPT_Image_Sep_21__2026__07_28_34_PM-removebg-preview.png";
const OUT_MAIN = "/home/z/my-project/public/images/logo.png";
const OUT_ICON = "/home/z/my-project/src/app/icon.png";
const OLD_SVG = "/home/z/my-project/public/logo.svg";

const src = sharp(SRC);
const meta = await src.metadata();
console.log("source:", meta.width, "x", meta.height, meta.channels, "channels");

// Trim transparent edges (threshold 1 keeps near-transparent pixels trimmed too)
const trimmed = await src.trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
console.log("trimmed:", trimmed.info.width, "x", trimmed.info.height);

// Full-res tight emblem for navbar / login / print use
await sharp(trimmed.data)
  .resize({ width: 512, height: 512, fit: "inside", withoutEnrollment: false })
  .png({ optimizationLevel: 9 })
  .toFile(OUT_MAIN);
console.log("saved", OUT_MAIN);

// Favicon: emblem at ~88% of 512 canvas, centered on transparent square
const FAVI = 512;
const INNER = Math.round(FAVI * 0.88);
await sharp(trimmed.data)
  .resize(INNER, INNER, { fit: "inside", withoutEnrollment: false })
  .extend({
    top: Math.floor((FAVI - INNER) / 2),
    bottom: Math.ceil((FAVI - INNER) / 2),
    left: Math.floor((FAVI - INNER) / 2),
    right: Math.ceil((FAVI - INNER) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png({ optimizationLevel: 9 })
  .toFile(OUT_ICON);
console.log("saved", OUT_ICON, `(emblem ${INNER}px inside ${FAVI}px)`);

// Remove unreferenced legacy logo.svg (rg-verified: 0 references)
try {
  await unlink(OLD_SVG);
  console.log("removed unreferenced", OLD_SVG);
} catch {
  console.log("legacy logo.svg not present, skipping");
}

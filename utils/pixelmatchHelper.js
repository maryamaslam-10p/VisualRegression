// utils/pixelmatchHelper.js
import fs from "fs";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/**
 * Compare two PNG images and save a diff if mismatch exists
 * @param {Buffer} img1Buffer - baseline image buffer
 * @param {Buffer} img2Buffer - actual image buffer
 * @param {string} diffPath - where to save diff image
 * @param {number} threshold - pixelmatch threshold (0–1)
 * @returns {{ mismatch: number, mismatchPercent: number }}
 */
export function compareImages(img1Buffer, img2Buffer, diffPath, threshold = 0.1) {
  const img1 = PNG.sync.read(img1Buffer);
  const img2 = PNG.sync.read(img2Buffer);

  const { width, height } = img1;
  const diff = new PNG({ width, height });

  const mismatch = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  // ✅ Always return numbers
  const totalPixels = width * height;
  const mismatchPercent = totalPixels > 0 ? (mismatch / totalPixels) * 100 : 0;

  // Save diff only if mismatch > 0
  if (mismatch > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return {
    mismatch,          // raw pixel count
    mismatchPercent,   // ✅ number, not string
  };
}

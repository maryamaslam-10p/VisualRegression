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

  let width = img1.width;
  let height = img1.height;

  let baseline = img1;
  let actual = img2;

  // ✅ Only pad if dimensions mismatch
  if (img1.width !== img2.width || img1.height !== img2.height) {
    width = Math.max(img1.width, img2.width);
    height = Math.max(img1.height, img2.height);

    const padImage = (img) => {
      const padded = new PNG({ width, height });
      PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
      return padded;
    };

    baseline = padImage(img1);
    actual = padImage(img2);
  }

  const diff = new PNG({ width, height });

  const mismatch = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  const totalPixels = width * height;
  const mismatchPercent = totalPixels > 0 ? (mismatch / totalPixels) * 100 : 0;

  if (mismatch > 0) {
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
  }

  return { mismatch, mismatchPercent };
}

import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import fs from "fs";

function padImage(img, width, height) {
  const padded = new PNG({ width, height });
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
  return padded;
}

export function compareImages(img1Buffer, img2Buffer, diffPath, threshold = 0.1) {
  let img1 = PNG.sync.read(img1Buffer);
  let img2 = PNG.sync.read(img2Buffer);

  // ✅ Normalize to the same width & height
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  img1 = padImage(img1, width, height);
  img2 = padImage(img2, width, height);

  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(
    img1.data,
    img2.data,
    diff.data,
    width,
    height,
    { threshold, includeAA: true }
  );

  const totalPixels = width * height;
  const mismatchPercent = totalPixels > 0 ? (mismatch / totalPixels) * 100 : 0;

  if (mismatch > 0) fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return { mismatch, mismatchPercent };
}

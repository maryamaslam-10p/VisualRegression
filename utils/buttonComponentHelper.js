// utils/componentHelper.js
import fs from "fs-extra";
import { PNG } from "pngjs";
import { compareImages } from "./pixelmatchHelper.js";
import { BASELINE_DIR, ACTUAL_DIR, DIFF_DIR } from "./directoriesHelper.js";  // ✅ centralized paths

// Helper: put an image on a bigger canvas if needed
function placeOnCanvas(img, width, height) {
  const canvas = new PNG({ width, height });
  for (let y = 0; y < img.height; y++) {
    const srcStart = y * img.width * 4;
    const srcEnd = srcStart + img.width * 4;
    const destStart = y * width * 4;
    img.data.copy(canvas.data, destStart, srcStart, srcEnd);
  }
  return canvas;
}

export async function captureAndCompareComponent(page, locator, name, threshold = 0.1) {
  const baselinePath = `${BASELINE_DIR}/${name}.png`;
  const actualPath   = `${ACTUAL_DIR}/${name}.png`;
  const diffPath     = `${DIFF_DIR}/${name}-diff.png`;

  const element = page.locator(locator).first();
  await element.waitFor({ state: "visible" });
  await element.scrollIntoViewIfNeeded();

  // ✅ Ensure fonts are loaded before capture
  await page.evaluate(() => document.fonts.ready);

  // Capture fresh element screenshot
  await element.screenshot({
    path: actualPath,
    timeout: 60000,            // extended timeout
    animations: "disabled",    // disable CSS animations
    caret: "hide",             // hide text cursor
  });

  // First run → save baseline
  if (!fs.existsSync(baselinePath)) {
    fs.copyFileSync(actualPath, baselinePath);
    return {
      isFirstRun: true,
      mismatch: 0,
      mismatchPercent: 0,
      sizeChanged: false,
      status: `📸 Baseline created for ${name}`,
      baselinePath,
      actualPath,
      diffPath: null
    };
  }

  // Load baseline + actual images
  const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
  const actualImg   = PNG.sync.read(fs.readFileSync(actualPath));

  let sizeChanged = false;
  let width = baselineImg.width;
  let height = baselineImg.height;

  // Normalize dimensions if needed
  if (baselineImg.width !== actualImg.width || baselineImg.height !== actualImg.height) {
    sizeChanged = true;
    width = Math.max(baselineImg.width, actualImg.width);
    height = Math.max(baselineImg.height, actualImg.height);
  }

  const baselineCanvas = placeOnCanvas(baselineImg, width, height);
  const actualCanvas   = placeOnCanvas(actualImg, width, height);

  // ✅ Reuse central compareImages
  const { mismatch, mismatchPercent } = compareImages(
    PNG.sync.write(baselineCanvas), // buffer
    PNG.sync.write(actualCanvas),
    diffPath,
    threshold
  );

  const statusParts = [
    `🔍 Mismatch: ${mismatchPercent.toFixed(2)}%`,
    sizeChanged
      ? `(size changed: baseline=${baselineImg.width}x${baselineImg.height}, actual=${actualImg.width}x${actualImg.height})`
      : "",
    mismatch > 0 ? `See diff → ${diffPath}` : "No differences"
  ].filter(Boolean);

  return {
    isFirstRun: false,
    mismatch,
    mismatchPercent,
    sizeChanged,
    baselineSize: `${baselineImg.width}x${baselineImg.height}`,
    actualSize: `${actualImg.width}x${actualImg.height}`,
    baselinePath,
    actualPath,
    diffPath,
    status: statusParts.join(" ")
  };
}

// utils/visualHelper.js
import fs from "fs";
import { PNG } from "pngjs";
import path from "path";
import { compareImages } from "./pixelmatchHelper.js";   // ✅ centralized comparison
import { BASELINE_DIR, ACTUAL_DIR, DIFF_DIR } from "./directoriesHelper.js"; // ✅ centralized paths

/**
 * Capture a screenshot for a given viewport
 */
export async function captureScreenshot(page, testName, viewport = { width: 1280, height: 720 }) {
  await page.setViewportSize(viewport);

  // ✅ Ensure fonts are fully loaded before screenshot
  await page.evaluate(() => document.fonts.ready);

  const currentPath = path.join(ACTUAL_DIR, `${testName}.png`);
  await page.screenshot({
    path: currentPath,
    fullPage: true,
    timeout: 60000, // extended timeout
    animations: "disabled",
    caret: "hide",
    omitBackground: false,
  });

  return currentPath;
}

/**
 * Pad an image to given width/height
 */
function padImage(img, width, height) {
  const padded = new PNG({ width, height });
  PNG.bitblt(img, padded, 0, 0, img.width, img.height, 0, 0);
  return padded;
}

/**
 * Compare screenshot with baseline
 * First run: saves baseline, no failure
 * Subsequent runs: generates diff and mismatch percentage
 */
export function compareWithBaseline(testName, currentPath, threshold = 0.1) {
  const baselinePath = path.join(BASELINE_DIR, `${testName}.png`);
  const diffPath = path.join(DIFF_DIR, `${testName}-diff.png`);

  // ✅ First run → save baseline
  if (!fs.existsSync(baselinePath)) {
    fs.copyFileSync(currentPath, baselinePath);
    console.log(`✅ Baseline created: ${testName}`);
    return { isFirstRun: true, mismatch: 0, mismatchPercent: 0, diffPath: null };
  }

  // ✅ Load both images
  let img1 = PNG.sync.read(fs.readFileSync(baselinePath));
  let img2 = PNG.sync.read(fs.readFileSync(currentPath));

  // Normalize dimensions
  const width = Math.max(img1.width, img2.width);
  const height = Math.max(img1.height, img2.height);

  img1 = padImage(img1, width, height);
  img2 = padImage(img2, width, height);

  // ✅ Use centralized compareImages
  const { mismatch, mismatchPercent } = compareImages(
    PNG.sync.write(img1),  // convert padded PNG back to buffer
    PNG.sync.write(img2),
    diffPath,
    threshold
  );

  return { isFirstRun: false, mismatch, mismatchPercent, diffPath };
}

/**
 * Utility: check if baseline exists
 */
export function baselineExists(testName) {
  return fs.existsSync(path.join(BASELINE_DIR, `${testName}.png`));
}

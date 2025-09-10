// utils/adsHelper.js
import fs from "fs";
import path from "path";
import { compareImages } from "./pixelmatchHelper.js";
import { BASELINE_DIR, ACTUAL_DIR, DIFF_DIR } from "./directoriesHelper.js"; // centralized paths

function sanitizeFileName(url) {
  return url.replace(/(^\w+:|^)\/\//, "").replace(/[^\w.-]/g, "_");
}

// ✅ Mask ads before screenshot
async function maskAds(page) {
  await page.evaluate(() => {
    const adSelectors = ["iframe", ".ad", "#ad", ".adsbygoogle", "[id*='google_ads']"];
    adSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.left = rect.left + window.scrollX + "px";
        overlay.style.top = rect.top + window.scrollY + "px";
        overlay.style.width = rect.width + "px";
        overlay.style.height = rect.height + "px";
        overlay.style.background = "white";
        overlay.style.zIndex = "999999";
        document.body.appendChild(overlay);
      });
    });
  });
}

async function waitForAds(page, timeout = 8000) {
  try {
    await page.waitForSelector("iframe, .adsbygoogle, [id*='google_ads']", { timeout });
    console.log("[adsHelper] Ads detected on page.");
  } catch {
    console.warn("[adsHelper] No ads detected within timeout.");
  }
}

export async function captureAndCompareAds(page, url, testName, ignoreAds = false) {
  const safeName = sanitizeFileName(url);
  const actualPath = path.join(ACTUAL_DIR, `${testName}-${safeName}.png`);
  const baselinePath = path.join(BASELINE_DIR, `${testName}-${safeName}.png`);
  const diffPath = path.join(DIFF_DIR, `${testName}-${safeName}.png`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // ⚡ Always wait for ads (so mask has effect)
  await waitForAds(page, 8000);

  if (ignoreAds) await maskAds(page);

  // ✅ Fixed: always same viewport screenshot (no padding mismatch)
  const actualBuffer = await page.screenshot({
    fullPage: false,
    clip: { x: 0, y: 0, width: page.viewportSize().width, height: page.viewportSize().height }
  });
  fs.writeFileSync(actualPath, actualBuffer);

  // First run → baseline = masked (if ignoreAds is true)
  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, actualBuffer);
    return { isFirstRun: true, mismatch: 0, mismatchPercent: 0 };
  }

  // Compare with baseline
  const baselineBuffer = fs.readFileSync(baselinePath);
  const { mismatch, mismatchPercent } = compareImages(baselineBuffer, actualBuffer, diffPath);

  console.log(
    `[adsHelper] ${testName} → mismatch=${mismatch} (${mismatchPercent.toFixed(2)}%)`
  );

  return { isFirstRun: false, mismatch, mismatchPercent };
}

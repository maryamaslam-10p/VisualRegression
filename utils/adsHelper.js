// utils/adsHelper.js
import fs from "fs";
import path from "path";
import { compareImages } from "./pixelmatchHelper.js";
import { BASELINE_DIR, ACTUAL_DIR, DIFF_DIR } from "./directoriesHelper.js"; // ✅ centralized paths

function sanitizeFileName(url) {
  return url
    .replace(/(^\w+:|^)\/\//, "")
    .replace(/[^\w.-]/g, "_");
}

// ✅ Mask ads (white overlay)
async function maskAds(page) {
  await page.evaluate(() => {
    const adSelectors = ["iframe", ".ad", "#ad", ".adsbygoogle", "[id*='google_ads']"];
    adSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        const rect = el.getBoundingClientRect();
        const div = document.createElement("div");
        div.style.position = "absolute";
        div.style.left = rect.left + window.scrollX + "px";
        div.style.top = rect.top + window.scrollY + "px";
        div.style.width = rect.width + "px";
        div.style.height = rect.height + "px";
        div.style.background = "white";
        div.style.zIndex = "999999";
        document.body.appendChild(div);
      });
    });
  });
}

// ✅ Wait for ads to load before taking screenshot
async function waitForAds(page, timeout = 8000) {
  try {
    await page.waitForSelector("iframe, .adsbygoogle, [id*='google_ads']", { timeout });
    console.log("[adsHelper] Ads detected on page.");
  } catch {
    console.warn("[adsHelper] No ads detected within timeout.");
  }
}

// ✅ Capture screenshot & compare (ads masking optional)
export async function captureAndCompareAds(page, url, testName, ignoreAds = false) {
  const safeName = sanitizeFileName(url);
  const actualPath = path.join(ACTUAL_DIR, `${testName}-${safeName}.png`);
  const baselinePath = path.join(BASELINE_DIR, `${testName}-${safeName}.png`);
  const diffPath = path.join(DIFF_DIR, `${testName}-${safeName}.png`);

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  // ⚡ Ensure ads (if any) are visible before screenshot
  await waitForAds(page, 8000);

  if (ignoreAds) await maskAds(page);

  // Screenshot viewport (stable size)
  const actualBuffer = await page.screenshot({ fullPage: false });
  fs.writeFileSync(actualPath, actualBuffer);

  // First run → save baseline
  if (!fs.existsSync(baselinePath)) {
    fs.writeFileSync(baselinePath, actualBuffer);
    return { isFirstRun: true, mismatch: 0, mismatchPercent: 0 };
  }

  // Compare with baseline
  const baselineBuffer = fs.readFileSync(baselinePath);
  const { mismatch, mismatchPercent } = compareImages(
    baselineBuffer,
    actualBuffer,
    diffPath
  );

  console.log(
  `[adsHelper] ${testName} → mismatch=${mismatch} (${mismatchPercent.toFixed(2)}%)`
);

  return { isFirstRun: false, mismatch, mismatchPercent };
}

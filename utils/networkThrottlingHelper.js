import fs from "fs";
import { compareImages } from "./pixelmatchHelper.js";
import { BASELINE_DIR, ACTUAL_DIR, DIFF_DIR } from "./directoriesHelper.js";

const THROTTLING_PROFILES = {
  slow3G: {
    download: (400 * 1024) / 8,
    upload: (400 * 1024) / 8,
    latency: 400,
  },
  fast4G: {
    download: (4 * 1024 * 1024) / 8,
    upload: (3 * 1024 * 1024) / 8,
    latency: 20,
  },
};

function ensureDir(path) {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
}

async function applyThrottling(page, profile) {
  const { download, upload, latency } = THROTTLING_PROFILES[profile];
  const client = await page.context().newCDPSession(page);

  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: download,
    uploadThroughput: upload,
    latency,
  });
}

/**
 * Capture screenshot & compare against baseline
 */
export async function captureAndCompare(page, name, profile, threshold = 0.1) {
  ensureDir(BASELINE_DIR);
  ensureDir(ACTUAL_DIR);
  ensureDir(DIFF_DIR);

  const baselinePath = `${BASELINE_DIR}/${name}-baseline.png`;
  const actualPath = `${ACTUAL_DIR}/${name}-${profile}.png`;
  const diffPath = `${DIFF_DIR}/${name}-${profile}-diff.png`;

  await page.screenshot({ path: actualPath, fullPage: true });

  if (!fs.existsSync(baselinePath)) {
    fs.copyFileSync(actualPath, baselinePath);
    return { isFirstRun: true, mismatch: 0, mismatchPercent: 0 };
  }

  const baselineBuffer = fs.readFileSync(baselinePath);
  const actualBuffer = fs.readFileSync(actualPath);

  const { mismatch, mismatchPercent } = compareImages(
    baselineBuffer,
    actualBuffer,
    diffPath,
    threshold
  );

  return { isFirstRun: false, mismatch, mismatchPercent };
}

/**
 * Generate Playwright visual regression tests with network throttling
 */
export function generateVisualTests(test, expect, passThresholdPercent = 1.0) {
  const name = "W3Schools-Homepage";
  const url = "https://www.w3schools.com/";
  const baselinePath = `${BASELINE_DIR}/${name}-baseline.png`;

  // --- Baseline test ---
  test(`Baseline - ${name}`, async ({ page }) => {
    const start = Date.now();
    await page.goto(url, { waitUntil: "load", timeout: 120000 });

    const loadTime = (Date.now() - start) / 1000;
    console.log(`⏱️ Baseline load time: ${loadTime.toFixed(2)}s`);

    const { isFirstRun } = await captureAndCompare(page, name, "baseline");
    if (isFirstRun) {
      console.log(`📸 Baseline created for ${name}`);
    } else {
      console.log(`📸 Baseline already exists for ${name}`);
    }
  });

  // --- Throttling tests ---
  for (const profile of ["slow3G", "fast4G"]) {
    const shouldSkipBaseline = !fs.existsSync(baselinePath);

    test.describe(`Throttling [${profile}] - ${name}`, () => {
      // Skip if baseline not created
      test.skip(shouldSkipBaseline, "Baseline not created yet");

      // Skip if not Chromium (CDP only works in Chromium/Edge)
      test.skip(
        ({ browserName }) => browserName !== "chromium",
        "Throttling only supported in Chromium/Edge"
      );

      test(`runs with ${profile}`, async ({ page }) => {
        await applyThrottling(page, profile);

        const start = Date.now();
        await page.goto(url, { waitUntil: "load", timeout: 120000 });
        const loadTime = (Date.now() - start) / 1000;
        console.log(`⏱️ Load time (${profile}): ${loadTime.toFixed(2)}s`);

        const { mismatch, mismatchPercent } = await captureAndCompare(
          page,
          name,
          profile
        );

        console.log(
          `📸 Visual regression checked [${profile}] → mismatch=${mismatch} (${mismatchPercent.toFixed(2)}%)`);

        expect(mismatchPercent).toBeLessThanOrEqual(passThresholdPercent);
      });
    });
  }
}

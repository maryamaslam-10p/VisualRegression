import { test, expect } from "@playwright/test";
import { captureAndCompareAds } from "../utils/adsHelper.js";
import { captureScreenshot, compareWithBaseline, baselineExists,} from "../utils/viewportHelper.js";
import { captureAndCompareComponent } from "../utils/buttonComponentHelper.js";
import { generateVisualTests } from "../utils/networkThrottlingHelper.js";

const W3_URL_ADS = "https://www.w3schools.com/html/default.asp";
const PASS_THRESHOLD_PERCENT = 1.0; // ✅ standard threshold for all tests

// ------------------------------
// 🔹 ADS HANDLING TESTS
// ------------------------------
test.describe("Visual Regression - Ads Handling", () => {
  test("✅ Pass: ads ignored (masked)", async ({ page }) => {
    const { isFirstRun, mismatchPercent } = await captureAndCompareAds(
      page,
      W3_URL_ADS,
      "ads-pass",
      true // ignore ads
    );

    if (isFirstRun) test.skip("Baseline created. Re-run to validate.");
    else {
      console.log(`[Ads] Mismatch = ${mismatchPercent.toFixed(2)}%`);
      expect(mismatchPercent).toBeLessThanOrEqual(PASS_THRESHOLD_PERCENT);
    }
  });

  test("❌ Fail: ads NOT ignored", async ({ page }) => {
    const { isFirstRun, mismatchPercent } = await captureAndCompareAds(
      page,
      W3_URL_ADS,
      "ads-fail",
      false // do NOT ignore ads
    );

    if (isFirstRun) test.skip("Baseline missing — run pass test first.");
    else {
      console.log(`[Ads] Mismatch = ${mismatchPercent.toFixed(2)}%`);
      expect(mismatchPercent).toBeGreaterThan(PASS_THRESHOLD_PERCENT);
    }
  });
});

// ------------------------------
// 🔹 VIEWPORT TESTS
// ------------------------------
test.describe("Visual Regression - Desktop vs Tablet", () => {
  test("Homepage comparison (desktop baseline vs tablet)", async ({ page }) => {
    await page.goto("https://www.w3schools.com/css/default.asp", { waitUntil: "domcontentloaded",});

    const BASELINE_VIEWPORT = { width: 1280, height: 720 }; // desktop baseline
    const TABLET_VIEWPORT = { width: 768, height: 1024 }; // tablet
    const TEST_NAME = "homepage-desktop-baseline";

    // First run → desktop baseline
    const firstRun = !baselineExists(TEST_NAME);
    const viewportToUse = firstRun ? BASELINE_VIEWPORT : TABLET_VIEWPORT;

    const currentPath = await captureScreenshot(page, TEST_NAME, viewportToUse);

    const { isFirstRun, mismatchPercent, diffPath } = compareWithBaseline(
      TEST_NAME,
      currentPath
    );

    if (isFirstRun) {
      console.log("✅ First run: baseline saved at desktop size, test passes.");
      return;
    }

    console.log(
      `[Viewport] Desktop vs Tablet mismatch = ${mismatchPercent.toFixed(2)}%`
    );
    if (diffPath) console.log(`[Viewport] Diff image → ${diffPath}`);

    // ✅ Fail if mismatch exceeds threshold
    expect(mismatchPercent).toBeLessThanOrEqual(PASS_THRESHOLD_PERCENT);
  });
});

// ------------------------------
// 🔹 BUTTON HANDLING TESTS
// ------------------------------
test.describe("Visual Regression - Button Component", () => {
  test("Button should match baseline", async ({ page }) => {
    await page.goto("https://demoqa.com/buttons", {
      waitUntil: "domcontentloaded",
    });

    // First capture (baseline check)
    let result = await captureAndCompareComponent(
      page,
      "button#doubleClickBtn",
      "button-component"
    );

    if (result.isFirstRun) {
      test.skip(true, result.status);
    } else {
      // 🔴 Optional: mutate button for demo regression
      await page.evaluate(() => {
       const btn = document.querySelector("#doubleClickBtn");
      if (btn) {
          btn.style.borderRadius = "50%";
      //     btn.style.backgroundColor = "orange";
           btn.textContent = "ROUND BTN";
        }
     });

      // Re-compare after modification
      result = await captureAndCompareComponent(
        page,
        "button#doubleClickBtn",
        "button-component"
      );

      console.log(`[Button] ${result.status}`);

      // ✅ Fail if mismatch exceeds threshold
      expect(result.mismatchPercent).toBeLessThanOrEqual(
        PASS_THRESHOLD_PERCENT
      );
    }
  });
});

// ------------------------------
// 🔹 NETWORK THROTTLING TESTS
// ------------------------------
generateVisualTests(test, expect, PASS_THRESHOLD_PERCENT);

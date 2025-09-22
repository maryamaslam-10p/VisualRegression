import path from "path";
import fs from "fs-extra";

// Centralized directories
export const BASELINE_DIR = path.join(process.cwd(), "visual-baseline");
export const ACTUAL_DIR   = path.join(process.cwd(), "visual-actual");
export const DIFF_DIR     = path.join(process.cwd(), "visual-diff");

// Ensure directories exist
[BASELINE_DIR, ACTUAL_DIR, DIFF_DIR].forEach(dir => {
  fs.ensureDirSync(dir);
});

#!/usr/bin/env bun
/**
 * Test runner script for Notion Exporter
 */

import { spawnSync } from "child_process";

console.log("=".repeat(50));
console.log("Running Notion Exporter Tests");
console.log("=".repeat(50));

// Run tests with Bun
const result = spawnSync("bun", ["test"], {
  stdio: "inherit",
  env: process.env,
});

// Check result
if (result.status !== 0) {
  console.error("Tests failed with status code:", result.status);
  process.exit(1);
}

console.log("=".repeat(50));
console.log("All tests passed successfully!");
console.log("=".repeat(50));

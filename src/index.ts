#!/usr/bin/env bun
/**
 * Notion to Markdown Exporter
 * CLI Interface
 */

import { exportNotionPage } from "./export";

// Parse command line arguments
const args = process.argv.slice(2);
let recursive = false;
let pageId = "";
let destinationDir = "";

// Process --recursive option
if (args.includes("--recursive")) {
  recursive = true;
  const recursiveIndex = args.indexOf("--recursive");
  args.splice(recursiveIndex, 1);
}

// Process required arguments
if (args.length < 2) {
  console.error(
    "Usage: bunx notion-exporter [--recursive] <notion-page-id> <destination-dir>",
  );
  process.exit(1);
}

pageId = args[0];
destinationDir = args[1];

// Check Notion API token
if (!process.env.NOTION_TOKEN) {
  console.error("Error: NOTION_TOKEN environment variable is not set.");
  console.error("Please set it in .env file or export it in your shell.");
  process.exit(1);
}

// Execute export process
console.log("=".repeat(50));
console.log(`Notion to Markdown Exporter`);
console.log("=".repeat(50));
console.log(`Starting export process with the following parameters:`);
console.log(`- Notion Page ID: ${pageId}`);
console.log(`- Destination Directory: ${destinationDir}`);
console.log(`- Recursive Mode: ${recursive ? "Enabled" : "Disabled"}`);
console.log("=".repeat(50));

try {
  console.log(`Initiating export process...`);
  const result = await exportNotionPage(pageId, destinationDir, recursive);

  console.log("\n" + "=".repeat(50));
  console.log(`Export Summary:`);
  console.log(`- Status: ${result.success ? "✅ Success" : "❌ Failed"}`);
  console.log(`- Page ID: ${result.pageId}`);
  console.log(`- Page Title: ${result.pageTitle}`);
  console.log(`- Output File: ${result.path}`);
  console.log("=".repeat(50));

  console.log("\n✨ Export completed successfully!");
  console.log(`You can find your exported Markdown file at: ${result.path}`);

  if (recursive) {
    console.log(`Subpages have been exported to the same directory structure.`);
  }
} catch (error) {
  console.error("\n" + "=".repeat(50));
  console.error("❌ Export process failed!");

  if (error instanceof Error) {
    console.error(`Error message: ${error.message}`);

    // Display stack trace (useful for debugging during development)
    if (process.env.DEBUG) {
      console.error(`Stack trace: ${error.stack}`);
    }
  } else {
    console.error("Unknown error:", error);
  }

  console.error("=".repeat(50));
  console.error("\nTroubleshooting tips:");
  console.error("1. Check if your Notion API token is correct");
  console.error("2. Verify that the page ID exists and is accessible");
  console.error("3. Ensure your integration has access to the page");
  console.error("4. Check network connectivity");
  console.error("\nFor more detailed logs, run with DEBUG=true:");
  console.error(
    "DEBUG=true bunx notion-exporter [--recursive] <notion-page-id> <destination-dir>",
  );

  process.exit(1);
}

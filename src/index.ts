#!/usr/bin/env bun
/**
 * Notion Exporter - CLI Interface
 */

import { parseArgs } from "node:util"
import { version } from "../package.json"
import { exportNotionResource } from "./export"
import { createLogger } from "./utils"

// Create logger for this module
const logger = createLogger("CLI")

/**
 * Display help message
 */
function displayHelp() {
  console.log(`Notion to Markdown Exporter v${version}`)
  console.log("\nUsage:")
  console.log(
    "  bunx @devneko/notion-exporter [options] <notion-resource-id> <destination-dir>",
  )
  console.log("\nArguments:")
  console.log(
    "  <notion-resource-id>  The ID of the Notion page or database to export",
  )
  console.log(
    "  <destination-dir>     Directory where the markdown files will be saved",
  )
  console.log("\nOptions:")
  console.log("  --recursive, -r      Export child pages recursively")
  console.log(
    "  --name, -n           Custom filename for the exported markdown file (pages only)",
  )
  console.log(
    "  --query, -q          Query JSON for database filtering (databases only)",
  )
  console.log("  --help, -h           Show this help message")
  console.log("  --version, -v        Show version number")
  console.log("\nEnvironment Variables:")
  console.log(
    "  NOTION_TOKEN         Your Notion API integration token (required)",
  )
  console.log("  DEBUG=true           Enable debug logging")
  console.log("\nExamples:")
  console.log("  # Export a single page")
  console.log(
    "  NOTION_TOKEN=your_token bunx @devneko/notion-exporter abc123def456 ./output",
  )
  console.log("\n  # Export a page and all its subpages")
  console.log(
    "  NOTION_TOKEN=your_token bunx @devneko/notion-exporter --recursive abc123def456 ./output",
  )
  console.log("\n  # Export with custom filename")
  console.log(
    "  NOTION_TOKEN=your_token bunx @devneko/notion-exporter --name my-custom-name abc123def456 ./output",
  )
  console.log("\n  # Export a database")
  console.log(
    "  NOTION_TOKEN=your_token bunx @devneko/notion-exporter db123456789 ./output",
  )
  console.log("\n  # Export a database with query filter")
  console.log(
    '  NOTION_TOKEN=your_token bunx @devneko/notion-exporter --query \'{"filter":{"property":"Status","status":{"equals":"Done"}}}\' db123456789 ./output',
  )
  console.log(
    "\nNote: Databases are exported to ./output/databases/<db-id>/ with metadata in _meta.md",
  )
}

/**
 * Parse command line arguments using parseArgs
 * @returns Parsed arguments object
 */
function parseArguments() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      recursive: {
        type: "boolean",
        short: "r",
        default: false,
      },
      name: {
        type: "string",
        short: "n",
      },
      query: {
        type: "string",
        short: "q",
      },
      help: {
        type: "boolean",
        short: "h",
      },
      version: {
        type: "boolean",
        short: "v",
      },
    },
    strict: true,
    allowPositionals: true,
  })

  // Handle --help flag
  if (values.help) {
    displayHelp()
    process.exit(0)
  }

  // Handle --version flag
  if (values.version) {
    console.log("0.1.1")
    process.exit(0)
  }

  // Check if we have the required positional arguments
  if (positionals.length < 2) {
    console.error("Error: Missing required arguments\n")
    displayHelp()
    process.exit(1)
  }

  const pageId = positionals[0]
  const destinationDir = positionals[1]
  const recursive = values.recursive || false
  const name = values.name
  const query = values.query

  return { recursive, pageId, destinationDir, name, query }
}

/**
 * Validate environment variables
 */
function validateEnvironment() {
  if (!process.env.NOTION_TOKEN) {
    console.error("Error: NOTION_TOKEN environment variable is not set.")
    console.error("Please set it in .env file or export it in your shell.")
    process.exit(1)
  }
}

/**
 * Display troubleshooting tips
 */
function displayTroubleshootingTips() {
  console.error("\nTroubleshooting tips:")
  console.error("1. Check if your Notion API token is correct")
  console.error("2. Verify that the page ID exists and is accessible")
  console.error("3. Ensure your integration has access to the page")
  console.error("4. Check network connectivity")
  console.error("\nFor more detailed logs, run with DEBUG=true:")
  console.error(
    "DEBUG=true bunx notion-exporter [--recursive] <notion-page-id> <destination-dir>",
  )
}

/**
 * Main function
 */
async function main() {
  try {
    // Parse command line arguments
    const { recursive, pageId, destinationDir, name, query } = parseArguments()

    // Validate environment
    validateEnvironment()

    // Display startup information
    console.log("=".repeat(50))
    console.log("Notion to Markdown Exporter")
    console.log("=".repeat(50))
    console.log("Starting export process with the following parameters:")
    console.log(`- Notion Page ID: ${pageId}`)
    console.log(`- Destination Directory: ${destinationDir}`)
    console.log(`- Recursive Mode: ${recursive ? "Enabled" : "Disabled"}`)
    if (name) {
      console.log(`- Custom Filename: ${name}`)
    }
    if (query) {
      console.log(`- Database Query: ${query}`)
    }
    console.log("=".repeat(50))

    // Execute export process
    logger.log("Initiating export process...")
    const result = await exportNotionResource(
      pageId,
      destinationDir,
      recursive,
      name,
      query,
    )

    // Display export summary based on result type
    if (Array.isArray(result)) {
      // Database export result
      const successCount = result.filter((r) => r.success).length
      const totalCount = result.length

      console.log(`\n${"=".repeat(50)}`)
      console.log("Database Export Summary:")
      console.log(
        `- Status: ${successCount === totalCount ? "✅ All items exported successfully" : `⚠️  ${successCount}/${totalCount} items exported`}`,
      )
      console.log(`- Total Items: ${totalCount}`)
      console.log(`- Successful: ${successCount}`)
      console.log(`- Failed: ${totalCount - successCount}`)
      console.log(`- Output Directory: ${destinationDir}/databases/${pageId}/`)
      console.log("=".repeat(50))

      console.log("\n✨ Database export completed!")
      console.log(
        `Database metadata saved to: ${destinationDir}/databases/${pageId}/_meta.md`,
      )
      console.log(
        `Database items saved to: ${destinationDir}/databases/${pageId}/`,
      )

      if (recursive) {
        console.log(
          "Subpages of database items have been exported to subdirectories.",
        )
      }
    } else {
      // Page export result
      console.log(`\n${"=".repeat(50)}`)
      console.log("Export Summary:")
      console.log(`- Status: ${result.success ? "✅ Success" : "❌ Failed"}`)
      console.log(`- Page ID: ${result.pageId}`)
      console.log(`- Page Title: ${result.pageTitle}`)
      console.log(`- Output File: ${result.path}`)
      console.log("=".repeat(50))

      console.log("\n✨ Export completed successfully!")
      console.log(`You can find your exported Markdown file at: ${result.path}`)

      if (recursive) {
        console.log(
          "Subpages have been exported to the same directory structure.",
        )
      }
    }
  } catch (error) {
    console.error(`\n${"=".repeat(50)}`)
    console.error("❌ Export process failed!")

    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`)

      // Display stack trace (useful for debugging during development)
      if (process.env.DEBUG) {
        console.error(`Stack trace: ${error.stack}`)
      }
    } else {
      console.error("Unknown error:", error)
    }

    console.error("=".repeat(50))
    displayTroubleshootingTips()
    process.exit(1)
  }
}

// Execute main function
main()

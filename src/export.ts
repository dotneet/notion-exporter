/**
 * Notion Exporter - Implementation of export functionality
 */

import * as fs from "node:fs"
import * as path from "node:path"
import { Client } from "@notionhq/client"
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import { convertBlocksToMarkdown } from "./markdown"
import {
  getNotionBlocks,
  getNotionPage,
  getPageTitle,
  getSubpages,
} from "./notion"
import type { ExportResult, NotionAPIError } from "./types"
import { createLogger, ensureDirectoryExists, getSafeFilename } from "./utils"

// Create logger for this module
const logger = createLogger("Export")

/**
 * Export a Notion page
 * @param pageId ID of the Notion page to export
 * @param destinationDir Destination directory
 * @param recursive Whether to recursively export subpages
 * @returns Export result object
 */
export async function exportNotionPage(
  pageId: string,
  destinationDir: string,
  recursive = false,
): Promise<ExportResult> {
  logger.log(`Starting export of Notion page ${pageId}...`)

  // Check Notion API token
  if (!process.env.NOTION_TOKEN) {
    throw new Error(
      "NOTION_TOKEN environment variable is not set. Please set it in .env file.",
    )
  }

  // Initialize Notion API client
  logger.log("Initializing Notion API client...")
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  })

  try {
    // Get page information
    logger.log(`Fetching page information for ${pageId}...`)
    const page = await getNotionPage(notion, pageId)
    logger.log("Page information retrieved successfully.")

    // Get page blocks (content)
    logger.log("Fetching page blocks...")
    const blocks = await getNotionBlocks(notion, pageId)
    logger.log(`Retrieved ${blocks.length} blocks from the page.`)

    // Convert blocks to Markdown
    logger.log("Converting blocks to Markdown...")
    const markdown = await convertBlocksToMarkdown(blocks, destinationDir)
    logger.log("Conversion to Markdown completed.")

    // Create destination directory if it doesn't exist
    logger.log(`Ensuring destination directory exists: ${destinationDir}`)
    ensureDirectoryExists(destinationDir)

    // Get page title (from page properties)
    const pageTitle = getPageTitle(page)
    logger.log(`Page title: "${pageTitle}"`)

    // Generate a safe title for use in filenames
    const safeTitle = getSafeFilename(pageTitle)
    logger.log(`Safe filename: "${safeTitle}"`)

    // Path for the Markdown file
    const markdownFilePath = path.join(destinationDir, `${safeTitle}.md`)
    logger.log(`Writing Markdown to file: ${markdownFilePath}`)

    // Write Markdown to file
    fs.writeFileSync(markdownFilePath, `# ${pageTitle}\n\n${markdown}`)

    logger.log(
      `Successfully exported page "${pageTitle}" to ${markdownFilePath}`,
    )

    // If recursively exporting subpages
    if (recursive) {
      logger.log("Recursive option enabled. Processing subpages...")

      // Directory for subpages
      const subpageDir = path.join(destinationDir, safeTitle)
      logger.log(`Subpage directory: ${subpageDir}`)

      // Get subpages
      logger.log("Fetching subpages...")
      const subpages = await getSubpages(notion, blocks)
      logger.log(`Found ${subpages.length} subpages.`)

      // Export each subpage recursively
      for (let i = 0; i < subpages.length; i++) {
        const subpage = subpages[i]
        logger.log(
          `Processing subpage ${i + 1}/${subpages.length}: ${subpage.title} (${
            subpage.id
          })`,
        )
        await exportNotionPage(subpage.id, subpageDir, true)
      }

      logger.log("All subpages processed successfully.")
    }

    return {
      success: true,
      pageId,
      pageTitle,
      path: markdownFilePath,
    }
  } catch (error) {
    logger.error(`Error exporting page ${pageId}:`)

    if (error instanceof Error) {
      logger.error(`Error message: ${error.message}`)
      logger.error(`Error stack: ${error.stack}`)

      // Display detailed information for Notion API errors
      if ("code" in error) {
        logger.error(`API Error code: ${(error as NotionAPIError).code}`)
      }
      if ("status" in error) {
        logger.error(`API Status: ${(error as NotionAPIError).status}`)
      }
    } else {
      logger.error(`Unknown error: ${String(error)}`)
    }

    throw error
  }
}

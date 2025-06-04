/**
 * Notion Exporter - Implementation of export functionality
 */

import * as fs from "node:fs"
import { Client } from "@notionhq/client"
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import { convertBlocksToMarkdown } from "./markdown"
import {
  getNotionBlocks,
  getNotionPage,
  getPageTitle,
  getSubpages,
} from "./notion"
import type { ExportResult, NotionAPIError, SubpageInfo } from "./types"
import {
  createLogger,
  ensureDirectoryExists,
  getSafeFilename,
  safePathJoin,
} from "./utils"

// Create logger for this module
const logger = createLogger("Export")

/**
 * Class representing a Notion API token error
 */
class NotionTokenError extends Error {
  constructor(
    message = "NOTION_TOKEN environment variable is not set. Please set it in .env file.",
  ) {
    super(message)
    this.name = "NotionTokenError"
  }
}

/**
 * Export a Notion page
 * @param pageId ID of the Notion page to export
 * @param destinationDir Destination directory
 * @param recursive Whether to recursively export subpages
 * @param customFilename Optional custom filename (without extension)
 * @returns Export result object
 */
export async function exportNotionPage(
  pageId: string,
  destinationDir: string,
  recursive = false,
  customFilename?: string,
): Promise<ExportResult> {
  logger.log(`Starting export of Notion page ${pageId}...`)

  // Check Notion API token
  const notionToken = process.env.NOTION_TOKEN
  if (!notionToken) {
    throw new NotionTokenError()
  }

  // Initialize Notion API client
  logger.log("Initializing Notion API client...")
  const notion = new Client({
    auth: notionToken,
  })

  try {
    // Get page information and blocks in parallel
    logger.log(`Fetching page information and blocks for ${pageId}...`)
    const [page, blocks] = await Promise.all([
      getNotionPage(notion, pageId),
      getNotionBlocks(notion, pageId),
    ])

    logger.log("Page information retrieved successfully.")
    logger.log(`Retrieved ${blocks.length} blocks from the page.`)

    // Convert blocks to Markdown
    logger.log("Converting blocks to Markdown...")
    const markdown = await convertBlocksToMarkdown(blocks, destinationDir)
    logger.log("Conversion to Markdown completed.")

    // Create destination directory if it doesn't exist
    logger.log(`Ensuring destination directory exists: ${destinationDir}`)
    const dirCreated = ensureDirectoryExists(destinationDir)
    if (dirCreated) {
      logger.log(`Created directory: ${destinationDir}`)
    }

    // Get page title (from page properties)
    const pageTitle = getPageTitle(page)
    logger.log(`Page title: "${pageTitle}"`)

    // Generate a safe title for use in filenames
    let filename: string
    if (customFilename) {
      // Use custom filename if provided (ensure it's safe)
      filename = getSafeFilename(customFilename)
      logger.log(`Using custom filename: "${filename}"`)
    } else {
      // Use page title as filename
      filename = getSafeFilename(pageTitle)
      logger.log(`Using page title as filename: "${filename}"`)
    }

    // Path for the Markdown file
    const markdownFilePath = safePathJoin(destinationDir, `${filename}.md`)
    logger.log(`Writing Markdown to file: ${markdownFilePath}`)

    // Write Markdown to file
    fs.writeFileSync(markdownFilePath, `# ${pageTitle}\n\n${markdown}`)

    logger.log(
      `Successfully exported page "${pageTitle}" to ${markdownFilePath}`,
    )

    // If recursively exporting subpages
    if (recursive) {
      // Use custom filename for subdirectory if provided, otherwise use page title
      const subdirName = customFilename
        ? getSafeFilename(customFilename)
        : getSafeFilename(pageTitle)
      await processSubpages(notion, blocks, destinationDir, subdirName)
    }

    return {
      success: true,
      pageId,
      pageTitle,
      path: markdownFilePath,
    }
  } catch (error) {
    handleExportError(error, pageId)
    throw error
  }
}

/**
 * Process subpages recursively
 * @param notion Notion client
 * @param blocks Blocks from parent page
 * @param destinationDir Parent destination directory
 * @param parentTitle Safe parent title for subdirectory
 */
async function processSubpages(
  notion: Client,
  blocks: BlockObjectResponse[],
  destinationDir: string,
  parentTitle: string,
): Promise<void> {
  logger.log("Recursive option enabled. Processing subpages...")

  // Directory for subpages
  const subpageDir = safePathJoin(destinationDir, parentTitle)
  logger.log(`Subpage directory: ${subpageDir}`)

  // Get subpages
  logger.log("Fetching subpages...")
  const subpages = await getSubpages(notion, blocks)
  logger.log(`Found ${subpages.length} subpages.`)

  if (subpages.length === 0) {
    logger.log("No subpages to process.")
    return
  }

  // Create subpage directory if it doesn't exist
  const subDirCreated = ensureDirectoryExists(subpageDir)
  if (subDirCreated) {
    logger.log(`Created subpage directory: ${subpageDir}`)
  }

  // Export subpages in parallel with concurrency limit
  await processSubpagesWithConcurrency(subpages, subpageDir)

  logger.log("All subpages processed successfully.")
}

/**
 * Process subpages with concurrency limit
 * @param subpages List of subpages to process
 * @param subpageDir Destination directory for subpages
 * @param concurrencyLimit Maximum number of concurrent exports
 */
async function processSubpagesWithConcurrency(
  subpages: SubpageInfo[],
  subpageDir: string,
  concurrencyLimit = 3,
): Promise<void> {
  const total = subpages.length
  const results: ExportResult[] = []
  const queue = [...subpages]
  const inProgress: Promise<ExportResult>[] = []

  while (queue.length > 0 || inProgress.length > 0) {
    // Fill up to concurrency limit
    while (queue.length > 0 && inProgress.length < concurrencyLimit) {
      const subpage = queue.shift()
      if (!subpage) continue

      const currentIndex = results.length + inProgress.length
      logger.log(
        `Processing subpage ${currentIndex + 1}/${total}: ${subpage.title} (${
          subpage.id
        })`,
      )

      const exportPromise = exportNotionPage(subpage.id, subpageDir, true)
        .then((result) => {
          logger.log(`Completed subpage: ${subpage.title}`)
          return result
        })
        .catch((error) => {
          logger.error(
            `Failed to export subpage ${subpage.title}: ${error.message}`,
          )
          return {
            success: false,
            pageId: subpage.id,
            pageTitle: subpage.title,
            path: "",
          }
        })

      inProgress.push(exportPromise)
    }

    // Wait for at least one promise to complete
    if (inProgress.length > 0) {
      const completedResult = await Promise.race(inProgress)
      results.push(completedResult)

      // Remove the completed promise
      const index = inProgress.findIndex((p) => p.then(() => completedResult))
      if (index !== -1) {
        inProgress.splice(index, 1)
      }
    }
  }

  const successCount = results.filter((r) => r.success).length
  logger.log(
    `Processed ${total} subpages with ${successCount} successes and ${
      total - successCount
    } failures`,
  )
}

/**
 * Handle export errors
 * @param error Error object
 * @param pageId ID of the page being exported
 */
function handleExportError(error: unknown, pageId: string): void {
  logger.error(`Error exporting page ${pageId}:`)

  if (error instanceof Error) {
    logger.error(`Error message: ${error.message}`)
    logger.error(`Error stack: ${error.stack ?? "No stack trace available"}`)

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
}

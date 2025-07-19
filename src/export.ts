/**
 * Notion Exporter - Implementation of export functionality
 */

import * as fs from "node:fs"
import { Client } from "@notionhq/client"
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints"
import { convertBlocksToMarkdown } from "./markdown"
import {
  getChildDatabases,
  getDatabase,
  getNotionBlocks,
  getNotionPage,
  getPageTitle,
  getSubpages,
  isDatabase,
  queryDatabase,
} from "./notion"
import type {
  BlockWithChildrenProperty,
  BlockWithDatabaseContent,
  DatabaseItem,
  DatabaseItemExportResult,
  DatabaseMetadata,
  DatabaseQuery,
  ExportResult,
  NotionAPIError,
  SubpageInfo,
} from "./types"
import {
  type ExportedMetadata,
  createLogger,
  ensureDirectoryExists,
  extractMetadataFromMarkdown,
  getSafeFilename,
  hasPageBeenUpdated,
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
 * Enrich child database blocks with their content
 * @param notion Notion client
 * @param blocks Array of blocks to process
 */
async function enrichChildDatabaseBlocks(
  notion: Client,
  blocks: BlockObjectResponse[],
): Promise<void> {
  for (const block of blocks) {
    if (block.type === "child_database") {
      try {
        logger.log(`Enriching child database block: ${block.id}`)

        // Get database info
        const database = await getDatabase(notion, block.id)

        // Query database items
        const items = await queryDatabase(notion, block.id)

        // Add the data to the block
        const enrichedBlock = block as BlockWithDatabaseContent
        enrichedBlock.database_content = {
          title: database.title,
          properties: database.properties,
          items: items.map((item) => {
            const itemData: DatabaseItem = {
              id: item.id,
              url: item.url,
            }

            // Extract property values
            for (const [key, value] of Object.entries(item.properties)) {
              if (value.type === "title") {
                itemData[key] = value.title.map((t) => t.plain_text).join("")
              } else if (value.type === "rich_text") {
                itemData[key] = value.rich_text
                  .map((t) => t.plain_text)
                  .join("")
              } else if (value.type === "number") {
                itemData[key] = value.number
              } else if (value.type === "select") {
                itemData[key] = value.select?.name
              } else if (value.type === "multi_select") {
                itemData[key] = value.multi_select.map((s) => s.name).join(", ")
              } else if (value.type === "date") {
                itemData[key] = value.date?.start
              } else if (value.type === "checkbox") {
                itemData[key] = value.checkbox
              } else if (value.type === "url") {
                itemData[key] = value.url
              } else if (value.type === "email") {
                itemData[key] = value.email
              } else if (value.type === "phone_number") {
                itemData[key] = value.phone_number
              } else if (value.type === "status") {
                itemData[key] = value.status?.name
              }
            }

            return itemData
          }),
        }

        logger.log(`Enriched database with ${items.length} items`)
      } catch (error) {
        logger.error(`Failed to enrich child database ${block.id}: ${error}`)
      }
    }

    // Process child blocks recursively
    if (block.has_children) {
      const blockWithChildren = block as BlockWithChildrenProperty
      if (blockWithChildren.children) {
        await enrichChildDatabaseBlocks(notion, blockWithChildren.children)
      }
    }
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
    // Get page information first
    logger.log(`Fetching page information for ${pageId}...`)
    const page = await getNotionPage(notion, pageId)
    logger.log("Page information retrieved successfully.")

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

    // Extract metadata from page object
    const currentMetadata: ExportedMetadata = {
      id: page.id,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      url: page.url,
      archived: page.archived,
      in_trash: page.in_trash,
      public_url: page.public_url,
    }

    // Check if file exists and extract existing metadata
    const existingMetadata = extractMetadataFromMarkdown(markdownFilePath)

    // Check if page has been updated
    const needsUpdate = hasPageBeenUpdated(currentMetadata, existingMetadata)

    if (!needsUpdate) {
      logger.log(
        `Page "${pageTitle}" has not been updated since last export. Skipping...`,
      )
      return {
        success: true,
        pageId,
        pageTitle,
        path: markdownFilePath,
      }
    }

    logger.log(`Page "${pageTitle}" has been updated. Processing...`)

    // Get blocks only if update is needed
    logger.log(`Fetching blocks for ${pageId}...`)
    const blocks = await getNotionBlocks(notion, pageId)
    logger.log(`Retrieved ${blocks.length} blocks from the page.`)

    // Convert blocks to Markdown with metadata
    logger.log("Converting blocks to Markdown...")
    // Enrich child database blocks with their content
    await enrichChildDatabaseBlocks(notion, blocks)
    const markdownContent = await convertBlocksToMarkdown(
      blocks,
      destinationDir,
    )
    logger.log("Conversion to Markdown completed.")

    // Create metadata JSON comment
    const metadataComment = `<!-- ** GENERATED_BY_NOTION_EXPORTER **
${JSON.stringify(currentMetadata, null, 2)}
-->`

    // Combine metadata comment, title, and content
    const markdown = `${metadataComment}\n\n# ${pageTitle}\n\n${markdownContent}`

    // Create destination directory if it doesn't exist
    logger.log(`Ensuring destination directory exists: ${destinationDir}`)
    const dirCreated = ensureDirectoryExists(destinationDir)
    if (dirCreated) {
      logger.log(`Created directory: ${destinationDir}`)
    }

    logger.log(`Writing Markdown to file: ${markdownFilePath}`)

    // Write Markdown to file
    fs.writeFileSync(markdownFilePath, markdown)

    logger.log(
      `Successfully exported page "${pageTitle}" to ${markdownFilePath}`,
    )

    // If recursively exporting subpages and child databases
    if (recursive) {
      // Use custom filename for subdirectory if provided, otherwise use page title
      const subdirName = customFilename
        ? getSafeFilename(customFilename)
        : getSafeFilename(pageTitle)
      await processSubpagesAndDatabases(
        notion,
        blocks,
        destinationDir,
        subdirName,
      )
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
 * Process subpages and child databases recursively
 * @param notion Notion client
 * @param blocks Blocks from parent page
 * @param destinationDir Parent destination directory
 * @param parentTitle Safe parent title for subdirectory
 */
async function processSubpagesAndDatabases(
  notion: Client,
  blocks: BlockObjectResponse[],
  destinationDir: string,
  parentTitle: string,
): Promise<void> {
  logger.log(
    "Recursive option enabled. Processing subpages and child databases...",
  )

  // Directory for subpages
  const subpageDir = safePathJoin(destinationDir, parentTitle)
  logger.log(`Subpage directory: ${subpageDir}`)

  // Get subpages
  logger.log("Fetching subpages...")
  const subpages = await getSubpages(notion, blocks)
  logger.log(`Found ${subpages.length} subpages.`)

  // Get child databases
  logger.log("Fetching child databases...")
  const childDatabases = await getChildDatabases(notion, blocks)
  logger.log(`Found ${childDatabases.length} child databases.`)

  if (subpages.length === 0 && childDatabases.length === 0) {
    logger.log("No subpages or child databases to process.")
    return
  }

  // Create subpage directory if it doesn't exist
  if (subpages.length > 0) {
    const subDirCreated = ensureDirectoryExists(subpageDir)
    if (subDirCreated) {
      logger.log(`Created subpage directory: ${subpageDir}`)
    }

    // Export subpages in parallel with concurrency limit
    await processSubpagesWithConcurrency(subpages, subpageDir)
    logger.log("All subpages processed successfully.")
  }

  // Process child databases
  if (childDatabases.length > 0) {
    logger.log("Processing child databases...")

    for (const childDb of childDatabases) {
      try {
        logger.log(`Exporting child database ${childDb.id}...`)
        await exportNotionDatabase(childDb.id, destinationDir, true)
        logger.log(`Successfully exported child database ${childDb.id}`)
      } catch (error) {
        logger.error(
          `Failed to export child database ${childDb.id}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    logger.log("All child databases processed.")
  }
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

/**
 * Export a Notion database
 * @param databaseId ID of the Notion database to export
 * @param destinationDir Destination directory
 * @param recursive Whether to recursively export pages (including their subpages)
 * @returns Array of export results for all database items
 */
export async function exportNotionDatabase(
  databaseId: string,
  destinationDir: string,
  recursive = false,
  query?: DatabaseQuery,
): Promise<DatabaseItemExportResult[]> {
  logger.log(`Starting export of Notion database ${databaseId}...`)

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
    // Get database information
    logger.log(`Fetching database information for ${databaseId}...`)
    const database = await getDatabase(notion, databaseId)
    logger.log(`Database title: "${database.title}"`)

    // Create database directory
    const databaseDir = safePathJoin(
      destinationDir,
      safePathJoin("databases", databaseId),
    )
    logger.log(`Database directory: ${databaseDir}`)
    const dirCreated = ensureDirectoryExists(databaseDir)
    if (dirCreated) {
      logger.log(`Created database directory: ${databaseDir}`)
    }

    // Export database metadata
    await exportDatabaseMetadata(database, databaseDir)

    // Query all pages in the database
    logger.log("Querying pages in database...")
    const pages = await queryDatabase(notion, databaseId, query)
    logger.log(`Found ${pages.length} pages in database`)

    // Export all pages
    const results: DatabaseItemExportResult[] = []
    const total = pages.length

    // Process pages with concurrency limit
    const concurrencyLimit = 3
    const queue = [...pages]
    const inProgress: Promise<DatabaseItemExportResult>[] = []

    while (queue.length > 0 || inProgress.length > 0) {
      // Fill up to concurrency limit
      while (queue.length > 0 && inProgress.length < concurrencyLimit) {
        const page = queue.shift()
        if (!page) continue

        const currentIndex = results.length + inProgress.length
        const pageTitle = getPageTitle(page)
        logger.log(
          `Processing database item ${currentIndex + 1}/${total}: ${pageTitle} (${page.id})`,
        )

        const exportPromise = exportDatabaseItem(
          notion,
          page,
          databaseDir,
          recursive,
        )
          .then((result) => {
            logger.log(`Completed database item: ${pageTitle}`)
            return result
          })
          .catch((error) => {
            logger.error(
              `Failed to export database item ${pageTitle}: ${error.message}`,
            )
            return {
              success: false,
              pageId: page.id,
              pageTitle,
              path: "",
              metadata: {},
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
    logger.log(`Successfully exported ${successCount}/${total} database items`)

    return results
  } catch (error) {
    handleExportError(error, databaseId)
    throw error
  }
}

/**
 * Export database metadata to _meta.md
 * @param database Database metadata
 * @param databaseDir Database directory
 */
async function exportDatabaseMetadata(
  database: DatabaseMetadata,
  databaseDir: string,
): Promise<void> {
  logger.log("Exporting database metadata...")

  const metadataPath = safePathJoin(databaseDir, "_meta.md")

  // Format properties for markdown
  const propertiesMarkdown = Object.entries(database.properties)
    .map(([key, prop]) => `- **${prop.name}** (${prop.type})`)
    .join("\n")

  const metadataContent = `# ${database.title}

${database.description || "No description provided."}

## Database Information

- **ID**: ${database.id}
- **Created**: ${new Date(database.created_time).toLocaleString()}
- **Last Edited**: ${new Date(database.last_edited_time).toLocaleString()}

## Properties

${propertiesMarkdown}

---

*This file contains metadata for the Notion database export.*
`

  fs.writeFileSync(metadataPath, metadataContent)
  logger.log(`Database metadata written to ${metadataPath}`)
}

/**
 * Export a single database item (page)
 * @param notion Notion client
 * @param page Page object from database
 * @param databaseDir Database directory
 * @param recursive Whether to export subpages
 * @returns Export result for the database item
 */
async function exportDatabaseItem(
  notion: Client,
  page: PageObjectResponse,
  databaseDir: string,
  recursive: boolean,
): Promise<DatabaseItemExportResult> {
  try {
    // Get page title
    const pageTitle = getPageTitle(page)
    const filename = getSafeFilename(pageTitle)
    const markdownFilePath = safePathJoin(databaseDir, `${filename}.md`)

    // Extract metadata from page object
    const currentMetadata: ExportedMetadata = {
      id: page.id,
      created_time: page.created_time,
      last_edited_time: page.last_edited_time,
      url: page.url,
      archived: page.archived,
      in_trash: page.in_trash,
      public_url: page.public_url,
    }

    // Extract property values as metadata
    const propertyMetadata: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(page.properties)) {
      if (value.type === "title") {
        propertyMetadata[key] = value.title.map((t) => t.plain_text).join("")
      } else if (value.type === "rich_text") {
        propertyMetadata[key] = value.rich_text
          .map((t) => t.plain_text)
          .join("")
      } else if (value.type === "number") {
        propertyMetadata[key] = value.number
      } else if (value.type === "select") {
        propertyMetadata[key] = value.select?.name
      } else if (value.type === "multi_select") {
        propertyMetadata[key] = value.multi_select.map((s) => s.name)
      } else if (value.type === "date") {
        propertyMetadata[key] = value.date?.start
      } else if (value.type === "checkbox") {
        propertyMetadata[key] = value.checkbox
      } else if (value.type === "url") {
        propertyMetadata[key] = value.url
      } else if (value.type === "email") {
        propertyMetadata[key] = value.email
      } else if (value.type === "phone_number") {
        propertyMetadata[key] = value.phone_number
      } else if (value.type === "status") {
        propertyMetadata[key] = value.status?.name
      }
    }

    // Check if file exists and extract existing metadata
    const existingMetadata = extractMetadataFromMarkdown(markdownFilePath)

    // Check if page has been updated
    const needsUpdate = hasPageBeenUpdated(currentMetadata, existingMetadata)

    if (!needsUpdate) {
      logger.log(
        `Database item "${pageTitle}" has not been updated since last export. Skipping...`,
      )
      return {
        success: true,
        pageId: page.id,
        pageTitle,
        path: markdownFilePath,
        metadata: propertyMetadata,
      }
    }

    logger.log(`Database item "${pageTitle}" has been updated. Processing...`)

    // Get blocks
    logger.log(`Fetching blocks for database item ${page.id}...`)
    const blocks = await getNotionBlocks(notion, page.id)
    logger.log(`Retrieved ${blocks.length} blocks.`)

    // Convert blocks to Markdown
    logger.log("Converting blocks to Markdown...")
    const markdownContent = await convertBlocksToMarkdown(blocks, databaseDir)
    logger.log("Conversion to Markdown completed.")

    // Create metadata JSON comment
    const fullMetadata = {
      ...currentMetadata,
      properties: propertyMetadata,
    }
    const metadataComment = `<!-- ** GENERATED_BY_NOTION_EXPORTER **
${JSON.stringify(fullMetadata, null, 2)}
-->`

    // Format properties for display
    const propertiesDisplay = Object.entries(propertyMetadata)
      .filter(
        ([key, value]) => value !== null && value !== undefined && value !== "",
      )
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `**${key}**: ${value.join(", ")}`
        }
        return `**${key}**: ${value}`
      })
      .join(" | ")

    // Combine metadata comment, title, properties, and content
    const markdown = `${metadataComment}\n\n# ${pageTitle}\n\n${propertiesDisplay ? `${propertiesDisplay}\n\n---\n\n` : ""}${markdownContent}`

    // Write Markdown to file
    logger.log(`Writing Markdown to file: ${markdownFilePath}`)
    fs.writeFileSync(markdownFilePath, markdown)
    logger.log(
      `Successfully exported database item "${pageTitle}" to ${markdownFilePath}`,
    )

    // If recursively exporting subpages
    if (recursive) {
      const subdirName = getSafeFilename(pageTitle)
      await processSubpagesAndDatabases(notion, blocks, databaseDir, subdirName)
    }

    return {
      success: true,
      pageId: page.id,
      pageTitle,
      path: markdownFilePath,
      metadata: propertyMetadata,
    }
  } catch (error) {
    handleExportError(error, page.id)
    throw error
  }
}

/**
 * Export a Notion resource (page or database)
 * @param resourceId ID of the Notion resource to export
 * @param destinationDir Destination directory
 * @param recursive Whether to recursively export
 * @param customFilename Optional custom filename (only for pages)
 * @returns Export result
 */
export async function exportNotionResource(
  resourceId: string,
  destinationDir: string,
  recursive = false,
  customFilename?: string,
  queryString?: string,
): Promise<ExportResult | DatabaseItemExportResult[]> {
  logger.log(`Checking resource type for ${resourceId}...`)

  // Check Notion API token
  const notionToken = process.env.NOTION_TOKEN
  if (!notionToken) {
    throw new NotionTokenError()
  }

  // Initialize Notion API client
  const notion = new Client({
    auth: notionToken,
  })

  try {
    // Check if resource is a database
    const isDb = await isDatabase(notion, resourceId)

    if (isDb) {
      logger.log(`Resource ${resourceId} is a database`)

      // Parse query string if provided
      let query: DatabaseQuery | undefined
      if (queryString) {
        try {
          query = JSON.parse(queryString) as DatabaseQuery
          logger.log(`Parsed database query: ${JSON.stringify(query, null, 2)}`)
        } catch (error) {
          throw new Error(
            `Invalid query JSON: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }

      return await exportNotionDatabase(
        resourceId,
        destinationDir,
        recursive,
        query,
      )
    }
    logger.log(`Resource ${resourceId} is a page`)
    return await exportNotionPage(
      resourceId,
      destinationDir,
      recursive,
      customFilename,
    )
  } catch (error) {
    handleExportError(error, resourceId)
    throw error
  }
}

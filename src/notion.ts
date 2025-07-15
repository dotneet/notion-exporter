/**
 * Notion Exporter - Notion API Integration
 */

import type { Client } from "@notionhq/client"
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  ListBlockChildrenParameters,
  ListBlockChildrenResponse,
  PageObjectResponse,
  QueryDatabaseParameters,
} from "@notionhq/client/build/src/api-endpoints"
import type {
  BlockWithChildren,
  DatabaseMetadata,
  NotionAPIError,
  SubpageInfo,
} from "./types"
import { createLogger } from "./utils"

// Create logger for this module
const logger = createLogger("Notion")

/**
 * Error class for Notion API errors
 */
export class NotionAPIErrorImpl extends Error implements NotionAPIError {
  code: string | undefined
  status: number | undefined

  constructor(message: string, code?: string, status?: number) {
    super(message)
    this.name = "NotionAPIError"
    this.code = code
    this.status = status
  }

  /**
   * Create a NotionAPIError from an unknown error
   */
  static fromError(error: unknown): NotionAPIError {
    if (error instanceof Error) {
      const apiError = new NotionAPIErrorImpl(error.message)

      // Copy properties from original error
      if ("code" in error) {
        apiError.code = (error as { code?: string }).code ?? undefined
      }
      if ("status" in error) {
        apiError.status = (error as { status?: number }).status ?? undefined
      }

      return apiError
    }

    return new NotionAPIErrorImpl(String(error))
  }
}

/**
 * Get Notion page information
 * @param notion Notion API client
 * @param pageId Page ID
 * @returns Page object
 */
export async function getNotionPage(
  notion: Client,
  pageId: string,
): Promise<PageObjectResponse> {
  try {
    logger.log(`Retrieving page with ID ${pageId}...`)
    const response = await notion.pages.retrieve({ page_id: pageId })
    logger.log("Successfully retrieved page data")
    return response as PageObjectResponse
  } catch (error) {
    logger.error(`Failed to retrieve page ${pageId}`)
    const apiError = handleNotionError(error, pageId)
    throw apiError
  }
}

/**
 * Get blocks (content) of a Notion page
 * @param notion Notion API client
 * @param blockId Block ID (usually page ID)
 * @returns Array of blocks with children
 */
export async function getNotionBlocks(
  notion: Client,
  blockId: string,
): Promise<BlockWithChildren[]> {
  const blocks: BlockWithChildren[] = []
  let cursor: string | undefined
  let pageCount = 0

  try {
    logger.log(`Retrieving blocks for ${blockId}...`)

    // Get all blocks using pagination
    do {
      pageCount++
      logger.log(`Fetching page ${pageCount} of blocks...`)

      const params: ListBlockChildrenParameters = {
        block_id: blockId,
      }

      if (cursor) {
        params.start_cursor = cursor
      }

      const response = (await notion.blocks.children.list(
        params,
      )) as ListBlockChildrenResponse

      // Add retrieved blocks
      const newBlocks = response.results as BlockWithChildren[]
      blocks.push(...newBlocks)
      logger.log(
        `Retrieved ${newBlocks.length} blocks (total: ${blocks.length})`,
      )

      // Check if there's a next page
      cursor = response.next_cursor ?? undefined

      if (cursor) {
        logger.log("More blocks available, continuing to next page...")
      }
    } while (cursor)

    // Process nested blocks with children
    await processNestedBlocks(notion, blocks)

    return blocks
  } catch (error) {
    logger.error(`Failed to retrieve blocks for ${blockId}`)
    const apiError = handleNotionError(error, blockId)
    throw apiError
  }
}

/**
 * Process nested blocks with children
 * @param notion Notion API client
 * @param blocks Array of blocks to process
 */
async function processNestedBlocks(
  notion: Client,
  blocks: BlockWithChildren[],
): Promise<void> {
  logger.log("Processing nested blocks...")

  // For blocks with children, recursively get child blocks
  let nestedBlockCount = 0

  // Process blocks with children in batches to avoid too many concurrent requests
  const BATCH_SIZE = 5

  for (let i = 0; i < blocks.length; i += BATCH_SIZE) {
    const batch = blocks.slice(i, i + BATCH_SIZE)
    const promises = batch
      .filter((block) => block.has_children)
      .map(async (block) => {
        nestedBlockCount++
        logger.log(
          `Processing nested block ${nestedBlockCount}: ${block.type} (${block.id})`,
        )

        try {
          const childBlocks = await getNotionBlocks(notion, block.id)

          // Add child block information to parent block
          block.children = childBlocks

          logger.log(
            `Added ${childBlocks.length} child blocks to ${block.type} block`,
          )
        } catch (error) {
          logger.error(
            `Failed to retrieve child blocks for ${block.id}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
          // Continue with other blocks even if one fails
          block.children = []
        }
      })

    // Wait for the current batch to complete before processing the next batch
    await Promise.all(promises)
  }

  logger.log(
    `Successfully retrieved all blocks: ${blocks.length} top-level blocks with ${nestedBlockCount} nested parent blocks`,
  )
}

/**
 * Extract subpages from block array
 * @param notion Notion API client
 * @param blocks Array of blocks
 * @returns Array of subpages
 */
export async function getSubpages(
  notion: Client,
  blocks: BlockObjectResponse[],
): Promise<SubpageInfo[]> {
  logger.log(`Scanning for subpages in ${blocks.length} blocks...`)
  const subpages: SubpageInfo[] = []

  // Scan blocks to find child_page type
  for (const block of blocks) {
    if (block.type === "child_page") {
      logger.log(`Found subpage: "${block.child_page.title}" (${block.id})`)
      subpages.push({
        id: block.id,
        title: block.child_page.title,
      })
    }
  }

  logger.log(`Total subpages found: ${subpages.length}`)
  return subpages
}

/**
 * Extract child databases from block array
 * @param notion Notion API client
 * @param blocks Array of blocks
 * @returns Array of child database info
 */
export async function getChildDatabases(
  notion: Client,
  blocks: BlockObjectResponse[],
): Promise<SubpageInfo[]> {
  logger.log(`Scanning for child databases in ${blocks.length} blocks...`)
  const databases: SubpageInfo[] = []
  // Scan blocks to find child_database type
  for (const block of blocks) {
    if (block.type === "child_database") {
      logger.log(`Found child database: "${block.id}"`)
      databases.push({
        id: block.id,
        title: `Database ${block.id}`, // Child databases don't have titles in the block
      })
    }
  }
  logger.log(`Total child databases found: ${databases.length}`)
  return databases
}

/**
 * Get page title from page properties
 * @param page Notion page object
 * @returns Page title
 */
export function getPageTitle(page: PageObjectResponse): string {
  // Find title property
  const titleProperty = Object.values(page.properties).find(
    (property) => property.type === "title",
  )

  if (titleProperty?.type === "title") {
    const titleText = titleProperty.title
      .map((text) => text.plain_text)
      .join("")

    return titleText || "Untitled"
  }

  return "Untitled"
}

/**
 * Check if a resource is a database
 * @param notion Notion API client
 * @param resourceId Resource ID
 * @returns True if resource is a database
 */
export async function isDatabase(
  notion: Client,
  resourceId: string,
): Promise<boolean> {
  try {
    logger.log(`Checking if ${resourceId} is a database...`)
    await notion.databases.retrieve({ database_id: resourceId })
    logger.log(`${resourceId} is a database`)
    return true
  } catch (error) {
    // If it fails with a specific error, it might be a page
    const apiError = error as { code?: string }
    if (
      apiError.code === "object_not_found" ||
      apiError.code === "validation_error"
    ) {
      logger.log(`${resourceId} is not a database`)
      return false
    }
    // Re-throw other errors
    throw error
  }
}

/**
 * Get database information
 * @param notion Notion API client
 * @param databaseId Database ID
 * @returns Database metadata
 */
export async function getDatabase(
  notion: Client,
  databaseId: string,
): Promise<DatabaseMetadata> {
  try {
    logger.log(`Retrieving database with ID ${databaseId}...`)
    const response = (await notion.databases.retrieve({
      database_id: databaseId,
    })) as DatabaseObjectResponse

    const title = response.title.map((t) => t.plain_text).join("")
    const description =
      response.description?.map((d) => d.plain_text).join("") || undefined

    logger.log(`Successfully retrieved database: ${title}`)

    const metadata: DatabaseMetadata = {
      id: response.id,
      title: title || "Untitled Database",
      created_time: response.created_time,
      last_edited_time: response.last_edited_time,
      properties: response.properties,
    }

    if (description) {
      metadata.description = description
    }

    return metadata
  } catch (error) {
    logger.error(`Failed to retrieve database ${databaseId}`)
    const apiError = handleNotionError(error, databaseId)
    throw apiError
  }
}

/**
 * Query database pages
 * @param notion Notion API client
 * @param databaseId Database ID
 * @returns Array of pages in the database
 */
export async function queryDatabase(
  notion: Client,
  databaseId: string,
): Promise<PageObjectResponse[]> {
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined
  let pageCount = 0

  try {
    logger.log(`Querying database ${databaseId}...`)

    // Get all pages using pagination
    do {
      pageCount++
      logger.log(`Fetching page ${pageCount} of database items...`)

      const params: QueryDatabaseParameters = {
        database_id: databaseId,
      }

      if (cursor) {
        params.start_cursor = cursor
      }

      const response = await notion.databases.query(params)

      // Add retrieved pages
      const newPages = response.results.filter(
        (result): result is PageObjectResponse => result.object === "page",
      )
      pages.push(...newPages)
      logger.log(`Retrieved ${newPages.length} pages (total: ${pages.length})`)

      // Check if there's a next page
      cursor = response.next_cursor ?? undefined

      if (cursor) {
        logger.log("More pages available, continuing to next page...")
      }
    } while (cursor)

    logger.log(`Successfully retrieved ${pages.length} pages from database`)
    return pages
  } catch (error) {
    logger.error(`Failed to query database ${databaseId}`)
    const apiError = handleNotionError(error, databaseId)
    throw apiError
  }
}

/**
 * Handle Notion API errors with detailed messages
 * @param error Error object
 * @param resourceId ID of the resource being accessed
 * @returns Formatted NotionAPIError
 */
function handleNotionError(error: unknown, resourceId: string): NotionAPIError {
  if (error instanceof Error) {
    // Check Notion API error code
    if ("code" in error) {
      const apiError = error as {
        code?: string
        status?: number
        message: string
      }
      const errorCode = apiError.code
      const errorStatus = apiError.status

      // Detailed messages for common error codes
      if (errorCode === "unauthorized") {
        logger.error(
          `Your API token doesn't have access to this resource. Make sure to share the page with your integration.`,
        )
      } else if (errorCode === "object_not_found") {
        logger.error(
          `Resource with ID ${resourceId} not found. Check if the ID is correct.`,
        )
      } else if (errorStatus === 429) {
        logger.error("Rate limit exceeded. Try again later.")
      } else {
        logger.error(`Error Code: ${errorCode}`)
        logger.error(`Error Message: ${apiError.message}`)
      }

      return NotionAPIErrorImpl.fromError(error)
    }

    logger.error(`Error Message: ${error.message}`)
    return new NotionAPIErrorImpl(error.message)
  }

  const errorMessage = `Unknown Error: ${String(error)}`
  logger.error(errorMessage)
  return new NotionAPIErrorImpl(errorMessage)
}

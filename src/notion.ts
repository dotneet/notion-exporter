/**
 * Notion Exporter - Notion API Integration
 */

import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { BlockWithChildren, SubpageInfo } from "./types";
import { createLogger } from "./utils";

// Create logger for this module
const logger = createLogger("Notion");

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
    logger.log(`Retrieving page with ID ${pageId}...`);
    const response = await notion.pages.retrieve({ page_id: pageId });
    logger.log(`Successfully retrieved page data`);
    return response as PageObjectResponse;
  } catch (error) {
    logger.error(`Failed to retrieve page ${pageId}`);

    if (error instanceof Error) {
      // Check Notion API error code
      if ("code" in error) {
        const apiError = error as any;

        // Detailed messages for common error codes
        if (apiError.code === "unauthorized") {
          logger.error(
            `Your API token doesn't have access to this page. Make sure to share the page with your integration.`,
          );
        } else if (apiError.code === "object_not_found") {
          logger.error(
            `Page with ID ${pageId} not found. Check if the ID is correct.`,
          );
        } else if (apiError.status === 429) {
          logger.error(`Rate limit exceeded. Try again later.`);
        } else {
          logger.error(`Error Code: ${apiError.code}`);
          logger.error(`Error Message: ${error.message}`);
        }
      } else {
        logger.error(`Error Message: ${error.message}`);
      }
    } else {
      logger.error(`Unknown Error: ${String(error)}`);
    }

    throw error;
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
  const blocks: BlockWithChildren[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  try {
    logger.log(`Retrieving blocks for ${blockId}...`);

    // Get all blocks using pagination
    do {
      pageCount++;
      logger.log(`Fetching page ${pageCount} of blocks...`);

      const response = (await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      })) as ListBlockChildrenResponse;

      // Add retrieved blocks
      const newBlocks = response.results as BlockWithChildren[];
      blocks.push(...newBlocks);
      logger.log(
        `Retrieved ${newBlocks.length} blocks (total: ${blocks.length})`,
      );

      // Check if there's a next page
      cursor = response.next_cursor || undefined;

      if (cursor) {
        logger.log(`More blocks available, continuing to next page...`);
      }
    } while (cursor);

    logger.log(`Processing nested blocks...`);

    // For blocks with children, recursively get child blocks
    let nestedBlockCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // For block types that have children
      if (block.has_children) {
        nestedBlockCount++;
        logger.log(
          `Processing nested block ${nestedBlockCount}: ${block.type} (${block.id})`,
        );

        const childBlocks = await getNotionBlocks(notion, block.id);

        // Add child block information to parent block
        block.children = childBlocks;

        logger.log(
          `Added ${childBlocks.length} child blocks to ${block.type} block`,
        );
      }
    }

    logger.log(
      `Successfully retrieved all blocks: ${blocks.length} top-level blocks with ${nestedBlockCount} nested parent blocks`,
    );
    return blocks;
  } catch (error) {
    logger.error(`Failed to retrieve blocks for ${blockId}`);

    if (error instanceof Error) {
      logger.error(`Error Message: ${error.message}`);

      // Check Notion API error code
      if ("code" in error) {
        logger.error(`Error Code: ${(error as any).code}`);
      }
    } else {
      logger.error(`Unknown Error: ${String(error)}`);
    }

    throw error;
  }
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
  logger.log(`Scanning for subpages in ${blocks.length} blocks...`);
  const subpages: SubpageInfo[] = [];

  // Scan blocks to find child_page type
  for (const block of blocks) {
    if (block.type === "child_page") {
      logger.log(`Found subpage: "${block.child_page.title}" (${block.id})`);
      subpages.push({
        id: block.id,
        title: block.child_page.title,
      });
    }
  }

  logger.log(`Total subpages found: ${subpages.length}`);
  return subpages;
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
  );

  if (titleProperty?.type === "title") {
    return (
      titleProperty.title.map((text) => text.plain_text).join("") || "Untitled"
    );
  }

  return "Untitled";
}

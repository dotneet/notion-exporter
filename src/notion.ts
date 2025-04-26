/**
 * Notion to Markdown Exporter
 * Notion API Integration
 */

import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  ListBlockChildrenResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";

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
    console.log(`  - API Call: Retrieving page with ID ${pageId}...`);
    const response = await notion.pages.retrieve({ page_id: pageId });
    console.log(`  - API Response: Successfully retrieved page data`);
    return response as PageObjectResponse;
  } catch (error) {
    console.error(`  - API Error: Failed to retrieve page ${pageId}`);

    if (error instanceof Error) {
      // Check Notion API error code
      if ("code" in error) {
        const apiError = error as any;

        // Detailed messages for common error codes
        if (apiError.code === "unauthorized") {
          console.error(
            `  - Error Details: Your API token doesn't have access to this page. Make sure to share the page with your integration.`,
          );
        } else if (apiError.code === "object_not_found") {
          console.error(
            `  - Error Details: Page with ID ${pageId} not found. Check if the ID is correct.`,
          );
        } else if (apiError.status === 429) {
          console.error(
            `  - Error Details: Rate limit exceeded. Try again later.`,
          );
        } else {
          console.error(`  - Error Code: ${apiError.code}`);
          console.error(`  - Error Message: ${error.message}`);
        }
      } else {
        console.error(`  - Error Message: ${error.message}`);
      }
    } else {
      console.error(`  - Unknown Error:`, error);
    }

    throw error;
  }
}

/**
 * Get blocks (content) of a Notion page
 * @param notion Notion API client
 * @param blockId Block ID (usually page ID)
 * @returns Array of blocks
 */
export async function getNotionBlocks(
  notion: Client,
  blockId: string,
): Promise<BlockObjectResponse[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  try {
    console.log(`  - API Call: Retrieving blocks for ${blockId}...`);

    // Get all blocks using pagination
    do {
      pageCount++;
      console.log(`  - Fetching page ${pageCount} of blocks...`);

      const response = (await notion.blocks.children.list({
        block_id: blockId,
        start_cursor: cursor,
      })) as ListBlockChildrenResponse;

      // Add retrieved blocks
      const newBlocks = response.results as BlockObjectResponse[];
      blocks.push(...newBlocks);
      console.log(
        `  - Retrieved ${newBlocks.length} blocks (total: ${blocks.length})`,
      );

      // Check if there's a next page
      cursor = response.next_cursor || undefined;

      if (cursor) {
        console.log(`  - More blocks available, continuing to next page...`);
      }
    } while (cursor);

    console.log(`  - Processing nested blocks...`);

    // For blocks with children, recursively get child blocks
    let nestedBlockCount = 0;
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // For block types that have children
      if (block.has_children) {
        nestedBlockCount++;
        console.log(
          `  - Processing nested block ${nestedBlockCount}: ${block.type} (${block.id})`,
        );

        const childBlocks = await getNotionBlocks(notion, block.id);

        // Add child block information to parent block
        // @ts-ignore - children property is dynamically added
        block.children = childBlocks;

        console.log(
          `  - Added ${childBlocks.length} child blocks to ${block.type} block`,
        );
      }
    }

    console.log(
      `  - Successfully retrieved all blocks: ${blocks.length} top-level blocks with ${nestedBlockCount} nested parent blocks`,
    );
    return blocks;
  } catch (error) {
    console.error(`  - API Error: Failed to retrieve blocks for ${blockId}`);

    if (error instanceof Error) {
      console.error(`  - Error Message: ${error.message}`);

      // Check Notion API error code
      if ("code" in error) {
        console.error(`  - Error Code: ${(error as any).code}`);
      }
    } else {
      console.error(`  - Unknown Error:`, error);
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
): Promise<{ id: string; title: string }[]> {
  console.log(`  - Scanning for subpages in ${blocks.length} blocks...`);
  const subpages: { id: string; title: string }[] = [];

  // Scan blocks to find child_page type
  for (const block of blocks) {
    if (block.type === "child_page") {
      console.log(
        `  - Found subpage: "${block.child_page.title}" (${block.id})`,
      );
      subpages.push({
        id: block.id,
        title: block.child_page.title,
      });
    }
  }

  console.log(`  - Total subpages found: ${subpages.length}`);
  return subpages;
}

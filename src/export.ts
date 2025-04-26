/**
 * Notion to Markdown Exporter
 * Implementation of export functionality
 */

import { Client } from "@notionhq/client";
import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { convertBlocksToMarkdown } from "./markdown";
import { getNotionBlocks, getNotionPage, getSubpages } from "./notion";
import * as fs from "fs";
import * as path from "path";

/**
 * Export a Notion page
 * @param pageId ID of the Notion page to export
 * @param destinationDir Destination directory
 * @param recursive Whether to recursively export subpages
 */
export async function exportNotionPage(
  pageId: string,
  destinationDir: string,
  recursive: boolean = false,
): Promise<{
  success: boolean;
  pageId: string;
  pageTitle: string;
  path: string;
}> {
  console.log(`Starting export of Notion page ${pageId}...`);

  // Check Notion API token
  if (!process.env.NOTION_TOKEN) {
    throw new Error(
      "NOTION_TOKEN environment variable is not set. Please set it in .env file.",
    );
  }

  // Initialize Notion API client
  console.log("Initializing Notion API client...");
  const notion = new Client({
    auth: process.env.NOTION_TOKEN,
  });

  try {
    // Get page information
    console.log(`Fetching page information for ${pageId}...`);
    const page = await getNotionPage(notion, pageId);
    console.log("Page information retrieved successfully.");

    // Get page blocks (content)
    console.log("Fetching page blocks...");
    const blocks = await getNotionBlocks(notion, pageId);
    console.log(`Retrieved ${blocks.length} blocks from the page.`);

    // Convert blocks to Markdown
    console.log("Converting blocks to Markdown...");
    const markdown = await convertBlocksToMarkdown(notion, blocks);
    console.log("Conversion to Markdown completed.");

    // Create destination directory if it doesn't exist
    console.log(`Ensuring destination directory exists: ${destinationDir}`);
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
      console.log(`Created directory: ${destinationDir}`);
    }

    // Get page title (from page properties)
    const pageTitle = getPageTitle(page);
    console.log(`Page title: "${pageTitle}"`);

    // Generate a safe title for use in filenames
    const safeTitle = getSafeFilename(pageTitle);
    console.log(`Safe filename: "${safeTitle}"`);

    // Path for the Markdown file
    const markdownFilePath = path.join(destinationDir, `${safeTitle}.md`);
    console.log(`Writing Markdown to file: ${markdownFilePath}`);

    // Write Markdown to file
    fs.writeFileSync(markdownFilePath, `# ${pageTitle}\n\n${markdown}`);

    console.log(
      `✅ Successfully exported page "${pageTitle}" to ${markdownFilePath}`,
    );

    // If recursively exporting subpages
    if (recursive) {
      console.log("Recursive option enabled. Processing subpages...");

      // Directory for subpages
      const subpageDir = path.join(destinationDir, safeTitle);
      console.log(`Subpage directory: ${subpageDir}`);

      // Get subpages
      console.log("Fetching subpages...");
      const subpages = await getSubpages(notion, blocks);
      console.log(`Found ${subpages.length} subpages.`);

      // Export each subpage recursively
      for (let i = 0; i < subpages.length; i++) {
        const subpage = subpages[i];
        console.log(
          `Processing subpage ${i + 1}/${subpages.length}: ${subpage.title} (${
            subpage.id
          })`,
        );
        await exportNotionPage(subpage.id, subpageDir, true);
      }

      console.log("All subpages processed successfully.");
    }

    return {
      success: true,
      pageId,
      pageTitle: getPageTitle(page),
      path: markdownFilePath,
    };
  } catch (error) {
    console.error(`❌ Error exporting page ${pageId}:`);

    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);

      // Display detailed information for Notion API errors
      if ("code" in error) {
        console.error(`API Error code: ${(error as any).code}`);
      }
      if ("status" in error) {
        console.error(`API Status: ${(error as any).status}`);
      }
    } else {
      console.error("Unknown error:", error);
    }

    throw error;
  }
}

/**
 * Get page title
 * @param page Notion page object
 * @returns Page title
 */
function getPageTitle(page: PageObjectResponse): string {
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

/**
 * Generate a safe string for use in filenames
 * @param title Original title
 * @returns String suitable for filenames
 */
function getSafeFilename(title: string): string {
  if (!title || title === "Untitled") {
    return "Untitled";
  }

  // Replace characters that cannot be used in filenames
  let safeTitle = title
    // Remove characters prohibited in file systems
    .replace(/[\\/:*?"<>|]/g, "")
    // Replace whitespace with underscores
    .replace(/\s+/g, "_")
    // Remove unnecessary characters from the beginning and end
    .replace(/^[.\s]+|[.\s]+$/g, "")
    // Combine consecutive underscores into one
    .replace(/_+/g, "_");

  // Use default value if the string is empty
  if (!safeTitle) {
    return "Untitled";
  }

  // Limit filename length (too long can cause problems in file systems)
  const MAX_FILENAME_LENGTH = 100;
  if (safeTitle.length > MAX_FILENAME_LENGTH) {
    safeTitle = safeTitle.substring(0, MAX_FILENAME_LENGTH);
  }

  return safeTitle;
}

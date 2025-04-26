/**
 * Notion Exporter - Markdown Conversion Functionality
 */

import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { BlockWithChildren } from "./types";
import {
  createLogger,
  downloadImage,
  ensureDirectoryExists,
  getImageExtension,
} from "./utils";

// Create logger for this module
const logger = createLogger("Markdown");

/**
 * Convert Notion blocks to Markdown
 * @param notion Notion API client
 * @param blocks Array of blocks
 * @param destinationDir Destination directory for assets
 * @returns Text in Markdown format
 */
export async function convertBlocksToMarkdown(
  blocks: BlockObjectResponse[],
  destinationDir: string = "",
): Promise<string> {
  logger.log(`Starting conversion of ${blocks.length} blocks to Markdown...`);
  let markdown = "";
  let convertedBlocks = 0;
  let prevBlockType = "";
  let numberedListCounter = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = i < blocks.length - 1 ? blocks[i + 1] : null;
    logger.debug(`Converting block type: ${block.type}`);

    // Reset numbered list counter when not in a numbered list
    if (block.type !== "numbered_list_item") {
      numberedListCounter = 0;
    } else {
      // Increment counter for numbered list items
      if (prevBlockType !== "numbered_list_item") {
        // Start a new numbered list
        numberedListCounter = 1;
      } else {
        // Continue the existing numbered list
        numberedListCounter++;
      }
    }

    // Convert current block
    const blockMarkdown = await convertBlockToMarkdown(
      block,
      destinationDir,
      numberedListCounter,
    );

    // Determine appropriate separator based on block types
    let separator = "\n\n";

    // Special handling for list items and TODOs to avoid extra newlines
    if (isListItem(block.type) && nextBlock && isListItem(nextBlock.type)) {
      separator = "\n";
    }

    markdown += blockMarkdown + separator;
    prevBlockType = block.type;
    convertedBlocks++;

    if (convertedBlocks % 10 === 0) {
      logger.log(`Converted ${convertedBlocks}/${blocks.length} blocks...`);
    }
  }

  logger.log(`Completed conversion of all ${blocks.length} blocks to Markdown`);
  return markdown.trim();
}

/**
 * Check if block type is a list item type
 * @param blockType Type of the block
 * @returns True if the block is a list item
 */
function isListItem(blockType: string): boolean {
  return ["bulleted_list_item", "numbered_list_item", "to_do"].includes(
    blockType,
  );
}

/**
 * Convert a single Notion block to Markdown
 * @param block Block to convert
 * @param destinationDir Destination directory for assets
 * @param numberedListIndex Index for numbered list items
 * @returns Text in Markdown format
 */
async function convertBlockToMarkdown(
  block: BlockObjectResponse,
  destinationDir: string = "",
  numberedListIndex: number = 0,
): Promise<string> {
  const blockHandlers: Record<string, Function> = {
    paragraph: () => convertParagraph(block),
    heading_1: () => convertHeading1(block),
    heading_2: () => convertHeading2(block),
    heading_3: () => convertHeading3(block),
    bulleted_list_item: () => convertBulletedListItem(block),
    numbered_list_item: () => convertNumberedListItem(block, numberedListIndex),
    to_do: () => convertToDo(block),
    toggle: () => convertToggle(block as BlockWithChildren, destinationDir),
    code: () => convertCode(block),
    quote: () => convertQuote(block),
    divider: () => "---",
    callout: () => convertCallout(block),
    image: () => convertImage(block, destinationDir),
    table: () => convertTable(block as BlockWithChildren),
    child_page: () => {
      if (block.type === "child_page") {
        return `[${
          block.child_page.title
        }](https://www.notion.so/${block.id.replace(/-/g, "")})`;
      }
      return "";
    },
    child_database: () => {
      if (block.type === "child_database") {
        return `[Database: ${
          block.id
        }](https://www.notion.so/${block.id.replace(/-/g, "")})`;
      }
      return "";
    },
  };

  const handler = blockHandlers[block.type];
  if (handler) {
    return await handler();
  }

  return `<!-- Unsupported block type: ${block.type} -->`;
}

/**
 * Convert paragraph block
 * @param block Paragraph block
 * @returns Markdown text
 */
function convertParagraph(block: BlockObjectResponse): string {
  if (block.type !== "paragraph") return "";
  return convertRichText(block.paragraph.rich_text);
}

/**
 * Convert heading 1 block
 * @param block Heading 1 block
 * @returns Markdown text
 */
function convertHeading1(block: BlockObjectResponse): string {
  if (block.type !== "heading_1") return "";
  return `# ${convertRichText(block.heading_1.rich_text)}`;
}

/**
 * Convert heading 2 block
 * @param block Heading 2 block
 * @returns Markdown text
 */
function convertHeading2(block: BlockObjectResponse): string {
  if (block.type !== "heading_2") return "";
  return `## ${convertRichText(block.heading_2.rich_text)}`;
}

/**
 * Convert heading 3 block
 * @param block Heading 3 block
 * @returns Markdown text
 */
function convertHeading3(block: BlockObjectResponse): string {
  if (block.type !== "heading_3") return "";
  return `### ${convertRichText(block.heading_3.rich_text)}`;
}

/**
 * Convert bulleted list item block
 * @param block Bulleted list item block
 * @returns Markdown text
 */
function convertBulletedListItem(block: BlockObjectResponse): string {
  if (block.type !== "bulleted_list_item") return "";
  return `- ${convertRichText(block.bulleted_list_item.rich_text)}`;
}

/**
 * Convert numbered list item block
 * @param block Numbered list item block
 * @param index Index for the numbered list item
 * @returns Markdown text
 */
function convertNumberedListItem(
  block: BlockObjectResponse,
  index: number = 1,
): string {
  if (block.type !== "numbered_list_item") return "";
  return `${index}. ${convertRichText(block.numbered_list_item.rich_text)}`;
}

/**
 * Convert ToDo list item block
 * @param block ToDo block
 * @returns Markdown text
 */
function convertToDo(block: BlockObjectResponse): string {
  if (block.type !== "to_do") return "";
  const checkbox = block.to_do.checked ? "[x]" : "[ ]";
  return `- ${checkbox} ${convertRichText(block.to_do.rich_text)}`;
}

/**
 * Convert toggle block
 * @param block Toggle block
 * @param destinationDir Destination directory for assets
 * @returns Markdown text
 */
async function convertToggle(
  block: BlockWithChildren,
  destinationDir: string = "",
): Promise<string> {
  if (block.type !== "toggle") return "";

  const summary = convertRichText(block.toggle.rich_text);

  // If there are child blocks, convert them recursively
  let content = "";
  if (block.has_children && block.children) {
    content = await convertBlocksToMarkdown(block.children, destinationDir);
  }

  // Markdown doesn't directly support toggles, so use details/summary tags
  return `<details>
  <summary>${summary}</summary>
  
  ${content}
</details>`;
}

/**
 * Convert code block
 * @param block Code block
 * @returns Markdown text
 */
function convertCode(block: BlockObjectResponse): string {
  if (block.type !== "code") return "";

  const language = block.code.language || "";
  const code = convertRichText(block.code.rich_text);

  return `\`\`\`${language}
${code}
\`\`\``;
}

/**
 * Convert quote block
 * @param block Quote block
 * @returns Markdown text
 */
function convertQuote(block: BlockObjectResponse): string {
  if (block.type !== "quote") return "";

  const lines = convertRichText(block.quote.rich_text).split("\n");
  return lines.map((line) => `> ${line}`).join("\n");
}

/**
 * Convert callout block
 * @param block Callout block
 * @returns Markdown text
 */
function convertCallout(block: BlockObjectResponse): string {
  if (block.type !== "callout") return "";

  const emoji =
    block.callout.icon?.type === "emoji" ? block.callout.icon.emoji : "";
  const text = convertRichText(block.callout.rich_text);

  return `> ${emoji} **Note**
> 
> ${text}`;
}

/**
 * Convert image block
 * @param block Image block
 * @param destinationDir Destination directory for assets
 * @returns Markdown text
 */
async function convertImage(
  block: BlockObjectResponse,
  destinationDir: string = "",
): Promise<string> {
  if (block.type !== "image") return "";

  let url = "";
  let caption = "";

  if (block.image.type === "external") {
    url = block.image.external.url;
  } else if (block.image.type === "file") {
    url = block.image.file.url;
  }

  if (block.image.caption && block.image.caption.length > 0) {
    caption = convertRichText(block.image.caption);
  }

  // If no destination directory is provided, return the original URL
  if (!destinationDir) {
    return `![${caption}](${url})`;
  }

  try {
    // Create images directory if it doesn't exist
    const imagesDir = path.join(destinationDir, "images");
    ensureDirectoryExists(imagesDir);
    logger.log(`Ensuring images directory exists: ${imagesDir}`);

    // Generate a unique filename based on URL (without query parameters)
    const baseUrl = url.split("?")[0]; // Remove query parameters
    const urlHash = crypto.createHash("md5").update(baseUrl).digest("hex");
    const fileExtension = getImageExtension(url);
    const filename = `image_${urlHash}${fileExtension}`;
    const filePath = path.join(imagesDir, filename);
    const relativeFilePath = path.join("images", filename);

    // Download the image if it doesn't exist
    if (!fs.existsSync(filePath)) {
      logger.log(`Downloading image from ${url}`);
      await downloadImage(url, filePath);
      logger.log(`Image saved to ${filePath}`);
    } else {
      logger.log(`Image already exists at ${filePath}`);
    }

    // Return markdown with local image reference
    return `![${caption}](${relativeFilePath.replace(/\\/g, "/")})`;
  } catch (error) {
    logger.error(
      `Error downloading image: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    // Fallback to original URL if download fails
    return `![${caption}](${url})`;
  }
}

/**
 * Convert table block
 * @param notion Notion API client
 * @param block Table block
 * @param destinationDir Destination directory for assets
 * @returns Markdown text
 */
async function convertTable(block: BlockWithChildren): Promise<string> {
  if (block.type !== "table") return "";

  // Get table row and column counts
  const hasRowHeader = block.table.has_row_header;
  const hasColumnHeader = block.table.has_column_header;

  // Get table child blocks (rows)
  const rows = block.children || [];

  if (rows.length === 0) {
    return "<!-- Empty table -->";
  }

  let markdown = "";
  let firstRow = true;

  for (const row of rows) {
    if (row.type !== "table_row") continue;

    const cells = row.table_row.cells.map((cell) => {
      // Convert rich text in cells
      return convertRichText(cell);
    });

    // Convert row to Markdown table format
    markdown += `| ${cells.join(" | ")} |\n`;

    // Add header separator line after first row
    if (firstRow && hasColumnHeader) {
      markdown += `| ${cells.map(() => "---").join(" | ")} |\n`;
      firstRow = false;
    }
  }

  return markdown;
}

/**
 * Convert rich text
 * @param richText Array of rich text
 * @returns Plain text (Markdown format)
 */
function convertRichText(richText: any[]): string {
  if (!richText || richText.length === 0) {
    return "";
  }

  return richText
    .map((text) => {
      let content = text.plain_text || "";

      // Apply text formatting
      if (text.annotations) {
        if (text.annotations.bold) {
          content = `**${content}**`;
        }

        if (text.annotations.italic) {
          content = `*${content}*`;
        }

        if (text.annotations.strikethrough) {
          content = `~~${content}~~`;
        }

        if (text.annotations.code) {
          content = `\`${content}\``;
        }

        // Underline is not directly supported in Markdown, so use HTML tags
        if (text.annotations.underline) {
          content = `<u>${content}</u>`;
        }
      }

      // For links
      if (text.href) {
        content = `[${content}](${text.href})`;
      }

      return content;
    })
    .join("");
}

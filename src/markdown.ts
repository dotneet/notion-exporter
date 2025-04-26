/**
 * Notion to Markdown Exporter
 * Markdown conversion functionality
 */

import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import * as https from "https";

/**
 * Convert Notion blocks to Markdown
 * @param notion Notion API client
 * @param blocks Array of blocks
 * @returns Text in Markdown format
 */
export async function convertBlocksToMarkdown(
  notion: Client,
  blocks: BlockObjectResponse[],
  destinationDir: string = "",
): Promise<string> {
  console.log(
    `  - Starting conversion of ${blocks.length} blocks to Markdown...`,
  );
  let markdown = "";
  let convertedBlocks = 0;
  let prevBlockType = "";
  let numberedListCounter = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const nextBlock = i < blocks.length - 1 ? blocks[i + 1] : null;
    console.log(`  - Converting block type: ${block.type}`);

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
      notion,
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
      console.log(
        `  - Converted ${convertedBlocks}/${blocks.length} blocks...`,
      );
    }
  }

  console.log(
    `  - Completed conversion of all ${blocks.length} blocks to Markdown`,
  );
  return markdown.trim();
}

/**
 * Check if block type is a list item type
 */
function isListItem(blockType: string): boolean {
  return ["bulleted_list_item", "numbered_list_item", "to_do"].includes(
    blockType,
  );
}

/**
 * Convert a single Notion block to Markdown
 * @param notion Notion API client
 * @param block Block to convert
 * @returns Text in Markdown format
 */
async function convertBlockToMarkdown(
  notion: Client,
  block: BlockObjectResponse,
  destinationDir: string = "",
  numberedListIndex: number = 0,
): Promise<string> {
  switch (block.type) {
    case "paragraph":
      return convertParagraph(block);

    case "heading_1":
      return convertHeading1(block);

    case "heading_2":
      return convertHeading2(block);

    case "heading_3":
      return convertHeading3(block);

    case "bulleted_list_item":
      return convertBulletedListItem(block);

    case "numbered_list_item":
      return convertNumberedListItem(block, numberedListIndex);

    case "to_do":
      return convertToDo(block);

    case "toggle":
      return await convertToggle(notion, block, destinationDir);

    case "code":
      return convertCode(block);

    case "quote":
      return convertQuote(block);

    case "divider":
      return "---";

    case "callout":
      return convertCallout(block);

    case "image":
      return await convertImage(block, destinationDir);

    case "table":
      return await convertTable(notion, block, destinationDir);

    case "child_page":
      return `[${
        block.child_page.title
      }](https://www.notion.so/${block.id.replace(/-/g, "")})`;

    case "child_database":
      return `[Database: ${block.id}](https://www.notion.so/${block.id.replace(
        /-/g,
        "",
      )})`;

    default:
      return `<!-- Unsupported block type: ${block.type} -->`;
  }
}

/**
 * Convert paragraph block
 */
function convertParagraph(block: BlockObjectResponse): string {
  if (block.type !== "paragraph") return "";

  return convertRichText(block.paragraph.rich_text);
}

/**
 * Convert heading 1
 */
function convertHeading1(block: BlockObjectResponse): string {
  if (block.type !== "heading_1") return "";

  return `# ${convertRichText(block.heading_1.rich_text)}`;
}

/**
 * Convert heading 2
 */
function convertHeading2(block: BlockObjectResponse): string {
  if (block.type !== "heading_2") return "";

  return `## ${convertRichText(block.heading_2.rich_text)}`;
}

/**
 * Convert heading 3
 */
function convertHeading3(block: BlockObjectResponse): string {
  if (block.type !== "heading_3") return "";

  return `### ${convertRichText(block.heading_3.rich_text)}`;
}

/**
 * Convert bulleted list item
 */
function convertBulletedListItem(block: BlockObjectResponse): string {
  if (block.type !== "bulleted_list_item") return "";

  return `- ${convertRichText(block.bulleted_list_item.rich_text)}`;
}

/**
 * Convert numbered list item
 */
function convertNumberedListItem(
  block: BlockObjectResponse,
  index: number = 1,
): string {
  if (block.type !== "numbered_list_item") return "";

  return `${index}. ${convertRichText(block.numbered_list_item.rich_text)}`;
}

/**
 * Convert ToDo list item
 */
function convertToDo(block: BlockObjectResponse): string {
  if (block.type !== "to_do") return "";

  const checkbox = block.to_do.checked ? "[x]" : "[ ]";
  return `- ${checkbox} ${convertRichText(block.to_do.rich_text)}`;
}

/**
 * Convert toggle block
 */
async function convertToggle(
  notion: Client,
  block: BlockObjectResponse,
  destinationDir: string = "",
): Promise<string> {
  if (block.type !== "toggle") return "";

  const summary = convertRichText(block.toggle.rich_text);

  // If there are child blocks, convert them recursively
  let content = "";
  if (block.has_children) {
    // @ts-ignore - children property is dynamically added
    const children = (block as any).children;
    if (children) {
      content = await convertBlocksToMarkdown(notion, children, destinationDir);
    }
  }

  // Markdown doesn't directly support toggles, so use details/summary tags
  return `<details>
  <summary>${summary}</summary>
  
  ${content}
</details>`;
}

/**
 * Convert code block
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
 */
function convertQuote(block: BlockObjectResponse): string {
  if (block.type !== "quote") return "";

  const lines = convertRichText(block.quote.rich_text).split("\n");
  return lines.map((line) => `> ${line}`).join("\n");
}

/**
 * Convert callout block
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
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
      console.log(`  - Created images directory: ${imagesDir}`);
    }

    // Generate a unique filename based on URL (without query parameters)
    const baseUrl = url.split("?")[0]; // Remove query parameters
    const urlHash = crypto.createHash("md5").update(baseUrl).digest("hex");
    const fileExtension = getImageExtension(url);
    const filename = `image_${urlHash}${fileExtension}`;
    const filePath = path.join(imagesDir, filename);
    const relativeFilePath = path.join("images", filename);

    // Download the image if it doesn't exist
    if (!fs.existsSync(filePath)) {
      console.log(`  - Downloading image from ${url}`);
      await downloadImage(url, filePath);
      console.log(`  - Image saved to ${filePath}`);
    } else {
      console.log(`  - Image already exists at ${filePath}`);
    }

    // Return markdown with local image reference
    return `![${caption}](${relativeFilePath.replace(/\\/g, "/")})`;
  } catch (error) {
    console.error(
      `  - Error downloading image: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    // Fallback to original URL if download fails
    return `![${caption}](${url})`;
  }
}

/**
 * Download an image from a URL and save it to a file
 */
function downloadImage(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        // Check if response is successful
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download image: ${response.statusCode} ${response.statusMessage}`,
            ),
          );
          return;
        }

        // Create write stream
        const fileStream = fs.createWriteStream(filePath);

        // Pipe response to file
        response.pipe(fileStream);

        // Handle events
        fileStream.on("finish", () => {
          fileStream.close();
          resolve();
        });

        fileStream.on("error", (err) => {
          fs.unlink(filePath, () => {}); // Delete file if error occurs
          reject(err);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

/**
 * Get image file extension from URL
 */
function getImageExtension(url: string): string {
  // Try to extract extension from URL
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  if (match && match[1]) {
    const ext = match[1].toLowerCase();
    // Check if it's a common image extension
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return `.${ext}`;
    }
  }

  // Default to .jpg if extension can't be determined
  return ".jpg";
}

/**
 * Convert table block
 */
async function convertTable(
  notion: Client,
  block: BlockObjectResponse,
  destinationDir: string = "",
): Promise<string> {
  if (block.type !== "table") return "";

  // Get table row and column counts
  const rowCount = block.table.has_row_header
    ? block.table.has_row_header
    : false;
  const colCount = block.table.has_column_header
    ? block.table.has_column_header
    : false;

  // Get table child blocks (rows)
  let rows: BlockObjectResponse[] = [];
  // children property is dynamically added
  const children = (block as any).children;
  if (children) {
    rows = children;
  }

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
    if (firstRow && colCount) {
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

/**
 * Notion to Markdown Exporter
 * Markdown conversion functionality
 */

import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import * as fs from "fs";
import * as path from "path";

/**
 * Convert Notion blocks to Markdown
 * @param notion Notion API client
 * @param blocks Array of blocks
 * @returns Text in Markdown format
 */
export async function convertBlocksToMarkdown(
  notion: Client,
  blocks: BlockObjectResponse[],
): Promise<string> {
  console.log(
    `  - Starting conversion of ${blocks.length} blocks to Markdown...`,
  );
  let markdown = "";
  let convertedBlocks = 0;

  for (const block of blocks) {
    console.log(`  - Converting block type: ${block.type}`);
    markdown += await convertBlockToMarkdown(notion, block);
    markdown += "\n\n";
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
 * Convert a single Notion block to Markdown
 * @param notion Notion API client
 * @param block Block to convert
 * @returns Text in Markdown format
 */
async function convertBlockToMarkdown(
  notion: Client,
  block: BlockObjectResponse,
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
      return convertNumberedListItem(block);

    case "to_do":
      return convertToDo(block);

    case "toggle":
      return await convertToggle(notion, block);

    case "code":
      return convertCode(block);

    case "quote":
      return convertQuote(block);

    case "divider":
      return "---";

    case "callout":
      return convertCallout(block);

    case "image":
      return convertImage(block);

    case "table":
      return await convertTable(notion, block);

    case "child_page":
      return `[${block.child_page.title}](${block.id}.md)`;

    case "child_database":
      return `[Database: ${block.id}](${block.id}.md)`;

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
function convertNumberedListItem(block: BlockObjectResponse): string {
  if (block.type !== "numbered_list_item") return "";

  return `1. ${convertRichText(block.numbered_list_item.rich_text)}`;
}

/**
 * Convert ToDo list item
 */
function convertToDo(block: BlockObjectResponse): string {
  if (block.type !== "to_do") return "";

  const checkbox = block.to_do.checked ? "[x]" : "[ ]";
  return `${checkbox} ${convertRichText(block.to_do.rich_text)}`;
}

/**
 * Convert toggle block
 */
async function convertToggle(
  notion: Client,
  block: BlockObjectResponse,
): Promise<string> {
  if (block.type !== "toggle") return "";

  const summary = convertRichText(block.toggle.rich_text);

  // If there are child blocks, convert them recursively
  let content = "";
  if (block.has_children) {
    // @ts-ignore - children property is dynamically added
    if (block.children) {
      // @ts-ignore
      content = await convertBlocksToMarkdown(notion, block.children);
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
function convertImage(block: BlockObjectResponse): string {
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

  return `![${caption}](${url})`;
}

/**
 * Convert table block
 */
async function convertTable(
  notion: Client,
  block: BlockObjectResponse,
): Promise<string> {
  if (block.type !== "table") return "";

  // テーブルの行数と列数
  const rowCount = block.table.has_row_header
    ? block.table.has_row_header
    : false;
  const colCount = block.table.has_column_header
    ? block.table.has_column_header
    : false;

  // Get table child blocks (rows)
  let rows: BlockObjectResponse[] = [];
  // @ts-ignore - children property is dynamically added
  if (block.children) {
    // @ts-ignore
    rows = block.children;
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

import { expect, test, describe } from "bun:test";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import * as fs from "fs";
import * as path from "path";

// Import the function to test
import { convertBlocksToMarkdown } from "../src/markdown";

describe("Markdown Conversion", () => {
  const TEST_DIR = path.join(process.cwd(), "test", "temp");

  // Setup
  test("setup", () => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  // Test simple paragraph conversion
  test("should convert simple blocks to markdown", async () => {
    // Create a simple paragraph block
    const blocks = [
      {
        id: "block-1",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: "This is a test paragraph", link: null },
              annotations: {
                bold: false,
                italic: false,
                strikethrough: false,
                underline: false,
                code: false,
                color: "default",
              },
              plain_text: "This is a test paragraph",
              href: null,
            },
          ],
          color: "default",
        },
        has_children: false,
      } as BlockObjectResponse,
    ];

    // Convert to markdown
    const markdown = await convertBlocksToMarkdown(blocks, TEST_DIR);

    // Verify
    expect(markdown).toContain("This is a test paragraph");
  });

  // Test cleanup
  test("cleanup", () => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });
});

import { expect, test, describe, mock, beforeEach, afterEach } from "bun:test";
import { Client } from "@notionhq/client";
import { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { convertBlocksToMarkdown } from "../src/markdown";
import * as fs from "fs";
import * as path from "path";
import { BlockWithChildren } from "../src/types";

describe("Markdown Conversion", () => {
  const TEST_DIR = path.join(process.cwd(), "test", "temp");

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Setup local mocks for each test
    mock.module("../src/utils", () => {
      return {
        downloadImage: mock(() => Promise.resolve()),
        ensureDirectoryExists: mock(() => true),
      };
    });
  });

  afterEach(() => {
    // Restore mocks after each test
    mock.restore();
  });

  describe("convertBlocksToMarkdown", () => {
    test("should convert paragraph blocks", async () => {
      // Mock paragraph block
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "This is a paragraph", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "This is a paragraph",
                href: null,
              },
            ],
          },
          has_children: false,
        },
      ];

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as BlockObjectResponse[],
        TEST_DIR,
      );

      // Verify
      expect(result).toContain("This is a paragraph");
    });

    test("should convert heading blocks", async () => {
      // Mock heading blocks
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: "Heading 1", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Heading 1",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-2",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: { content: "Heading 2", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Heading 2",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-3",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: { content: "Heading 3", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Heading 3",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
      ];

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as BlockObjectResponse[],
        TEST_DIR,
      );

      // Verify
      expect(result).toContain("# Heading 1");
      expect(result).toContain("## Heading 2");
      expect(result).toContain("### Heading 3");
    });

    test("should convert list items", async () => {
      // Mock list blocks
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [
              {
                type: "text",
                text: { content: "Bullet item", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Bullet item",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-2",
          type: "numbered_list_item",
          numbered_list_item: {
            rich_text: [
              {
                type: "text",
                text: { content: "Numbered item", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Numbered item",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-3",
          type: "to_do",
          to_do: {
            rich_text: [
              {
                type: "text",
                text: { content: "Todo item", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Todo item",
                href: null,
              },
            ],
            checked: true,
            color: "default",
          },
          has_children: false,
        },
      ];

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as BlockObjectResponse[],
        TEST_DIR,
      );

      // Verify
      expect(result).toContain("- Bullet item");
      expect(result).toContain("1. Numbered item");
      expect(result).toContain("- [x] Todo item");
    });

    test("should convert code blocks", async () => {
      // Mock code block
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "code",
          code: {
            rich_text: [
              {
                type: "text",
                text: { content: "console.log('Hello World');", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "console.log('Hello World');",
                href: null,
              },
            ],
            language: "javascript",
            caption: [],
          },
          has_children: false,
        },
      ];

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as BlockObjectResponse[],
        TEST_DIR,
      );

      // Verify
      expect(result).toContain("```javascript");
      expect(result).toContain("console.log('Hello World');");
      expect(result).toContain("```");
    });

    test("should handle rich text formatting", async () => {
      // Mock paragraph with formatted text
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Bold", link: null },
                annotations: {
                  bold: true,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Bold",
                href: null,
              },
              {
                type: "text",
                text: { content: " and ", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: " and ",
                href: null,
              },
              {
                type: "text",
                text: { content: "italic", link: null },
                annotations: {
                  bold: false,
                  italic: true,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "italic",
                href: null,
              },
              {
                type: "text",
                text: { content: " and ", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: " and ",
                href: null,
              },
              {
                type: "text",
                text: { content: "code", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: true,
                  color: "default",
                },
                plain_text: "code",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
      ];

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as BlockObjectResponse[],
        TEST_DIR,
      );

      // Verify
      expect(result).toContain("**Bold** and *italic* and `code`");
    });
  });
});

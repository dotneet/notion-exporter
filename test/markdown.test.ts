import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints"
import { convertBlocksToMarkdown } from "../src/markdown"
import type { BlockWithChildren } from "../src/types"

describe("Markdown Conversion", () => {
  const TEST_DIR = path.join(process.cwd(), "test", "temp")

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true })
    }

    // Setup local mocks for each test
    mock.module("../src/utils", () => {
      return {
        downloadImage: mock(() => Promise.resolve()),
      }
    })
  })

  afterEach(() => {
    // Restore mocks after each test
    mock.restore()
  })

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
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain("This is a paragraph")
    })

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
            is_toggleable: false,
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
            is_toggleable: false,
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
            is_toggleable: false,
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain("# Heading 1")
      expect(result).toContain("## Heading 2")
      expect(result).toContain("### Heading 3")
    })

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
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain("- Bullet item")
      expect(result).toContain("1. Numbered item")
      expect(result).toContain("- [x] Todo item")
    })

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
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain("```javascript")
      expect(result).toContain("console.log('Hello World');")
      expect(result).toContain("```")
    })

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
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain("**Bold** and *italic* and `code`")
    })

    test("should convert link preview blocks", async () => {
      // Mock link preview block
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "link_preview",
          link_preview: {
            url: "https://github.com/example/example-repo/pull/1234",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify
      expect(result).toContain(
        "https://github.com/example/example-repo/pull/1234",
      )
    })

    test("should convert table of contents block", async () => {
      // Mock blocks with headings and table of contents
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: "Introduction", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Introduction",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
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
                text: { content: "Getting Started", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Getting Started",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
        {
          id: "block-3",
          type: "table_of_contents",
          table_of_contents: {
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-4",
          type: "heading_3",
          heading_3: {
            rich_text: [
              {
                type: "text",
                text: { content: "Installation", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Installation",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify table of contents generation
      expect(result).toContain("- [Introduction](#Introduction)")
      expect(result).toContain("  - [Getting Started](#Getting-Started)")
      expect(result).toContain("    - [Installation](#Installation)")
    })

    test("should handle empty table of contents", async () => {
      // Mock table of contents block without any headings
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: { content: "Some content", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Some content",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
        {
          id: "block-2",
          type: "table_of_contents",
          table_of_contents: {
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify empty table of contents handling
      expect(result).toContain(
        "<!-- No headings found for table of contents -->",
      )
    })

    test("should create proper anchor links for table of contents", async () => {
      // Mock blocks with special characters in headings
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: "API & Configuration", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "API & Configuration",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
        {
          id: "block-2",
          type: "table_of_contents",
          table_of_contents: {
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify anchor link normalization
      expect(result).toContain("- [API & Configuration](#API-&-Configuration)")
    })

    test("should handle parentheses in anchor links", async () => {
      // Mock blocks with parentheses in headings
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: "API Reference (v2.0)", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "API Reference (v2.0)",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
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
                text: { content: "設定項目 (基本)", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "設定項目 (基本)",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
        {
          id: "block-3",
          type: "table_of_contents",
          table_of_contents: {
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify parentheses are converted to hyphens
      expect(result).toContain("- [API Reference (v2.0)](#API-Reference-v2.0-)")
      expect(result).toContain("  - [設定項目 (基本)](#設定項目-基本-)")
    })

    test("should handle hash and quotes in anchor links", async () => {
      // Mock blocks with hash and quotes in headings
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "heading_1",
          heading_1: {
            rich_text: [
              {
                type: "text",
                text: { content: 'Step #1: "Hello World"', link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: 'Step #1: "Hello World"',
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
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
                text: { content: "機能 #2: 'テスト'", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "機能 #2: 'テスト'",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
        {
          id: "block-3",
          type: "table_of_contents",
          table_of_contents: {
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify hash and quotes are converted to hyphens
      expect(result).toContain(
        '- [Step #1: "Hello World"](#Step-1-Hello-World-)',
      )
      expect(result).toContain("  - [機能 #2: 'テスト'](#機能-2-テスト-)")
    })

    test("should convert column_list blocks", async () => {
      // Mock column_list block with two columns
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "column-list-1",
          type: "column_list",
          column_list: {},
          has_children: true,
          children: [
            {
              id: "column-1",
              type: "column",
              column: {},
              has_children: true,
              children: [
                {
                  id: "para-1",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Left column content", link: null },
                        annotations: {
                          bold: false,
                          italic: false,
                          strikethrough: false,
                          underline: false,
                          code: false,
                          color: "default",
                        },
                        plain_text: "Left column content",
                        href: null,
                      },
                    ],
                    color: "default",
                  },
                  has_children: false,
                },
              ],
            },
            {
              id: "column-2",
              type: "column",
              column: {},
              has_children: true,
              children: [
                {
                  id: "para-2",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Right column content", link: null },
                        annotations: {
                          bold: false,
                          italic: false,
                          strikethrough: false,
                          underline: false,
                          code: false,
                          color: "default",
                        },
                        plain_text: "Right column content",
                        href: null,
                      },
                    ],
                    color: "default",
                  },
                  has_children: false,
                },
              ],
            },
          ],
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify column structure and content
      expect(result).toContain('<div style="display: flex; gap: 20px;">')
      expect(result).toContain('<div style="flex: 1;">')
      expect(result).toContain("Left column content")
      expect(result).toContain("Right column content")
      expect(result).toContain("</div>")
    })

    test("should handle empty column_list", async () => {
      // Mock empty column_list block
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "column-list-1",
          type: "column_list",
          column_list: {},
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify empty column_list handling
      expect(result).toContain('<div style="display: flex; gap: 20px;">')
      expect(result).toContain("</div>")
    })

    test("should handle column with multiple blocks", async () => {
      // Mock column with multiple child blocks
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "column-list-1",
          type: "column_list",
          column_list: {},
          has_children: true,
          children: [
            {
              id: "column-1",
              type: "column",
              column: {},
              has_children: true,
              children: [
                {
                  id: "heading-1",
                  type: "heading_2",
                  heading_2: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Column Title", link: null },
                        annotations: {
                          bold: false,
                          italic: false,
                          strikethrough: false,
                          underline: false,
                          code: false,
                          color: "default",
                        },
                        plain_text: "Column Title",
                        href: null,
                      },
                    ],
                    color: "default",
                    is_toggleable: false,
                  },
                  has_children: false,
                },
                {
                  id: "para-1",
                  type: "paragraph",
                  paragraph: {
                    rich_text: [
                      {
                        type: "text",
                        text: { content: "Column paragraph", link: null },
                        annotations: {
                          bold: false,
                          italic: false,
                          strikethrough: false,
                          underline: false,
                          code: false,
                          color: "default",
                        },
                        plain_text: "Column paragraph",
                        href: null,
                      },
                    ],
                    color: "default",
                  },
                  has_children: false,
                },
              ],
            },
          ],
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify multiple blocks within column
      expect(result).toContain("## Column Title")
      expect(result).toContain("Column paragraph")
      expect(result).toContain('<div style="flex: 1;">')
    })

    test("should convert toggle blocks with children", async () => {
      // Mock toggle block with children
      const mockBlocks = [
        {
          id: "toggle-1",
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Click to expand", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Click to expand",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: true,
          children: [
            {
              id: "child-1",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "This content is inside the toggle",
                      link: null,
                    },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default",
                    },
                    plain_text: "This content is inside the toggle",
                    href: null,
                  },
                ],
                color: "default",
              },
              has_children: false,
            },
            {
              id: "child-2",
              type: "bulleted_list_item",
              bulleted_list_item: {
                rich_text: [
                  {
                    type: "text",
                    text: { content: "Bullet point inside toggle", link: null },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default",
                    },
                    plain_text: "Bullet point inside toggle",
                    href: null,
                  },
                ],
                color: "default",
              },
              has_children: false,
            },
          ],
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify toggle structure
      expect(result).toContain("<details>")
      expect(result).toContain("<summary>Click to expand</summary>")
      expect(result).toContain("This content is inside the toggle")
      expect(result).toContain("- Bullet point inside toggle")
      expect(result).toContain("</details>")
    })

    test("should convert toggle blocks without children", async () => {
      // Mock toggle block without children
      const mockBlocks = [
        {
          id: "toggle-2",
          type: "toggle",
          toggle: {
            rich_text: [
              {
                type: "text",
                text: { content: "Empty toggle", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Empty toggle",
                href: null,
              },
            ],
            color: "default",
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify empty toggle structure
      expect(result).toContain("<details>")
      expect(result).toContain("<summary>Empty toggle</summary>")
      expect(result).toContain("</details>")
      // Should not contain extra content between summary and closing tag
      const cleanResult = result.replace(/\s+/g, " ").trim()
      expect(cleanResult).toMatch(
        /<summary>Empty toggle<\/summary>\s*<\/details>/,
      )
    })

    test("should convert toggle headings with children", async () => {
      // Mock toggle heading with children
      const mockBlocks = [
        {
          id: "toggle-heading-1",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: { content: "Toggle Heading Example", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Toggle Heading Example",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: true,
          },
          has_children: true,
          children: [
            {
              id: "child-para-1",
              type: "paragraph",
              paragraph: {
                rich_text: [
                  {
                    type: "text",
                    text: {
                      content: "This content is inside the toggle heading",
                      link: null,
                    },
                    annotations: {
                      bold: false,
                      italic: false,
                      strikethrough: false,
                      underline: false,
                      code: false,
                      color: "default",
                    },
                    plain_text: "This content is inside the toggle heading",
                    href: null,
                  },
                ],
                color: "default",
              },
              has_children: false,
            },
          ],
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify toggle heading structure
      expect(result).toContain("<details>")
      expect(result).toContain(
        "<summary><h2>Toggle Heading Example</h2></summary>",
      )
      expect(result).toContain("This content is inside the toggle heading")
      expect(result).toContain("</details>")
    })

    test("should convert regular headings (non-toggle)", async () => {
      // Mock regular heading without toggle
      const mockBlocks = [
        {
          id: "regular-heading-1",
          type: "heading_2",
          heading_2: {
            rich_text: [
              {
                type: "text",
                text: { content: "Regular Heading", link: null },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Regular Heading",
                href: null,
              },
            ],
            color: "default",
            is_toggleable: false,
          },
          has_children: false,
        },
      ]

      // Call function
      const result = await convertBlocksToMarkdown(
        mockBlocks as unknown as BlockObjectResponse[],
        TEST_DIR,
      )

      // Verify regular heading structure
      expect(result).toContain("## Regular Heading")
      expect(result).not.toContain("<details>")
      expect(result).not.toContain("<summary>")
    })
  })
})

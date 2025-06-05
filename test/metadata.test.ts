/**
 * Tests for metadata export functionality
 */

import { describe, expect, it, mock } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import { exportNotionPage } from "../src/export"

// Mock environment
process.env.NOTION_TOKEN = "test-token"

// Mock Notion client
mock.module("@notionhq/client", () => {
  return {
    Client: class MockClient {
      pages = {
        retrieve: async () => ({
          id: "test-page-id",
          url: "https://www.notion.so/test-page-id",
          created_time: "2024-01-01T00:00:00.000Z",
          last_edited_time: "2024-01-02T00:00:00.000Z",
          archived: false,
          in_trash: false,
          public_url: "https://notion.site/test-page-public",
          properties: {
            title: {
              type: "title",
              title: [{ plain_text: "Test Page" }],
            },
          },
        }),
      }
      blocks = {
        children: {
          list: async () => ({
            results: [
              {
                id: "block-1",
                type: "paragraph",
                paragraph: {
                  rich_text: [{ plain_text: "Test content" }],
                },
                has_children: false,
              },
            ],
            next_cursor: null,
          }),
        },
      }
    },
  }
})

describe("Metadata Export", () => {
  it("should include metadata in exported markdown", async () => {
    const tempDir = "./tmp/test-metadata"

    // Clean up before test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }

    // Export the page
    const result = await exportNotionPage("test-page-id", tempDir)

    expect(result.success).toBe(true)

    // Read the exported file (filename will be sanitized)
    const exportedFile = path.join(tempDir, "Test_Page.md")
    const content = fs.readFileSync(exportedFile, "utf-8")

    // Check for metadata comment
    expect(content).toContain("<!-- ** GENERATED_BY_NOTION_EXPORTER **")
    expect(content).toContain('"id": "test-page-id"')
    expect(content).toContain('"url": "https://www.notion.so/test-page-id"')
    expect(content).toContain('"created_time": "2024-01-01T00:00:00.000Z"')
    expect(content).toContain('"last_edited_time": "2024-01-02T00:00:00.000Z"')
    expect(content).toContain('"archived": false')
    expect(content).toContain('"in_trash": false')
    expect(content).toContain(
      '"public_url": "https://notion.site/test-page-public"',
    )
    expect(content).toContain("-->")

    // Check that metadata is at the top
    const lines = content.split("\n")
    expect(lines[0]).toBe("<!-- ** GENERATED_BY_NOTION_EXPORTER **")

    // Clean up after test
    fs.rmSync(tempDir, { recursive: true })
  })
})

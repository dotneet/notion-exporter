/**
 * Tests for skip-if-not-updated functionality
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
          public_url: null,
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

describe("Skip-if-not-updated Feature", () => {
  const tempDir = "./tmp/test-skip-update"
  const exportedFile = path.join(tempDir, "Test_Page.md")

  it("should skip processing if page has not been updated", async () => {
    // Clean up before test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }

    // First export
    const firstResult = await exportNotionPage("test-page-id", tempDir)
    expect(firstResult.success).toBe(true)

    // Read the content after first export
    const firstContent = fs.readFileSync(exportedFile, "utf-8")
    const firstStats = fs.statSync(exportedFile)

    // Wait a bit to ensure file modification time would be different
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Second export (should be skipped)
    const secondResult = await exportNotionPage("test-page-id", tempDir)
    expect(secondResult.success).toBe(true)

    // Check that file was not modified
    const secondStats = fs.statSync(exportedFile)
    expect(secondStats.mtime.getTime()).toBe(firstStats.mtime.getTime())

    // Content should remain the same
    const secondContent = fs.readFileSync(exportedFile, "utf-8")
    expect(secondContent).toBe(firstContent)

    // Clean up after test
    fs.rmSync(tempDir, { recursive: true })
  })

  it("should process if page has been updated", async () => {
    // Clean up before test
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }

    // First export
    await exportNotionPage("test-page-id", tempDir)

    // Mock updated page with new last_edited_time
    mock.module("@notionhq/client", () => {
      return {
        Client: class MockClient {
          pages = {
            retrieve: async () => ({
              id: "test-page-id",
              url: "https://www.notion.so/test-page-id",
              created_time: "2024-01-01T00:00:00.000Z",
              last_edited_time: "2024-01-03T00:00:00.000Z", // Updated time
              archived: false,
              in_trash: false,
              public_url: null,
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
                      rich_text: [{ plain_text: "Updated content" }],
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

    const firstStats = fs.statSync(exportedFile)

    // Wait a bit to ensure file modification time would be different
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Second export (should process due to updated time)
    const result = await exportNotionPage("test-page-id", tempDir)
    expect(result.success).toBe(true)

    // Check that file was modified
    const secondStats = fs.statSync(exportedFile)
    expect(secondStats.mtime.getTime()).toBeGreaterThan(
      firstStats.mtime.getTime(),
    )

    // Check that content includes updated metadata
    const content = fs.readFileSync(exportedFile, "utf-8")
    expect(content).toContain('"last_edited_time": "2024-01-03T00:00:00.000Z"')
    expect(content).toContain("Updated content")

    // Clean up after test
    fs.rmSync(tempDir, { recursive: true })
  })
})

import { beforeEach, describe, expect, test } from "bun:test"
import type { Client } from "@notionhq/client"
import type {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints"
import {
  getNotionBlocks,
  getNotionPage,
  getPageTitle,
  getSubpages,
} from "../src/notion"
import type { NotionAPIError } from "../src/types"

// Create a mock Notion client
const createMockClient = () => {
  return {
    pages: {
      retrieve: () => {},
    },
    blocks: {
      children: {
        list: () => {},
      },
    },
  } as unknown as Client
}

describe("Notion API Integration", () => {
  let notionClient: Client

  beforeEach(() => {
    notionClient = createMockClient()
  })

  describe("getNotionPage", () => {
    test("should retrieve a page successfully", async () => {
      // Mock page data
      const mockPage: Partial<PageObjectResponse> = {
        id: "page-id",
        properties: {
          title: {
            type: "title",
            title: [{ plain_text: "Test Page", type: "text" }],
          },
        },
      }

      // Setup mock
      notionClient.pages.retrieve = () =>
        Promise.resolve(mockPage as PageObjectResponse)

      // Call function
      const result = await getNotionPage(notionClient, "page-id")

      // Verify
      expect(result).toEqual(mockPage)
    })

    test("should handle API errors", async () => {
      // Setup mock to throw error
      const error = new Error("API Error") as NotionAPIError
      error.code = "unauthorized"
      notionClient.pages.retrieve = () => Promise.reject(error)

      // Call function and expect it to throw
      await expect(getNotionPage(notionClient, "page-id")).rejects.toThrow()
    })
  })

  describe("getNotionBlocks", () => {
    test("should retrieve blocks successfully", async () => {
      // Mock block data
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: { rich_text: [] },
          has_children: false,
        },
        {
          id: "block-2",
          type: "heading_1",
          heading_1: { rich_text: [] },
          has_children: true,
        },
      ]

      // For the second call (for block with children)
      const mockChildBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "child-block-1",
          type: "paragraph",
          paragraph: { rich_text: [] },
          has_children: false,
        },
      ]

      // Setup mock for list calls
      let callCount = 0
      notionClient.blocks.children.list = () => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            results: mockBlocks as BlockObjectResponse[],
            next_cursor: null,
          })
        }
        return Promise.resolve({
          results: mockChildBlocks as BlockObjectResponse[],
          next_cursor: null,
        })
      }

      // Call function
      const result = await getNotionBlocks(notionClient, "block-id")

      // Verify
      expect(result.length).toBe(2)
      expect(result[0].id).toBe("block-1")
      expect(result[1].id).toBe("block-2")
    })
  })

  describe("getSubpages", () => {
    test("should extract subpages from blocks", async () => {
      // Mock blocks with subpages
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: { rich_text: [] },
        },
        {
          id: "subpage-1",
          type: "child_page",
          child_page: { title: "Subpage 1" },
        },
        {
          id: "subpage-2",
          type: "child_page",
          child_page: { title: "Subpage 2" },
        },
      ]

      // Call function
      const result = await getSubpages(
        notionClient,
        mockBlocks as BlockObjectResponse[],
      )

      // Verify
      expect(result.length).toBe(2)
      expect(result[0].id).toBe("subpage-1")
      expect(result[0].title).toBe("Subpage 1")
      expect(result[1].id).toBe("subpage-2")
      expect(result[1].title).toBe("Subpage 2")
    })

    test("should return empty array if no subpages", async () => {
      // Mock blocks without subpages
      const mockBlocks: Partial<BlockObjectResponse>[] = [
        {
          id: "block-1",
          type: "paragraph",
          paragraph: { rich_text: [] },
        },
      ]

      // Call function
      const result = await getSubpages(
        notionClient,
        mockBlocks as BlockObjectResponse[],
      )

      // Verify
      expect(result.length).toBe(0)
    })
  })

  describe("getPageTitle", () => {
    test("should extract title from page properties", () => {
      // Mock page with title
      const mockPage = {
        properties: {
          title: {
            type: "title",
            title: [{ plain_text: "Test Page", type: "text" }],
          },
        },
      } as PageObjectResponse

      // Call function
      const result = getPageTitle(mockPage)

      // Verify
      expect(result).toBe("Test Page")
    })

    test("should return 'Untitled' if no title property", () => {
      // Mock page without title
      const mockPage = {
        properties: {},
      } as PageObjectResponse

      // Call function
      const result = getPageTitle(mockPage)

      // Verify
      expect(result).toBe("Untitled")
    })

    test("should return 'Untitled' if title is empty", () => {
      // Mock page with empty title
      const mockPage = {
        properties: {
          title: {
            type: "title",
            title: [],
          },
        },
      } as PageObjectResponse

      // Call function
      const result = getPageTitle(mockPage)

      // Verify
      expect(result).toBe("Untitled")
    })
  })
})

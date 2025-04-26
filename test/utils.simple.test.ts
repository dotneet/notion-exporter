import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import * as fs from "node:fs"
import * as path from "node:path"
import {
  createLogger,
  ensureDirectoryExists,
  getImageExtension,
  getSafeFilename,
} from "../src/utils"

describe("Utils", () => {
  // Test directory for file operations
  const TEST_DIR = path.join(process.cwd(), "test", "temp")

  // Setup and cleanup
  beforeAll(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true })
    }
  })

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  describe("ensureDirectoryExists", () => {
    test("should create directory if it doesn't exist", () => {
      const dirPath = path.join(TEST_DIR, "new-dir")

      // Make sure directory doesn't exist
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true })
      }

      // Test function
      const result = ensureDirectoryExists(dirPath)

      // Verify
      expect(result).toBe(true)
      expect(fs.existsSync(dirPath)).toBe(true)
    })

    test("should return false if directory already exists", () => {
      const dirPath = path.join(TEST_DIR, "existing-dir")

      // Create directory
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath)
      }

      // Test function
      const result = ensureDirectoryExists(dirPath)

      // Verify
      expect(result).toBe(false)
      expect(fs.existsSync(dirPath)).toBe(true)
    })
  })

  describe("getSafeFilename", () => {
    test("should return 'Untitled' for empty or 'Untitled' input", () => {
      expect(getSafeFilename("")).toBe("Untitled")
      expect(getSafeFilename("Untitled")).toBe("Untitled")
    })

    test("should replace invalid characters", () => {
      expect(getSafeFilename("file/with:invalid*chars?")).toBe(
        "filewithinvalidchars",
      )
    })

    test("should replace whitespace with underscores", () => {
      expect(getSafeFilename("file with spaces")).toBe("file_with_spaces")
    })

    test("should limit filename length", () => {
      const longTitle = "a".repeat(200)
      expect(getSafeFilename(longTitle).length).toBe(100)
    })

    test("should combine consecutive underscores", () => {
      expect(getSafeFilename("file__with___underscores")).toBe(
        "file_with_underscores",
      )
    })
  })

  describe("getImageExtension", () => {
    test("should extract extension from URL", () => {
      expect(getImageExtension("https://example.com/image.jpg")).toBe(".jpg")
      expect(
        getImageExtension("https://example.com/image.png?query=param"),
      ).toBe(".png")
    })

    test("should return default extension for URLs without extension", () => {
      expect(getImageExtension("https://example.com/image")).toBe(".jpg")
    })

    test("should return default extension for non-image extensions", () => {
      expect(getImageExtension("https://example.com/file.xyz")).toBe(".jpg")
    })
  })

  describe("createLogger", () => {
    test("should create a logger with the specified prefix", () => {
      // Create logger
      const logger = createLogger("TestPrefix")

      // Verify logger has the expected methods
      expect(typeof logger.log).toBe("function")
      expect(typeof logger.error).toBe("function")
      expect(typeof logger.warn).toBe("function")
      expect(typeof logger.debug).toBe("function")
    })
  })
})

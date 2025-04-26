/**
 * Notion Exporter - Utility Functions
 */

import * as fs from "node:fs"
import * as https from "node:https"
import * as path from "node:path"
import type { ImageDownloadResult, Logger } from "./types"

/**
 * Ensure a directory exists, creating it if necessary
 * @param dirPath Directory path to ensure
 * @returns True if directory was created, false if it already existed
 */
export function ensureDirectoryExists(dirPath: string): boolean {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
    return true
  }
  return false
}

/**
 * Generate a safe string for use in filenames
 * @param title Original title
 * @returns String suitable for filenames
 */
export function getSafeFilename(title: string): string {
  // Check for empty string or "Untitled" first
  if (!title || title.trim() === "" || title === "Untitled") {
    return "Untitled"
  }

  // Replace characters that cannot be used in filenames
  const safeTitle = title
    // Remove characters prohibited in file systems
    .replace(/[/\\:*?"<>|]/g, "")
    // Replace whitespace with underscores
    .replace(/\s+/g, "_")
    // Remove unnecessary characters from the beginning and end
    .replace(/^[.\s]+|[.\s]+$/g, "")
    // Combine consecutive underscores into one
    .replace(/_+/g, "_")

  // Use default value if the string is empty after replacements
  if (!safeTitle || safeTitle.trim() === "") {
    return "Untitled"
  }

  // Limit filename length (too long can cause problems in file systems)
  const MAX_FILENAME_LENGTH = 100
  return safeTitle.length > MAX_FILENAME_LENGTH
    ? safeTitle.substring(0, MAX_FILENAME_LENGTH)
    : safeTitle
}

/**
 * Download an image from a URL and save it to a file
 * @param url URL of the image to download
 * @param filePath Path where the image should be saved
 * @returns Promise that resolves with download result
 */
export async function downloadImage(
  url: string,
  filePath: string,
): Promise<ImageDownloadResult> {
  return new Promise((resolve) => {
    https
      .get(url, (response) => {
        // Check if response is successful
        if (response.statusCode !== 200) {
          const error = new Error(
            `Failed to download image: ${response.statusCode} ${
              response.statusMessage ?? "Unknown error"
            }`,
          )
          resolve({
            success: false,
            path: filePath,
            originalUrl: url,
            error,
          })
          return
        }

        // Create write stream
        const fileStream = fs.createWriteStream(filePath)

        // Pipe response to file
        response.pipe(fileStream)

        // Handle events
        fileStream.on("finish", () => {
          fileStream.close()
          resolve({
            success: true,
            path: filePath,
            originalUrl: url,
          })
        })

        fileStream.on("error", (err) => {
          fs.unlink(filePath, () => {}) // Delete file if error occurs
          resolve({
            success: false,
            path: filePath,
            originalUrl: url,
            error: err,
          })
        })
      })
      .on("error", (err) => {
        resolve({
          success: false,
          path: filePath,
          originalUrl: url,
          error: err,
        })
      })
  })
}

/**
 * Get image file extension from URL
 * @param url URL of the image
 * @returns File extension including the dot (e.g., ".jpg")
 */
export function getImageExtension(url: string): string {
  // Try to extract extension from URL
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  if (match?.[1]) {
    const ext = match[1].toLowerCase()
    // Check if it's a common image extension
    const validExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"]
    if (validExtensions.includes(ext)) {
      return `.${ext}`
    }
  }

  // Default to .jpg if extension can't be determined
  return ".jpg"
}

/**
 * Create a logger with a prefix for better organization of log messages
 * @param prefix Prefix to add to log messages
 * @returns Object with logging methods
 */
export function createLogger(prefix: string): Logger {
  const formatMessage = (message: string): string => `[${prefix}] ${message}`

  return {
    log: (message: string): void => console.log(formatMessage(message)),
    error: (message: string): void => console.error(formatMessage(message)),
    warn: (message: string): void => console.warn(formatMessage(message)),
    debug: (message: string): void => {
      if (process.env.DEBUG === "true") {
        console.debug(formatMessage(message))
      }
    },
  }
}

/**
 * Safely join paths and ensure the result is within the base directory
 * @param baseDir Base directory
 * @param relativePath Relative path to join
 * @returns Safe joined path
 */
export function safePathJoin(baseDir: string, relativePath: string): string {
  const normalizedPath = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "")
  return path.join(baseDir, normalizedPath)
}

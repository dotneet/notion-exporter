/**
 * Notion Exporter - Utility Functions
 */

import * as fs from "node:fs"
import * as https from "node:https"

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
  let safeTitle = title
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
  if (safeTitle.length > MAX_FILENAME_LENGTH) {
    safeTitle = safeTitle.substring(0, MAX_FILENAME_LENGTH)
  }

  return safeTitle
}

/**
 * Download an image from a URL and save it to a file
 * @param url URL of the image to download
 * @param filePath Path where the image should be saved
 * @returns Promise that resolves when the download is complete
 */
export function downloadImage(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (response) => {
        // Check if response is successful
        if (response.statusCode !== 200) {
          reject(
            new Error(
              `Failed to download image: ${response.statusCode} ${response.statusMessage}`,
            ),
          )
          return
        }

        // Create write stream
        const fileStream = fs.createWriteStream(filePath)

        // Pipe response to file
        response.pipe(fileStream)

        // Handle events
        fileStream.on("finish", () => {
          fileStream.close()
          resolve()
        })

        fileStream.on("error", (err) => {
          fs.unlink(filePath, () => {}) // Delete file if error occurs
          reject(err)
        })
      })
      .on("error", (err) => {
        reject(err)
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
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
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
export function createLogger(prefix: string) {
  const formatMessage = (message: string) => `[${prefix}] ${message}`

  return {
    log: (message: string) => console.log(formatMessage(message)),
    error: (message: string) => console.error(formatMessage(message)),
    warn: (message: string) => console.warn(formatMessage(message)),
    debug: (message: string) => {
      if (process.env.DEBUG) {
        console.debug(formatMessage(message))
      }
    },
  }
}

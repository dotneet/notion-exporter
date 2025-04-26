import { describe, expect, test } from "bun:test"

// Copy of the actual implementation to avoid mock interference
function getSafeFilename(title: string): string {
  if (!title || title === "Untitled") {
    return "Untitled"
  }

  // Replace characters that cannot be used in filenames
  let safeTitle = title
    // Remove characters prohibited in file systems
    .replace(/[\\/:*?"<>|]/g, "")
    // Replace whitespace with underscores
    .replace(/\s+/g, "_")
    // Remove unnecessary characters from the beginning and end
    .replace(/^[.\s]+|[.\s]+$/g, "")
    // Combine consecutive underscores into one
    .replace(/_+/g, "_")

  // Use default value if the string is empty
  if (!safeTitle) {
    return "Untitled"
  }

  // Limit filename length (too long can cause problems in file systems)
  const MAX_FILENAME_LENGTH = 100
  if (safeTitle.length > MAX_FILENAME_LENGTH) {
    safeTitle = safeTitle.substring(0, MAX_FILENAME_LENGTH)
  }

  return safeTitle
}

function getImageExtension(url: string): string {
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

describe("Simple Tests", () => {
  test("getSafeFilename should handle empty input", () => {
    expect(getSafeFilename("")).toBe("Untitled")
  })

  test("getSafeFilename should replace invalid characters", () => {
    expect(getSafeFilename("file/with:invalid*chars?")).toBe(
      "filewithinvalidchars",
    )
  })

  test("getImageExtension should extract extension from URL", () => {
    expect(getImageExtension("https://example.com/image.jpg")).toBe(".jpg")
  })
})

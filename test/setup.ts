/**
 * Test setup file for Notion Exporter
 * This file is loaded before all tests run
 */

// Set up environment variables for testing
process.env.NOTION_TOKEN = "test-token";
process.env.DEBUG = "true";

// Global setup
console.log("Setting up test environment...");

// This function runs before all tests
export function beforeAll() {
  console.log("Running global beforeAll hook");

  // You can add global setup logic here
  // For example, creating test directories, setting up mocks, etc.
}

// This function runs after all tests
export function afterAll() {
  console.log("Running global afterAll hook");

  // You can add global teardown logic here
  // For example, cleaning up test directories, resetting mocks, etc.
}

// Add global mocks or utilities that should be available to all tests
global.testUtils = {
  createMockBlock: (type: string, content: string) => {
    return {
      id: `mock-${type}-${Date.now()}`,
      type,
      [type]: {
        rich_text: [
          {
            type: "text",
            text: { content, link: null },
            annotations: {
              bold: false,
              italic: false,
              strikethrough: false,
              underline: false,
              code: false,
              color: "default",
            },
            plain_text: content,
            href: null,
          },
        ],
        color: "default",
      },
      has_children: false,
    };
  },
};

console.log("Test environment setup complete");

# Notion Exporter

![CI](https://github.com/devneko/notion-exporter/actions/workflows/ci.yml/badge.svg)

Export the content of a Notion page to a markdown file.

## Usage

Setup the environment variables:

```bash
cp .env.example .env
# or export the variables in your shell
# export NOTION_TOKEN=your_notion_token
```

### Export a Notion page

#### Using bunx to run

```bash
# Export the content of a Notion page to a file
bunx @devneko/notion-exporter notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md

# Export the content of a Notion page and all its subpages to a directory
bunx @devneko/notion-exporter --recursive notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md
# destination-dir/notion-page-id/subpage-id-1.md
# destination-dir/notion-page-id/subpage-id-1/subsubpage-id-1.md
# destination-dir/notion-page-id/subpage-id-2.md
# destination-dir/notion-page-id/subpage-id-2/subsubpage-id-1.md
```

### Building and Running with Node.js

You can build the project and run it with Node.js:

```bash
# Build the project
bun run build

# Run with Node.js
node dist/index.js [--recursive] notion-page-id destination-dir
```

## Testing

The project includes a comprehensive test suite using Bun's built-in test runner. To run the tests:

```bash
# Run all tests
bun test

# Run tests in watch mode (automatically re-run on file changes)
bun test --watch

# Run tests with coverage report
bun test --coverage

# Run only the reliable tests (no mocking issues)
bun run test:reliable
```

The test suite includes:

- Unit tests for utility functions
- Mocked tests for Notion API integration
- Tests for markdown conversion
- Tests for export functionality
- Tests for CLI interface

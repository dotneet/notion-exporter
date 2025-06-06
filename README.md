# Notion Exporter

![CI](https://github.com/dotneet/notion-exporter/actions/workflows/ci.yml/badge.svg)

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

# Export with a custom filename
bunx @devneko/notion-exporter --name my-document notion-page-id destination-dir
# will generates:
# destination-dir/my-document.md

# Export recursively with a custom filename
bunx @devneko/notion-exporter --recursive --name my-docs notion-page-id destination-dir
# will generates:
# destination-dir/my-docs.md
# destination-dir/my-docs/subpage-id-1.md
# destination-dir/my-docs/subpage-id-2.md
```

### Command-line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--recursive` | `-r` | Export child pages recursively |
| `--name` | `-n` | Specify a custom filename for the exported markdown file (without extension) |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

### Building and Running with Node.js

You can build the project and run it with Node.js:

```bash
# Build the project
bun run build

# Run with Node.js
node dist/index.js [--recursive] [--name filename] notion-page-id destination-dir
```

### GitHub Actions Usage

You can use this as a GitHub Action to export Notion pages in your workflows:

```yaml
- name: Export Notion page
  uses: dotneet/notion-exporter@v1
  with:
    notion_token: ${{ secrets.NOTION_TOKEN }}
    page_id: 'your-page-id'
    dest_dir: './exported-content'
    recursive: 'true'
```

#### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `notion_token` | Notion integration token | Yes | - |
| `page_id` | Notion page ID to export | Yes | - |
| `dest_dir` | Destination directory for exported files | No | `./notion-export` |
| `recursive` | Export child pages recursively (`true`/`false`) | No | `false` |

#### Example Workflow

```yaml
name: Export Notion Documentation

on:
  workflow_dispatch:
    inputs:
      page_id:
        description: 'Notion page ID to export'
        required: true
        type: string
      recursive:
        description: 'Export child pages recursively'
        required: false
        default: false
        type: boolean

jobs:
  export:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Export Notion page
        uses: dotneet/notion-exporter@main
        with:
          notion_token: ${{ secrets.NOTION_TOKEN }}
          page_id: ${{ github.event.inputs.page_id }}
          dest_dir: './docs'
          recursive: ${{ github.event.inputs.recursive }}

      - name: Upload exported files
        uses: actions/upload-artifact@v4
        with:
          name: notion-docs
          path: ./docs
```

See [`.github/workflows/example.yml`](.github/workflows/example.yml) for a complete example.

**Important:** Make sure to add your Notion token as a repository secret named `NOTION_TOKEN` in your GitHub repository settings.

## Metadata Handling

The exporter automatically handles Notion page metadata to enable smart export management and update detection.

### Automatic Metadata Extraction

When exporting pages, the tool automatically extracts and stores metadata including:

- **Page ID**: Unique identifier for the Notion page
- **Creation time**: When the page was originally created
- **Last edited time**: When the page was last modified (used for update detection)
- **URL**: Direct link to the Notion page
- **Archive status**: Whether the page is archived
- **Trash status**: Whether the page is in trash
- **Public URL**: Public sharing URL if available

### Metadata Storage Format

Metadata is stored as JSON within HTML comments at the top of each exported markdown file:

```markdown
<!-- ** GENERATED_BY_NOTION_EXPORTER **
{
  "id": "page-id-here",
  "created_time": "2024-01-01T00:00:00.000Z",
  "last_edited_time": "2024-01-02T00:00:00.000Z",
  "url": "https://www.notion.so/page-id",
  "archived": false,
  "in_trash": false,
  "public_url": "https://notion.site/public-url"
}
-->

# Page Title

Content goes here...
```

### Smart Update Detection

The exporter uses metadata to intelligently determine when pages need to be re-exported:

- **Incremental exports**: Only re-exports pages that have been modified since the last export
- **Performance optimization**: Skips unchanged pages to reduce API calls and processing time
- **Timestamp comparison**: Compares `last_edited_time` from Notion API with stored metadata

When running the exporter on previously exported content, you'll see messages like:
```
Page "Unchanged Document" has not been updated since last export. Skipping...
```

### Benefits

- **Faster subsequent exports**: Only processes changed content
- **Reduced API usage**: Minimizes Notion API calls for unchanged pages
- **Traceability**: Full audit trail of when pages were created and modified
- **Non-intrusive**: Metadata stored in HTML comments doesn't affect markdown rendering

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

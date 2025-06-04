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

# Notion Exporter

![CI](https://github.com/dotneet/notion-exporter/actions/workflows/ci.yml/badge.svg)

Export the content of a Notion page or database to markdown files.

## Usage

Setup the environment variables:

```bash
cp .env.example .env
# or export the variables in your shell
# export NOTION_TOKEN=your_notion_token
```

### Export a Notion page or database

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

# Export a database
bunx @devneko/notion-exporter database-id destination-dir
# will generates:
# destination-dir/databases/database-id/_meta.md
# destination-dir/databases/database-id/page-1.md
# destination-dir/databases/database-id/page-2.md

# Export a database with query filter
bunx @devneko/notion-exporter --query '{"filter":{"property":"Status","status":{"equals":"Done"}}}' database-id destination-dir
# will generate only pages matching the filter criteria

# Export a database with sorting
bunx @devneko/notion-exporter --query '{"sorts":[{"property":"Created","direction":"descending"}]}' database-id destination-dir
# will export pages sorted by the Created property in descending order
```

### Command-line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--recursive` | `-r` | Export child pages recursively |
| `--name` | `-n` | Specify a custom filename for the exported markdown file (pages only, without extension) |
| `--query` | `-q` | Query JSON for database filtering and sorting (databases only) |
| `--help` | `-h` | Show help message |
| `--version` | `-v` | Show version number |

### Building and Running with Node.js

You can build the project and run it with Node.js:

```bash
# Build the project
bun run build

# Run with Node.js
node dist/index.js [--recursive] [--name filename] [--query json] notion-resource-id destination-dir
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

### Database Query Functionality

When exporting databases, you can use the `--query` option to filter and sort results using the Notion API query format. The query parameter accepts a JSON string with the following structure:

#### Filter Examples

```bash
# Filter by status property
--query '{"filter":{"property":"Status","status":{"equals":"Done"}}}'

# Filter by checkbox property
--query '{"filter":{"property":"Published","checkbox":{"equals":true}}}'

# Filter by date range
--query '{"filter":{"property":"Created","date":{"after":"2024-01-01"}}}'

# Complex AND filter
--query '{"filter":{"and":[{"property":"Status","status":{"equals":"In Progress"}},{"property":"Priority","select":{"equals":"High"}}]}}'

# Complex OR filter
--query '{"filter":{"or":[{"property":"Status","status":{"equals":"Done"}},{"property":"Status","status":{"equals":"Published"}}]}}'
```

#### Sort Examples

```bash
# Sort by created date (descending)
--query '{"sorts":[{"property":"Created","direction":"descending"}]}'

# Sort by multiple properties
--query '{"sorts":[{"property":"Priority","direction":"ascending"},{"property":"Created","direction":"descending"}]}'
```

#### Combined Filter and Sort

```bash
# Filter published items and sort by created date
--query '{"filter":{"property":"Published","checkbox":{"equals":true}},"sorts":[{"property":"Created","direction":"descending"}]}'
```

#### Available Filter Types

- **Text**: `equals`, `does_not_equal`, `contains`, `does_not_contain`, `starts_with`, `ends_with`, `is_empty`, `is_not_empty`
- **Number**: `equals`, `does_not_equal`, `greater_than`, `less_than`, `greater_than_or_equal_to`, `less_than_or_equal_to`, `is_empty`, `is_not_empty`
- **Select**: `equals`, `does_not_equal`, `is_empty`, `is_not_empty`
- **Multi-select**: `contains`, `does_not_contain`, `is_empty`, `is_not_empty`
- **Date**: `equals`, `before`, `after`, `on_or_before`, `on_or_after`, `past_week`, `past_month`, `past_year`, `next_week`, `next_month`, `next_year`, `is_empty`, `is_not_empty`
- **Checkbox**: `equals`
- **Status**: `equals`, `does_not_equal`, `is_empty`, `is_not_empty`

For complete filter documentation, see the [Notion API reference](https://developers.notion.com/reference/post-database-query).

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
- Tests for database query functionality

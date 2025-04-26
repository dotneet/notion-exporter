# Notion Export

Export the content of a Notion page to a file or directory.

## Usage

Setup the environment variables:

```bash
cp .env.example .env
# or export the variables in your shell
# export NOTION_TOKEN=your_notion_token
```

### Export a Notion page

#### Using bun run

```bash
# Export the content of a Notion page to a file
bun run src/export.ts notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md

# Export the content of a Notion page and all its subpages to a directory
bun run src/export.ts --recursive notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md
# destination-dir/notion-page-id/subpage-id-1.md
# destination-dir/notion-page-id/subpage-id-1/subsubpage-id-1.md
# destination-dir/notion-page-id/subpage-id-2.md
# destination-dir/notion-page-id/subpage-id-2/subsubpage-id-1.md
```

#### Using bunx

You can also use `bunx` to run the exporter without installing it globally:

```bash
# Export the content of a Notion page to a file
bunx dotneet/notion-exporter notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md

# Export the content of a Notion page and all its subpages to a directory
bunx dotneet/notion-exporter --recursive notion-page-id destination-dir
# will generates:
# destination-dir/notion-page-id.md
# destination-dir/notion-page-id/subpage-id-1.md
# destination-dir/notion-page-id/subpage-id-1/subsubpage-id-1.md
# destination-dir/notion-page-id/subpage-id-2.md
# destination-dir/notion-page-id/subpage-id-2/subsubpage-id-1.md
```

For debugging, you can use the `DEBUG` environment variable:

```bash
DEBUG=true bunx notion-exporter --recursive notion-page-id destination-dir
```

### Building and Running with Node.js

You can build the project and run it with Node.js:

```bash
# Build the project
bun run build

# Run with Node.js
node dist/index.js [--recursive] notion-page-id destination-dir
```

**Note**: There are some compatibility issues when running the built version with Node.js. For best results, use `bunx` or `bun run` to execute the TypeScript source directly.

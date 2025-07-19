# Notion Exporter Project

## Overview

A TypeScript CLI tool and GitHub Action that exports Notion pages to Markdown files. Published as `@devneko/notion-exporter` on npm.

Use search tools to gather information if necessary to solve the problem.

## Key Features

- Export single Notion pages to Markdown
- Recursive export of page hierarchies
- GitHub Action integration
- CLI interface with bunx support
- Comprehensive test suite

## Project Structure

```
src/
├── index.ts      # CLI entry point with argument parsing
├── export.ts     # Main export functionality
├── notion.ts     # Notion API client wrapper
├── markdown.ts   # Notion to Markdown conversion
├── types.ts      # TypeScript type definitions
└── utils.ts      # Utility functions and logging

test/           # Test files using Bun test runner
dist/           # Built output directory
```

## Technology Stack

- **Runtime**: Bun (primary), Node.js (compatible)
- **Language**: TypeScript with strict configuration
- **Package Manager**: Bun
- **Linting/Formatting**: Biome
- **Testing**: Bun's built-in test runner
- **CI/CD**: GitHub Actions

## Development Commands

```bash
# Development
bun run start                    # Run from source
bun run build                    # Build to dist/
bun run lint                     # Check with Biome
bun run lint:fix                 # Fix linting issues
bun run format                   # Format code

# Testing
bun test                         # Run all tests
bun test --watch                 # Watch mode
bun test --coverage              # With coverage
bun run test:reliable            # Reliable tests only (no mocking issues)
```

## Configuration Files

- `tsconfig.json`: Strict TypeScript config with ESNext modules
- `biome.json`: Linting and formatting rules (2-space indents, double quotes)
- `bunfig.toml`: Bun configuration
- `lefthook.yml`: Git hooks configuration
- `action.yaml`: GitHub Action definition

## Environment Setup

Requires `NOTION_TOKEN` environment variable for Notion API access.

## Entry Points

- CLI: `src/index.ts` (built to `dist/index.js`)
- Package: `@devneko/notion-exporter` binary
- GitHub Action: Uses Docker container

## Key Dependencies

- `@notionhq/client`: Official Notion API client
- Only production dependency, minimal footprint

## Coding Practices

- Keep file sizes small (max 500 lines)
- Refactor frequently to maintain clarity
- Keep functions testable. Isolate side effects as much as possible.
- For understandability, add enough comments and type annotations.
- Apply format and linting rules consistently.

## Testing Strategy

- Unit tests for utilities and core functions
- Mocked Notion API integration tests
- Markdown conversion tests
- CLI interface tests
- Separate "reliable" test suite to avoid mocking issues

## Build Output

- Target: Node.js compatible
- Format: ESM modules
- Includes: TypeScript declarations and source maps

## References

- [Notion API Reference](https://developers.notion.com/reference/intro)

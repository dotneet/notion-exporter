#!/bin/bash
set -e

# Set up environment variables
export NOTION_TOKEN="${INPUT_NOTION_TOKEN}"

# Parse arguments
PAGE_ID="${INPUT_PAGE_ID}"
DEST_DIR="${INPUT_DEST_DIR}"
RECURSIVE="${INPUT_RECURSIVE}"

# Build command arguments
ARGS=()

# Add recursive flag if needed
if [ "${RECURSIVE}" = "true" ]; then
  ARGS+=(--recursive)
fi

# Add required arguments
ARGS+=("${PAGE_ID}" "${DEST_DIR}")

# Run the export command
echo "Running: bun run src/index.ts ${ARGS[@]}"
exec bun run src/index.ts "${ARGS[@]}"
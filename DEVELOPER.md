## Tech Stack

- Bun
- TypeScript
- [Notion SDK](https://github.com/makenotion/notion-sdk-js)
- [Octokit for GitHub](https://github.com/octokit/rest.js)

## Project Structure

```
.
├── src/
│   ├── export.ts
│   └── index.ts
├── .env
├── .gitignore
├── .env.example
```

## Development Workflow

1. **Setup Environment**

   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/notion-exporter.git
   cd notion-exporter

   # Install dependencies
   bun install

   # Setup environment variables
   cp .env.example .env
   # Edit .env with your Notion API token
   ```

2. **Development**

   ```bash
   # Run the exporter in development mode
   bun run src/index.ts [--recursive] notion-page-id destination-dir

   # Run tests
   bun test
   ```

3. **Building**
   ```bash
   # Build the project
   bun run build
   ```

## Publishing to npm

To publish this package to npm, follow these steps:

1. **Prepare for Publishing**

   - Update the version in `package.json`
   - Ensure all changes are committed
   - Make sure tests pass: `bun test`

2. **Login to npm**

   ```bash
   npm login
   ```

3. **Publish the Package**

   ```bash
   npm publish
   ```

   This will automatically run the build script before publishing.

4. **Verify the Publication**

   ```bash
   # Check if the package is published
   npm view @dotneet/notion-exporter
   ```

5. **Using the Published Package**

   ```bash
   # Install globally
   npm install -g @dotneet/notion-exporter

   # Or use with npx
   npx @dotneet/notion-exporter [--recursive] notion-page-id destination-dir
   ```

## Versioning

Follow [Semantic Versioning](https://semver.org/) for version updates:

- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backward compatible manner
- PATCH version for backward compatible bug fixes

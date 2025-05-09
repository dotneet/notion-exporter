Here are the important points extracted from the document, focusing on basic usage, testing, and important APIs:

### Basic Usage

- **Running Files:**
  - Execute JS/TS/JSX/TSX files with `bun run <file>` or `bun <file>`[cite: 4, 157, 160].
  - Files are transpiled on the fly[cite: 158].
  - Use `bun --watch run <file>` for automatic process restart on changes[cite: 161].
  - Use `bun --hot <file>` for hot reloading without process restart (preserves global state)[cite: 585, 593].
  - Run code from stdin using `echo "..." | bun run -`[cite: 185].
- **Running Scripts:**
  - Execute `package.json` scripts with `bun run <script>`[cite: 83, 164, 165].
  - Use `bun run --bun <script>` to run Node.js CLIs with the Bun runtime[cite: 179, 180, 181].
- **Package Management:**
  - Install all dependencies with `bun install`[cite: 5, 905].
  - Add packages with `bun add <pkg>`[cite: 87].
- **Project Setup:**
  - Scaffold new projects with `bun init`[cite: 69, 99].
  - Use project templates with `bun create <template>`[cite: 109].
- **Environment Variables:**
  - Automatically reads `.env`, `.env.<NODE_ENV>`, `.env.local` files[cite: 273, 275].
  - Access variables via `process.env` or `Bun.env`[cite: 288, 289].
- **File Types & Features:**
  - Native support for TypeScript and JSX[cite: 22, 196, 200].
  - Respects `tsconfig.json` for `paths` mapping [cite: 224] and JSX settings[cite: 240].
  - Supports importing `.json`, `.toml`, `.txt` files directly[cite: 205, 204].
  - Create single-file executables with `bun build --compile`[cite: 386, 387].
  - Cross-compile executables with `--target`[cite: 391].
  - Embed assets into executables[cite: 452, 453].
- **Bun Shell:**
  - Built-in cross-platform shell similar to bash[cite: 3371, 3373].
  - Execute commands using the `$` tagged template literal: `await $`echo Hello``[cite: 3381, 3382].
  - Supports redirection (`>`, `<`), piping (`|`), environment variables, and JS object interop[cite: 3378, 3399, 3411, 3421].

### Testing

- **Running Tests:**
  - Execute tests using `bun test`[cite: 5, 1702].
  - Recursively finds files matching `*.test.{js,jsx,ts,tsx}`, `*_test.*`, `*.spec.*`, `*_spec.*`[cite: 1708, 2003].
  - Filter test files by providing path arguments: `bun test <filter>`[cite: 1709, 2004].
  - Filter tests by name using `-t <pattern>` or `--test-name-pattern <pattern>`[cite: 1712, 2007].
  - Run in watch mode with `bun test --watch`[cite: 571, 1731, 1816].
- **Writing Tests:**
  - Uses a Jest-compatible API (`describe`, `test`, `it`, `expect`) imported from `bun:test`[cite: 1706, 1749]. Globals are automatically available in test files[cite: 1753, 1754, 1755].
  - Supports lifecycle hooks: `beforeAll`, `afterAll`, `beforeEach`, `afterEach`[cite: 1732, 1819, 1820]. Hooks can be file-scoped or global (using `--preload`)[cite: 1737, 1827, 1832, 1834].
  - Supports `async` tests and `done` callback[cite: 1759, 1761].
- **Test Control:**
  - Skip tests with `test.skip`[cite: 1769]. Focus tests with `test.only`[cite: 1777].
  - Conditional execution/skipping/todo: `test.if()`, `test.skipIf()`, `test.todoIf()` and corresponding `describe` modifiers[cite: 1782, 1786, 1788, 1796].
  - Mark tests as TODO with `test.todo`[cite: 1772]; run and check them with `bun test --todo`[cite: 1774].
  - Mark expected failing tests with `test.failing`[cite: 1792].
  - Parametrized tests with `test.each()` and `describe.each()`[cite: 1800, 1804].
- **Assertions & Matchers:**
  - Implements most Jest matchers (`.toBe`, `.toEqual`, `.toHaveBeenCalled`, etc.)[cite: 1814].
  - Verify assertion counts with `expect.hasAssertions()` and `expect.assertions(n)`[cite: 1810, 1812].
- **Mocking:**
  - Create mock functions with `mock()` or `jest.fn()`[cite: 1738, 1741, 1835].
  - Spy on object methods using `spyOn()`[cite: 1844].
  - Mock modules with `mock.module()`[cite: 1848]. Use `--preload` for mocks needed before imports[cite: 1857].
  - Global mock utilities: `mock.clearAllMocks()`, `mock.restore()`[cite: 1879, 1883].
  - `vi` global alias provided for Vitest compatibility[cite: 1889].
- **Snapshots:**
  - Use `.toMatchSnapshot()` for file-based snapshots[cite: 1744, 1892].
  - Use `.toMatchInlineSnapshot()` for snapshots stored in the test file[cite: 1897].
  - Update snapshots using `bun test --update-snapshots`[cite: 1745, 1896].
- **DOM Testing:**
  - Compatible with `happy-dom` [cite: 1747, 2011] and Testing Library[cite: 1747, 5346].
  - Requires setting up preload scripts to inject DOM environment and matchers[cite: 2015, 2018, 5351, 5357].
- **Configuration & Environment:**
  - Timeout: Default 5 seconds per test[cite: 1726, 1990]. Configure with `--timeout <ms>` [cite: 1725, 5309] or per-test[cite: 1763, 1991].
  - Bail: Stop run after N failures with `--bail=<n>`[cite: 1729, 5215].
  - Rerun: Run each test N times with `--rerun-each=<n>`[cite: 1727, 5277].
  - Coverage: Generate coverage reports with `--coverage`[cite: 1922, 1924, 5221]. Set coverage thresholds in `bunfig.toml`[cite: 1934, 5304]. Supports `text` and `lcov` reporters[cite: 1942].
  - CI/CD: Integrates with GitHub Actions automatically[cite: 1717]. Supports JUnit XML reporter (`--reporter=junit`)[cite: 1722, 1953].
  - Timezone: Defaults to UTC for tests[cite: 1917, 5668]. Can be overridden via `TZ` environment variable[cite: 1918]. Mock system time using `setSystemTime()`[cite: 1905, 1907].

### Important APIs

- **`Bun.serve`**: Starts a high-performance HTTP server[cite: 68, 328, 2047].
  - Features built-in routing, including parameters and wildcards[cite: 2049, 2052].
  - Native WebSocket support with pub/sub capabilities[cite: 2313, 2322, 2345].
  - Supports TLS configuration[cite: 2136, 2137].
  - Can stream `BunFile` responses efficiently[cite: 2160].
  - Handles cookies automatically via `req.cookies`[cite: 2176, 3643, 4543].
- **`Bun.file`**: Creates a lazy `Blob`-like reference to a file[cite: 330, 2448, 3020]. Used for reading file content in various formats (`.text()`, `.json()`, `.arrayBuffer()`, `.bytes()`, `.stream()`)[cite: 3022].
- **`Bun.write`**: Writes data (string, Blob, Buffer, Response, etc.) to a destination (path, `BunFile`, stdout)[cite: 330, 3030].
- **`Bun.spawn`/`Bun.spawnSync`**: Spawns child processes asynchronously or synchronously[cite: 330, 3454, 3507]. Supports IPC between Bun processes[cite: 3488].
- **`$` (Bun Shell)**: Tagged template literal to execute shell commands cross-platform[cite: 3368, 3381]. Supports piping, redirection, and JS interop[cite: 3378, 3399, 3411].
- **`bun:test`**: Module providing the API for Bun's built-in test runner (`describe`, `test`, `expect`, `mock`, etc.)[cite: 330, 1706, 1749].
- **`bun:sqlite`**: High-performance native SQLite3 driver[cite: 330, 3140].
- **`Bun.password`**: Securely hashes and verifies passwords using Argon2id (default) or bcrypt[cite: 3585, 3586].
- **`Bun.Transpiler`**: Provides access to Bun's internal JS/TS/JSX transpiler[cite: 330, 4171].
- **`bun:ffi`**: Foreign Function Interface for calling native code (C, Rust, Zig)[cite: 330, 3704].
- **`HTMLRewriter`**: Transforms HTML content using CSS selectors[cite: 330, 3548].
- **`import.meta`**: Provides module-specific metadata like `.dir`, `.file`, `.path`, `.url`, `.main`[cite: 330, 3128, 3130].
- **`Bun.listen`/`Bun.connect`**: Low-level TCP socket API[cite: 330, 3305].
- **`Bun.udpSocket`**: API for UDP sockets[cite: 3333].
- **`Bun.Glob`**: Fast, native file globbing utility[cite: 330, 4033].
- **`Bun.env`**: Alias for `process.env` for accessing environment variables[cite: 289, 330, 5654].
- **`Bun.argv`**: Array of command-line arguments passed to the script[cite: 5915].
- **`Bun.stdin`/`stdout`/`stderr`**: `BunFile` instances representing standard I/O streams[cite: 3028, 5709].
- **`Bun.sleep`/`Bun.sleepSync`**: Pause execution asynchronously or synchronously[cite: 330, 3891, 3894].
- **`Bun.readableStreamTo*`**: Utility functions to convert ReadableStreams to common formats (Text, JSON, ArrayBuffer, Blob, etc.)[cite: 330, 2582, 4010].
- **`Bun.gzipSync`/`gunzipSync`/`deflateSync`/`inflateSync`**: Zlib compression/decompression utilities[cite: 330, 3970, 3990, 3992, 3994].
- **`Bun.hash`**: Non-cryptographic hashing functions (Wyhash, etc.)[cite: 330, 3605].
- **`Bun.CryptoHasher`**: Cryptographic hashing functions (SHA, MD5, etc.)[cite: 330, 3614].
- **`Bun.which`**: Locates the path to an executable[cite: 330, 3895].
- **`Bun.escapeHTML`**: Escapes HTML special characters in a string[cite: 330, 5403].
- **`Bun.deepEquals`**: Performs deep equality checks between objects[cite: 330, 5377].
- **`Bun.semver`**: Utilities for comparing semantic versions (`satisfies`, `order`)[cite: 4086].
- **`Bun.color`**: Parses and formats colors in various formats (CSS, ANSI, hex, RGB)[cite: 4096].
- **`Bun.Cookie`/`Bun.CookieMap`**: Classes for parsing and manipulating HTTP cookies[cite: 3636, 3638, 3667].
- **`bun:jsc`**: JavaScriptCore-specific APIs, including heap inspection (`heapStats`, `generateHeapSnapshot`), serialization (`serialize`, `deserialize`), and memory estimation (`estimateShallowMemoryUsageOf`)[cite: 4216, 4225, 4020, 4024].

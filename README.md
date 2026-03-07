# WinCC OA CTRL Script Runner

Execute WinCC OA CTRL scripts programmatically with TypeScript/JavaScript API and CLI.

## Installation

```bash
npm install @winccoa-tools-pack/npm-winccoa-ctrl
```

## Quick Start

### API Usage

```typescript
import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl';

const result = await executeScript({
    version: '3.21',
    scriptPath: '/path/to/script.ctl',
    projectName: 'MyProject',
    timeout: 120000
});

if (result.success) {
    console.log('Script completed:', result.stdout);
} else {
    console.error('Script failed:', result.stderr);
    process.exit(result.exitCode);
}
```

### CLI Usage

```bash
# Basic execution
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject

# With parameters
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --params arg1 arg2

# Standalone mode (no Data/Event connection)
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --standalone

# Syntax check only
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --syntax-only

# JSON output for automation
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --json
```

## Features

- ✅ Execute CTRL scripts via WCCOActrl binary
- ✅ Pass parameters to scripts (positional arguments)
- ✅ Timeout handling (configurable, default 60s)
- ✅ Standalone mode (\`-n\` flag)
- ✅ Syntax checking only (\`-syntax\` flag)
- ✅ CTRL trace debugging (\`-dbg 29\`)
- ✅ Complete stdout/stderr capture
- ✅ Exit code handling
- ✅ Execution duration tracking
- ✅ JSON output mode
- ✅ Cross-platform (Windows & Linux)

## API Reference

### `executeScript(options: CtrlExecutionOptions): Promise\<CtrlExecutionResult\>`

Execute a CTRL script with the given options.

**Options:**

- \`version\` (string, required): WinCC OA version (e.g., "3.21")
- \`scriptPath\` (string, required): Absolute path to .ctl file
- \`projectName\` (string, required): Project name for -proj parameter
- \`params\` (string[], optional): Script parameters (positional)
- \`timeout\` (number, optional): Execution timeout in ms (default: 60000)
- \`configPath\` (string, optional): Custom config file path
- \`standalone\` (boolean, optional): Run without Data/Event connection
- \`syntaxOnly\` (boolean, optional): Syntax check only
- \`reportFile\` (string, optional): Report file name
- \`enableTrace\` (boolean, optional): Enable CTRL trace messages

**Returns:** \`CtrlExecutionResult\`

- \`success\`: Whether execution was successful (exitCode === 0)
- \`exitCode\`: Process exit code
- \`stdout\`: Complete stdout output
- \`stderr\`: Complete stderr output
- \`scriptPath\`: Executed script path
- \`projectName\`: Project name used
- \`duration\`: Execution time in milliseconds

### \`createRunner(): CtrlRunner\`

Create a new CtrlRunner instance for more control.

```typescript
const runner = createRunner();

// Optional: Register output callback
runner.onOutput((event) => {
    console.log(\`[\${event.type}]\`, event.data);
});

const result = await runner.execute(options);
```

### \`checkExecutable(version: string): boolean\`

Check if WCCOActrl executable exists for the given version.

### \`getExecutablePath(version: string): string | null\`

Get the path to WCCOActrl executable for the given version.

## CLI Reference

```text
Usage: winccoa-ctrl execute <scriptPath> [options]

Options:
  -v, --version <ver>        WinCC OA version (required)
  -p, --project <name>       Project name (required)
  -t, --timeout <ms>         Execution timeout (default: 60000)
  -c, --config <path>        Custom config file path
  --params <arg1> <arg2>...  Script parameters (positional)
  --standalone               Run without Data/Event connection (-n)
  --syntax-only              Syntax check only
  --report-file <name>       Report output file
  --enable-trace             Enable CTRL trace messages
  --silent                   Suppress console output
  --json                     Output result as JSON
  -h, --help                 Show help
```

## Requirements

- Node.js >= 20
- WinCC OA installation (3.18+)
- \`@winccoa-tools-pack/npm-winccoa-core\` for CtrlComponent

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test
```

## License

MIT

## Related Packages

- [@winccoa-tools-pack/npm-winccoa-core](https://github.com/winccoa-tools-pack/npm-winccoa-core) - Core utilities
- [@winccoa-tools-pack/npm-winccoa-ui-pnl-xml](https://github.com/winccoa-tools-pack/npm-winccoa-ui-pnl-xml) - PNL/XML converter

## Support

[GitHub Issues](https://github.com/winccoa-tools-pack/npm-winccoa-ctrl/issues)

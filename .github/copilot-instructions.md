# GitHub Copilot Instructions: WinCC OA Ctrl Runner

## Project Overview

This package provides a **reusable library and CLI tool** for executing WinCC OA CTRL scripts via the `WCCOActrl` executable. It follows the established component-based architecture pattern used in other `@winccoa-tools-pack` packages.

**Package Name**: `@winccoa-tools-pack/npm-winccoa-ctrl-runner`  
**Purpose**: Execute WinCC OA `.ctl` scripts programmatically with TypeScript/JavaScript API and CLI  
**Target Users**: VS Code extensions, automation tools, CI/CD pipelines, developers

## Architecture Overview

### Component Pattern
This package follows the **Component Pattern** established by `@winccoa-tools-pack/npm-winccoa-core`:
- Similar to `UIComponent` (for WCCOAui) and `PmonComponent` (for WCCILpmon)
- Uses `CtrlComponent` from core package for low-level executable management
- Provides high-level `CtrlRunner` class with convenient API

### Key Files Structure
```
src/
├── runner.ts          # Main CtrlRunner class (replaces converter.ts)
├── types.ts           # TypeScript interfaces and types
├── api.ts             # Convenience API wrapper functions
├── cli.ts             # Command-line interface
└── index.ts           # Public exports
```

## WCCOActrl Executable Reference

### Command Structure
```bash
WCCOActrl <script.ctl> [arg1 arg2 ...] -proj <projectName> [options]
```

### Critical Parameters
- **Script Path**: First positional argument, must be in `scripts/` directory or absolute path
- **Script Arguments**: Positional args after script path, NO FLAG needed (e.g., `script.ctl arg1 arg2`)
- `-proj <name>`: Project name (REQUIRED)
- `-n`: Run without Data/Event Manager connection (standalone mode)
- `-config <file>`: Override config file path
- `-syntax`: Syntax check only, no execution
- `-reportfile <filename>`: Redirect output to log file

### Key Debug Flags
- `-dbg 29`: Enable CTRL trace messages
- `-dbg 54`: Code coverage report
- `-dbg 57`: Break on error

### Exit Codes
- `0`: Success
- `1`: Error (also used by `-help` and `-version`, which is normal)
- Other codes: Various error conditions

### Version Detection
- Located at: `<installPath>/bin/WCCOActrl` (Linux) or `<installPath>/bin/WCCOActrl.exe` (Windows)
- Detection happens via version string in install path (e.g., `/opt/WinCC_OA/3.21/`)

## Core Interfaces

### CtrlExecutionOptions
```typescript
interface CtrlExecutionOptions {
  version: string;          // WinCC OA version (e.g., "3.21")
  scriptPath: string;       // Absolute path to .ctl file
  projectName: string;      // Project name for -proj
  params?: string[];        // Script parameters (passed as positional args)
  timeout?: number;         // Execution timeout in ms (default: 60000)
  configPath?: string;      // Optional: custom config file path
  standalone?: boolean;     // Use -n flag (no Data/Event connection)
  syntaxOnly?: boolean;     // Use -syntax flag (check only)
  reportFile?: string;      // Optional: report file name
}
```

### CtrlExecutionResult
```typescript
interface CtrlExecutionResult {
  success: boolean;         // exitCode === 0
  exitCode: number;         // Process exit code
  stdout: string;           // Complete stdout output
  stderr: string;           // Complete stderr output
  scriptPath: string;       // Executed script path
  projectName: string;      // Project name used
  duration?: number;        // Execution time in milliseconds
}
```

## CtrlRunner Class

### Key Methods
```typescript
class CtrlRunner {
  // Execute a CTRL script with options
  async execute(options: CtrlExecutionOptions): Promise<CtrlExecutionResult>;
  
  // Build command-line arguments array
  private buildArgs(options: CtrlExecutionOptions): string[];
  
  // Optional: Event-based output streaming
  on(event: 'stdout' | 'stderr', callback: (data: string) => void): void;
}
```

### Argument Building Logic
```typescript
private buildArgs(options: CtrlExecutionOptions): string[] {
  const args: string[] = [];
  
  // Script path (first argument)
  args.push(options.scriptPath);
  
  // Script parameters (positional, after script path)
  if (options.params && options.params.length > 0) {
    args.push(...options.params);
  }
  
  // Project name (REQUIRED)
  args.push('-proj', options.projectName);
  
  // Optional flags
  if (options.standalone) {
    args.push('-n');
  }
  
  if (options.syntaxOnly) {
    args.push('-syntax');
  }
  
  if (options.configPath) {
    args.push('-config', options.configPath);
  }
  
  if (options.reportFile) {
    args.push('-reportfile', options.reportFile);
  }
  
  return args;
}
```

### Output Streaming
For real-time output (important for VS Code integration):
- Capture stdout/stderr incrementally during execution
- Emit events or use callbacks for live output
- Still collect complete output in result

## API Wrapper (api.ts)

### Convenience Functions
```typescript
// Execute script with simplified API
export async function executeScript(
  options: CtrlExecutionOptions
): Promise<CtrlExecutionResult>;

// Check if script exists
export async function validateScript(scriptPath: string): Promise<boolean>;

// Factory for reusable runner instance
export function createRunner(): CtrlRunner;
```

## CLI Interface (cli.ts)

### Command Structure
```bash
winccoa-ctrl execute <scriptPath> [options]

Options:
  -v, --version <version>      WinCC OA version (required)
  -p, --project <name>         Project name (required)
  -t, --timeout <ms>           Execution timeout (default: 60000)
  -c, --config <path>          Config file path
  --params <arg1> <arg2> ...   Script parameters
  --standalone                 Run without Data/Event connection (-n)
  --syntax-only                Syntax check only
  --report-file <filename>     Report output file
  --silent                     Suppress console output
  --json                       Output result as JSON
```

### Example Usage
```bash
# Basic execution
winccoa-ctrl execute /path/to/script.ctl -v 3.21 -p MyProject

# With parameters
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --params arg1 arg2

# Syntax check only
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --syntax-only

# JSON output for automation
winccoa-ctrl execute script.ctl -v 3.21 -p MyProject --json
```

## Integration with VS Code Extension

### Current Implementation (vscode_winccoa_scriptactions)
The VS Code extension currently has inline execution logic that should be replaced:

**Before** (extension.ts, lines 172-197):
```typescript
function buildExecutionCommand(scriptPath: string, config: ScriptConfig): string {
  const fullExecutablePath = path.join(config.installPath, 'bin', 'WCCOActrl.exe');
  return `"${fullExecutablePath}" "${scriptPath}" -proj ${config.projectName}`;
}

const { stdout, stderr } = await execAsync(command);
```

**After** (using this library):
```typescript
import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl-runner';

const result = await executeScript({
  version: config.version,
  scriptPath: absoluteScriptPath,
  projectName: config.projectName,
  timeout: 120000
});

if (result.success) {
  outputChannel.appendLine(result.stdout);
} else {
  outputChannel.appendLine(`Error: ${result.stderr}`);
  showErrorMessage(`Script execution failed (exit code: ${result.exitCode})`);
}
```

### Real-time Output in VS Code
```typescript
const runner = createRunner();

runner.on('stdout', (data) => {
  outputChannel.append(data);
});

runner.on('stderr', (data) => {
  outputChannel.append(data);
});

const result = await runner.execute(options);
```

## Testing Strategy

### Unit Tests
- Test argument building with various option combinations
- Mock CtrlComponent for execution tests
- Validate timeout handling
- Test error scenarios (missing project, invalid script, timeout)

### Integration Tests
Use existing test infrastructure in `test/helpers/test-project-helpers.ts`:
```typescript
import { ProjEnvProject } from './test/helpers/test-project-helpers';

// Setup test project
const project = new ProjEnvProject('/path/to/test/project');
await project.register();

// Execute test script
const result = await executeScript({
  version: '3.21',
  scriptPath: '/path/to/test/script.ctl',
  projectName: project.name
});

expect(result.success).toBe(true);
expect(result.exitCode).toBe(0);
```

### Test Fixtures
Create minimal test scripts in `test/fixtures/scripts/`:
```
test/fixtures/scripts/
├── simple.ctl           # Basic script that exits with code 0
├── with-output.ctl      # Script that writes to stdout
├── with-error.ctl       # Script that exits with error code
├── with-params.ctl      # Script that uses parameters
└── long-running.ctl     # Script for timeout testing
```

## Migration from PNL-XML Converter

This repo originally contained a PNL/XML converter. Key changes:

### Files to Update
- `package.json`: Change name, description, bin entry, keywords
- `README.md`: Completely rewrite for ctrl-runner
- `src/converter.ts` → `src/runner.ts`: Rename and adapt class
- `src/types.ts`: Replace ConversionOptions/Result with Execution variants
- `src/cli.ts`: Update commands from convert to execute
- `src/api.ts`: Update function names and signatures
- `test/core-utils.test.js` → `test/ctrl-runner.test.js`: Update tests

### Files to Keep
- Build configuration (tsconfig.*.json)
- CI/CD workflows (.github/workflows/*)
- Contributing/Security/License docs
- Test helpers and infrastructure

## Development Workflow

### Getting Started
```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Local CLI testing
npm link
winccoa-ctrl execute test.ctl -v 3.21 -p TestProject
```

### Code Style
- Follow existing ESLint configuration (eslint.config.cjs)
- Use TypeScript strict mode
- Document public APIs with JSDoc comments
- Follow async/await pattern (no callbacks in public API)

## Common Patterns

### Error Handling
```typescript
try {
  const result = await executeScript(options);
  if (!result.success) {
    console.error(`Execution failed: ${result.stderr}`);
    process.exit(result.exitCode);
  }
} catch (error) {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
}
```

### Timeout Configuration
- Default: 60000ms (60 seconds)
- Configurable per execution
- Should be longer for known long-running scripts
- CLI should allow custom timeout via flag

### Path Handling
- Always use `path.join()` for cross-platform compatibility
- Normalize paths before passing to WCCOActrl
- Support both relative and absolute script paths
- Convert to absolute paths internally

## Future Enhancements

### Planned Features (not in MVP)
- **Auto-detection**: Automatic WinCC OA installation and project detection
- **Interactive mode**: stdin/stdout streaming for interactive scripts
- **Progress reporting**: Progress callbacks for long-running scripts
- **Parallel execution**: Run multiple scripts concurrently
- **Result caching**: Cache syntax check results
- **Script validation**: Pre-execution validation (file exists, readable, etc.)

### Integration Opportunities
- GitHub Actions for CI/CD
- GitLab CI runners
- Jenkins plugins
- npm scripts in WinCC OA projects

## Cross-Platform Considerations

### Windows vs Linux
- Binary name: `WCCOActrl.exe` (Windows) vs `WCCOActrl` (Linux)
- Default install paths differ
- Path separators handled by Node.js `path` module
- Line endings: Use `os.EOL` for platform-specific newlines

### Environment Variables
- `PVSS_II`: Project environment (can be overridden with `-config`)
- `PVSS_II_PROJ`: Project name (can be overridden with `-proj`)

## Documentation Standards

### Code Comments
- Use JSDoc for all public APIs
- Include usage examples in JSDoc
- Document parameter constraints
- Note any platform-specific behavior

### README Sections
- Quick Start with simple example
- Installation instructions
- API Reference (all public methods)
- CLI Reference (all commands and flags)
- Integration examples (VS Code, CI/CD)
- Troubleshooting common issues

## Key Dependencies

### Runtime Dependencies
- `@winccoa-tools-pack/npm-winccoa-core`: Core component infrastructure
- CLI parser (commander or yargs): Command-line interface

### Dev Dependencies
- TypeScript: Type system
- ESLint: Code quality
- Jest or similar: Testing framework
- Build tools: Already configured in tsconfig files

## Success Criteria

A successful implementation should:
- ✅ Execute CTRL scripts with all required parameters
- ✅ Support script arguments (positional parameters)
- ✅ Handle timeouts gracefully
- ✅ Capture stdout and stderr completely
- ✅ Provide real-time output streaming
- ✅ Work on both Windows and Linux
- ✅ Include comprehensive CLI
- ✅ Have test coverage >80%
- ✅ Documentation complete and accurate
- ✅ Successfully replace logic in vscode_winccoa_scriptactions extension

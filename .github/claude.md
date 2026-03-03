# Implementation Plan: WinCC OA Ctrl Runner

## Project Context

This repository is being transformed from a **PNL/XML converter** into a **CTRL script execution library**. The goal is to extract reusable WCCOActrl execution logic from the VS Code extension (`vscode_winccoa_scriptactions`) into a standalone, testable, and well-documented npm package.

**Repository**: `npm-ctrl-runner`  
**Target Package**: `@winccoa-tools-pack/npm-winccoa-ctrl-runner`  
**Current State**: Contains PNL/XML converter (to be replaced)  
**Target State**: Reusable CTRL script runner with CLI and API

---

## Executive Summary

### What We're Building
A TypeScript library and CLI tool that wraps the WinCC OA `WCCOActrl` executable, providing:
1. **API**: Programmatic script execution for VS Code extensions and automation
2. **CLI**: Command-line tool for scripts, CI/CD, and manual testing
3. **Streaming**: Real-time output capture for live logging
4. **Cross-platform**: Works on Windows and Linux

### Why It Matters
- **Reusability**: Multiple tools can execute CTRL scripts consistently
- **Maintainability**: Centralized logic instead of duplicated code
- **Testability**: Isolated component with comprehensive tests
- **Documentation**: Single source of truth for CTRL execution patterns

### Key Technologies
- TypeScript with strict mode
- Component pattern from `@winccoa-tools-pack/npm-winccoa-core`
- Node.js child process management
- Cross-platform path handling

---

## Technical Research Findings

### WCCOActrl Executable Analysis

**Location on Test System**: `/opt/WinCC_OA/3.21/bin/WCCOActrl`  
**Version**: 3.21.0 (Linux x86_64)  
**Exit Code Behavior**: Returns 1 for `-help` and `-version` (this is normal)

#### Command Syntax
```bash
WCCOActrl <script.ctl> [arg1 arg2 ...] -proj <projectName> [options]
```

#### Critical Discovery: Script Parameters
**Script arguments are positional**, not flag-based:
```bash
# CORRECT
WCCOActrl script.ctl myArg1 myArg2 -proj MyProject

# INCORRECT (would be treated as flags)
WCCOActrl script.ctl -proj MyProject --params myArg1 myArg2
```

#### Essential Parameters
| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `<script.ctl>` | Yes | Script path (in `scripts/` or absolute) | `/path/to/script.ctl` |
| `-proj <name>` | Yes | Project name | `-proj MyProject` |
| `-n` | No | Standalone mode (no Data/Event connection) | `-n` |
| `-config <file>` | No | Override config file | `-config /path/to/config` |
| `-syntax` | No | Syntax check only | `-syntax` |
| `-reportfile <name>` | No | Output to log file | `-reportfile report.txt` |
| `-timeout` | No | Not a native flag, must be handled by wrapper | N/A |

#### Debug Options (for advanced features)
- `-dbg 29`: CTRL trace messages
- `-dbg 54`: Code coverage report  
- `-dbg 57`: Break on error
- `-dbg 59`: CTRL performance statistics

#### Platform Differences
| Aspect | Windows | Linux |
|--------|---------|-------|
| Binary name | `WCCOActrl.exe` | `WCCOActrl` |
| Default path | `C:/Siemens/Automation/WinCC_OA/<ver>/bin` | `/opt/WinCC_OA/<ver>/bin` |
| Path separator | `\` (but `/` works too) | `/` |

---

## Architecture Design

### Component Hierarchy
```
┌─────────────────────────────────────┐
│   vscode_winccoa_scriptactions      │
│   (VS Code Extension)               │
└──────────────┬──────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────┐
│ @winccoa-tools-pack/                │
│   npm-winccoa-ctrl-runner           │
│ ┌─────────────────────────────────┐ │
│ │  API Layer (api.ts)             │ │
│ │  ├─ executeScript()             │ │
│ │  └─ createRunner()              │ │
│ ├─────────────────────────────────┤ │
│ │  Core Layer (runner.ts)         │ │
│ │  └─ CtrlRunner class            │ │
│ ├─────────────────────────────────┤ │
│ │  CLI Layer (cli.ts)             │ │
│ │  └─ Command parsing             │ │
│ └─────────────────────────────────┘ │
└──────────────┬──────────────────────┘
               │ uses
               ▼
┌─────────────────────────────────────┐
│ @winccoa-tools-pack/                │
│   npm-winccoa-core                  │
│ └─ CtrlComponent                    │
└─────────────────────────────────────┘
               │ spawns
               ▼
┌─────────────────────────────────────┐
│   WCCOActrl executable              │
│   (WinCC OA System Binary)          │
└─────────────────────────────────────┘
```

### File Structure Transformation

**BEFORE** (PNL/XML Converter):
```
src/
├── converter.ts       # PnlXmlConverter class
├── types.ts           # ConversionOptions, ConversionResult
├── api.ts             # convert(), convertPnlToXml(), convertXmlToPnl()
├── cli.ts             # "convert" commands
└── index.ts           # Exports
```

**AFTER** (CTRL Runner):
```
src/
├── runner.ts          # CtrlRunner class (NEW)
├── types.ts           # CtrlExecutionOptions, CtrlExecutionResult (UPDATED)
├── api.ts             # executeScript(), createRunner() (UPDATED)
├── cli.ts             # "execute" commands (UPDATED)
└── index.ts           # Updated exports
```

---

## Implementation Steps

### Phase 1: Foundation & Types (Step 1-3)

#### Step 1: Update package.json Metadata
**File**: `/home/testus/repos/npm-ctrl-runner/package.json`

Changes needed:
```json
{
  "name": "@winccoa-tools-pack/npm-winccoa-ctrl-runner",
  "description": "Execute WinCC OA CTRL scripts programmatically with TypeScript/JavaScript API and CLI",
  "version": "1.0.0",
  "keywords": [
    "winccoa",
    "ctrl",
    "WCCOActrl",
    "script-runner",
    "automation",
    "siemens"
  ],
  "bin": {
    "winccoa-ctrl": "./dist/cjs/cli.js"
  },
  "exports": {
    ".": {
      "types": "./dist/types/index.d.ts",
      "import": "./dist/esm/index.js",
      "require": "./dist/cjs/index.js"
    }
  }
}
```

**Validation**: Run `npm run build` and verify package metadata.

#### Step 2: Define TypeScript Interfaces
**File**: `/home/testus/repos/npm-ctrl-runner/src/types.ts`

Replace existing types with:

```typescript
/**
 * Options for executing a CTRL script via WCCOActrl
 */
export interface CtrlExecutionOptions {
  /** WinCC OA version (e.g., "3.21") for executable resolution */
  version: string;
  
  /** Absolute path to the .ctl script file */
  scriptPath: string;
  
  /** WinCC OA project name (required for -proj parameter) */
  projectName: string;
  
  /** Optional script parameters (passed as positional arguments) */
  params?: string[];
  
  /** Execution timeout in milliseconds (default: 60000) */
  timeout?: number;
  
  /** Optional custom config file path (for -config parameter) */
  configPath?: string;
  
  /** Run in standalone mode without Data/Event Manager connection (-n flag) */
  standalone?: boolean;
  
  /** Perform syntax check only without execution (-syntax flag) */
  syntaxOnly?: boolean;
  
  /** Optional report file name (for -reportfile parameter) */
  reportFile?: string;
  
  /** Enable CTRL trace messages (-dbg 29) */
  enableTrace?: boolean;
}

/**
 * Result of a CTRL script execution
 */
export interface CtrlExecutionResult {
  /** Whether execution was successful (exitCode === 0) */
  success: boolean;
  
  /** Process exit code (0 = success, other = error) */
  exitCode: number;
  
  /** Complete stdout output from the script */
  stdout: string;
  
  /** Complete stderr output from the script */
  stderr: string;
  
  /** Path to the executed script */
  scriptPath: string;
  
  /** Project name used for execution */
  projectName: string;
  
  /** Execution duration in milliseconds */
  duration?: number;
}

/**
 * Event data for streaming output
 */
export interface OutputEvent {
  /** Output type: stdout or stderr */
  type: 'stdout' | 'stderr';
  
  /** Output data chunk */
  data: string;
  
  /** Timestamp when data was received */
  timestamp: Date;
}

/**
 * Callback function for streaming output
 */
export type OutputCallback = (event: OutputEvent) => void;
```

**Validation**: Run `npm run build` and check for type errors.

#### Step 3: Create CtrlRunner Core Class
**File**: `/home/testus/repos/npm-ctrl-runner/src/runner.ts`

Create new file (replacing converter.ts logic):

```typescript
import { CtrlComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/CtrlComponent';
import type {
  CtrlExecutionOptions,
  CtrlExecutionResult,
  OutputCallback,
  OutputEvent,
} from './types';

/**
 * Default execution timeout (60 seconds)
 */
const DEFAULT_TIMEOUT = 60000;

/**
 * Runner class for executing WinCC OA CTRL scripts via WCCOActrl executable
 */
export class CtrlRunner {
  private ctrl: CtrlComponent;
  private outputCallbacks: OutputCallback[] = [];

  constructor() {
    this.ctrl = new CtrlComponent();
  }

  /**
   * Execute a CTRL script with the given options
   * 
   * @param options - Execution configuration
   * @returns Promise resolving to execution result
   * 
   * @example
   * ```typescript
   * const runner = new CtrlRunner();
   * const result = await runner.execute({
   *   version: '3.21',
   *   scriptPath: '/path/to/script.ctl',
   *   projectName: 'MyProject'
   * });
   * 
   * if (result.success) {
   *   console.log('Output:', result.stdout);
   * }
   * ```
   */
  async execute(options: CtrlExecutionOptions): Promise<CtrlExecutionResult> {
    const startTime = Date.now();
    
    // Set WinCC OA version for executable path resolution
    this.ctrl.setVersion(options.version);
    
    // Build command-line arguments
    const args = this.buildArgs(options);
    
    // Configure timeout
    const timeout = options.timeout ?? DEFAULT_TIMEOUT;
    
    // Execute script
    const exitCode = await this.ctrl.start(args, { timeout });
    
    // Calculate duration
    const duration = Date.now() - startTime;
    
    // Build result
    const result: CtrlExecutionResult = {
      success: exitCode === 0,
      exitCode,
      stdout: this.ctrl.stdOut,
      stderr: this.ctrl.stdErr,
      scriptPath: options.scriptPath,
      projectName: options.projectName,
      duration,
    };
    
    return result;
  }

  /**
   * Register a callback for streaming output events
   * 
   * @param callback - Function to call on each output event
   * 
   * @example
   * ```typescript
   * runner.onOutput((event) => {
   *   console.log(`[${event.type}]`, event.data);
   * });
   * ```
   */
  onOutput(callback: OutputCallback): void {
    this.outputCallbacks.push(callback);
  }

  /**
   * Build WCCOActrl command-line arguments from options
   * 
   * Arguments are ordered according to WCCOActrl syntax:
   * 1. Script path
   * 2. Script parameters (positional)
   * 3. -proj <projectName>
   * 4. Optional flags
   */
  private buildArgs(options: CtrlExecutionOptions): string[] {
    const args: string[] = [];
    
    // 1. Script path (first positional argument)
    args.push(options.scriptPath);
    
    // 2. Script parameters (positional, must come before flags)
    if (options.params && options.params.length > 0) {
      args.push(...options.params);
    }
    
    // 3. Project name (REQUIRED)
    args.push('-proj', options.projectName);
    
    // 4. Optional flags
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
    
    if (options.enableTrace) {
      args.push('-dbg', '29');
    }
    
    return args;
  }

  /**
   * Check if WCCOActrl executable exists for the given version
   */
  exists(version: string): boolean {
    this.ctrl.setVersion(version);
    return this.ctrl.exists();
  }

  /**
   * Get the path to WCCOActrl executable for the given version
   */
  getExecutablePath(version: string): string {
    this.ctrl.setVersion(version);
    return this.ctrl.getPath();
  }
}
```

**Validation**: TypeScript compilation should succeed.

### Phase 2: API & CLI (Steps 4-5)

#### Step 4: Create API Wrapper
**File**: `/home/testus/repos/npm-ctrl-runner/src/api.ts`

Replace existing API with:

```typescript
import { CtrlRunner } from './runner';
import type { CtrlExecutionOptions, CtrlExecutionResult } from './types';

/**
 * Shared singleton runner instance
 */
let sharedRunner: CtrlRunner | null = null;

/**
 * Get or create the shared runner instance
 */
function getSharedRunner(): CtrlRunner {
  if (!sharedRunner) {
    sharedRunner = new CtrlRunner();
  }
  return sharedRunner;
}

/**
 * Execute a CTRL script with the given options
 * 
 * This is a convenience function that uses a shared runner instance.
 * For more control, create your own CtrlRunner instance.
 * 
 * @param options - Execution configuration
 * @returns Promise resolving to execution result
 * 
 * @example
 * ```typescript
 * import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl-runner';
 * 
 * const result = await executeScript({
 *   version: '3.21',
 *   scriptPath: '/path/to/script.ctl',
 *   projectName: 'MyProject',
 *   timeout: 120000
 * });
 * 
 * if (!result.success) {
 *   console.error('Script failed:', result.stderr);
 *   process.exit(result.exitCode);
 * }
 * ```
 */
export async function executeScript(
  options: CtrlExecutionOptions
): Promise<CtrlExecutionResult> {
  const runner = getSharedRunner();
  return runner.execute(options);
}

/**
 * Create a new CtrlRunner instance
 * 
 * Use this when you need multiple independent runners or want to
 * manage the runner lifecycle yourself.
 * 
 * @returns New CtrlRunner instance
 * 
 * @example
 * ```typescript
 * const runner = createRunner();
 * runner.onOutput((event) => {
 *   console.log(event.data);
 * });
 * const result = await runner.execute(options);
 * ```
 */
export function createRunner(): CtrlRunner {
  return new CtrlRunner();
}

/**
 * Check if WCCOActrl executable exists for the given version
 * 
 * @param version - WinCC OA version (e.g., "3.21")
 * @returns True if executable exists
 */
export function checkExecutable(version: string): boolean {
  const runner = getSharedRunner();
  return runner.exists(version);
}
```

#### Step 5: Implement CLI
**File**: `/home/testus/repos/npm-ctrl-runner/src/cli.ts`

Update CLI to use execute command:

```typescript
#!/usr/bin/env node
import { Command } from 'commander';
import { executeScript } from './api';
import type { CtrlExecutionOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

// Read package.json for version
const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

program
  .name('winccoa-ctrl')
  .description('Execute WinCC OA CTRL scripts')
  .version(packageJson.version);

program
  .command('execute <scriptPath>')
  .description('Execute a CTRL script')
  .requiredOption('-v, --version <version>', 'WinCC OA version (e.g., 3.21)')
  .requiredOption('-p, --project <name>', 'Project name')
  .option('-t, --timeout <ms>', 'Execution timeout in milliseconds', '60000')
  .option('-c, --config <path>', 'Custom config file path')
  .option('--params <args...>', 'Script parameters')
  .option('--standalone', 'Run without Data/Event Manager connection (-n)')
  .option('--syntax-only', 'Syntax check only, no execution')
  .option('--report-file <filename>', 'Report output file')
  .option('--enable-trace', 'Enable CTRL trace messages')
  .option('--silent', 'Suppress console output')
  .option('--json', 'Output result as JSON')
  .action(async (scriptPath: string, cmdOptions: any) => {
    try {
      // Resolve script path to absolute
      const absoluteScriptPath = path.resolve(scriptPath);
      
      // Check if script exists
      if (!fs.existsSync(absoluteScriptPath)) {
        console.error(`Error: Script file not found: ${absoluteScriptPath}`);
        process.exit(1);
      }
      
      // Build execution options
      const options: CtrlExecutionOptions = {
        version: cmdOptions.version,
        scriptPath: absoluteScriptPath,
        projectName: cmdOptions.project,
        timeout: parseInt(cmdOptions.timeout, 10),
        configPath: cmdOptions.config,
        params: cmdOptions.params,
        standalone: cmdOptions.standalone || false,
        syntaxOnly: cmdOptions.syntaxOnly || false,
        reportFile: cmdOptions.reportFile,
        enableTrace: cmdOptions.enableTrace || false,
      };
      
      // Execute script
      if (!cmdOptions.silent) {
        console.log(`Executing: ${path.basename(scriptPath)}`);
        console.log(`Project: ${options.projectName}`);
        console.log(`Version: ${options.version}`);
        if (options.params && options.params.length > 0) {
          console.log(`Parameters: ${options.params.join(', ')}`);
        }
        console.log('---');
      }
      
      const result = await executeScript(options);
      
      // Handle JSON output
      if (cmdOptions.json) {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.exitCode);
      }
      
      // Handle normal output
      if (!cmdOptions.silent) {
        if (result.stdout) {
          console.log(result.stdout);
        }
        
        if (result.stderr) {
          console.error(result.stderr);
        }
        
        console.log('---');
        console.log(`Exit code: ${result.exitCode}`);
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      }
      
      process.exit(result.exitCode);
      
    } catch (error: any) {
      if (cmdOptions.json) {
        console.log(JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack
        }, null, 2));
      } else {
        console.error('Fatal error:', error.message);
      }
      process.exit(1);
    }
  });

program.parse();
```

**Validation**: 
- Build: `npm run build`
- Link: `npm link`
- Test: `winccoa-ctrl --help`

### Phase 3: Testing (Steps 6-7)

#### Step 6: Create Test Fixtures
**Directory**: `/home/testus/repos/npm-ctrl-runner/test/fixtures/scripts/`

Create minimal test scripts:

**File**: `test/fixtures/scripts/simple.ctl`
```ctrl
main()
{
  DebugN("Simple test script executed successfully");
  return 0;
}
```

**File**: `test/fixtures/scripts/with-params.ctl`
```ctrl
main(string param1, string param2)
{
  DebugN("Parameter 1: " + param1);
  DebugN("Parameter 2: " + param2);
  return 0;
}
```

**File**: `test/fixtures/scripts/with-error.ctl`
```ctrl
main()
{
  DebugN("This script will fail");
  throwError("Intentional error for testing");
  return 1;
}
```

**File**: `test/fixtures/scripts/long-running.ctl`
```ctrl
main()
{
  DebugN("Starting long-running task");
  delay(90); // 90 seconds - exceeds default timeout
  DebugN("Task completed");
  return 0;
}
```

#### Step 7: Write Unit Tests
**File**: `/home/testus/repos/npm-ctrl-runner/test/ctrl-runner.test.js`

Replace core-utils.test.js with:

```javascript
const { executeScript, createRunner, checkExecutable } = require('../dist/cjs/api');
const path = require('path');
const fs = require('fs');

// Test configuration - adjust based on your environment
const TEST_CONFIG = {
  version: '3.21',
  projectName: 'TestProject', // Must exist
  scriptsDir: path.join(__dirname, 'fixtures', 'scripts'),
};

describe('CtrlRunner', () => {
  beforeAll(() => {
    // Ensure test scripts exist
    if (!fs.existsSync(TEST_CONFIG.scriptsDir)) {
      throw new Error(`Test scripts directory not found: ${TEST_CONFIG.scriptsDir}`);
    }
  });

  describe('executeScript', () => {
    test('should execute simple script successfully', async () => {
      const result = await executeScript({
        version: TEST_CONFIG.version,
        scriptPath: path.join(TEST_CONFIG.scriptsDir, 'simple.ctl'),
        projectName: TEST_CONFIG.projectName,
        standalone: true,
      });

      expect(result.success).toBe(true);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Simple test script');
      expect(result.duration).toBeGreaterThan(0);
    }, 30000);

    test('should pass parameters to script', async () => {
      const result = await executeScript({
        version: TEST_CONFIG.version,
        scriptPath: path.join(TEST_CONFIG.scriptsDir, 'with-params.ctl'),
        projectName: TEST_CONFIG.projectName,
        params: ['value1', 'value2'],
        standalone: true,
      });

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Parameter 1: value1');
      expect(result.stdout).toContain('Parameter 2: value2');
    }, 30000);

    test('should handle script errors', async () => {
      const result = await executeScript({
        version: TEST_CONFIG.version,
        scriptPath: path.join(TEST_CONFIG.scriptsDir, 'with-error.ctl'),
        projectName: TEST_CONFIG.projectName,
        standalone: true,
      });

      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toBeTruthy();
    }, 30000);

    test('should respect timeout', async () => {
      await expect(
        executeScript({
          version: TEST_CONFIG.version,
          scriptPath: path.join(TEST_CONFIG.scriptsDir, 'long-running.ctl'),
          projectName: TEST_CONFIG.projectName,
          timeout: 5000, // 5 seconds
          standalone: true,
        })
      ).rejects.toThrow(/timeout/i);
    }, 10000);

    test('should handle non-existent script', async () => {
      await expect(
        executeScript({
          version: TEST_CONFIG.version,
          scriptPath: '/path/to/nonexistent.ctl',
          projectName: TEST_CONFIG.projectName,
        })
      ).rejects.toThrow();
    });
  });

  describe('createRunner', () => {
    test('should create independent runner instances', () => {
      const runner1 = createRunner();
      const runner2 = createRunner();
      
      expect(runner1).not.toBe(runner2);
    });
  });

  describe('checkExecutable', () => {
    test('should find WCCOActrl for valid version', () => {
      const exists = checkExecutable(TEST_CONFIG.version);
      expect(exists).toBe(true);
    });

    test('should return false for invalid version', () => {
      const exists = checkExecutable('99.99');
      expect(exists).toBe(false);
    });
  });
});
```

**Validation**: Run `npm test`

### Phase 4: Documentation (Steps 8-9)

#### Step 8: Update README
**File**: `/home/testus/repos/npm-ctrl-runner/README.md`

Complete rewrite for ctrl-runner (replace PNL/XML content).

See copilot-instructions.md for documentation standards.

Key sections:
- Quick Start
- Installation
- API Reference
- CLI Reference
- Integration Examples
- Troubleshooting

#### Step 9: Update CHANGELOG
**File**: `/home/testus/repos/npm-ctrl-runner/CHANGELOG.md`

Add version 1.0.0 entry at the top:

```markdown
## [1.0.0] - 2026-03-03

### Changed
- **BREAKING**: Transformed package from PNL/XML converter to CTRL script runner
- Package renamed to `@winccoa-tools-pack/npm-winccoa-ctrl-runner`
- Complete API redesign around CTRL script execution

### Added
- `CtrlRunner` class for executing WinCC OA CTRL scripts
- `executeScript()` convenience API function
- CLI tool: `winccoa-ctrl execute` command
- Support for script parameters (positional arguments)
- Real-time output streaming capabilities
- Timeout handling for long-running scripts
- Standalone mode support (`-n` flag)
- Syntax-only checking (`-syntax` flag)
- Comprehensive test suite with test fixtures
- TypeScript type definitions for all public APIs

### Features
- Cross-platform support (Windows and Linux)
- WinCC OA version-based executable resolution
- Complete stdout/stderr capture
- Exit code handling
- Execution duration tracking
- Debug trace support
- JSON output mode for automation

### Migration from PNL/XML Converter
This is a complete package transformation. If you were using the previous
PNL/XML converter, that functionality has been moved to a separate package.
```

### Phase 5: VS Code Extension Integration (Step 10)

#### Step 10: Refactor vscode_winccoa_scriptactions Extension
**File**: `/home/testus/repos/vscode_winccoa_scriptactions/package.json`

Add dependency:
```json
{
  "dependencies": {
    "@winccoa-tools-pack/npm-winccoa-ctrl-runner": "^1.0.0"
  }
}
```

**File**: `/home/testus/repos/vscode_winccoa_scriptactions/src/extension.ts`

Replace execution logic (lines 88-103 and 172-197):

```typescript
import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl-runner';
import * as path from 'path';

// Old buildExecutionCommand() function - DELETE
// Lines 172-197 can be removed

// New execution logic in runScriptAction():
async function runScriptAction(scriptUri: vscode.Uri) {
  const config = getScriptConfig();
  
  try {
    outputChannel.appendLine(`[${new Date().toISOString()}] Executing: ${scriptUri.fsPath}`);
    
    const result = await executeScript({
      version: detectVersion(config.installPath), // You'll need version detection
      scriptPath: scriptUri.fsPath,
      projectName: config.projectName,
      timeout: 120000, // 2 minutes
      standalone: false, // Change based on requirement
    });
    
    // Log output
    if (result.stdout) {
      outputChannel.appendLine(result.stdout);
    }
    
    if (result.stderr) {
      outputChannel.appendLine(`[STDERR] ${result.stderr}`);
    }
    
    // Show result
    if (result.success) {
      outputChannel.appendLine(`[${new Date().toISOString()}] Execution completed successfully (${result.duration}ms)`);
      vscode.window.showInformationMessage(`Script executed successfully in ${result.duration}ms`);
    } else {
      outputChannel.appendLine(`[${new Date().toISOString()}] Execution failed with exit code ${result.exitCode}`);
      vscode.window.showErrorMessage(`Script execution failed (exit code: ${result.exitCode})`);
    }
    
  } catch (error: any) {
    outputChannel.appendLine(`[${new Date().toISOString()}] Fatal error: ${error.message}`);
    vscode.window.showErrorMessage(`Failed to execute script: ${error.message}`);
  }
  
  outputChannel.show();
}

// Helper function to detect version from install path
function detectVersion(installPath: string): string {
  // Extract version from path like /opt/WinCC_OA/3.21 or C:/Siemens/.../3.20
  const match = installPath.match(/(\d+\.\d+)/);
  if (match) {
    return match[1];
  }
  throw new Error('Could not detect WinCC OA version from install path');
}
```

**Validation**:
- Build extension
- Test "Run Script Action" command
- Verify output in Output Channel
- Check success/error notifications

---

## Verification Checklist

### Build & Package
- [ ] `npm run build` succeeds without errors
- [ ] All TypeScript files compile cleanly
- [ ] Generated `dist/` contains cjs, esm, and types
- [ ] Package size is reasonable (<500KB)

### CLI Testing
- [ ] `npm link` creates global command
- [ ] `winccoa-ctrl --help` shows usage
- [ ] `winccoa-ctrl --version` shows correct version
- [ ] `winccoa-ctrl execute` works with test script
- [ ] Parameters are passed correctly to script
- [ ] JSON output mode works
- [ ] Error handling works (missing script, invalid project)

### API Testing
- [ ] Unit tests pass (`npm test`)
- [ ] Integration tests pass with real WinCC OA
- [ ] Timeout handling works correctly
- [ ] Output capture is complete
- [ ] Exit codes are handled properly

### VS Code Extension Integration
- [ ] Extension activates without errors
- [ ] Script execution trigger works
- [ ] Output appears in Output Channel
- [ ] Success/error notifications show
- [ ] No breaking changes for users

### Documentation
- [ ] README is complete and accurate
- [ ] API documentation includes examples
- [ ] CLI documentation includes all flags
- [ ] CHANGELOG entry is clear
- [ ] Migration notes are provided

### Cross-Platform
- [ ] Tested on Linux
- [ ] Tested on Windows (if possible)
- [ ] Path handling works on both platforms
- [ ] Binary detection works correctly

---

## Common Issues & Solutions

### Issue: CtrlComponent not found
**Solution**: Ensure `@winccoa-tools-pack/npm-winccoa-core` is installed and CtrlComponent exists. If not, you may need to implement it following UIComponent pattern.

### Issue: Script not found error
**Solution**: WCCOActrl requires scripts to be in `scripts/` directory or use absolute paths. Always resolve to absolute paths.

### Issue: Timeout not working
**Solution**: Ensure CtrlComponent.start() supports timeout option. May need to implement using AbortController or similar.

### Issue: Output not captured
**Solution**: Verify CtrlComponent exposes stdOut/stdErr properties after execution completes.

### Issue: Exit code always 1
**Solution**: For `-help` and `-version`, exit code 1 is normal. Only check exit code for actual script execution.

---

## Next Steps After MVP

1. **Auto-detection Feature**: Implement WinCC OA installation and project detection
2. **Interactive Mode**: Support stdin/stdout streaming for interactive scripts
3. **Progress Reporting**: Add progress callbacks for long-running operations
4. **Parallel Execution**: Support running multiple scripts concurrently
5. **GitHub Actions**: Create action for CI/CD integration
6. **Enhanced Error Messages**: Parse WCCOActrl errors for better diagnostics

---

## Success Criteria

The implementation is considered complete when:
- ✅ All unit tests pass
- ✅ CLI tool works with real WinCC OA installation
- ✅ VS Code extension successfully uses the library
- ✅ Documentation is complete with examples
- ✅ Cross-platform compatibility verified
- ✅ Package published to npm
- ✅ CI/CD pipeline passes

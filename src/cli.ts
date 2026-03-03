#!/usr/bin/env node

import { executeScript } from './api';
import type { CtrlExecutionOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * CLI exit codes.
 */
const EXIT_OK = 0;
const EXIT_USAGE = 1;
const EXIT_EXECUTION_FAILED = 2;

/**
 * Print usage information to stderr.
 */
function printUsage(): void {
    const bin = 'winccoa-ctrl';
    process.stderr.write(
        [
            '',
            `Usage: ${bin} execute <scriptPath> [options]`,
            '',
            'Execute a WinCC OA CTRL script via WCCOActrl.',
            '',
            'Options:',
            '  -v, --version <ver>        WinCC OA version (e.g. 3.21)       [required]',
            '  -p, --project <name>       Project name                        [required]',
            '  -t, --timeout <ms>         Execution timeout in ms             (default: 60000)',
            '  -c, --config <path>        Custom config file path',
            '  --params <arg1> <arg2>...  Script parameters (positional)',
            '  --standalone               Run without Data/Event connection (-n)',
            '  --syntax-only              Syntax check only, no execution',
            '  --report-file <name>       Report output file',
            '  --enable-trace             Enable CTRL trace messages (-dbg 29)',
            '  --silent                   Suppress console output',
            '  --json                     Output result as JSON',
            '  -h, --help                 Show this help message',
            '',
            'Examples:',
            `  ${bin} execute script.ctl -v 3.21 -p MyProject`,
            `  ${bin} execute /path/to/script.ctl -v 3.21 -p MyProject --standalone`,
            `  ${bin} execute script.ctl -v 3.21 -p MyProject --params arg1 arg2`,
            `  ${bin} execute script.ctl -v 3.21 -p MyProject --syntax-only`,
            `  ${bin} execute script.ctl -v 3.21 -p MyProject --json`,
            '',
        ].join('\n'),
    );
}

/**
 * Parsed CLI arguments.
 */
interface ParsedArgs {
    scriptPath: string;
    version: string;
    projectName: string;
    timeout?: number;
    configPath?: string;
    params?: string[];
    standalone: boolean;
    syntaxOnly: boolean;
    reportFile?: string;
    enableTrace: boolean;
    silent: boolean;
    json: boolean;
}

/**
 * Minimal argument parser for the execute command.
 * Returns the parsed CLI options or null when the input is invalid.
 */
function parseArgs(argv: string[]): ParsedArgs | null {
    // Strip node + script path
    const args = argv.slice(2);

    if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
        return null;
    }

    // Expect: execute <scriptPath> [options]
    if (args[0] !== 'execute') {
        process.stderr.write(`Error: Unknown command "${args[0]}". Expected "execute".\n`);
        return null;
    }

    const scriptPath = args[1];
    if (!scriptPath || scriptPath.startsWith('-')) {
        process.stderr.write('Error: Missing script path.\n');
        return null;
    }

    let version = '';
    let projectName = '';
    let timeout: number | undefined;
    let configPath: string | undefined;
    let params: string[] | undefined;
    let standalone = false;
    let syntaxOnly = false;
    let reportFile: string | undefined;
    let enableTrace = false;
    let silent = false;
    let json = false;

    // Parse remaining flags
    let i = 2;
    while (i < args.length) {
        const flag = args[i];
        switch (flag) {
            case '-v':
            case '--version':
                version = args[++i] ?? '';
                break;
            case '-p':
            case '--project':
                projectName = args[++i] ?? '';
                break;
            case '-t':
            case '--timeout': {
                const raw = args[++i] ?? '';
                const parsed = Number(raw);
                if (isNaN(parsed) || parsed <= 0) {
                    process.stderr.write(`Error: Invalid timeout value "${raw}".\n`);
                    return null;
                }
                timeout = parsed;
                break;
            }
            case '-c':
            case '--config':
                configPath = args[++i] ?? '';
                break;
            case '--params': {
                // Collect all remaining non-flag arguments as params
                params = [];
                i++;
                while (i < args.length && !args[i].startsWith('-')) {
                    params.push(args[i]);
                    i++;
                }
                i--; // Back up one since the outer loop will increment
                break;
            }
            case '--standalone':
                standalone = true;
                break;
            case '--syntax-only':
                syntaxOnly = true;
                break;
            case '--report-file':
                reportFile = args[++i] ?? '';
                break;
            case '--enable-trace':
                enableTrace = true;
                break;
            case '--silent':
                silent = true;
                break;
            case '--json':
                json = true;
                break;
            default:
                process.stderr.write(`Error: Unknown option "${flag}".\n`);
                return null;
        }
        i++;
    }

    if (!version) {
        process.stderr.write('Error: WinCC OA version is required (-v / --version).\n');
        return null;
    }

    if (!projectName) {
        process.stderr.write('Error: Project name is required (-p / --project).\n');
        return null;
    }

    return {
        scriptPath,
        version,
        projectName,
        timeout,
        configPath,
        params,
        standalone,
        syntaxOnly,
        reportFile,
        enableTrace,
        silent,
        json,
    };
}

/**
 * Main CLI entry point.
 */
async function main(): Promise<void> {
    const parsed = parseArgs(process.argv);

    if (!parsed) {
        printUsage();
        process.exitCode = EXIT_USAGE;
        return;
    }

    // Resolve script path to absolute
    const absoluteScriptPath = path.resolve(parsed.scriptPath);

    // Check if script exists
    if (!fs.existsSync(absoluteScriptPath)) {
        if (parsed.json) {
            process.stdout.write(
                JSON.stringify(
                    {
                        success: false,
                        error: `Script file not found: ${absoluteScriptPath}`,
                    },
                    null,
                    2,
                ) + '\n',
            );
        } else {
            process.stderr.write(`Error: Script file not found: ${absoluteScriptPath}\n`);
        }
        process.exitCode = EXIT_USAGE;
        return;
    }

    // Build execution options
    const options: CtrlExecutionOptions = {
        version: parsed.version,
        scriptPath: absoluteScriptPath,
        projectName: parsed.projectName,
        timeout: parsed.timeout,
        configPath: parsed.configPath,
        params: parsed.params,
        standalone: parsed.standalone,
        syntaxOnly: parsed.syntaxOnly,
        reportFile: parsed.reportFile,
        enableTrace: parsed.enableTrace,
    };

    // Print execution info unless silent or JSON mode
    if (!parsed.silent && !parsed.json) {
        process.stderr.write(`Executing: ${path.basename(parsed.scriptPath)}\n`);
        process.stderr.write(`Project: ${parsed.projectName}\n`);
        process.stderr.write(`Version: ${parsed.version}\n`);
        if (parsed.params && parsed.params.length > 0) {
            process.stderr.write(`Parameters: ${parsed.params.join(', ')}\n`);
        }
        if (parsed.standalone) {
            process.stderr.write(`Mode: Standalone (no Data/Event connection)\n`);
        }
        if (parsed.syntaxOnly) {
            process.stderr.write(`Mode: Syntax check only\n`);
        }
        process.stderr.write('---\n');
    }

    try {
        const result = await executeScript(options);

        // Handle JSON output
        if (parsed.json) {
            process.stdout.write(JSON.stringify(result, null, 2) + '\n');
            process.exitCode = result.exitCode;
            return;
        }

        // Handle normal output
        if (!parsed.silent) {
            if (result.stdout) {
                process.stdout.write(result.stdout);
                if (!result.stdout.endsWith('\n')) {
                    process.stdout.write('\n');
                }
            }

            if (result.stderr) {
                process.stderr.write(result.stderr);
                if (!result.stderr.endsWith('\n')) {
                    process.stderr.write('\n');
                }
            }

            process.stderr.write('---\n');
            process.stderr.write(`Exit code: ${result.exitCode}\n`);
            if (result.duration !== undefined) {
                process.stderr.write(`Duration: ${result.duration}ms\n`);
            }
            process.stderr.write(`Status: ${result.success ? 'SUCCESS' : 'FAILED'}\n`);
        }

        process.exitCode = result.success ? EXIT_OK : EXIT_EXECUTION_FAILED;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        if (parsed.json) {
            process.stdout.write(
                JSON.stringify(
                    {
                        success: false,
                        error: message,
                        stack: err instanceof Error ? err.stack : undefined,
                    },
                    null,
                    2,
                ) + '\n',
            );
        } else {
            process.stderr.write(`Fatal error: ${message}\n`);
        }

        process.exitCode = EXIT_EXECUTION_FAILED;
    }
}

// Auto-run only when invoked directly (not when imported for testing)
const isDirectRun =
    process.argv[1] &&
    (process.argv[1].endsWith('cli.js') ||
        process.argv[1].endsWith('cli.ts') ||
        process.argv[1].endsWith('cli.cjs') ||
        process.argv[1].endsWith('cli.mjs'));

if (isDirectRun) {
    main();
}


// Export for testing
export { parseArgs, printUsage, main };

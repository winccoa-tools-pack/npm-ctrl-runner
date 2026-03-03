import { CtrlComponent } from '@winccoa-tools-pack/npm-winccoa-core/types/components/implementations/CtrlComponent';
import type {
    CtrlExecutionOptions,
    CtrlExecutionResult,
    OutputCallback,
    OutputEvent,
} from './types';

/**
 * Default execution timeout (60 seconds).
 */
const DEFAULT_TIMEOUT = 60_000;

/**
 * Runner class for executing WinCC OA CTRL scripts via WCCOActrl executable.
 *
 * Uses the WinCC OA CTRL manager (`WCCOActrl`) to execute .ctl script files
 * with support for parameters, timeout handling, and real-time output streaming.
 *
 * **Important:** Script arguments are passed as **positional parameters**
 * after the script path, NOT as flags. The command structure is:
 * `WCCOActrl script.ctl [arg1 arg2 ...] -proj <projectName> [options]`
 *
 * @example
 * ```typescript
 * const runner = new CtrlRunner();
 * const result = await runner.execute({
 *     version: '3.21',
 *     scriptPath: '/path/to/script.ctl',
 *     projectName: 'MyProject',
 *     params: ['arg1', 'arg2'],
 *     timeout: 120000
 * });
 * 
 * if (result.success) {
 *     console.log('Script completed:', result.stdout);
 * } else {
 *     console.error('Script failed:', result.stderr);
 * }
 * ```
 */
export class CtrlRunner {
    private ctrl: CtrlComponent;
    private outputCallbacks: OutputCallback[] = [];

    constructor() {
        this.ctrl = new CtrlComponent();
    }

    /**
     * Execute a CTRL script with the given options.
     *
     * @param options - Execution configuration
     * @returns Promise resolving to execution result
     *
     * @example
     * ```typescript
     * const result = await runner.execute({
     *     version: '3.21',
     *     scriptPath: '/path/to/script.ctl',
     *     projectName: 'MyProject',
     *     standalone: true,
     *     timeout: 60000
     * });
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
     * Register a callback for streaming output events.
     *
     * Note: Current implementation collects output and returns it in the result.
     * Real-time streaming support depends on CtrlComponent implementation.
     *
     * @param callback - Function to call on each output event
     *
     * @example
     * ```typescript
     * runner.onOutput((event) => {
     *     console.log(`[${event.timestamp.toISOString()}] ${event.type}:`, event.data);
     * });
     * ```
     */
    onOutput(callback: OutputCallback): void {
        this.outputCallbacks.push(callback);
    }

    /**
     * Build WCCOActrl command-line arguments from options.
     *
     * Arguments are ordered according to WCCOActrl syntax:
     * 1. Script path (first positional argument)
     * 2. Script parameters (positional, must come before flags)
     * 3. -proj <projectName> (REQUIRED)
     * 4. Optional flags (-n, -syntax, -config, etc.)
     *
     * @param options - Execution options
     * @returns Array of CLI arguments
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
     * Check if WCCOActrl executable exists for the given version.
     *
     * @param version - WinCC OA version (e.g., "3.21")
     * @returns True if executable exists and is accessible
     */
    exists(version: string): boolean {
        this.ctrl.setVersion(version);
        return this.ctrl.exists();
    }

    /**
     * Get the path to WCCOActrl executable for the given version.
     *
     * @param version - WinCC OA version (e.g., "3.21")
     * @returns Absolute path to WCCOActrl binary, or null if not found
     */
    getExecutablePath(version: string): string | null {
        this.ctrl.setVersion(version);
        return this.ctrl.getPath();
    }
}

/**
 * Options for executing a CTRL script via WCCOActrl.
 * 
 * @example
 * ```typescript
 * const options: CtrlExecutionOptions = {
 *   version: '3.21',
 *   scriptPath: '/path/to/script.ctl',
 *   projectName: 'MyProject',
 *   timeout: 120000
 * };
 * ```
 */
export interface CtrlExecutionOptions {
    /**
     * WinCC OA version (e.g., "3.21") for executable resolution.
     * Used to locate the correct WCCOActrl binary.
     */
    version: string;

    /**
     * Absolute path to the .ctl script file.
     * Must be accessible from the filesystem.
     */
    scriptPath: string;

    /**
     * WinCC OA project name (required for -proj parameter).
     * The project must be registered or a configPath must be provided.
     */
    projectName: string;

    /**
     * Optional script parameters (passed as positional arguments).
     * These are passed to the script's main() function.
     * 
     * @example ['arg1', 'arg2'] → WCCOActrl script.ctl arg1 arg2 -proj MyProject
     */
    params?: string[];

    /**
     * Execution timeout in milliseconds.
     * @default 60000 (60 seconds)
     */
    timeout?: number;

    /**
     * Optional custom config file path (for -config parameter).
     * Overrides PVSS_II environment variable.
     */
    configPath?: string;

    /**
     * Run in standalone mode without Data/Event Manager connection (-n flag).
     * Useful for scripts that don't need runtime system connection.
     * @default false
     */
    standalone?: boolean;

    /**
     * Perform syntax check only without execution (-syntax flag).
     * Script will be parsed but not executed.
     * @default false
     */
    syntaxOnly?: boolean;

    /**
     * Optional report file name (for -reportfile parameter).
     * Output will be written to project's log directory.
     */
    reportFile?: string;

    /**
     * Enable CTRL trace messages (-dbg 29).
     * Provides detailed execution tracing for debugging.
     * @default false
     */
    enableTrace?: boolean;
}

/**
 * Result of a CTRL script execution.
 * 
 * @example
 * ```typescript
 * const result = await executeScript(options);
 * if (result.success) {
 *   console.log('Script completed in', result.duration, 'ms');
 *   console.log('Output:', result.stdout);
 * } else {
 *   console.error('Script failed with exit code', result.exitCode);
 *   console.error('Error:', result.stderr);
 * }
 * ```
 */
export interface CtrlExecutionResult {
    /**
     * Whether execution was successful (exitCode === 0).
     */
    success: boolean;

    /**
     * Process exit code.
     * 0 indicates success, any other value indicates an error.
     */
    exitCode: number;

    /**
     * Complete stdout output from the script execution.
     * Includes DebugN() output and other console messages.
     */
    stdout: string;

    /**
     * Complete stderr output from the script execution.
     * Includes error messages and warnings.
     */
    stderr: string;

    /**
     * Path to the executed script (for reference).
     */
    scriptPath: string;

    /**
     * Project name used for execution (for reference).
     */
    projectName: string;

    /**
     * Execution duration in milliseconds.
     * Measured from process start to completion.
     */
    duration?: number;
}

/**
 * Event data for streaming output.
 * Used for real-time output monitoring during script execution.
 */
export interface OutputEvent {
    /**
     * Output stream type.
     */
    type: 'stdout' | 'stderr';

    /**
     * Output data chunk.
     */
    data: string;

    /**
     * Timestamp when data was received.
     */
    timestamp: Date;
}

/**
 * Callback function for streaming output events.
 * Called for each chunk of output data during execution.
 * 
 * @example
 * ```typescript
 * runner.onOutput((event) => {
 *   console.log(`[${event.type}]`, event.data);
 * });
 * ```
 */
export type OutputCallback = (event: OutputEvent) => void;

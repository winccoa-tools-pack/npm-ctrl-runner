import { CtrlRunner } from './runner';
import type { CtrlExecutionOptions, CtrlExecutionResult } from './types';

/**
 * Shared singleton runner instance for convenience functions.
 */
let sharedRunner: CtrlRunner | null = null;

/**
 * Get or create the shared runner instance.
 * @returns Shared CtrlRunner instance
 */
function getSharedRunner(): CtrlRunner {
    if (!sharedRunner) {
        sharedRunner = new CtrlRunner();
    }
    return sharedRunner;
}

/**
 * Execute a CTRL script with the given options.
 *
 * This is a convenience function that uses a shared runner instance.
 * For more control (e.g., output streaming), create your own CtrlRunner instance.
 *
 * @param options - Execution configuration
 * @returns Promise resolving to execution result
 *
 * @example
 * ```typescript
 * import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl';
 *
 * const result = await executeScript({
 *     version: '3.21',
 *     scriptPath: '/path/to/script.ctl',
 *     projectName: 'MyProject',
 *     timeout: 120000
 * });
 *
 * if (!result.success) {
 *     console.error('Script failed:', result.stderr);
 *     process.exit(result.exitCode);
 * }
 *
 * console.log('Output:', result.stdout);
 * ```
 */
export async function executeScript(options: CtrlExecutionOptions): Promise<CtrlExecutionResult> {
    const runner = getSharedRunner();
    return runner.execute(options);
}

/**
 * Create a new CtrlRunner instance.
 *
 * Use this when you need multiple independent runners or want to
 * manage the runner lifecycle yourself (e.g., for output streaming).
 *
 * @returns New CtrlRunner instance
 *
 * @example
 * ```typescript
 * import { createRunner } from '@winccoa-tools-pack/npm-winccoa-ctrl';
 *
 * const runner = createRunner();
 *
 * // Optional: Register output callback for real-time logging
 * runner.onOutput((event) => {
 *     console.log(`[${event.type}]`, event.data);
 * });
 *
 * const result = await runner.execute({
 *     version: '3.21',
 *     scriptPath: '/path/to/script.ctl',
 *     projectName: 'MyProject'
 * });
 * ```
 */
export function createRunner(): CtrlRunner {
    return new CtrlRunner();
}

/**
 * Check if WCCOActrl executable exists for the given version.
 *
 * Useful for validation before attempting script execution.
 *
 * @param version - WinCC OA version (e.g., "3.21")
 * @returns True if executable exists and is accessible
 *
 * @example
 * ```typescript
 * import { checkExecutable } from '@winccoa-tools-pack/npm-winccoa-ctrl';
 *
 * if (!checkExecutable('3.21')) {
 *     console.error('WCCOActrl not found for version 3.21');
 *     process.exit(1);
 * }
 * ```
 */
export function checkExecutable(version: string): boolean {
    const runner = getSharedRunner();
    return runner.exists(version);
}

/**
 * Get the path to WCCOActrl executable for the given version.
 *
 * @param version - WinCC OA version (e.g., "3.21")
 * @returns Absolute path to WCCOActrl binary, or null if not found
 *
 * @example
 * ```typescript
 * import { getExecutablePath } from '@winccoa-tools-pack/npm-winccoa-ctrl';
 *
 * const path = getExecutablePath('3.21');
 * console.log('WCCOActrl location:', path);
 * // Output: /opt/WinCC_OA/3.21/bin/WCCOActrl
 * ```
 */
export function getExecutablePath(version: string): string | null {
    const runner = getSharedRunner();
    return runner.getExecutablePath(version);
}

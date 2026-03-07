/**
 * WinCC OA CTRL Script Runner
 *
 * Execute WinCC OA CTRL scripts programmatically with TypeScript/JavaScript API and CLI.
 * Provides reliable script execution using the WCCOActrl manager under the hood.
 *
 * @example
 * ```typescript
 * import { executeScript } from '@winccoa-tools-pack/npm-winccoa-ctrl-runner';
 *
 * const result = await executeScript({
 *     version: '3.21',
 *     scriptPath: '/path/to/script.ctl',
 *     projectName: 'MyProject'
 * });
 *
 * if (result.success) {
 *     console.log('Script completed:', result.stdout);
 * } else {
 *     console.error('Script failed:', result.stderr);
 * }
 * ```
 */

// Types
export type {
    CtrlExecutionOptions,
    CtrlExecutionResult,
    OutputEvent,
    OutputCallback,
} from './types';

// Core runner
export { CtrlRunner } from './runner';

// Convenience API
export { executeScript, createRunner, checkExecutable, getExecutablePath } from './api';

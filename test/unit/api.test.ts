import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { executeScript, createRunner, checkExecutable, getExecutablePath } from '../../src/api';
import { CtrlRunner } from '../../src/runner';
import type { CtrlExecutionOptions, CtrlExecutionResult } from '../../src/types';

const MOCK_RESULT: CtrlExecutionResult = {
    success: true,
    exitCode: 0,
    stdout: 'mock output',
    stderr: '',
    scriptPath: '/path/to/script.ctl',
    projectName: 'TestProject',
    duration: 500,
};

describe('API convenience functions', () => {
    describe('executeScript()', () => {
        it('should execute a script using the shared runner', async () => {
            const originalExecute = CtrlRunner.prototype.execute;
            const calls: any[] = [];

            CtrlRunner.prototype.execute = mock.fn(async function (this: any, options: CtrlExecutionOptions) {
                calls.push(options);
                return MOCK_RESULT;
            }) as any;

            try {
                const result = await executeScript({
                    version: '3.21',
                    scriptPath: '/path/to/script.ctl',
                    projectName: 'TestProject',
                });

                assert.equal(result.success, true);
                assert.equal(result.exitCode, 0);
                assert.equal(result.stdout, 'mock output');
                assert.equal(calls.length, 1);
                assert.equal(calls[0].version, '3.21');
                assert.equal(calls[0].scriptPath, '/path/to/script.ctl');
                assert.equal(calls[0].projectName, 'TestProject');
            } finally {
                CtrlRunner.prototype.execute = originalExecute;
            }
        });

        it('should forward all options to the runner', async () => {
            const originalExecute = CtrlRunner.prototype.execute;
            const calls: any[] = [];

            CtrlRunner.prototype.execute = mock.fn(async function (this: any, options: CtrlExecutionOptions) {
                calls.push(options);
                return { ...MOCK_RESULT, success: false, exitCode: 1 };
            }) as any;

            try {
                const result = await executeScript({
                    version: '3.21',
                    scriptPath: '/test.ctl',
                    projectName: 'P',
                    params: ['x', 'y'],
                    timeout: 10000,
                    standalone: true,
                    syntaxOnly: false,
                    enableTrace: true,
                });

                assert.equal(result.success, false);
                assert.deepEqual(calls[0].params, ['x', 'y']);
                assert.equal(calls[0].timeout, 10000);
                assert.equal(calls[0].standalone, true);
                assert.equal(calls[0].enableTrace, true);
            } finally {
                CtrlRunner.prototype.execute = originalExecute;
            }
        });
    });

    describe('createRunner()', () => {
        it('should return a new CtrlRunner instance', () => {
            const runner = createRunner();
            assert.ok(runner instanceof CtrlRunner, 'should be a CtrlRunner instance');
        });

        it('should return distinct instances on each call', () => {
            const r1 = createRunner();
            const r2 = createRunner();
            assert.notEqual(r1, r2, 'each call should return a different instance');
        });

        it('should return an instance with execute method', () => {
            const runner = createRunner();
            assert.equal(typeof runner.execute, 'function');
        });
    });

    describe('checkExecutable()', () => {
        it('should return true when executable exists', () => {
            const originalExists = CtrlRunner.prototype.exists;
            CtrlRunner.prototype.exists = mock.fn(() => true) as any;

            try {
                const result = checkExecutable('3.21');
                assert.equal(result, true);
            } finally {
                CtrlRunner.prototype.exists = originalExists;
            }
        });

        it('should return false when executable does not exist', () => {
            const originalExists = CtrlRunner.prototype.exists;
            CtrlRunner.prototype.exists = mock.fn(() => false) as any;

            try {
                const result = checkExecutable('3.99');
                assert.equal(result, false);
            } finally {
                CtrlRunner.prototype.exists = originalExists;
            }
        });
    });

    describe('getExecutablePath()', () => {
        it('should return the executable path when found', () => {
            const originalGetPath = CtrlRunner.prototype.getExecutablePath;
            CtrlRunner.prototype.getExecutablePath = mock.fn(
                () => '/opt/WinCC_OA/3.21/bin/WCCOActrl',
            ) as any;

            try {
                const result = getExecutablePath('3.21');
                assert.equal(result, '/opt/WinCC_OA/3.21/bin/WCCOActrl');
            } finally {
                CtrlRunner.prototype.getExecutablePath = originalGetPath;
            }
        });

        it('should return null when executable is not found', () => {
            const originalGetPath = CtrlRunner.prototype.getExecutablePath;
            CtrlRunner.prototype.getExecutablePath = mock.fn(() => null) as any;

            try {
                const result = getExecutablePath('3.99');
                assert.equal(result, null);
            } finally {
                CtrlRunner.prototype.getExecutablePath = originalGetPath;
            }
        });
    });
});

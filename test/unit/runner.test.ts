import { describe, it, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CtrlRunner } from '../../src/runner';

describe('CtrlRunner', () => {
    let runner: CtrlRunner;

    beforeEach(() => {
        runner = new CtrlRunner();
    });

    describe('execute()', () => {
        it('should call CtrlComponent.start with correct args (minimal options)', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: { args: string[]; options: any }[] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[], options: any) => {
                capturedArgs.push({ args, options });
                return 0;
            });
            ctrl.stdOut = 'script output';
            ctrl.stdErr = '';

            const result = await runner.execute({
                version: '3.21',
                scriptPath: '/path/to/script.ctl',
                projectName: 'TestProject',
            });

            // Version was set correctly
            assert.equal(ctrl.setVersion.mock.callCount(), 1);
            assert.deepEqual(ctrl.setVersion.mock.calls[0].arguments, ['3.21']);

            // start was called once
            assert.equal(ctrl.start.mock.callCount(), 1);
            const args = capturedArgs[0].args;

            // Script path is the first positional argument
            assert.equal(args[0], '/path/to/script.ctl');
            // -proj flag is present and followed by the project name
            assert.ok(args.includes('-proj'), 'should include -proj');
            assert.equal(args[args.indexOf('-proj') + 1], 'TestProject');

            // Result fields
            assert.equal(result.success, true);
            assert.equal(result.exitCode, 0);
            assert.equal(result.stdout, 'script output');
            assert.equal(result.scriptPath, '/path/to/script.ctl');
            assert.equal(result.projectName, 'TestProject');
            assert.ok(result.duration !== undefined, 'duration should be set');
        });

        it('should pass script params as positional args BEFORE -proj', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/path/test.ctl',
                projectName: 'Proj',
                params: ['arg1', 'arg2'],
            });

            const args = capturedArgs[0];
            // Order: scriptPath, param1, param2, -proj, projectName
            assert.equal(args[0], '/path/test.ctl');
            assert.equal(args[1], 'arg1');
            assert.equal(args[2], 'arg2');
            assert.equal(args[3], '-proj');
            assert.equal(args[4], 'Proj');
        });

        it('should include -n flag when standalone is true', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                standalone: true,
            });

            assert.ok(capturedArgs[0].includes('-n'), 'should include -n for standalone');
        });

        it('should NOT include -n flag when standalone is false or omitted', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                standalone: false,
            });

            assert.ok(!capturedArgs[0].includes('-n'), 'should NOT include -n');
        });

        it('should include -syntax flag when syntaxOnly is true', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                syntaxOnly: true,
            });

            assert.ok(capturedArgs[0].includes('-syntax'), 'should include -syntax');
        });

        it('should include -config flag when configPath is provided', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                configPath: '/path/to/config',
            });

            const args = capturedArgs[0];
            const idx = args.indexOf('-config');
            assert.ok(idx >= 0, 'should include -config');
            assert.equal(args[idx + 1], '/path/to/config');
        });

        it('should include -reportfile flag when reportFile is provided', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                reportFile: 'my-report',
            });

            const args = capturedArgs[0];
            const idx = args.indexOf('-reportfile');
            assert.ok(idx >= 0, 'should include -reportfile');
            assert.equal(args[idx + 1], 'my-report');
        });

        it('should include -dbg 29 when enableTrace is true', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                enableTrace: true,
            });

            const args = capturedArgs[0];
            const idx = args.indexOf('-dbg');
            assert.ok(idx >= 0, 'should include -dbg');
            assert.equal(args[idx + 1], '29');
        });

        it('should NOT include -dbg when enableTrace is omitted', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
            });

            assert.ok(!capturedArgs[0].includes('-dbg'), 'should NOT include -dbg by default');
        });

        it('should pass custom timeout to CtrlComponent.start', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedOptions: any[] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (_args: string[], options: any) => {
                capturedOptions.push(options);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
                timeout: 30000,
            });

            assert.equal(capturedOptions[0].timeout, 30000);
        });

        it('should use default 60s timeout when timeout is not specified', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedOptions: any[] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (_args: string[], options: any) => {
                capturedOptions.push(options);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
            });

            assert.equal(capturedOptions[0].timeout, 60000);
        });

        it('should return success: false when exit code is non-zero', async () => {
            const ctrl = (runner as any).ctrl;

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async () => 1);
            ctrl.stdOut = '';
            ctrl.stdErr = 'error occurred';

            const result = await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
            });

            assert.equal(result.success, false);
            assert.equal(result.exitCode, 1);
            assert.equal(result.stderr, 'error occurred');
        });

        it('should capture stdout and stderr from CtrlComponent', async () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async () => 0);
            ctrl.stdOut = 'standard output';
            ctrl.stdErr = 'standard error';

            const result = await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
            });

            assert.equal(result.stdout, 'standard output');
            assert.equal(result.stderr, 'standard error');
        });

        it('should set duration when execution completes', async () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async () => 0);
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            const result = await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'P',
            });

            assert.ok(typeof result.duration === 'number', 'duration should be a number');
            assert.ok(result.duration >= 0, 'duration should be non-negative');
        });

        it('should combine multiple optional flags correctly', async () => {
            const ctrl = (runner as any).ctrl;
            const capturedArgs: string[][] = [];

            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.start = mock.fn(async (args: string[]) => {
                capturedArgs.push(args);
                return 0;
            });
            ctrl.stdOut = '';
            ctrl.stdErr = '';

            await runner.execute({
                version: '3.21',
                scriptPath: '/test.ctl',
                projectName: 'Proj',
                params: ['p1', 'p2'],
                standalone: true,
                syntaxOnly: true,
                configPath: '/cfg',
                reportFile: 'rpt',
                enableTrace: true,
            });

            const args = capturedArgs[0];
            // Check positional order: scriptPath, params before -proj
            assert.equal(args[0], '/test.ctl');
            const projIdx = args.indexOf('-proj');
            assert.ok(projIdx > 0);
            // params come before -proj
            assert.ok(args.indexOf('p1') < projIdx);
            assert.ok(args.indexOf('p2') < projIdx);
            // flags present
            assert.ok(args.includes('-n'));
            assert.ok(args.includes('-syntax'));
            assert.ok(args.includes('-config'));
            assert.ok(args.includes('-reportfile'));
            assert.ok(args.includes('-dbg'));
        });
    });

    describe('onOutput()', () => {
        it('should register an output callback without error', () => {
            const cb = (_event: any) => {};
            assert.doesNotThrow(() => {
                runner.onOutput(cb);
            });
        });

        it('should allow multiple callbacks to be registered', () => {
            const cb1 = (_event: any) => {};
            const cb2 = (_event: any) => {};
            runner.onOutput(cb1);
            runner.onOutput(cb2);
            const callbacks = (runner as any).outputCallbacks;
            assert.equal(callbacks.length, 2);
        });
    });

    describe('exists()', () => {
        it('should set version and delegate to CtrlComponent.exists()', () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.exists = mock.fn(() => true);

            const result = runner.exists('3.21');

            assert.equal(ctrl.setVersion.mock.callCount(), 1);
            assert.deepEqual(ctrl.setVersion.mock.calls[0].arguments, ['3.21']);
            assert.equal(ctrl.exists.mock.callCount(), 1);
            assert.equal(result, true);
        });

        it('should return false when CtrlComponent.exists() returns false', () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.exists = mock.fn(() => false);

            const result = runner.exists('3.99');

            assert.equal(result, false);
        });
    });

    describe('getExecutablePath()', () => {
        it('should set version and delegate to CtrlComponent.getPath()', () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.getPath = mock.fn(() => '/opt/WinCC_OA/3.21/bin/WCCOActrl');

            const result = runner.getExecutablePath('3.21');

            assert.equal(ctrl.setVersion.mock.callCount(), 1);
            assert.deepEqual(ctrl.setVersion.mock.calls[0].arguments, ['3.21']);
            assert.equal(ctrl.getPath.mock.callCount(), 1);
            assert.equal(result, '/opt/WinCC_OA/3.21/bin/WCCOActrl');
        });

        it('should return null when executable is not found', () => {
            const ctrl = (runner as any).ctrl;
            ctrl.setVersion = mock.fn((_v: string) => {});
            ctrl.getPath = mock.fn(() => null);

            const result = runner.getExecutablePath('3.99');

            assert.equal(result, null);
        });
    });
});

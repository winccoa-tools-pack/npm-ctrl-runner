import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CtrlExecutionOptions, CtrlExecutionResult, OutputEvent, OutputCallback } from '../../src/types';

describe('CtrlExecutionOptions', () => {
    it('should allow construction of a minimal options object', () => {
        const opts: CtrlExecutionOptions = {
            version: '3.21',
            scriptPath: '/path/to/script.ctl',
            projectName: 'MyProject',
        };
        assert.equal(opts.version, '3.21');
        assert.equal(opts.scriptPath, '/path/to/script.ctl');
        assert.equal(opts.projectName, 'MyProject');
    });

    it('should allow all optional fields', () => {
        const opts: CtrlExecutionOptions = {
            version: '3.21',
            scriptPath: '/path/to/script.ctl',
            projectName: 'MyProject',
            params: ['arg1', 'arg2'],
            timeout: 30000,
            configPath: '/path/to/config',
            standalone: true,
            syntaxOnly: true,
            reportFile: 'my-report',
            enableTrace: true,
        };
        assert.deepEqual(opts.params, ['arg1', 'arg2']);
        assert.equal(opts.timeout, 30000);
        assert.equal(opts.standalone, true);
        assert.equal(opts.syntaxOnly, true);
        assert.equal(opts.reportFile, 'my-report');
        assert.equal(opts.enableTrace, true);
    });
});

describe('CtrlExecutionResult', () => {
    it('should allow construction of a success result', () => {
        const result: CtrlExecutionResult = {
            success: true,
            exitCode: 0,
            stdout: 'output text',
            stderr: '',
            scriptPath: '/path/script.ctl',
            projectName: 'TestProject',
            duration: 1234,
        };
        assert.equal(result.success, true);
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, 'output text');
        assert.equal(result.duration, 1234);
    });

    it('should allow construction of a failure result', () => {
        const result: CtrlExecutionResult = {
            success: false,
            exitCode: 1,
            stdout: '',
            stderr: 'error message',
            scriptPath: '/path/script.ctl',
            projectName: 'TestProject',
        };
        assert.equal(result.success, false);
        assert.equal(result.exitCode, 1);
        assert.equal(result.stderr, 'error message');
        assert.equal(result.duration, undefined);
    });
});

describe('OutputEvent', () => {
    it('should allow stdout event', () => {
        const event: OutputEvent = {
            type: 'stdout',
            data: 'hello world',
            timestamp: new Date(),
        };
        assert.equal(event.type, 'stdout');
        assert.equal(event.data, 'hello world');
        assert.ok(event.timestamp instanceof Date);
    });

    it('should allow stderr event', () => {
        const event: OutputEvent = {
            type: 'stderr',
            data: 'error output',
            timestamp: new Date(),
        };
        assert.equal(event.type, 'stderr');
        assert.equal(event.data, 'error output');
    });
});

describe('OutputCallback', () => {
    it('should allow a function conforming to OutputCallback', () => {
        const received: OutputEvent[] = [];
        const cb: OutputCallback = (event) => {
            received.push(event);
        };
        assert.equal(typeof cb, 'function');
        cb({ type: 'stdout', data: 'test', timestamp: new Date() });
        assert.equal(received.length, 1);
        assert.equal(received[0].data, 'test');
        assert.equal(received[0].type, 'stdout');
    });
});

describe('Types module', () => {
    it('should import from types module without error', async () => {
        const mod = await import('../../src/types.js');
        assert.ok(mod !== undefined);
    });
});

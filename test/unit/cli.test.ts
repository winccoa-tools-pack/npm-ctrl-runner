import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../../src/cli';

/**
 * Helper – builds a fake process.argv array from the given CLI tokens.
 * Prepends 'node' and 'winccoa-ctrl' to mimic real argv.
 */
function argv(...tokens: string[]): string[] {
    return ['node', 'winccoa-ctrl', ...tokens];
}

describe('CLI parseArgs', () => {
    // ── valid invocations ──────────────────────────────────────

    describe('valid invocations', () => {
        it('should parse minimal required flags', () => {
            const result = parseArgs(argv('execute', 'script.ctl', '-v', '3.21', '-p', 'MyProject'));
            assert.ok(result);
            assert.equal(result.scriptPath, 'script.ctl');
            assert.equal(result.version, '3.21');
            assert.equal(result.projectName, 'MyProject');
            assert.equal(result.standalone, false);
            assert.equal(result.syntaxOnly, false);
            assert.equal(result.enableTrace, false);
            assert.equal(result.silent, false);
            assert.equal(result.json, false);
            assert.equal(result.timeout, undefined);
            assert.equal(result.configPath, undefined);
            assert.equal(result.params, undefined);
            assert.equal(result.reportFile, undefined);
        });

        it('should accept --version long form', () => {
            const result = parseArgs(argv('execute', 's.ctl', '--version', '3.20', '-p', 'P'));
            assert.ok(result);
            assert.equal(result.version, '3.20');
        });

        it('should accept --project long form', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '--project', 'MyProj'));
            assert.ok(result);
            assert.equal(result.projectName, 'MyProj');
        });

        it('should accept -t flag with timeout', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '-t', '30000'));
            assert.ok(result);
            assert.equal(result.timeout, 30000);
        });

        it('should accept --timeout long form', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--timeout', '120000'),
            );
            assert.ok(result);
            assert.equal(result.timeout, 120000);
        });

        it('should accept -c flag for config path', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '-c', '/path/to/config'),
            );
            assert.ok(result);
            assert.equal(result.configPath, '/path/to/config');
        });

        it('should accept --config long form', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--config', '/other/config'),
            );
            assert.ok(result);
            assert.equal(result.configPath, '/other/config');
        });

        it('should accept --params with a single value', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--params', 'arg1'));
            assert.ok(result);
            assert.deepEqual(result.params, ['arg1']);
        });

        it('should accept --params with multiple values', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--params', 'arg1', 'arg2', 'arg3'),
            );
            assert.ok(result);
            assert.deepEqual(result.params, ['arg1', 'arg2', 'arg3']);
        });

        it('should stop collecting --params at the next flag', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--params', 'a', 'b', '--json'),
            );
            assert.ok(result);
            assert.deepEqual(result.params, ['a', 'b']);
            assert.equal(result.json, true);
        });

        it('should accept --standalone flag', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--standalone'));
            assert.ok(result);
            assert.equal(result.standalone, true);
        });

        it('should accept --syntax-only flag', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--syntax-only'));
            assert.ok(result);
            assert.equal(result.syntaxOnly, true);
        });

        it('should accept --report-file flag', () => {
            const result = parseArgs(
                argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--report-file', 'output.log'),
            );
            assert.ok(result);
            assert.equal(result.reportFile, 'output.log');
        });

        it('should accept --enable-trace flag', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--enable-trace'));
            assert.ok(result);
            assert.equal(result.enableTrace, true);
        });

        it('should accept --silent flag', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--silent'));
            assert.ok(result);
            assert.equal(result.silent, true);
        });

        it('should accept --json flag', () => {
            const result = parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--json'));
            assert.ok(result);
            assert.equal(result.json, true);
        });

        it('should accept an absolute script path', () => {
            const result = parseArgs(
                argv('execute', '/abs/path/to/script.ctl', '-v', '3.21', '-p', 'P'),
            );
            assert.ok(result);
            assert.equal(result.scriptPath, '/abs/path/to/script.ctl');
        });

        it('should accept all flags together', () => {
            const result = parseArgs(
                argv(
                    'execute', '/abs/script.ctl',
                    '-v', '3.21',
                    '-p', 'MyProj',
                    '-t', '90000',
                    '-c', '/etc/winccoa/config',
                    '--params', 'p1', 'p2',
                    '--standalone',
                    '--report-file', 'report.log',
                    '--enable-trace',
                    '--json',
                ),
            );
            assert.ok(result);
            assert.equal(result.scriptPath, '/abs/script.ctl');
            assert.equal(result.version, '3.21');
            assert.equal(result.projectName, 'MyProj');
            assert.equal(result.timeout, 90000);
            assert.equal(result.configPath, '/etc/winccoa/config');
            assert.deepEqual(result.params, ['p1', 'p2']);
            assert.equal(result.standalone, true);
            assert.equal(result.reportFile, 'report.log');
            assert.equal(result.enableTrace, true);
            assert.equal(result.json, true);
        });
    });

    // ── error / invalid invocations ──────────────────────────────

    describe('invalid invocations', () => {
        it('should return null for empty args', () => {
            assert.equal(parseArgs(argv()), null);
        });

        it('should return null for -h', () => {
            assert.equal(parseArgs(argv('-h')), null);
        });

        it('should return null for --help', () => {
            assert.equal(parseArgs(argv('--help')), null);
        });

        it('should return null for unknown command', () => {
            assert.equal(parseArgs(argv('run', 'script.ctl', '-v', '3.21', '-p', 'P')), null);
        });

        it('should return null when script path is missing after execute', () => {
            // next token starts with '-', treated as missing path
            assert.equal(parseArgs(argv('execute', '-v', '3.21', '-p', 'P')), null);
        });

        it('should return null when version is missing', () => {
            assert.equal(parseArgs(argv('execute', 'script.ctl', '-p', 'P')), null);
        });

        it('should return null when project name is missing', () => {
            assert.equal(parseArgs(argv('execute', 'script.ctl', '-v', '3.21')), null);
        });

        it('should return null for invalid (non-numeric) timeout', () => {
            assert.equal(
                parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '-t', 'abc')),
                null,
            );
        });

        it('should return null for negative timeout', () => {
            assert.equal(
                parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '-t', '-100')),
                null,
            );
        });

        it('should return null for zero timeout', () => {
            assert.equal(
                parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '-t', '0')),
                null,
            );
        });

        it('should return null for unknown option', () => {
            assert.equal(
                parseArgs(argv('execute', 's.ctl', '-v', '3.21', '-p', 'P', '--unknown-opt')),
                null,
            );
        });
    });
});

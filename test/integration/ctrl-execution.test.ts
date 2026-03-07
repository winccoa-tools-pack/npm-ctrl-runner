import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { CtrlRunner, executeScript } from '../../src/index';
import {
    getAvailableWinCCOAVersions,
    getWinCCOAInstallationPathByVersion,
} from '@winccoa-tools-pack/npm-winccoa-core/utils/winccoa-paths';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Directory containing the fixture CTL scripts (never modified).
 */
const FIXTURE_SCRIPTS_DIR = path.resolve(__dirname, '..', 'fixtures', 'scripts');

/**
 * Central WinCC OA project registry file.
 * Linux: /etc/opt/pvss/pvssInst.conf
 * Windows: C:\ProgramData\SIEMENS\WinCC_OA\pvssInst.conf
 */
const PVSS_INST_CONF = process.platform === 'win32'
    ? path.join(process.env['ProgramData'] ?? 'C:\\ProgramData', 'SIEMENS', 'WinCC_OA', 'pvssInst.conf')
    : '/etc/opt/pvss/pvssInst.conf';

/** Unique project name used for integration test registration. */
const TEST_PROJECT_NAME = 'ctrl-runner-integration-test';

/**
 * Returns the first available WinCC OA version, or undefined if none installed.
 */
function getTestVersion(): string | undefined {
    try {
        const versions = getAvailableWinCCOAVersions();
        return versions.length > 0 ? versions[0] : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Checks whether WCCOActrl executable is available for the given version.
 */
function isCtrlAvailable(version: string): boolean {
    try {
        const runner = new CtrlRunner();
        return runner.exists(version);
    } catch {
        return false;
    }
}

/**
 * Creates an isolated temporary project directory with a minimal config/config
 * file and registers it in pvssInst.conf so that WCCOActrl can find it.
 * Tests use standalone mode (-n) so no Data/Event managers are needed.
 */
function createTempProject(version: string): {
    projectDir: string;
    configFile: string;
    cleanup: () => void;
} | undefined {
    const installPath = getWinCCOAInstallationPathByVersion(version);
    if (!installPath || !fs.existsSync(PVSS_INST_CONF)) {
        return undefined;
    }

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrl-runner-test-'));
    const configDir = path.join(tmpRoot, 'config');
    fs.mkdirSync(configDir, { recursive: true });

    // Normalise to forward-slashes for WinCC OA config format
    const normInstall = installPath.replace(/\\/g, '/');
    const normProject = tmpRoot.replace(/\\/g, '/');
    const configFile = path.join(configDir, 'config');

    const configContent = [
        '[general]',
        `pvss_path = "${normInstall}"`,
        `proj_path = "${normProject}"`,
        `proj_version = "${version}"`,
        '',
        'lang = "auto"',
        'langs = "en_US.utf8"',
        '',
    ].join('\n');

    fs.writeFileSync(configFile, configContent, 'utf-8');

    // Register the project in pvssInst.conf so WCCOActrl can find it
    const registrationEntry = [
        '',
        `[Software\\ETM\\PVSS II\\Configs\\${TEST_PROJECT_NAME}]`,
        'notRunnable = 0',
        `InstallationDate = "${new Date().toISOString()}"`,
        `InstallationUser = "${os.userInfo().username}"`,
        `InstallationDir = "${tmpRoot}"`,
        '',
    ].join('\n');

    try {
        fs.appendFileSync(PVSS_INST_CONF, registrationEntry, 'utf-8');
    } catch {
        // If we can't write to pvssInst.conf, skip registration — tests will skip
        fs.rmSync(tmpRoot, { recursive: true, force: true });
        return undefined;
    }

    const cleanup = (): void => {
        // Remove registration entry from pvssInst.conf
        try {
            const content = fs.readFileSync(PVSS_INST_CONF, 'utf-8');
            const sectionHeader = `[Software\\ETM\\PVSS II\\Configs\\${TEST_PROJECT_NAME}]`;
            const idx = content.indexOf(sectionHeader);
            if (idx >= 0) {
                const nextSection = content.indexOf('\n[Software\\ETM\\PVSS II\\', idx + sectionHeader.length);
                const cleaned = nextSection >= 0
                    ? content.slice(0, idx) + content.slice(nextSection)
                    : content.slice(0, idx);
                fs.writeFileSync(PVSS_INST_CONF, cleaned, 'utf-8');
            }
        } catch {
            // Ignore cleanup errors
        }

        // Remove temp project directory
        try {
            fs.rmSync(tmpRoot, { recursive: true, force: true });
        } catch {
            // Ignore cleanup errors
        }
    };

    return { projectDir: tmpRoot, configFile, cleanup };
}

describe('CTRL script execution (integration)', () => {
    let testVersion: string | undefined;
    let testProject: ReturnType<typeof createTempProject>;

    before(() => {
        testVersion = getTestVersion();
        if (testVersion) {
            testProject = createTempProject(testVersion);
        }
    });

    after(() => {
        if (testProject) {
            testProject.cleanup();
        }
    });

    it('should execute simple.ctl and report success (exit code 0)', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'simple.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            timeout: 30000,
        });

        assert.ok(
            result.success,
            `simple.ctl should succeed (exit ${result.exitCode}):\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
        assert.equal(result.exitCode, 0);
        assert.ok(typeof result.duration === 'number' && result.duration >= 0);
    });

    it('should execute with-error.ctl and report failure (non-zero exit code)', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'with-error.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            timeout: 30000,
        });

        assert.equal(result.success, false, 'with-error.ctl should report failure');
        assert.notEqual(result.exitCode, 0, 'exit code should be non-zero');
    });

    it('should execute with-output.ctl and capture DebugN output', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'with-output.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            timeout: 30000,
        });

        assert.ok(
            result.success,
            `with-output.ctl should succeed (exit ${result.exitCode}):\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );

        // DebugN output can appear in stdout or stderr depending on WinCC OA version
        const combinedOutput = result.stdout + result.stderr;
        assert.ok(
            combinedOutput.includes('hello from ctrl script'),
            `Output should contain the DebugN message.\nCombined output:\n${combinedOutput}`,
        );
    });

    it('should execute with-params.ctl with positional params and succeed', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        // Verifies that positional params are forwarded without breaking execution.
        // Arg ordering (params before -proj) is validated by unit tests in runner.test.ts.
        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'with-params.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            params: ['hello', 'world'],
            timeout: 30000,
        });

        assert.ok(
            result.success,
            `with-params.ctl should succeed with params (exit ${result.exitCode}):\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
        assert.equal(result.exitCode, 0);
    });

    it('should pass an int param to exit-with-param.ctl and get it back as exit code', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        // The script receives the int via main(int code) and calls exit(code).
        // If the exit code matches what we passed in, parameter forwarding works end-to-end.
        const EXPECTED_CODE = 42;
        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'exit-with-param.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            params: [String(EXPECTED_CODE)],
            timeout: 30000,
        });

        assert.equal(
            result.exitCode,
            EXPECTED_CODE,
            `exit code should equal the passed parameter (${EXPECTED_CODE}), got ${result.exitCode}\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
    });

    it('should run syntax check on syntax-error.ctl without crashing', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'syntax-error.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            syntaxOnly: true,
            timeout: 30000,
        });

        // The syntax check should run without throwing and return an exit code.
        // WCCOActrl behaviour for syntax errors: typically exits non-zero, but
        // the exact code is version-specific, so we just assert it ran.
        assert.ok(typeof result.exitCode === 'number', 'exitCode should be a number');
        // A script with invalid syntax should NOT exit with 0
        assert.notEqual(result.exitCode, 0, 'syntax-error.ctl should fail syntax check');
    });

    it('should pass syntax check for simple.ctl when using syntaxOnly', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'simple.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            syntaxOnly: true,
            timeout: 30000,
        });

        assert.ok(
            result.success,
            `Syntax check on simple.ctl should pass (exit ${result.exitCode}):\n`
                + `stdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
    });

    it('should populate result metadata (scriptPath, projectName, duration)', async (t) => {
        if (!testVersion || !isCtrlAvailable(testVersion)) {
            t.skip('WCCOActrl not found; skipping integration test');
            return;
        }
        if (!testProject) {
            t.skip('Could not create/register temp test project; skipping');
            return;
        }

        const scriptPath = path.join(FIXTURE_SCRIPTS_DIR, 'simple.ctl');
        const result = await executeScript({
            version: testVersion,
            scriptPath,
            projectName: TEST_PROJECT_NAME,
            configPath: testProject.configFile,
            standalone: true,
            timeout: 30000,
        });

        assert.equal(result.scriptPath, scriptPath);
        assert.equal(result.projectName, TEST_PROJECT_NAME);
        assert.ok(typeof result.duration === 'number' && result.duration >= 0);
    });
});

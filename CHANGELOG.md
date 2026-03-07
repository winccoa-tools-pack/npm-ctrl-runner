# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Documentation

- Align README CLI/API examples with actual tool behavior (required version, argument order).

## [1.0.0] - 2026-03-03

> **Breaking change:** Package transformed from PNL/XML converter to CTRL script runner.

### Added

- `CtrlRunner` class wrapping WinCC OA `WCCOActrl` binary for programmatic script execution.
- TypeScript API convenience functions: `executeScript()`, `createRunner()`, `checkExecutable()`, `getExecutablePath()`.
- CLI command `winccoa-ctrl execute` with full flag support.
- Script parameter support — positional args passed before `-proj` flag per WCCOActrl syntax.
- Timeout handling (default 60 s, configurable via `--timeout`).
- Standalone mode (`-n` flag via `--standalone`).
- Syntax-check-only mode (`-syntax` flag via `--syntax-only`).
- CTRL trace debugging (`-dbg 29` via `--enable-trace`).
- Report file output (`-reportfile` via `--report-file`).
- Custom config path support (`-config` via `--config`).
- Complete stdout/stderr capture and exit code propagation in `CtrlExecutionResult`.
- Execution duration tracking in result.
- JSON output mode for machine-readable CLI results (`--json`).
- Silent mode to suppress console output (`--silent`).
- Dual module format: CommonJS (`dist/cjs/`) and ESM (`dist/esm/`).
- Full TypeScript type definitions (`CtrlExecutionOptions`, `CtrlExecutionResult`, `OutputEvent`, `OutputCallback`).
- `onOutput` callback API for streaming output events.
- Cross-platform support (Windows `WCCOActrl.exe` and Linux `WCCOActrl`).

### Changed

- Package renamed from `@winccoa-tools-pack/npm-winccoa-ui-pnl-xml` to `@winccoa-tools-pack/npm-winccoa-ctrl`.
- CLI binary renamed from `winccoa-pnl-xml` to `winccoa-ctrl`.
- Full API redesign — replaces `PnlXmlConverter` with `CtrlRunner`.

### Fixed

- CLI direct-run detection now uses `require.main === module` and matches the `winccoa-ctrl` symlink name, fixing invocation via `npm link` or globally installed symlinks.

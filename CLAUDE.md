# CLAUDE.md — npm-winccoa-ctrl-runner

## Project

**Package**: `@winccoa-tools-pack/npm-winccoa-ctrl-runner`
**Purpose**: TypeScript library + CLI to execute WinCC OA CTRL scripts via `WCCOActrl`.
**Version**: 1.0.0 — released, stable.
**Branch workflow**: `feature/*` → `develop` → `main`

## Key Commands

```bash
npm run build          # Compile CJS + ESM + types
npm run test           # style-check + build + unit tests
npm run test:unit      # Unit tests only
npm run test:integration  # Requires WinCC OA Docker container
npm run style-check    # lint + format:check + lint:md
npm run style-fix      # Auto-fix lint + format + markdown
```

## Architecture

```text
src/
├── runner.ts   # CtrlRunner class — wraps CtrlComponent, builds args, executes
├── api.ts      # Convenience functions: executeScript(), createRunner(), checkExecutable()
├── cli.ts      # CLI entry point: winccoa-ctrl execute <script>
├── types.ts    # CtrlExecutionOptions, CtrlExecutionResult, OutputEvent, OutputCallback
└── index.ts    # Public exports
```

Depends on `@winccoa-tools-pack/npm-winccoa-core` → `CtrlComponent` for low-level process management.

## WCCOActrl Syntax (Critical)

```bash
WCCOActrl <script.ctl> [arg1 arg2 ...] -proj <projectName> [flags]
```

- Script args are **positional** — must come **before** `-proj`, never as flags
- `-n` standalone mode, `-syntax` syntax-only, `-config <file>`, `-reportfile <name>`, `-dbg 29` trace
- Exit code `1` from `-help`/`-version` is normal, not an error
- Binaries: `/opt/WinCC_OA/<ver>/bin/WCCOActrl` (Linux), `C:/Siemens/.../bin/WCCOActrl.exe` (Windows)

## Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `test:`
- TypeScript strict mode
- Dual output: CJS (`dist/cjs/`) + ESM (`dist/esm/`) + types (`dist/*.d.ts`)
- CLI binary name: `winccoa-ctrl`

## Planned: Init Feature

Auto-detect WinCC OA installations and projects (zero-config setup). See `docs/init/INIT_FEATURE.md`.
Phases: installation detection → project detection → config caching → CLI/extension integration.

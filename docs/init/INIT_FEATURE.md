# Init Feature - WinCC OA Configuration Detection

## Overview

Das Init-Feature ermöglicht die automatische Erkennung von WinCC OA Installationen und Projektkonfigurationen. Dies ersetzt die manuelle Konfiguration in der VS Code Extension und anderen Tools.

## Extrahierte Logik aus vscode_winccoa_scriptactions

Die Script Action Extension enthält derzeit folgende manuelle Konfiguration:
- `installPath`: Pfad zur WinCC OA Installation  
- `projectName`: Name des Projekts
- Platform-spezifische Executable-Pfade (WCCOActrl.exe/WCCOActrl)

Diese Logik soll automatisiert werden durch:

### 1. Installation Detection
- Suche nach WinCC OA Installationen im System
- Platform-spezifische Pfade (Windows, Linux)
- Validierung von Installation-Verzeichnissen
- Version Detection

### 2. Project Detection  
- Automatische Erkennung von Projekten im Workspace
- Lesen von `config/config` Dateien
- Erkennung von Projekt-Struktur (config/, scripts/, panels/, etc.)
- Unterstützung für Sub-Projekte

### 3. Configuration API
```typescript
interface WinCCOAConfig {
  installPath: string;
  version: string;
  projectName: string;
  projectPath: string;
  binaries: {
    WCCOActrl: string;
    WCCOAui: string;
    // ... weitere
  };
}

// API
export function detectInstallation(): Promise<WinCCOAConfig[]>;
export function detectProject(cwd?: string): Promise<WinCCOAConfig | null>;
export function init(options?: InitOptions): Promise<WinCCOAConfig>;
```

## Implementierungsplan

1. **Phase 1**: Basic Installation Detection
   - Search common installation paths
   - Validate WinCC OA directory structure
   - Detect version from installation

2. **Phase 2**: Project Detection
   - Find project root from current working directory
   - Parse config files
   - Validate project structure

3. **Phase 3**: Configuration Caching
   - Cache detected configurations
   - Quick re-detection
   - Configuration file (.winccoa.json)

4. **Phase 4**: Integration
   - Update Script Action Extension
   - CLI support
   - Documentation

## Vorteile

- **Zero Configuration**: Keine manuelle Setup erforderlich
- **Multi-Project Support**: Automatische Erkennung verschiedener Projekte
- **Platform Agnostic**: Windows & Linux Support
- **Developer Experience**: Weniger Konfiguration, mehr Entwicklung
- **Error Reduction**: Automatische Validierung der Pfade

## Nächste Schritte

1. Struktur für das init-Feature erstellen
2. Installation detection implementieren  
3. Project detection implementieren
4. Tests schreiben
5. Integration in Script Action

# CLAUDE.md — Komga Controller (Gamepad-to-Keyboard Userscript)

## Project Overview

A Tampermonkey userscript that maps physical gamepad inputs to keyboard events, enabling gamepad control of any web page. Built primarily for Komga (a self-hosted comic/manga reader) but works with any site. Features a docked floating panel for real-time remapping, site-specific profiles, and persistent configuration via `GM_setValue`.

## Architecture

```
Gamepad API (Browser)      Storage (GM_setValue)
       │                          │
       ▼                          ▼
┌─────────────┐           ┌──────────────┐
│ GamepadReader│           │   Storage    │
│ (rAF poll,   │     ┌────▶│ (config CRUD)│
│  state diff) │     │     └──────────────┘
└──────┬──────┘     │
       │ GamepadState     ┌──────────────┐
       ▼            │     │   Panel UI   │
┌─────────────┐     │     │ (floating     │
│   Mapper    │─────┘     │  config panel)│
│ (deadzone,  │           └──────────────┘
│  key lookup)│
└──────┬──────┘
       │ KeyboardAction[]
       ▼
┌─────────────┐
│  Dispatcher │
│ (Keyboard   │
│  Event)     │
└──────┬──────┘
       │
       ▼
  Web Application
```

### Core Pipeline

1. **GamepadReader** — rAF loop reads `navigator.getGamepads()` each frame. Gamepad objects are live (mutated in place by the browser), so values are **copied** every frame. Only changed buttons/axes are emitted via `poll()` → `{ buttons: Map<number,boolean>, axes: Map<number,number> }`.

2. **Mapper** — Two-stage filtering:
   - **Deadzone**: Analog stick values within ±0.15 (configurable) are zeroed. Survivors are rescaled from [deadzone, 1] → [0, 1].
   - **Activation threshold**: Only axis values exceeding ±0.5 (configurable) trigger key events.
   - **Key lookup**: Button index / axis+dir → `KeyboardAction` via `Storage.getMappings(site, profile)`.
   - **Reference-counted hold tracking** (`KeyTracker`): Multiple gamepad inputs can map to the same key. The key's `keyup` is only dispatched when *all* inputs mapping to it are released.

3. **Dispatcher** — Builds `KeyboardEvent` with `key`, `code`, `keyCode`, `which`. Applies `Object.defineProperty` overrides for browsers that ignore `keyCode` in the constructor. Dispatches to `document` with optional `window` fallback. Handles optional key-repeat (400ms delay, 30Hz rate).

### Storage Schema

Single key `gc_config` under `GM_setValue`, JSON:

```typescript
{
  version: 1,
  panel: { x: number, y: number, minimized: boolean },
  activeProfile: Record<hostname, profileName>,
  mappings: {
    [hostname]: {
      [profileName]: Array<{
        type: "button" | "axis",
        index: number,
        direction?: "positive" | "negative",  // axes only
        key: string                            // KeyboardEvent.key
      }>
    }
  },
  deadzone: number,         // 0–0.5, default 0.15
  axisThreshold: number,    // 0.1–1.0, default 0.5
  repeatEnabled: boolean,
  repeatDelay: number,      // ms, default 400
  repeatRate: number        // Hz, default 30
}
```

Fallback: if `GM_setValue` is unavailable (e.g. dev outside Tampermonkey), falls back to `localStorage`.

### Panel UI

The config panel is a single floating `<div id="gc-panel">` injected into the page DOM. All CSS uses `gc-` prefix to avoid site conflicts. Z-index is `2147483646`. Catppuccin Mocha dark theme.

Key interactions:
- **Drag**: mousedown on `.gc-header` → track delta → update `left`/`top` → persist position on mouseup
- **Remap**: click `[修改]` → `keybindRecorder.startKeyCapture()` → one-shot `keydown` listener → captures `e.key` → updates mapping → `_refreshTable()`
- **Profile**: select → `Storage.setActiveProfile()` → `_refreshTable()`
- **Minimize**: hide panel, show `#gc-mini-btn` floating circle at bottom-right

## File Map

| File | Role |
|------|------|
| `src/index.js` | Entry point. Instantiates all modules, runs rAF loop, handles visibility/connect/disconnect. Detects Start+Select long-press (2s) to toggle panel. |
| `src/core/gamepad.js` | `GamepadReader` class. `poll()` diffs current vs previous frame. 500ms debounce on connect/disconnect. |
| `src/core/mapper.js` | `Mapper` class + `KeyTracker` class. `process(state, site)` → `KeyboardAction[]`. `releaseAll()` for cleanup. |
| `src/core/dispatcher.js` | `Dispatcher` class. `dispatch(action)` with `Object.defineProperty` fallbacks. `dispatchRepeat(action)` for held keys. |
| `src/core/storage.js` | `Storage` class. Full CRUD for config. Site/profile helpers. Schema migration (`version` field). Export/import. |
| `src/config/defaults.js` | `KEY_MAP` lookup table (key→keyCode/code). Button/axis labels (ZH/EN). Default mappings for Komga and YouTube. `getSiteDefaults(hostname)`. |
| `src/ui/panel.js` | `Panel` class. DOM construction, drag, minimize, profile management, table rendering, remap/unmap, advanced settings dialog. |
| `src/ui/panel.css.js` | `PANEL_CSS` template string. All styles scoped under `#gc-panel`, `#gc-mini-btn`, `.gc-toast`. |
| `src/ui/i18n.js` | `getButtonLabel()`, `getAxisLabel()`, `getAllInputs()`. Auto-detects `zh`/`en` from `navigator.language`. |
| `src/ui/keybindRecorder.js` | `startKeyCapture({ onCapture })` — one-shot keyboard listener. `startGamepadCapture()` — for future gamepad-only mapping. |
| `src/banner.txt` | Tampermonkey metadata block (`@name`, `@match`, `@grant`, etc.). Prepended during build. |
| `scripts/build.mjs` | esbuild IIFE bundle + banner injection. Supports `--watch` mode. |

## Build

```bash
npm run build    # one-shot, outputs dist/komga-controller.user.js
npm run watch    # watch mode
```

esbuild bundles all ES modules into a single IIFE. The banner (UserScript metadata) is injected via esbuild's `banner` option. No CSS loader — styles are inline JS strings injected at runtime.

## Edge Cases Handled

- **Gamepad disconnect**: Releases all held keys, stops repeats, updates UI
- **Gamepad reconnect**: Resets previous-state cache to prevent stale-diff events
- **Tab hidden**: `visibilitychange` releases all keys (prevents stuck keys when returning)
- **Multiple gamepads**: Uses index 0 by default
- **Analog drift**: 0.15 deadzone + hysteresis (deactivate at 0.10)
- **SPA navigation**: Script persists; events dispatched to `document` survive component remounts
- **keyCode compatibility**: `Object.defineProperty` patches for browsers that ignore constructor keyCode
- **Rapid connect/disconnect**: 500ms debounce on both events

## Key Design Decisions

1. **Single Storage Key** — Entire config under one `GM_setValue('gc_config', ...)` call. Simplifies atomic saves, avoids key proliferation, and keeps schema migration centralized.

2. **Reference-counted key holding** — Two gamepad inputs map to the same key? The key releases only when both inputs release. Prevents interleaved key events.

3. **CSS as JS string** — Avoids needing a CSS loader plugin in esbuild. The stylesheet is injected as `<style id="gc-styles">` on panel render and removed on destroy.

4. **Site detection via `location.hostname`** — Simple, automatic, no configuration needed. Komga users on `komga.local:25600` get the correct mapping without setup.

5. **Start+Select as panel toggle** — 2-second hold. Processed in the main loop (not the mapper) so it works independently of the current mapping configuration.

# cc-buddy

<p align="center">
  <img src="media/orange_cat-hero.gif" alt="cc-buddy demo" width="320" />
</p>

A Tauri desktop pet that reflects your Claude Code session state via pixel-art animal sprites. One buddy per active session, multi-terminal aware.

> Early / WIP. Distribution is **source-only** for now — clone, build locally, you're done. No code signing required because you compile on your own machine.

---

## For Claude Code: install this for me

If you are a human, skip to [Manual install](#manual-install). If you are Claude Code and the user asked you to install cc-buddy, follow this section top-to-bottom. Stop and ask the user only if a step fails.

### 0. Confirm prerequisites

Run these checks. If any tool is missing, tell the user which one and stop — don't try to auto-install system toolchains.

```bash
node --version          # need >= 18
npm --version
rustc --version         # need any stable; install via https://rustup.rs if missing
cargo --version
python3 --version       # 'python' on Windows; need >= 3.9
```

Platform-specific extras:
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** webkit2gtk + a few libs — see <https://tauri.app/start/prerequisites/>
- **Windows:** Microsoft C++ Build Tools (Visual Studio 2022 Build Tools, "Desktop development with C++" workload) and WebView2 (preinstalled on Win11)

### 1. Clone and install JS deps

```bash
git clone https://github.com/royzjq/cc-buddy-.git
cd cc-buddy-
npm install
```

### 2. Install the Python hook dependency

The hook script ships state to the app over a local WebSocket. It needs one library:

```bash
python3 -m pip install --user websocket-client
```

(On Windows, use `python -m pip install --user websocket-client`.)

### 3. Build the desktop app

```bash
npm run tauri:build
```

This produces a native installer under `src-tauri/target/release/bundle/`:
- macOS → `.dmg` and `.app`
- Windows → `.msi` and `.exe` (NSIS)
- Linux → `.deb` / `.AppImage`

Install it the normal way for the OS, OR just run the unpacked binary directly:
- macOS: `src-tauri/target/release/bundle/macos/cc-buddy.app`
- Windows: `src-tauri/target/release/cc-buddy.exe`
- Linux: `src-tauri/target/release/cc-buddy`

If the user only wants to try it without installing, `npm run tauri:dev` is fine.

### 4. Wire up Claude Code hooks

cc-buddy receives state via Claude Code's hook system. Open the user's `~/.claude/settings.json` (create it if missing) and **merge** the entries from `hooks/hook-config.json` into the top-level `"hooks"` key. Do not blindly overwrite — if `hooks` already has other entries, preserve them and append cc-buddy's commands.

Replace `<CC_BUDDY_PATH>` with the absolute path to this clone, e.g. `/Users/alice/code/cc-buddy` (mac/linux) or `C:/Users/alice/code/cc-buddy` (windows — use forward slashes inside JSON).

On Windows, change every `python3` in the commands to `python`.

After editing, the user must restart any open Claude Code sessions for the hooks to take effect.

### 5. Verify

1. Launch cc-buddy (the built app, or `npm run tauri:dev` from the repo).
2. In a new terminal, start a Claude Code session (`claude`).
3. A buddy sprite should appear on the desktop within a second or two.
4. Send any prompt — the buddy should switch to a "working" pose, then back to idle when done.

If nothing appears: check the cc-buddy console output for `[cc-buddy] WS connected` / hook events. Most failures are (a) hook commands not merged into `~/.claude/settings.json`, (b) `<CC_BUDDY_PATH>` not replaced, or (c) `websocket-client` not installed for the Python that Claude Code's hooks invoke.

---

## Manual install

Same as above, just performed by hand. The short version:

```bash
git clone https://github.com/royzjq/cc-buddy-.git
cd cc-buddy-
npm install
python3 -m pip install --user websocket-client
npm run tauri:build
```

Then merge `hooks/hook-config.json` into your `~/.claude/settings.json` (replacing `<CC_BUDDY_PATH>` with the absolute path to this clone), restart Claude Code, and launch the built app.

Prereqs: Node ≥18, Rust stable, Python ≥3.9, plus your OS's native build tools (see Tauri prerequisites above).

---

## Development

```bash
npm run tauri:dev       # live-reload dev mode (spawns a demo buddy if no real session connects)
npm run tauri:build     # production build for the current OS
```

The dev-mode demo buddy is gated behind Vite's `import.meta.env.DEV`, so it never appears in production builds.

## Architecture (short version)

```
Claude Code hook → hooks/cc-buddy-hook.py → ws://127.0.0.1:19444
                                           → Tauri backend (src-tauri/src/lib.rs)
                                           → 'hook-event' → src/main.js → src/playground.js
```

Events: `session_start`, `notification`, `thinking`, `stop`, `done`, `session_end`, `usage`.

## Uninstall

1. Quit cc-buddy.
2. Remove the cc-buddy entries from `~/.claude/settings.json` under `"hooks"`.
3. Uninstall the app (OS-standard uninstall) or just delete the clone.

## License

TBD.

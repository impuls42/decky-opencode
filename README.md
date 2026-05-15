# Decky OpenCode Web

A [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader) plugin for the Steam Deck that controls the `opencode-web.service` systemd **user** unit from Game Mode.

It gives you a Quick Access Menu panel showing the current unit state and Start / Stop / Restart buttons — handy when you want to spin up an [OpenCode](https://github.com/sst/opencode) web session on the Deck without dropping to Desktop Mode.

![logo](./assets/logo.png)

## What it does

The plugin shells out to `systemctl --user` against a single unit:

```
opencode-web.service
```

It reads `LoadState`, `ActiveState`, `SubState`, `Result`, and `UnitFileState` for live status, and exposes `start` / `stop` / `restart` actions. The backend forces `XDG_RUNTIME_DIR=/run/user/1000` and the matching DBUS session bus address so that the user manager is reachable from the Decky plugin process.

## Requirements

- Steam Deck (or any Decky-compatible system) with [decky-loader](https://github.com/SteamDeckHomebrew/decky-loader) installed.
- A user-level systemd unit named `opencode-web.service` installed under `~/.config/systemd/user/`. The plugin does **not** install or manage the unit file itself — it only drives an existing unit.
- The user must be UID `1000` (the default `deck` user). If your setup uses a different UID, edit `_systemd_env` in `main.py`.

A minimal unit might look like:

```ini
# ~/.config/systemd/user/opencode-web.service
[Unit]
Description=OpenCode web session

[Service]
ExecStart=/usr/bin/opencode serve --host 0.0.0.0 --port 4096
Restart=on-failure

[Install]
WantedBy=default.target
```

Reload after dropping it in: `systemctl --user daemon-reload`.

## Install

1. Enable developer mode in Decky Loader and turn on the CEF debugger.
2. Build the plugin (see below) or download a release zip.
3. Copy the resulting plugin folder to `~/homebrew/plugins/decky-opencode/` on the Deck, or use the Decky CLI / store sideload flow.
4. Restart Decky Loader from the Quick Access Menu.

The plugin appears in the QAM with the terminal icon and the title **OpenCode Web**.

## Development

Requires Node.js v16.14+ and `pnpm` v9.

```bash
pnpm install
pnpm run build      # one-shot build into dist/
pnpm run watch      # rebuild on change
```

VSCode tasks (`setup`, `build`, `deploy`) are wired up in `.vscode/tasks.json` and mirror the same scripts. The `deploy` task pushes the built plugin to a Deck over SSH — edit `.vscode/config.sh` first to point at your device.

### Layout

```
.
├── main.py            # Decky Python backend — wraps systemctl --user
├── src/index.tsx      # QAM panel (status dot + Start/Stop/Restart)
├── plugin.json        # Decky plugin manifest
├── package.json       # Frontend build config
├── rollup.config.js   # @decky/rollup wrapper
└── assets/logo.png    # Plugin logo
```

### Frontend ↔ backend

Frontend calls are typed `callable<[], T>` bindings to four Python methods on the `Plugin` class:

| Frontend             | Backend (`main.py`)         |
|----------------------|-----------------------------|
| `get_status()`       | `Plugin.get_status`         |
| `startUnit()`        | `Plugin.start`              |
| `stopUnit()`         | `Plugin.stop`               |
| `restartUnit()`      | `Plugin.restart`            |

Status is polled every 3 seconds while the panel is mounted.

## License

[BSD-3-Clause](./LICENSE).

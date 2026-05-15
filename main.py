import asyncio
import os

import decky

UNIT = "opencode-web.service"


def _systemd_env() -> dict[str, str]:
    env = {k: v for k, v in os.environ.items() if not k.startswith("LD_")}
    env["XDG_RUNTIME_DIR"] = "/run/user/1000"
    env["DBUS_SESSION_BUS_ADDRESS"] = "unix:path=/run/user/1000/bus"
    return env


SYSTEMD_ENV = _systemd_env()


async def _systemctl(*args: str) -> tuple[int, str, str]:
    proc = await asyncio.create_subprocess_exec(
        "systemctl", "--user", *args,
        env=SYSTEMD_ENV,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, stderr = await proc.communicate()
    return proc.returncode or 0, stdout.decode().strip(), stderr.decode().strip()


class Plugin:
    async def get_status(self) -> dict:
        rc, out, _ = await _systemctl(
            "show", UNIT,
            "--property=LoadState,ActiveState,SubState,Result,UnitFileState",
            "--no-pager",
        )
        props: dict[str, str] = {}
        for line in out.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                props[k] = v
        return {
            "unit": UNIT,
            "load_state": props.get("LoadState", "unknown"),
            "active_state": props.get("ActiveState", "unknown"),
            "sub_state": props.get("SubState", ""),
            "result": props.get("Result", ""),
            "unit_file_state": props.get("UnitFileState", ""),
            "ok": rc == 0,
        }

    async def start(self) -> dict:
        rc, _, err = await _systemctl("start", UNIT)
        return {"ok": rc == 0, "error": err}

    async def stop(self) -> dict:
        rc, _, err = await _systemctl("stop", UNIT)
        return {"ok": rc == 0, "error": err}

    async def restart(self) -> dict:
        rc, _, err = await _systemctl("restart", UNIT)
        return {"ok": rc == 0, "error": err}

    async def _main(self):
        decky.logger.info(f"OpenCode Web plugin loaded; controlling {UNIT}")

    async def _unload(self):
        decky.logger.info("OpenCode Web plugin unloading")

    async def _uninstall(self):
        decky.logger.info("OpenCode Web plugin uninstalling")

#!/usr/bin/env python3
"""Claude Code hook -> CC Buddy.

Reads a JSON payload from stdin (Claude Code v2 hook protocol), augments it
with an event ``type`` derived from CLI args, and ships it to the local
CC Buddy WebSocket server with a small retry loop.

Usage:
    cc-buddy-hook.py <event_type>

where ``event_type`` is one of: session_start, notification, stop,
session_end, thinking, done.
"""
from __future__ import annotations

import json
import os
import sys
import time

try:
    import websocket  # websocket-client (sync; cheap to import)
except ImportError:  # pragma: no cover
    websocket = None

try:
    from websockets.sync.client import connect as ws_connect
except ImportError:  # pragma: no cover
    ws_connect = None


WS_URL = os.environ.get("CC_BUDDY_WS_URL", "ws://127.0.0.1:19444")
ALLOWED = {"session_start", "notification", "stop", "session_end", "thinking", "done"}
LOG_PATH = os.path.join(os.environ.get("TEMP") or os.environ.get("TMPDIR") or "/tmp", "cc-buddy-hook.log")


def debug_log(line: str) -> None:
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(f"{time.strftime('%H:%M:%S')}  {line}\n")
    except Exception:
        pass


def read_stdin_payload() -> dict:
    if sys.stdin.isatty():
        return {}
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def build_event(event_type: str, payload: dict) -> dict:
    session_id = (
        payload.get("session_id")
        or os.environ.get("CLAUDE_SESSION_ID")
        or "unknown"
    )
    event = {"type": event_type, "session_id": session_id}
    if event_type in ("session_start", "notification"):
        event["cwd"] = payload.get("cwd") or os.environ.get("PWD") or os.getcwd()
    if event_type == "session_start":
        event["ppid"] = os.getppid()
    return event


def send(event: dict, attempts: int = 3, delay: float = 0.5) -> bool:
    msg = json.dumps(event)
    last_err = None
    for i in range(attempts):
        try:
            if ws_connect is not None:
                with ws_connect(WS_URL, open_timeout=1.5, close_timeout=1.0) as ws:
                    ws.send(msg)
                return True
            if websocket is not None:
                ws = websocket.create_connection(WS_URL, timeout=1.5)
                try:
                    ws.send(msg)
                finally:
                    ws.close()
                return True
            raise RuntimeError("neither 'websockets' nor 'websocket-client' is installed")
        except Exception as e:  # broad: hook must never break Claude Code
            last_err = e
            time.sleep(delay)
    print(f"cc-buddy hook: gave up after {attempts} attempts ({last_err})", file=sys.stderr)
    return False


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ALLOWED:
        print(
            f"usage: {sys.argv[0]} <{'|'.join(sorted(ALLOWED))}>",
            file=sys.stderr,
        )
        return 2
    event_type = sys.argv[1]
    payload = read_stdin_payload()
    event = build_event(event_type, payload)
    message = payload.get("message") or ""
    if event.get("session_id") in (None, "", "unknown"):
        debug_log(f"skip event with no session_id type={event_type}")
        return 0
    if event_type == "notification" and "waiting for your input" in message.lower():
        debug_log(f"skip idle notification sid={event.get('session_id')}")
        return 0
    debug_log(
        f"fire {event_type} sid={event.get('session_id')} "
        f"msg={payload.get('message')!r}"
    )
    ok = send(event)
    debug_log(f"  -> ws send {'ok' if ok else 'FAIL'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""ActivityRadar official data sync.

Reads data/registry.json, marks every official source/event with the sync time,
optionally performs a lightweight reachability check, and writes
data/activities.json for both the web app and the bundled Android app.
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone


ROOT = pathlib.Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "data" / "registry.json"
OUTPUT = ROOT / "data" / "activities.json"
USER_AGENT = "Mozilla/5.0 (compatible; ActivityRadarDataSync/2.3)"


def china_time_now() -> str:
    now = datetime.now(timezone.utc) + timedelta(hours=8)
    return now.strftime("%Y-%m-%dT%H:%M:%S+08:00")


def as_utc(value: str) -> datetime | None:
    if not value:
        return None
    text = str(value).strip()
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed = datetime.strptime(text[:10], "%Y-%m-%d")
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def dynamic_status(register: dict, now: datetime) -> str:
    """Derive registration state from opensAt/deadline when available."""
    opens_at = as_utc(register.get("opensAt") or register.get("openAt"))
    deadline = as_utc(register.get("deadline"))
    fallback = str(register.get("status", "announced")).lower()
    if opens_at is None and deadline is None:
        return "closed" if fallback in ("closed", "ended") else ("open" if fallback in ("open", "recruiting") else "announced")
    if opens_at is not None and now < opens_at:
        return "announced"
    if deadline is not None and now > deadline:
        return "closed"
    return "open"


def check_url(url: str, timeout: int = 8) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return {"status": resp.status, "ok": 200 <= resp.status < 400}
    except urllib.error.HTTPError as exc:
        return {"status": exc.code, "ok": False}
    except Exception:
        return {"status": None, "ok": False}


def main() -> int:
    if not REGISTRY.exists():
        print(f"registry not found: {REGISTRY}", file=sys.stderr)
        return 1

    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    items = registry.get("items", [])
    if not items:
        print("registry has no items", file=sys.stderr)
        return 1

    updated_at = china_time_now()
    now_utc = datetime.now(timezone.utc)
    skip_health = "--skip-health" in sys.argv or os.environ.get("SKIP_SOURCE_HEALTH") == "1"
    sources = []
    for source in registry.get("meta", {}).get("sources", []):
        checked = {"ok": None, "status": None} if skip_health else check_url(source.get("url", ""))
        sources.append(
            {
                "name": source.get("name", ""),
                "url": source.get("url", ""),
                "kind": source.get("kind", "official"),
                "checkedAt": updated_at,
                "ok": checked.get("ok"),
                "httpStatus": checked.get("status"),
            }
        )

    normalized = []
    for index, item in enumerate(items, start=1):
        entry = dict(item)
        entry["register"] = dict(item.get("register", {}))
        entry["register"]["status"] = dynamic_status(entry["register"], now_utc)
        entry["volunteer"] = dict(item.get("volunteer", {}))
        entry["volunteer"]["registerUrl"] = entry["volunteer"].get("registerUrl") or entry["volunteer"].get("url") or ""
        entry["id"] = int(item.get("id", 9000 + index))
        entry["schemaVersion"] = 2
        entry["updatedAt"] = updated_at
        entry["lastChecked"] = updated_at
        entry["sourceKind"] = "official"
        entry["source"] = item.get("sourceName", "官方发布")
        entry["sourceUrl"] = item.get("officialUrl", "")
        entry["verified"] = bool(item.get("verified", True))
        normalized.append(entry)

    payload = {
        "schemaVersion": 2,
        "updatedAt": updated_at,
        "source": "activity-radar-web/official-registry",
        "generator": "radar-official-sync",
        "fallback": False,
        "meta": {
            "refreshMinutes": 240,
            "sources": sources,
        },
        "items": normalized,
    }

    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    reachable = sum(1 for s in sources if s.get("ok"))
    total = len(sources)
    print(f"Wrote {len(normalized)} official activities to {OUTPUT.relative_to(ROOT)}")
    print(f"Source health: {reachable}/{total} reachable (updated at {updated_at})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

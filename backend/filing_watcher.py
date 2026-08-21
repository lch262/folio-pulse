"""Polling watcher for newly published original Form 13F-HR filings."""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Callable, Iterator, Literal, Mapping

from .sec_client import Filing, SecClient, SecClientError, normalize_cik


USER_AGENT_ENV = "FOLIOPULSE_SEC_USER_AGENT"
DEFAULT_CIK = "0001067983"
DEFAULT_STATE_FILE = "data/watcher_state.json"

WatchStatus = Literal["INITIALIZED", "UNCHANGED", "NEW_FILING", "STALE", "NO_FILING"]
Clock = Callable[[], datetime]
Sleeper = Callable[[float], None]


class WatcherStateError(ValueError):
    """Raised when persisted watcher state is unreadable or invalid."""


@dataclass(frozen=True, slots=True)
class WatcherStateEntry:
    accession_number: str
    filing_date: str
    report_date: str
    checked_at: str


@dataclass(frozen=True, slots=True)
class WatchEvent:
    status: WatchStatus
    cik: str
    filer_name: str
    checked_at: str
    filing: Filing | None
    previous_accession_number: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "cik": self.cik,
            "filer_name": self.filer_name,
            "checked_at": self.checked_at,
            "previous_accession_number": self.previous_accession_number,
            "filing": self.filing.to_dict() if self.filing else None,
        }


class WatcherStateStore:
    """Small atomic JSON store keyed by normalized CIK."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)

    def load(self) -> dict[str, WatcherStateEntry]:
        if not self.path.exists():
            return {}
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise WatcherStateError(f"Could not read watcher state: {exc}") from exc

        if not isinstance(payload, Mapping) or payload.get("version") != 1:
            raise WatcherStateError("Watcher state must be a version 1 JSON object.")
        funds = payload.get("funds")
        if not isinstance(funds, Mapping):
            raise WatcherStateError("Watcher state is missing the funds object.")

        entries: dict[str, WatcherStateEntry] = {}
        for cik, value in funds.items():
            if not isinstance(cik, str) or not isinstance(value, Mapping):
                raise WatcherStateError("Watcher state contains an invalid fund entry.")
            try:
                entry = WatcherStateEntry(
                    accession_number=str(value["accession_number"]),
                    filing_date=str(value["filing_date"]),
                    report_date=str(value["report_date"]),
                    checked_at=str(value["checked_at"]),
                )
            except KeyError as exc:
                raise WatcherStateError(
                    f"Watcher state entry {cik} is missing {exc.args[0]}."
                ) from exc
            entries[cik] = entry
        return entries

    def save(self, entries: Mapping[str, WatcherStateEntry]) -> None:
        payload = {
            "version": 1,
            "funds": {cik: asdict(entry) for cik, entry in sorted(entries.items())},
        }
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary_path = self.path.with_name(f"{self.path.name}.tmp")
        try:
            temporary_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
                encoding="utf-8",
            )
            temporary_path.replace(self.path)
        except OSError as exc:
            raise WatcherStateError(f"Could not save watcher state: {exc}") from exc


class FilingWatcher:
    """Compare the newest SEC filing with a persisted accession baseline."""

    def __init__(
        self,
        client: SecClient,
        state_store: WatcherStateStore,
        *,
        clock: Clock | None = None,
        sleeper: Sleeper = time.sleep,
    ) -> None:
        self.client = client
        self.state_store = state_store
        self.clock = clock or (lambda: datetime.now(timezone.utc))
        self.sleeper = sleeper

    def check(self, cik: str | int) -> WatchEvent:
        normalized_cik = normalize_cik(cik)
        result = self.client.get_latest_13f_filings(normalized_cik, limit=2)
        latest = result.latest
        checked_at = self.clock().astimezone(timezone.utc).isoformat()
        entries = self.state_store.load()

        if latest is None:
            return WatchEvent(
                status="NO_FILING",
                cik=normalized_cik,
                filer_name=result.name,
                checked_at=checked_at,
                filing=None,
            )

        previous = entries.get(normalized_cik)
        current_entry = WatcherStateEntry(
            accession_number=latest.accession_number,
            filing_date=latest.filing_date,
            report_date=latest.report_date,
            checked_at=checked_at,
        )

        if previous is None:
            status: WatchStatus = "INITIALIZED"
            entries[normalized_cik] = current_entry
            self.state_store.save(entries)
        elif previous.accession_number == latest.accession_number:
            status = "UNCHANGED"
            entries[normalized_cik] = current_entry
            self.state_store.save(entries)
        elif (latest.filing_date, latest.accession_number) > (
            previous.filing_date,
            previous.accession_number,
        ):
            status = "NEW_FILING"
            entries[normalized_cik] = current_entry
            self.state_store.save(entries)
        else:
            status = "STALE"

        return WatchEvent(
            status=status,
            cik=normalized_cik,
            filer_name=result.name,
            checked_at=checked_at,
            filing=latest,
            previous_accession_number=(
                previous.accession_number if previous is not None else None
            ),
        )

    def watch(
        self,
        cik: str | int,
        *,
        interval_seconds: float = 60.0,
        max_checks: int | None = None,
    ) -> Iterator[WatchEvent]:
        if interval_seconds < 1:
            raise ValueError("interval_seconds must be at least 1 second.")
        checks = 0
        while max_checks is None or checks < max_checks:
            yield self.check(cik)
            checks += 1
            if max_checks is None or checks < max_checks:
                self.sleeper(interval_seconds)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Watch one filer for a newly published original 13F-HR."
    )
    parser.add_argument(
        "cik",
        nargs="?",
        default=DEFAULT_CIK,
        help=f"SEC CIK (default: Berkshire Hathaway, {DEFAULT_CIK})",
    )
    parser.add_argument(
        "--user-agent",
        default=os.getenv(USER_AGENT_ENV, ""),
        help=f"Declared SEC User-Agent; defaults to ${USER_AGENT_ENV}",
    )
    parser.add_argument(
        "--state-file",
        default=DEFAULT_STATE_FILE,
        help=f"Watcher JSON state path (default: {DEFAULT_STATE_FILE})",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=60.0,
        help="Seconds between checks in continuous mode (default: 60)",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Check once and exit instead of polling continuously.",
    )
    parser.add_argument("--json", action="store_true", dest="as_json")
    return parser


def _print_event(event: WatchEvent, *, as_json: bool) -> None:
    if as_json:
        print(json.dumps(event.to_dict(), ensure_ascii=False))
        return
    accession = event.filing.accession_number if event.filing else "none"
    print(
        f"[{event.checked_at}] {event.status} | {event.filer_name} | "
        f"CIK {event.cik} | accession {accession}",
        flush=True,
    )


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.user_agent.strip():
        parser.error(
            f"declare a contact User-Agent with --user-agent or {USER_AGENT_ENV}"
        )
    if args.interval < 1:
        parser.error("--interval must be at least 1 second")

    watcher = FilingWatcher(
        SecClient(args.user_agent),
        WatcherStateStore(args.state_file),
    )
    try:
        if args.once:
            _print_event(watcher.check(args.cik), as_json=args.as_json)
            return 0
        print(
            f"Watching CIK {normalize_cik(args.cik)} every {args.interval:g} seconds. "
            "Press Ctrl+C to stop.",
            flush=True,
        )
        while True:
            try:
                _print_event(watcher.check(args.cik), as_json=args.as_json)
            except SecClientError as exc:
                print(f"SEC check failed: {exc}", file=sys.stderr, flush=True)
            watcher.sleeper(args.interval)
    except (OSError, SecClientError, ValueError, WatcherStateError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        print("\nWatcher stopped.")
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

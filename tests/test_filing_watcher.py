from __future__ import annotations

from contextlib import redirect_stdout
from datetime import datetime, timezone
from io import StringIO
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from backend.filing_watcher import (
    FilingWatcher,
    WatcherStateError,
    WatcherStateStore,
    main,
)
from backend.sec_client import Filing, Filer13FResult


def filing(
    accession_number: str,
    filing_date: str,
    report_date: str,
) -> Filing:
    return Filing(
        cik="0001067983",
        form="13F-HR",
        report_date=report_date,
        filing_date=filing_date,
        accession_number=accession_number,
        primary_document="primary_doc.xml",
    )


def result(*filings: Filing) -> Filer13FResult:
    return Filer13FResult(
        cik="0001067983",
        name="BERKSHIRE HATHAWAY INC",
        filings=tuple(filings),
    )


class FakeClient:
    def __init__(self, *results: Filer13FResult) -> None:
        self.results = list(results)

    def get_latest_13f_filings(self, _cik, *, limit=2) -> Filer13FResult:
        if len(self.results) > 1:
            return self.results.pop(0)
        return self.results[0]


class FilingWatcherTests(unittest.TestCase):
    def setUp(self) -> None:
        self.current = filing(
            "0001193125-26-300001",
            "2026-08-14",
            "2026-06-30",
        )
        self.previous = filing(
            "0001193125-26-200001",
            "2026-05-15",
            "2026-03-31",
        )
        self.clock = lambda: datetime(2026, 8, 16, tzinfo=timezone.utc)

    def test_first_check_initializes_baseline(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            store = WatcherStateStore(Path(temporary_directory) / "state.json")
            watcher = FilingWatcher(
                FakeClient(result(self.current, self.previous)),
                store,
                clock=self.clock,
            )

            event = watcher.check("1067983")
            saved = store.load()["0001067983"]

        self.assertEqual(event.status, "INITIALIZED")
        self.assertIsNone(event.previous_accession_number)
        self.assertEqual(saved.accession_number, self.current.accession_number)

    def test_same_accession_is_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            store = WatcherStateStore(Path(temporary_directory) / "state.json")
            watcher = FilingWatcher(
                FakeClient(
                    result(self.current, self.previous),
                    result(self.current, self.previous),
                ),
                store,
                clock=self.clock,
            )
            watcher.check("1067983")

            event = watcher.check("1067983")

        self.assertEqual(event.status, "UNCHANGED")

    def test_newer_accession_triggers_new_filing(self) -> None:
        new_filing = filing(
            "0001193125-26-400001",
            "2026-11-14",
            "2026-09-30",
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            store = WatcherStateStore(Path(temporary_directory) / "state.json")
            watcher = FilingWatcher(
                FakeClient(
                    result(self.current, self.previous),
                    result(new_filing, self.current),
                ),
                store,
                clock=self.clock,
            )
            watcher.check("1067983")

            event = watcher.check("1067983")

        self.assertEqual(event.status, "NEW_FILING")
        self.assertEqual(
            event.previous_accession_number,
            self.current.accession_number,
        )
        self.assertEqual(event.filing, new_filing)

    def test_older_result_does_not_regress_state(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            store = WatcherStateStore(Path(temporary_directory) / "state.json")
            watcher = FilingWatcher(
                FakeClient(
                    result(self.current, self.previous),
                    result(self.previous),
                ),
                store,
                clock=self.clock,
            )
            watcher.check("1067983")

            event = watcher.check("1067983")
            saved = store.load()["0001067983"]

        self.assertEqual(event.status, "STALE")
        self.assertEqual(saved.accession_number, self.current.accession_number)

    def test_no_filing_does_not_create_state(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_path = Path(temporary_directory) / "state.json"
            watcher = FilingWatcher(
                FakeClient(result()),
                WatcherStateStore(state_path),
                clock=self.clock,
            )

            event = watcher.check("1067983")
            state_exists = state_path.exists()

        self.assertEqual(event.status, "NO_FILING")
        self.assertFalse(state_exists)

    def test_rejects_corrupt_state_instead_of_overwriting_it(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_path = Path(temporary_directory) / "state.json"
            state_path.write_text("not-json", encoding="utf-8")
            watcher = FilingWatcher(
                FakeClient(result(self.current)),
                WatcherStateStore(state_path),
                clock=self.clock,
            )

            with self.assertRaises(WatcherStateError):
                watcher.check("1067983")
            state_content = state_path.read_text(encoding="utf-8")

        self.assertEqual(state_content, "not-json")

    @patch("backend.filing_watcher.SecClient")
    def test_cli_once_prints_event_and_exits(self, client_type) -> None:
        client_type.return_value.get_latest_13f_filings.return_value = result(
            self.current, self.previous
        )
        with tempfile.TemporaryDirectory() as temporary_directory:
            state_path = Path(temporary_directory) / "state.json"
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "1067983",
                        "--user-agent",
                        "FolioPulse test@example.com",
                        "--state-file",
                        str(state_path),
                        "--once",
                    ]
                )

        self.assertEqual(exit_code, 0)
        self.assertIn("INITIALIZED", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()

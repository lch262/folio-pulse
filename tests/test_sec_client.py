from __future__ import annotations

from io import BytesIO
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from backend.sec_client import (
    InvalidCikError,
    SecClient,
    SecRequestError,
    normalize_cik,
)


class NormalizeCikTests(unittest.TestCase):
    def test_pads_a_short_cik(self) -> None:
        self.assertEqual(normalize_cik(1067983), "0001067983")

    def test_rejects_invalid_ciks(self) -> None:
        for value in ("", "CIK1067983", "12A", 0, True, "12345678901"):
            with self.subTest(value=value), self.assertRaises(InvalidCikError):
                normalize_cik(value)


class SecClientTests(unittest.TestCase):
    def test_returns_latest_two_original_filings_and_ignores_amendments(self) -> None:
        payload = {
            "name": "BERKSHIRE HATHAWAY INC",
            "filings": {
                "recent": {
                    "accessionNumber": [
                        "0001-26-000001",
                        "0001-26-000003",
                        "0001-26-000002",
                    ],
                    "form": ["13F-HR", "13F-HR/A", "13F-HR"],
                    "reportDate": ["2025-12-31", "2026-03-31", "2026-03-31"],
                    "filingDate": ["2026-02-17", "2026-05-16", "2026-05-15"],
                    "primaryDocument": ["q4.xml", "amendment.xml", "q1.xml"],
                },
                "files": [],
            },
        }
        client = SecClient("FolioPulse test@example.com", fetch_json=lambda _: payload)

        result = client.get_latest_13f_filings("1067983")

        self.assertEqual(result.name, "BERKSHIRE HATHAWAY INC")
        self.assertEqual(result.cik, "0001067983")
        self.assertEqual(
            [filing.accession_number for filing in result.filings],
            ["0001-26-000002", "0001-26-000001"],
        )
        self.assertEqual(result.latest.primary_document, "q1.xml")

    def test_loads_an_older_submissions_file_when_recent_has_only_one_13f(self) -> None:
        current = {
            "name": "EXAMPLE FUND",
            "filings": {
                "recent": {
                    "accessionNumber": ["0001-26-000002"],
                    "form": ["13F-HR"],
                    "reportDate": ["2026-03-31"],
                    "filingDate": ["2026-05-15"],
                    "primaryDocument": ["new.xml"],
                },
                "files": [{"name": "CIK0000000001-submissions-001.json"}],
            },
        }
        history = {
            "accessionNumber": ["0001-26-000001"],
            "form": ["13F-HR"],
            "reportDate": ["2025-12-31"],
            "filingDate": ["2026-02-15"],
            "primaryDocument": ["old.xml"],
        }

        def fetch(url: str):
            return history if url.endswith("submissions-001.json") else current

        result = SecClient(
            "FolioPulse test@example.com", fetch_json=fetch
        ).get_latest_13f_filings(1)

        self.assertEqual(len(result.filings), 2)
        self.assertEqual(result.previous.primary_document, "old.xml")

    def test_returns_an_empty_result_when_no_original_13f_exists(self) -> None:
        payload = {
            "name": "NO 13F FILER",
            "filings": {
                "recent": {
                    "accessionNumber": ["0001-26-000001"],
                    "form": ["10-K"],
                },
                "files": [],
            },
        }
        result = SecClient(
            "FolioPulse test@example.com", fetch_json=lambda _: payload
        ).get_latest_13f_filings(1)

        self.assertEqual(result.filings, ())
        self.assertIsNone(result.latest)
        self.assertIsNone(result.previous)

    @patch("backend.sec_client.urlopen")
    def test_translates_sec_rate_limit_errors(self, mocked_urlopen) -> None:
        mocked_urlopen.side_effect = HTTPError(
            url="https://data.sec.gov/test",
            code=429,
            msg="Too Many Requests",
            hdrs=None,
            fp=BytesIO(),
        )
        client = SecClient("FolioPulse test@example.com")

        with self.assertRaisesRegex(SecRequestError, "rate limit"):
            client.get_latest_13f_filings(1)


if __name__ == "__main__":
    unittest.main()


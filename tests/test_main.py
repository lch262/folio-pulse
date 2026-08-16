from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import unittest
from unittest.mock import patch

from backend.main import main
from backend.sec_client import Filing, Filer13FResult, SecRequestError


class MainTests(unittest.TestCase):
    @staticmethod
    def _result() -> Filer13FResult:
        return Filer13FResult(
            cik="0001067983",
            name="BERKSHIRE HATHAWAY INC",
            filings=(
                Filing(
                    cik="0001067983",
                    form="13F-HR",
                    report_date="2026-03-31",
                    filing_date="2026-05-15",
                    accession_number="0001193125-26-226661",
                    primary_document="primary_doc.xml",
                ),
                Filing(
                    cik="0001067983",
                    form="13F-HR",
                    report_date="2025-12-31",
                    filing_date="2026-02-17",
                    accession_number="0001193125-26-054580",
                    primary_document="primary_doc.xml",
                ),
            ),
        )

    @patch("backend.main.SecClient")
    def test_prints_latest_and_previous_filings(self, client_type) -> None:
        client_type.return_value.get_latest_13f_filings.return_value = self._result()
        stdout = StringIO()

        with redirect_stdout(stdout):
            exit_code = main(
                ["0001067983", "--user-agent", "FolioPulse test@example.com"]
            )

        self.assertEqual(exit_code, 0)
        output = stdout.getvalue()
        self.assertIn("BERKSHIRE HATHAWAY INC", output)
        self.assertIn("Latest 13F-HR", output)
        self.assertIn("Previous 13F-HR", output)
        self.assertIn("0001193125-26-226661", output)

    @patch("backend.main.SecClient")
    def test_reports_sec_client_errors(self, client_type) -> None:
        client_type.return_value.get_latest_13f_filings.side_effect = SecRequestError(
            "SEC unavailable"
        )
        stderr = StringIO()

        with redirect_stderr(stderr):
            exit_code = main(["1", "--user-agent", "FolioPulse test@example.com"])

        self.assertEqual(exit_code, 1)
        self.assertIn("SEC unavailable", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()


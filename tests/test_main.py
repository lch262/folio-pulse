from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from io import StringIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from backend.filing_parser import Holding
from backend.main import main
from backend.sec_client import (
    Filing,
    Filer13FResult,
    InformationTableDocument,
    SecRequestError,
)


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

    @staticmethod
    def _holding(issuer: str, cusip: str, amount: int) -> Holding:
        return Holding(
            issuer=issuer,
            title_of_class="COM",
            cusip=cusip,
            figi=None,
            reported_value=amount * 10,
            value_usd=amount * 10,
            shares_or_principal_amount=amount,
            shares_or_principal_type="SH",
            put_call=None,
            investment_discretion="SOLE",
            other_manager=None,
            voting_authority_sole=amount,
            voting_authority_shared=0,
            voting_authority_none=0,
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

    @patch("backend.main.parse_information_table")
    @patch("backend.main.SecClient")
    def test_exports_latest_information_table_as_json(
        self, client_type, parser
    ) -> None:
        client = client_type.return_value
        result = self._result()
        client.get_latest_13f_filings.return_value = result
        client.get_information_table.return_value = InformationTableDocument(
            filename="holdings.xml",
            url="https://www.sec.gov/example/holdings.xml",
            content="<informationTable />",
        )
        parser.return_value = (
            Holding(
                issuer="APPLE INC",
                title_of_class="COM",
                cusip="037833100",
                figi=None,
                reported_value=123456789,
                value_usd=123456789,
                shares_or_principal_amount=2000000,
                shares_or_principal_type="SH",
                put_call=None,
                investment_discretion="SOLE",
                other_manager=None,
                voting_authority_sole=2000000,
                voting_authority_shared=0,
                voting_authority_none=0,
            ),
        )

        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = Path(temporary_directory) / "holdings.json"
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "0001067983",
                        "--user-agent",
                        "FolioPulse test@example.com",
                        "--holdings-output",
                        str(output_path),
                    ]
                )

            payload = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["holding_count"], 1)
        self.assertEqual(payload["holdings"][0]["cusip"], "037833100")
        self.assertIn("Holdings: 1", stdout.getvalue())

    @patch("backend.main.parse_information_table")
    @patch("backend.main.SecClient")
    def test_exports_quarterly_portfolio_changes(self, client_type, parser) -> None:
        client = client_type.return_value
        client.get_latest_13f_filings.return_value = self._result()
        client.get_information_table.side_effect = (
            InformationTableDocument(
                filename="current.xml",
                url="https://www.sec.gov/example/current.xml",
                content="<informationTable />",
            ),
            InformationTableDocument(
                filename="previous.xml",
                url="https://www.sec.gov/example/previous.xml",
                content="<informationTable />",
            ),
        )
        parser.side_effect = (
            (
                self._holding("APPLE INC", "037833100", 270),
                self._holding("AMAZON", "023135106", 10),
            ),
            (
                self._holding("APPLE INC", "037833100", 300),
                self._holding("BANK OF AMERICA", "060505104", 500),
            ),
        )

        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = Path(temporary_directory) / "changes.json"
            stdout = StringIO()
            with redirect_stdout(stdout):
                exit_code = main(
                    [
                        "0001067983",
                        "--user-agent",
                        "FolioPulse test@example.com",
                        "--changes-output",
                        str(output_path),
                    ]
                )
            payload = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(payload["counts"]["new"], 1)
        self.assertEqual(payload["counts"]["reduced"], 1)
        self.assertEqual(payload["counts"]["exited"], 1)
        self.assertEqual(payload["new"][0]["issuer"], "AMAZON")
        self.assertIn("NEW: 1", stdout.getvalue())


if __name__ == "__main__":
    unittest.main()

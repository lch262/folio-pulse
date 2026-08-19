from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from backend.filing_parser import Holding
from backend.portfolio_diff import compare_portfolios
from backend.sec_client import Filing
from backend.web_snapshot import WebSnapshotError, build_web_snapshot, load_ticker_map


def holding(issuer: str, cusip: str, shares: int, value_usd: int) -> Holding:
    return Holding(
        issuer=issuer,
        title_of_class="COM",
        cusip=cusip,
        figi=None,
        reported_value=value_usd,
        value_usd=value_usd,
        shares_or_principal_amount=shares,
        shares_or_principal_type="SH",
        put_call=None,
        investment_discretion="SOLE",
        other_manager=None,
        voting_authority_sole=shares,
        voting_authority_shared=0,
        voting_authority_none=0,
    )


class WebSnapshotTests(unittest.TestCase):
    def test_builds_dashboard_contract_with_exit_rows(self) -> None:
        previous = (
            holding("APPLE INC", "037833100", 300, 3_000_000_000),
            holding("BANK OF AMERICA", "060505104", 500, 2_000_000_000),
        )
        current = (
            holding("APPLE INC", "037833100", 270, 4_000_000_000),
            holding("AMAZON", "023135106", 10, 1_000_000_000),
        )
        filing = Filing(
            cik="0001067983",
            form="13F-HR",
            report_date="2026-06-30",
            filing_date="2026-08-14",
            accession_number="0001193125-26-000001",
            primary_document="primary.xml",
        )

        snapshot = build_web_snapshot(
            fund_name="BERKSHIRE HATHAWAY INC",
            current_filing=filing,
            current_holdings=current,
            portfolio_diff=compare_portfolios(previous, current),
            ticker_map={"037833100": "AAPL", "023135106": "AMZN"},
        )

        self.assertEqual(snapshot["totalValue"], 5.0)
        self.assertEqual(snapshot["positionCount"], 2)
        self.assertEqual(snapshot["changes"]["NEW"], 1)
        self.assertEqual(snapshot["changes"]["EXIT"], 1)
        self.assertEqual(snapshot["positions"][0]["ticker"], "AAPL")
        self.assertEqual(snapshot["positions"][0]["weight"], 80.0)
        self.assertEqual(snapshot["positions"][-1]["changeType"], "EXIT")
        self.assertEqual(snapshot["positions"][-1]["ticker"], "060505104")

    def test_loads_and_normalizes_ticker_map(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "tickers.json"
            path.write_text(json.dumps({"037-833-100": "aapl"}), encoding="utf-8")
            result = load_ticker_map(str(path))

        self.assertEqual(result, {"037833100": "AAPL"})

    def test_rejects_non_object_ticker_map(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "tickers.json"
            path.write_text("[]", encoding="utf-8")
            with self.assertRaises(WebSnapshotError):
                load_ticker_map(str(path))


if __name__ == "__main__":
    unittest.main()

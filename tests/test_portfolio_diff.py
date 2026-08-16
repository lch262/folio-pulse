from __future__ import annotations

import unittest

from backend.filing_parser import Holding
from backend.portfolio_diff import (
    PortfolioDiffError,
    aggregate_positions,
    compare_portfolios,
)


def holding(
    issuer: str,
    cusip: str,
    amount: int,
    value_usd: int,
    *,
    put_call: str | None = None,
    amount_type: str = "SH",
) -> Holding:
    return Holding(
        issuer=issuer,
        title_of_class="COM",
        cusip=cusip,
        figi=None,
        reported_value=value_usd,
        value_usd=value_usd,
        shares_or_principal_amount=amount,
        shares_or_principal_type=amount_type,
        put_call=put_call,
        investment_discretion="SOLE",
        other_manager=None,
        voting_authority_sole=amount,
        voting_authority_shared=0,
        voting_authority_none=0,
    )


class PortfolioDiffTests(unittest.TestCase):
    def test_classifies_all_change_types(self) -> None:
        previous = (
            holding("APPLE INC", "037833100", 300, 3000),
            holding("OCCIDENTAL", "674599105", 200, 2000),
            holding("BANK OF AMERICA", "060505104", 500, 5000),
            holding("COCA COLA", "191216100", 100, 1000),
        )
        current = (
            holding("APPLE INC", "037833100", 270, 2800),
            holding("OCCIDENTAL", "674599105", 230, 2600),
            holding("AMAZON", "023135106", 10, 900),
            holding("COCA COLA", "191216100", 100, 1100),
        )

        result = compare_portfolios(previous, current)

        self.assertEqual(
            result.counts,
            {"new": 1, "added": 1, "reduced": 1, "unchanged": 1, "exited": 1},
        )
        self.assertEqual(result.new[0].issuer, "AMAZON")
        self.assertIsNone(result.new[0].change_percent)
        self.assertEqual(result.added[0].change_amount, 30)
        self.assertAlmostEqual(result.added[0].change_percent, 0.15)
        self.assertEqual(result.reduced[0].change_amount, -30)
        self.assertAlmostEqual(result.reduced[0].change_percent, -0.10)
        self.assertEqual(result.unchanged[0].change_percent, 0.0)
        self.assertEqual(result.exited[0].current_amount, 0)
        self.assertIsNone(result.exited[0].change_percent)

    def test_aggregates_manager_split_rows_before_comparison(self) -> None:
        previous = (
            holding("APPLE INC", "037833100", 100, 1000),
            holding("APPLE INC", "037833100", 50, 500),
        )
        current = (holding("APPLE INC", "037-833-100", 180, 2100),)

        result = compare_portfolios(previous, current)

        self.assertEqual(len(result.added), 1)
        self.assertEqual(result.added[0].previous_amount, 150)
        self.assertEqual(result.added[0].current_amount, 180)
        self.assertEqual(result.added[0].previous_value_usd, 1500)

    def test_keeps_options_separate_from_common_stock(self) -> None:
        previous = (
            holding("EXAMPLE", "123456789", 100, 1000),
            holding("EXAMPLE", "123456789", 50, 200, put_call="Call"),
        )
        current = (holding("EXAMPLE", "123456789", 100, 1100),)

        result = compare_portfolios(previous, current)

        self.assertEqual(len(result.unchanged), 1)
        self.assertEqual(len(result.exited), 1)
        self.assertEqual(result.exited[0].put_call, "CALL")

    def test_rejects_negative_holdings(self) -> None:
        with self.assertRaises(PortfolioDiffError):
            aggregate_positions((holding("INVALID", "123456789", -1, 100),))


if __name__ == "__main__":
    unittest.main()

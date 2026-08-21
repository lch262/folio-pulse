"""Convert parsed 13F data into the FolioPulse website snapshot contract."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Mapping

from .filing_parser import Holding
from .portfolio_diff import (
    ChangeStatus,
    PortfolioDiff,
    PositionChange,
    SecurityKey,
    aggregate_positions,
)
from .sec_client import Filing


class WebSnapshotError(ValueError):
    """Raised when a website snapshot or ticker map cannot be built safely."""


def load_ticker_map(path_value: str | None) -> dict[str, str]:
    """Load an optional CUSIP-to-ticker JSON object."""

    if not path_value:
        return {}
    path = Path(path_value)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise WebSnapshotError(f"Ticker map could not be read: {exc}") from exc
    if not isinstance(payload, dict):
        raise WebSnapshotError("Ticker map must be a JSON object of CUSIP to ticker.")

    ticker_map: dict[str, str] = {}
    for cusip, ticker in payload.items():
        if not isinstance(cusip, str) or not isinstance(ticker, str):
            raise WebSnapshotError("Ticker map keys and values must be strings.")
        normalized_cusip = _normalize_cusip(cusip)
        normalized_ticker = ticker.strip().upper()
        if not normalized_ticker:
            raise WebSnapshotError(f"Ticker map has an empty ticker for {cusip!r}.")
        ticker_map[normalized_cusip] = normalized_ticker
    return ticker_map


def build_web_snapshot(
    *,
    fund_name: str,
    previous_filing: Filing,
    current_filing: Filing,
    current_holdings: tuple[Holding, ...],
    portfolio_diff: PortfolioDiff,
    ticker_map: Mapping[str, str] | None = None,
) -> dict[str, object]:
    """Build the JSON contract consumed by POST /api/portfolio."""

    if not previous_filing.report_date:
        raise WebSnapshotError("The previous filing must include a report date.")
    if not current_filing.report_date or not current_filing.filing_date:
        raise WebSnapshotError("The current filing must include report and filing dates.")

    tickers = {_normalize_cusip(key): value.strip().upper() for key, value in (ticker_map or {}).items()}
    current = aggregate_positions(current_holdings)
    changes = _changes_by_key(portfolio_diff)
    total_value_usd = sum(position.value_usd for position in current.values())

    rows: list[dict[str, object]] = []
    for key, position in current.items():
        change = changes.get(key)
        status: ChangeStatus = change.status if change else "UNCHANGED"
        share_change = change.change_amount if change else 0
        change_percent = (
            round(change.change_percent * 100, 4)
            if change and change.change_percent is not None
            else None
        )
        rows.append(
            {
                "issuer": position.issuer,
                "ticker": _display_symbol(position.cusip, position.put_call, tickers),
                "sector": "未分类",
                "value": round(position.value_usd / 1_000_000_000, 9),
                "weight": (
                    round(position.value_usd / total_value_usd * 100, 6)
                    if total_value_usd
                    else 0.0
                ),
                "shares": position.amount,
                "shareChange": share_change,
                "changePercent": change_percent,
                "changeType": status,
            }
        )

    for change in portfolio_diff.exited:
        rows.append(
            {
                "issuer": change.issuer,
                "ticker": _display_symbol(change.cusip, change.put_call, tickers),
                "sector": "未分类",
                "value": 0.0,
                "weight": 0.0,
                "shares": 0,
                "shareChange": change.change_amount,
                "changePercent": None,
                "changeType": "EXIT",
            }
        )

    rows.sort(key=lambda row: (-float(row["value"]), str(row["issuer"]).casefold()))
    counts = portfolio_diff.counts
    return {
        "manager": fund_name,
        "managerShort": fund_name,
        "cik": current_filing.cik,
        "previousReportDate": previous_filing.report_date,
        "reportDate": current_filing.report_date,
        "filedAt": current_filing.filing_date,
        "source": "SEC 13F-HR",
        "totalValue": round(total_value_usd / 1_000_000_000, 9),
        "positionCount": len(current),
        "changes": {
            "NEW": counts["new"],
            "ADDED": counts["added"],
            "REDUCED": counts["reduced"],
            "EXIT": counts["exited"],
            "UNCHANGED": counts["unchanged"],
        },
        "positions": rows,
    }


def _changes_by_key(portfolio_diff: PortfolioDiff) -> dict[SecurityKey, PositionChange]:
    changes: dict[SecurityKey, PositionChange] = {}
    for bucket in (
        portfolio_diff.new,
        portfolio_diff.added,
        portfolio_diff.reduced,
        portfolio_diff.unchanged,
    ):
        for change in bucket:
            changes[(change.cusip, change.put_call or "", change.amount_type)] = change
    return changes


def _display_symbol(
    cusip: str, put_call: str | None, ticker_map: Mapping[str, str]
) -> str:
    symbol = ticker_map.get(cusip, cusip)
    return f"{symbol} {put_call}" if put_call else symbol


def _normalize_cusip(value: str) -> str:
    normalized = "".join(character for character in value.upper() if character.isalnum())
    if not normalized:
        raise WebSnapshotError("Ticker map contains an empty CUSIP.")
    return normalized

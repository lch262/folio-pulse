"""Command-line entry point for FolioPulse."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from .filing_parser import FilingParseError, Holding, parse_information_table
from .portfolio_diff import PortfolioDiff, PortfolioDiffError, compare_portfolios
from .sec_client import Filing, SecClient, SecClientError
from .web_snapshot import WebSnapshotError, build_web_snapshot, load_ticker_map


USER_AGENT_ENV = "FOLIOPULSE_SEC_USER_AGENT"
DEFAULT_CIK = "0001067983"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Find the latest two original SEC 13F-HR filings for a filer."
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
        "--json",
        action="store_true",
        dest="as_json",
        help="Print machine-readable JSON.",
    )
    parser.add_argument(
        "--holdings-output",
        metavar="PATH",
        help="Download and write the latest 13F Information Table as JSON.",
    )
    parser.add_argument(
        "--changes-output",
        metavar="PATH",
        help="Compare the newest two 13F portfolios and write changes as JSON.",
    )
    parser.add_argument(
        "--web-snapshot-output",
        metavar="PATH",
        help="Write a website-import snapshot from the newest two portfolios.",
    )
    parser.add_argument(
        "--ticker-map",
        metavar="PATH",
        help="Optional JSON object mapping CUSIP values to ticker symbols.",
    )
    return parser


def _print_filing(label: str, filing: Filing | None) -> None:
    print(f"\n{label}")
    if filing is None:
        print("Not available")
        return
    print(f"Form: {filing.form}")
    print(f"Report period: {filing.report_date or 'Unknown'}")
    print(f"Filed: {filing.filing_date or 'Unknown'}")
    print(f"Accession: {filing.accession_number}")
    print(f"Primary document: {filing.primary_document or 'Unknown'}")
    print(f"URL: {filing.primary_document_url}")


def _holdings_payload(
    *,
    fund_name: str,
    filing: Filing,
    source_url: str,
    holdings: tuple[Holding, ...],
) -> dict[str, object]:
    return {
        "fund": fund_name,
        "cik": filing.cik,
        "form": filing.form,
        "report_date": filing.report_date,
        "filing_date": filing.filing_date,
        "accession_number": filing.accession_number,
        "information_table_url": source_url,
        "value_currency": "USD",
        "holding_count": len(holdings),
        "holdings": [holding.to_dict() for holding in holdings],
    }


def _changes_payload(
    *,
    fund_name: str,
    previous_filing: Filing,
    current_filing: Filing,
    portfolio_diff: PortfolioDiff,
) -> dict[str, object]:
    return {
        "fund": fund_name,
        "cik": current_filing.cik,
        "previous_filing": previous_filing.to_dict(),
        "current_filing": current_filing.to_dict(),
        **portfolio_diff.to_dict(),
    }


def _write_json(path_value: str, payload: dict[str, object]) -> Path:
    output_path = Path(path_value)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return output_path


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.user_agent.strip():
        parser.error(
            f"declare a contact User-Agent with --user-agent or {USER_AGENT_ENV}"
        )

    holdings_summary: dict[str, object] | None = None
    changes_summary: dict[str, object] | None = None
    web_snapshot_summary: dict[str, object] | None = None
    try:
        client = SecClient(args.user_agent)
        result = client.get_latest_13f_filings(args.cik)
        parsed_holdings: dict[str, tuple[str, tuple[Holding, ...]]] = {}

        def load_holdings(filing: Filing) -> tuple[str, tuple[Holding, ...]]:
            cached = parsed_holdings.get(filing.accession_number)
            if cached is not None:
                return cached
            document = client.get_information_table(filing)
            holdings = parse_information_table(
                document.content,
                filing_date=filing.filing_date,
            )
            parsed = (document.url, holdings)
            parsed_holdings[filing.accession_number] = parsed
            return parsed

        if args.holdings_output:
            if result.latest is None:
                raise FilingParseError("No original 13F-HR is available to parse.")
            source_url, holdings = load_holdings(result.latest)
            payload = _holdings_payload(
                fund_name=result.name,
                filing=result.latest,
                source_url=source_url,
                holdings=holdings,
            )
            output_path = _write_json(args.holdings_output, payload)
            holdings_summary = {
                "count": len(holdings),
                "output": str(output_path),
                "source_url": source_url,
            }

        if args.changes_output or args.web_snapshot_output:
            if result.latest is None or result.previous is None:
                raise PortfolioDiffError(
                    "Two original 13F-HR filings are required for comparison."
                )
            _, current_holdings = load_holdings(result.latest)
            _, previous_holdings = load_holdings(result.previous)
            portfolio_diff = compare_portfolios(previous_holdings, current_holdings)
            if args.changes_output:
                payload = _changes_payload(
                    fund_name=result.name,
                    previous_filing=result.previous,
                    current_filing=result.latest,
                    portfolio_diff=portfolio_diff,
                )
                output_path = _write_json(args.changes_output, payload)
                changes_summary = {
                    "counts": portfolio_diff.counts,
                    "output": str(output_path),
                }

            if args.web_snapshot_output:
                snapshot = build_web_snapshot(
                    fund_name=result.name,
                    current_filing=result.latest,
                    current_holdings=current_holdings,
                    portfolio_diff=portfolio_diff,
                    ticker_map=load_ticker_map(args.ticker_map),
                )
                output_path = _write_json(args.web_snapshot_output, snapshot)
                web_snapshot_summary = {
                    "positions": snapshot["positionCount"],
                    "output": str(output_path),
                }
    except (
        FilingParseError,
        OSError,
        PortfolioDiffError,
        SecClientError,
        ValueError,
        WebSnapshotError,
    ) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.as_json:
        output = result.to_dict()
        if holdings_summary is not None:
            output["holdings_export"] = holdings_summary
        if changes_summary is not None:
            output["changes_export"] = changes_summary
        if web_snapshot_summary is not None:
            output["web_snapshot_export"] = web_snapshot_summary
        print(json.dumps(output, indent=2, ensure_ascii=False))
    else:
        print("FolioPulse SEC Tracker")
        print(f"\nFund: {result.name}")
        print(f"CIK: {result.cik}")
        _print_filing("Latest 13F-HR", result.latest)
        _print_filing("Previous 13F-HR", result.previous)
        if holdings_summary is not None:
            print("\nInformation Table")
            print(f"Holdings: {holdings_summary['count']}")
            print(f"Saved: {holdings_summary['output']}")
        if changes_summary is not None:
            counts = changes_summary["counts"]
            print("\nPortfolio Changes")
            print(
                "NEW: {new} | ADDED: {added} | REDUCED: {reduced} | "
                "UNCHANGED: {unchanged} | EXITED: {exited}".format(**counts)
            )
            print(f"Saved: {changes_summary['output']}")
        if web_snapshot_summary is not None:
            print("\nWebsite Snapshot")
            print(f"Positions: {web_snapshot_summary['positions']}")
            print(f"Saved: {web_snapshot_summary['output']}")

    if len(result.filings) < 2:
        print(
            "Warning: fewer than two original 13F-HR filings were found.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

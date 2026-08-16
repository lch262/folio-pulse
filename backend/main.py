"""Command-line entry point for FolioPulse V0.02."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import sys

from .filing_parser import FilingParseError, Holding, parse_information_table
from .sec_client import Filing, SecClient, SecClientError


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


def _write_holdings(path_value: str, payload: dict[str, object]) -> Path:
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
    try:
        client = SecClient(args.user_agent)
        result = client.get_latest_13f_filings(args.cik)
        if args.holdings_output:
            if result.latest is None:
                raise FilingParseError("No original 13F-HR is available to parse.")
            document = client.get_information_table(result.latest)
            holdings = parse_information_table(
                document.content,
                filing_date=result.latest.filing_date,
            )
            payload = _holdings_payload(
                fund_name=result.name,
                filing=result.latest,
                source_url=document.url,
                holdings=holdings,
            )
            output_path = _write_holdings(args.holdings_output, payload)
            holdings_summary = {
                "count": len(holdings),
                "output": str(output_path),
                "source_url": document.url,
            }
    except (FilingParseError, OSError, SecClientError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.as_json:
        output = result.to_dict()
        if holdings_summary is not None:
            output["holdings_export"] = holdings_summary
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

    if len(result.filings) < 2:
        print(
            "Warning: fewer than two original 13F-HR filings were found.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Command-line entry point for FolioPulse V0.01."""

from __future__ import annotations

import argparse
import json
import os
import sys

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


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not args.user_agent.strip():
        parser.error(
            f"declare a contact User-Agent with --user-agent or {USER_AGENT_ENV}"
        )

    try:
        result = SecClient(args.user_agent).get_latest_13f_filings(args.cik)
    except (SecClientError, ValueError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    if args.as_json:
        print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
    else:
        print("FolioPulse SEC Tracker")
        print(f"\nFund: {result.name}")
        print(f"CIK: {result.cik}")
        _print_filing("Latest 13F-HR", result.latest)
        _print_filing("Previous 13F-HR", result.previous)

    if len(result.filings) < 2:
        print(
            "Warning: fewer than two original 13F-HR filings were found.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


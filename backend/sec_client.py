"""Small, dependency-free client for the SEC EDGAR submissions API."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import json
from typing import Any, Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SUBMISSIONS_BASE_URL = "https://data.sec.gov/submissions"
ARCHIVES_BASE_URL = "https://www.sec.gov/Archives/edgar/data"


class SecClientError(RuntimeError):
    """Base error for SEC client failures."""


class InvalidCikError(SecClientError):
    """Raised when a CIK cannot be normalized."""


class SecRequestError(SecClientError):
    """Raised when the SEC cannot be reached or rejects a request."""


class SecResponseError(SecClientError):
    """Raised when an SEC response is malformed."""


def normalize_cik(cik: str | int) -> str:
    """Return a positive numeric CIK as a zero-padded 10-character string."""

    if isinstance(cik, bool):
        raise InvalidCikError("CIK must be a positive number, not a boolean.")

    raw = str(cik).strip()
    if not raw or not raw.isdigit():
        raise InvalidCikError("CIK must contain digits only.")
    if len(raw) > 10:
        raise InvalidCikError("CIK cannot be longer than 10 digits.")
    if int(raw) <= 0:
        raise InvalidCikError("CIK must be greater than zero.")
    return raw.zfill(10)


@dataclass(frozen=True, slots=True)
class Filing:
    """Normalized metadata for one SEC filing."""

    cik: str
    form: str
    report_date: str
    filing_date: str
    accession_number: str
    primary_document: str

    @property
    def filing_directory_url(self) -> str:
        accession_path = self.accession_number.replace("-", "")
        return f"{ARCHIVES_BASE_URL}/{int(self.cik)}/{accession_path}/"

    @property
    def primary_document_url(self) -> str:
        return f"{self.filing_directory_url}{self.primary_document}"

    def to_dict(self) -> dict[str, str]:
        payload = asdict(self)
        payload["filing_directory_url"] = self.filing_directory_url
        payload["primary_document_url"] = self.primary_document_url
        return payload


@dataclass(frozen=True, slots=True)
class Filer13FResult:
    """A filer and its newest original 13F-HR filings."""

    cik: str
    name: str
    filings: tuple[Filing, ...]

    @property
    def latest(self) -> Filing | None:
        return self.filings[0] if self.filings else None

    @property
    def previous(self) -> Filing | None:
        return self.filings[1] if len(self.filings) > 1 else None

    def to_dict(self) -> dict[str, Any]:
        return {
            "cik": self.cik,
            "name": self.name,
            "filings": [filing.to_dict() for filing in self.filings],
        }


JsonFetcher = Callable[[str], Mapping[str, Any]]


class SecClient:
    """Fetch and normalize a filer's most recent original 13F-HR filings."""

    def __init__(
        self,
        user_agent: str,
        *,
        timeout: float = 30.0,
        fetch_json: JsonFetcher | None = None,
    ) -> None:
        declared_user_agent = user_agent.strip()
        if not declared_user_agent:
            raise ValueError("A declared SEC User-Agent is required.")
        if timeout <= 0:
            raise ValueError("timeout must be greater than zero.")

        self.user_agent = declared_user_agent
        self.timeout = timeout
        self._fetcher = fetch_json or self._fetch_json

    def get_latest_13f_filings(
        self, cik: str | int, *, limit: int = 2
    ) -> Filer13FResult:
        """Return up to ``limit`` newest 13F-HR filings, excluding amendments."""

        if limit <= 0:
            raise ValueError("limit must be greater than zero.")

        normalized_cik = normalize_cik(cik)
        submissions_url = f"{SUBMISSIONS_BASE_URL}/CIK{normalized_cik}.json"
        submissions = self._fetcher(submissions_url)
        if not isinstance(submissions, Mapping):
            raise SecResponseError("SEC submissions response must be a JSON object.")

        filer_name = str(submissions.get("name") or "Unknown filer")
        filings_block = submissions.get("filings")
        if not isinstance(filings_block, Mapping):
            raise SecResponseError("SEC response is missing the filings object.")

        candidates = self._extract_13f_rows(
            normalized_cik, filings_block.get("recent")
        )

        history_files = filings_block.get("files") or []
        if len(candidates) < limit and isinstance(history_files, list):
            for history_file in history_files:
                if not isinstance(history_file, Mapping):
                    continue
                filename = history_file.get("name")
                if not filename:
                    continue
                history = self._fetcher(f"{SUBMISSIONS_BASE_URL}/{filename}")
                candidates.extend(self._extract_13f_rows(normalized_cik, history))
                if len(self._deduplicate(candidates)) >= limit:
                    break

        ordered = sorted(
            self._deduplicate(candidates),
            key=lambda filing: (filing.filing_date, filing.accession_number),
            reverse=True,
        )
        return Filer13FResult(
            cik=normalized_cik,
            name=filer_name,
            filings=tuple(ordered[:limit]),
        )

    @staticmethod
    def _extract_13f_rows(cik: str, section: Any) -> list[Filing]:
        if not isinstance(section, Mapping):
            return []

        accession_numbers = section.get("accessionNumber") or []
        if not isinstance(accession_numbers, list):
            raise SecResponseError("SEC accessionNumber field must be an array.")

        filings: list[Filing] = []
        for index, accession_number in enumerate(accession_numbers):
            form = SecClient._column_value(section, "form", index)
            if form != "13F-HR":
                continue

            accession = str(accession_number or "").strip()
            if not accession:
                continue
            filings.append(
                Filing(
                    cik=cik,
                    form=form,
                    report_date=SecClient._column_value(section, "reportDate", index),
                    filing_date=SecClient._column_value(section, "filingDate", index),
                    accession_number=accession,
                    primary_document=SecClient._column_value(
                        section, "primaryDocument", index
                    ),
                )
            )
        return filings

    @staticmethod
    def _column_value(section: Mapping[str, Any], key: str, index: int) -> str:
        column = section.get(key) or []
        if not isinstance(column, list) or index >= len(column):
            return ""
        return str(column[index] or "").strip()

    @staticmethod
    def _deduplicate(filings: list[Filing]) -> list[Filing]:
        unique: dict[str, Filing] = {}
        for filing in filings:
            unique[filing.accession_number] = filing
        return list(unique.values())

    def _fetch_json(self, url: str) -> Mapping[str, Any]:
        request = Request(
            url,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "application/json",
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read()
        except HTTPError as exc:
            if exc.code == 404:
                message = "CIK or SEC submissions resource was not found."
            elif exc.code == 429:
                message = "SEC rate limit reached; retry later with a lower request rate."
            else:
                message = f"SEC returned HTTP {exc.code}."
            raise SecRequestError(message) from exc
        except (URLError, OSError) as exc:
            raise SecRequestError(f"Could not reach the SEC: {exc}") from exc

        try:
            payload = json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SecResponseError("SEC returned invalid JSON.") from exc
        if not isinstance(payload, Mapping):
            raise SecResponseError("SEC JSON response must be an object.")
        return payload


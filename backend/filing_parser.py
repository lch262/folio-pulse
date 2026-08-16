"""Parser for SEC Form 13F XML Information Tables."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Any
import xml.etree.ElementTree as ET


VALUE_UNIT_CHANGE_DATE = date(2023, 1, 3)


class FilingParseError(ValueError):
    """Raised when an Information Table cannot be normalized safely."""


@dataclass(frozen=True, slots=True)
class Holding:
    """One normalized row from a Form 13F Information Table."""

    issuer: str
    title_of_class: str
    cusip: str
    figi: str | None
    reported_value: int
    value_usd: int
    shares_or_principal_amount: int
    shares_or_principal_type: str
    put_call: str | None
    investment_discretion: str
    other_manager: str | None
    voting_authority_sole: int
    voting_authority_shared: int
    voting_authority_none: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def parse_information_table(xml_content: str, *, filing_date: str) -> tuple[Holding, ...]:
    """Parse a modern 13F Information Table and normalize values to dollars."""

    try:
        filed_on = date.fromisoformat(filing_date)
    except ValueError as exc:
        raise FilingParseError("filing_date must use YYYY-MM-DD format.") from exc

    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as exc:
        raise FilingParseError(f"Information Table is invalid XML: {exc}") from exc

    if _local_name(root.tag).casefold() != "informationtable":
        raise FilingParseError("XML root element is not informationTable.")

    value_multiplier = 1 if filed_on >= VALUE_UNIT_CHANGE_DATE else 1000
    holdings: list[Holding] = []
    for row_number, row in enumerate(_children(root, "infoTable"), start=1):
        shares = _child(row, "shrsOrPrnAmt", required=True)
        voting = _child(row, "votingAuthority", required=True)
        reported_value = _integer(row, "value", row_number)
        holdings.append(
            Holding(
                issuer=_text(row, "nameOfIssuer", required=True),
                title_of_class=_text(row, "titleOfClass", required=True),
                cusip=_text(row, "cusip", required=True),
                figi=_optional_text(row, "figi"),
                reported_value=reported_value,
                value_usd=reported_value * value_multiplier,
                shares_or_principal_amount=_integer(
                    shares, "sshPrnamt", row_number
                ),
                shares_or_principal_type=_text(
                    shares, "sshPrnamtType", required=True
                ),
                put_call=_optional_text(row, "putCall"),
                investment_discretion=_text(
                    row, "investmentDiscretion", required=True
                ),
                other_manager=_optional_text(row, "otherManager"),
                voting_authority_sole=_integer(voting, "Sole", row_number),
                voting_authority_shared=_integer(voting, "Shared", row_number),
                voting_authority_none=_integer(voting, "None", row_number),
            )
        )
    return tuple(holdings)


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _children(element: ET.Element, name: str) -> list[ET.Element]:
    return [child for child in element if _local_name(child.tag) == name]


def _child(
    element: ET.Element, name: str, *, required: bool = False
) -> ET.Element:
    for child in element:
        if _local_name(child.tag) == name:
            return child
    if required:
        raise FilingParseError(f"Missing required {name} element.")
    raise FilingParseError(f"Missing {name} element.")


def _text(element: ET.Element, name: str, *, required: bool = False) -> str:
    for child in element:
        if _local_name(child.tag) == name:
            value = (child.text or "").strip()
            if value or not required:
                return value
            break
    if required:
        raise FilingParseError(f"Missing required {name} value.")
    return ""


def _optional_text(element: ET.Element, name: str) -> str | None:
    value = _text(element, name)
    return value or None


def _integer(element: ET.Element, name: str, row_number: int) -> int:
    value = _text(element, name, required=True).replace(",", "")
    try:
        return int(value)
    except ValueError as exc:
        raise FilingParseError(
            f"Row {row_number} has invalid integer value for {name}: {value!r}."
        ) from exc

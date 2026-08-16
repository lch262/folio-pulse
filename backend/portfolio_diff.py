"""Quarter-over-quarter comparison for normalized Form 13F holdings."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Iterable, Literal

from .filing_parser import Holding


ChangeStatus = Literal["NEW", "ADDED", "REDUCED", "UNCHANGED", "EXIT"]
SecurityKey = tuple[str, str, str]


class PortfolioDiffError(ValueError):
    """Raised when holdings cannot be compared safely."""


@dataclass(frozen=True, slots=True)
class Position:
    """One security position after duplicate Information Table rows are combined."""

    issuer: str
    title_of_class: str
    cusip: str
    figi: str | None
    put_call: str | None
    amount_type: str
    amount: int
    value_usd: int


@dataclass(frozen=True, slots=True)
class PositionChange:
    """One normalized quarter-over-quarter position change."""

    status: ChangeStatus
    issuer: str
    title_of_class: str
    cusip: str
    figi: str | None
    put_call: str | None
    amount_type: str
    previous_amount: int
    current_amount: int
    change_amount: int
    change_percent: float | None
    previous_value_usd: int
    current_value_usd: int

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class PortfolioDiff:
    """Classified changes between two reported portfolios."""

    new: tuple[PositionChange, ...]
    added: tuple[PositionChange, ...]
    reduced: tuple[PositionChange, ...]
    unchanged: tuple[PositionChange, ...]
    exited: tuple[PositionChange, ...]

    @property
    def counts(self) -> dict[str, int]:
        return {
            "new": len(self.new),
            "added": len(self.added),
            "reduced": len(self.reduced),
            "unchanged": len(self.unchanged),
            "exited": len(self.exited),
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "counts": self.counts,
            "new": [change.to_dict() for change in self.new],
            "added": [change.to_dict() for change in self.added],
            "reduced": [change.to_dict() for change in self.reduced],
            "unchanged": [change.to_dict() for change in self.unchanged],
            "exited": [change.to_dict() for change in self.exited],
        }


@dataclass(slots=True)
class _PositionAccumulator:
    issuer: str
    title_of_class: str
    cusip: str
    figi: str | None
    put_call: str | None
    amount_type: str
    amount: int = 0
    value_usd: int = 0

    def freeze(self) -> Position:
        return Position(
            issuer=self.issuer,
            title_of_class=self.title_of_class,
            cusip=self.cusip,
            figi=self.figi,
            put_call=self.put_call,
            amount_type=self.amount_type,
            amount=self.amount,
            value_usd=self.value_usd,
        )


def aggregate_positions(holdings: Iterable[Holding]) -> dict[SecurityKey, Position]:
    """Combine manager-split rows using CUSIP, Put/Call, and amount type."""

    accumulators: dict[SecurityKey, _PositionAccumulator] = {}
    for holding in holdings:
        if holding.shares_or_principal_amount < 0 or holding.value_usd < 0:
            raise PortfolioDiffError("Holdings cannot contain negative amounts or values.")

        cusip = _normalize_cusip(holding.cusip)
        put_call = _normalize_optional(holding.put_call)
        amount_type = holding.shares_or_principal_type.strip().upper()
        if not amount_type:
            raise PortfolioDiffError("Holdings must declare SH or PRN amount type.")
        key = (cusip, put_call or "", amount_type)

        accumulator = accumulators.get(key)
        if accumulator is None:
            accumulator = _PositionAccumulator(
                issuer=holding.issuer.strip(),
                title_of_class=holding.title_of_class.strip(),
                cusip=cusip,
                figi=_normalize_optional(holding.figi),
                put_call=put_call,
                amount_type=amount_type,
            )
            accumulators[key] = accumulator
        elif accumulator.figi is None and holding.figi:
            accumulator.figi = holding.figi.strip().upper()

        accumulator.amount += holding.shares_or_principal_amount
        accumulator.value_usd += holding.value_usd

    return {
        key: accumulator.freeze()
        for key, accumulator in accumulators.items()
        if accumulator.amount > 0
    }


def compare_portfolios(
    previous_holdings: Iterable[Holding], current_holdings: Iterable[Holding]
) -> PortfolioDiff:
    """Aggregate and classify changes between two reported portfolios."""

    previous = aggregate_positions(previous_holdings)
    current = aggregate_positions(current_holdings)
    buckets: dict[ChangeStatus, list[PositionChange]] = {
        "NEW": [],
        "ADDED": [],
        "REDUCED": [],
        "UNCHANGED": [],
        "EXIT": [],
    }

    for key in previous.keys() | current.keys():
        old = previous.get(key)
        new = current.get(key)
        previous_amount = old.amount if old else 0
        current_amount = new.amount if new else 0

        if old is None:
            status: ChangeStatus = "NEW"
        elif new is None:
            status = "EXIT"
        elif current_amount > previous_amount:
            status = "ADDED"
        elif current_amount < previous_amount:
            status = "REDUCED"
        else:
            status = "UNCHANGED"

        display = new or old
        if display is None:  # pragma: no cover - impossible for a union key
            continue
        change_amount = current_amount - previous_amount
        change_percent = (
            change_amount / previous_amount if previous_amount > 0 and new else None
        )
        buckets[status].append(
            PositionChange(
                status=status,
                issuer=display.issuer,
                title_of_class=display.title_of_class,
                cusip=display.cusip,
                figi=(new.figi if new and new.figi else old.figi if old else None),
                put_call=display.put_call,
                amount_type=display.amount_type,
                previous_amount=previous_amount,
                current_amount=current_amount,
                change_amount=change_amount,
                change_percent=change_percent,
                previous_value_usd=old.value_usd if old else 0,
                current_value_usd=new.value_usd if new else 0,
            )
        )

    for changes in buckets.values():
        changes.sort(key=_sort_key)

    return PortfolioDiff(
        new=tuple(buckets["NEW"]),
        added=tuple(buckets["ADDED"]),
        reduced=tuple(buckets["REDUCED"]),
        unchanged=tuple(buckets["UNCHANGED"]),
        exited=tuple(buckets["EXIT"]),
    )


def _normalize_cusip(value: str) -> str:
    normalized = "".join(character for character in value.upper() if character.isalnum())
    if not normalized:
        raise PortfolioDiffError("Holdings must contain a CUSIP.")
    return normalized


def _normalize_optional(value: str | None) -> str | None:
    normalized = (value or "").strip().upper()
    return normalized or None


def _sort_key(change: PositionChange) -> tuple[int, str, str, str]:
    largest_value = max(change.previous_value_usd, change.current_value_usd)
    return (
        -largest_value,
        change.issuer.casefold(),
        change.cusip,
        change.put_call or "",
    )

"""
XIRR Calculation Engine
Computes Extended Internal Rate of Return for irregular cash flows.
Uses Newton-Raphson iteration on the NPV equation.
"""
from datetime import date
from typing import List, Tuple
import numpy as np


def xirr(cash_flows: List[Tuple[date, float]], guess: float = 0.1, max_iterations: int = 100, tol: float = 1e-6) -> float:
    """
    Calculate XIRR given a list of (date, amount) tuples.
    Negative amounts = investments (outflows), positive = redemptions/current value (inflows).
    Returns annualized return rate (e.g. 0.12 = 12%).
    """
    if len(cash_flows) < 2:
        return 0.0

    dates = [cf[0] for cf in cash_flows]
    amounts = [cf[1] for cf in cash_flows]

    # Use first cash flow date as base
    base_date = dates[0]
    day_diffs = [(d - base_date).days / 365.0 for d in dates]

    def npv(rate: float) -> float:
        return sum(amt / (1 + rate) ** t for amt, t in zip(amounts, day_diffs))

    def npv_derivative(rate: float) -> float:
        return sum(-t * amt / (1 + rate) ** (t + 1) for amt, t in zip(amounts, day_diffs))

    rate = guess
    for _ in range(max_iterations):
        npv_val = npv(rate)
        deriv = npv_derivative(rate)
        if abs(deriv) < 1e-12:
            break
        new_rate = rate - npv_val / deriv
        if abs(new_rate - rate) < tol:
            return new_rate
        rate = new_rate

    # Fallback: try bisection if Newton-Raphson diverges
    try:
        lo, hi = -0.999, 10.0
        for _ in range(200):
            mid = (lo + hi) / 2
            if npv(mid) > 0:
                lo = mid
            else:
                hi = mid
            if hi - lo < tol:
                return (lo + hi) / 2
    except Exception:
        pass

    return rate


def cagr(invested: float, current_value: float, years: float) -> float:
    """Simple CAGR calculation as fallback."""
    if invested <= 0 or years <= 0:
        return 0.0
    return (current_value / invested) ** (1 / years) - 1


def annualized_return(invested: float, current_value: float, days: int) -> float:
    """Annualized return given number of days."""
    if invested <= 0 or days <= 0:
        return 0.0
    return cagr(invested, current_value, days / 365.0)


def compute_portfolio_xirr(transactions: list, current_value: float, current_date: date) -> dict:
    """
    Given a list of transactions [{date, amount, type}] and current value,
    compute XIRR and related metrics.
    transaction type: 'buy' or 'sell'
    """
    cash_flows = []
    total_invested = 0.0
    total_redeemed = 0.0

    for txn in transactions:
        txn_date = txn["date"] if isinstance(txn["date"], date) else date.fromisoformat(txn["date"])
        amount = float(txn["amount"])
        if txn.get("type", "buy") == "buy":
            cash_flows.append((txn_date, -amount))
            total_invested += amount
        else:
            cash_flows.append((txn_date, amount))
            total_redeemed += amount

    # Add current value as terminal inflow
    cash_flows.append((current_date, current_value + total_redeemed))

    # Sort by date
    cash_flows.sort(key=lambda x: x[0])

    xirr_val = 0.0
    method = "xirr"
    try:
        if len(cash_flows) >= 2:
            xirr_val = xirr(cash_flows)
            if not np.isfinite(xirr_val) or xirr_val < -1 or xirr_val > 100:
                raise ValueError("XIRR out of range")
    except Exception:
        # Fall back to CAGR
        days = (current_date - cash_flows[0][0]).days
        xirr_val = annualized_return(total_invested, current_value, days)
        method = "cagr_fallback"

    unrealized_gain = current_value - (total_invested - total_redeemed)
    abs_return = (unrealized_gain / total_invested * 100) if total_invested > 0 else 0

    return {
        "xirr": round(xirr_val * 100, 2),
        "method": method,
        "total_invested": round(total_invested, 2),
        "total_redeemed": round(total_redeemed, 2),
        "current_value": round(current_value, 2),
        "unrealized_gain": round(unrealized_gain, 2),
        "absolute_return_pct": round(abs_return, 2),
    }

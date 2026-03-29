from __future__ import annotations

from typing import Any, Dict, List


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _future_value_monthly_investment(monthly_amount: float, annual_return: float, years: int) -> float:
    months = max(1, years * 12)
    monthly_rate = annual_return / 12.0
    if monthly_rate == 0:
        return monthly_amount * months
    return monthly_amount * (((1 + monthly_rate) ** months - 1) / monthly_rate)


def build_student_sip_plan(payload: Dict[str, Any]) -> Dict[str, Any]:
    monthly_budget = _to_float(payload.get("monthly_budget", 500))
    investment_duration = int(_to_float(payload.get("investment_duration", 3), 3))
    risk_appetite = str(payload.get("risk_appetite", "moderate")).lower()
    user_type = str(payload.get("user_type", "student")).lower()

    if user_type != "student":
        user_type = "student"

    duration = min(5, max(3, investment_duration))

    baseline = min(700.0, max(500.0, monthly_budget * 0.7))
    monthly_investment = min(monthly_budget, baseline)
    monthly_investment = max(100.0, monthly_investment)

    if risk_appetite == "high":
        equity_pct, safety_pct, assumed_return = 90, 10, 0.14
        allocation_strategy = "Equity-heavy growth allocation with a small safety buffer."
    elif risk_appetite == "low":
        equity_pct, safety_pct, assumed_return = 65, 35, 0.08
        allocation_strategy = "Balanced-first approach with stronger safety allocation."
    else:
        equity_pct, safety_pct, assumed_return = 80, 20, 0.11
        allocation_strategy = "Growth-oriented allocation with moderate safety buffer."

    projected_value = _future_value_monthly_investment(monthly_investment, assumed_return, duration)
    total_invested = monthly_investment * duration * 12

    learning_resources: List[Dict[str, str]] = [
        {
            "title": "What is SIP?",
            "level": "beginner",
            "category": "basics",
        },
        {
            "title": "Equity vs Debt",
            "level": "beginner",
            "category": "asset-allocation",
        },
        {
            "title": "Indian vs Global Markets",
            "level": "intermediate",
            "category": "markets",
        },
        {
            "title": "How Compounding Works in SIPs",
            "level": "beginner",
            "category": "returns",
        },
        {
            "title": "Portfolio Rebalancing for Young Investors",
            "level": "intermediate",
            "category": "portfolio-management",
        },
    ]

    return {
        "sip_plan": {
            "monthly_investment": int(round(monthly_investment)),
            "allocation_strategy": f"{allocation_strategy} Suggested split: {equity_pct}% growth assets, {safety_pct}% safety assets.",
            "estimated_growth": (
                f"With Rs {int(round(monthly_investment))}/month for {duration} years, "
                f"total invested is about Rs {int(round(total_invested))} and projected value is about Rs {int(round(projected_value))}."
            ),
            "timeline": f"{duration} years",
        },
        "learning_resources": learning_resources,
    }

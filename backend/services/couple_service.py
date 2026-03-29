from __future__ import annotations

from typing import Any, Dict

from services.tax_service import analyze_individual_tax


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_bracket(bracket: str) -> int:
    normalized = str(bracket).replace("%", "").strip()
    try:
        return int(normalized)
    except ValueError:
        return 0


def _ensure_tax_analysis(partner: Dict[str, Any]) -> Dict[str, Any]:
    existing = partner.get("tax_analysis")
    if isinstance(existing, dict):
        # Reuse provided tax output shape when already computed.
        return {
            "tax_analysis": existing.get("tax_analysis", {}),
            "tax_bracket": existing.get("tax_bracket", "5%"),
            "missed_deductions": existing.get("missed_deductions", []),
            "recommendations": existing.get("recommendations", []),
            "income_profile": existing.get("income_profile", {}),
        }

    input_payload = {
        "salary_breakdown": partner.get("salary_breakdown", {}),
        "salary_period": partner.get("salary_period", "monthly"),
        "deductions": partner.get("deductions", {}),
        "risk_profile": partner.get("risk_profile", "moderate"),
        "additional_income_streams": partner.get("additional_income_streams", []),
        "future_income_change": partner.get("future_income_change"),
    }
    return analyze_individual_tax(input_payload)


def plan_couple_money(partner1: Dict[str, Any], partner2: Dict[str, Any], mode: str) -> Dict[str, Any]:
    p1_tax = _ensure_tax_analysis(partner1)
    p2_tax = _ensure_tax_analysis(partner2)

    p1_bracket = _parse_bracket(p1_tax.get("tax_bracket", "5%"))
    p2_bracket = _parse_bracket(p2_tax.get("tax_bracket", "5%"))

    p1_tax_value = _to_float(p1_tax.get("tax_analysis", {}).get("tax_old_regime", 0))
    p2_tax_value = _to_float(p2_tax.get("tax_analysis", {}).get("tax_old_regime", 0))

    partner1_name = str(partner1.get("name", "partner1"))
    partner2_name = str(partner2.get("name", "partner2"))

    if mode == "equal":
        return {
            "strategy": "equal",
            "expense_split": {
                partner1_name: "50%",
                partner2_name: "50%",
            },
            "savings_split": {
                partner1_name: "50%",
                partner2_name: "50%",
            },
            "tax_note": "Tax brackets are shown for awareness, but allocations are kept equal by design.",
        }

    if p1_bracket > p2_bracket or (p1_bracket == p2_bracket and p1_tax_value >= p2_tax_value):
        higher_name, lower_name = partner1_name, partner2_name
        higher_tax, lower_tax = p1_tax, p2_tax
        higher_future, lower_future = partner1.get("future_income_change"), partner2.get("future_income_change")
    else:
        higher_name, lower_name = partner2_name, partner1_name
        higher_tax, lower_tax = p2_tax, p1_tax
        higher_future, lower_future = partner2.get("future_income_change"), partner1.get("future_income_change")

    future_adjustment_notes = "No significant future income shift indicated. Keep annual review cadence."

    higher_growth = _to_float((higher_future or {}).get("expected_annual_income_change", 0))
    lower_growth = _to_float((lower_future or {}).get("expected_annual_income_change", 0))

    if higher_growth > 0:
        future_adjustment_notes = (
            f"{higher_name} is expected to move higher in income; increase tax-saving SIP and NPS contribution share gradually toward this partner."
        )
    elif lower_growth > higher_growth:
        future_adjustment_notes = (
            f"{lower_name} shows stronger income growth expectations; rebalance tax-saving load toward {lower_name} over time."
        )

    return {
        "strategy": "tax_optimized",
        "income_roles": {
            "higher_tax_bracket_partner": {
                "name": higher_name,
                "tax_bracket": higher_tax.get("tax_bracket", "5%"),
                "priority": "maximize deductions, prioritize NPS and ELSS",
            },
            "lower_tax_bracket_partner": {
                "name": lower_name,
                "tax_bracket": lower_tax.get("tax_bracket", "5%"),
                "priority": "handle flexible expenses and lower tax-saving burden",
            },
        },
        "allocation_plan": {
            "deduction_focus": {
                higher_name: "Target full 80C + 80CCD(1B) + eligible 80D",
                lower_name: "Use basic 80C/80D as needed",
            },
            "expense_responsibility": {
                higher_name: "fixed obligations and long-term SIP commitments",
                lower_name: "groceries, lifestyle, variable household spending",
            },
            "insurance_assignment": {
                higher_name: "Primary term cover optimization due to higher taxable impact",
                lower_name: "Supplementary health and family floater balancing",
            },
        },
        "nps_strategy": f"Prioritize 80CCD(1B) for {higher_name} first; use {lower_name} as secondary contributor after primary cap utilization.",
        "hra_strategy": f"Route rent declaration through {higher_name} where compliant to maximize HRA tax efficiency.",
        "sip_split": {
            higher_name: "65%",
            lower_name: "35%",
        },
        "future_adjustment_notes": future_adjustment_notes,
    }

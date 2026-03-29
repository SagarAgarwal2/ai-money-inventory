from __future__ import annotations

from typing import Any, Dict, List

OLD_REGIME_SLABS = [
    (250000, 0.0),
    (500000, 0.05),
    (1000000, 0.20),
    (float("inf"), 0.30),
]

NEW_REGIME_SLABS = [
    (400000, 0.0),
    (800000, 0.05),
    (1200000, 0.10),
    (1600000, 0.15),
    (2000000, 0.20),
    (2400000, 0.25),
    (float("inf"), 0.30),
]

STANDARD_DEDUCTION_OLD = 50000.0
STANDARD_DEDUCTION_NEW = 75000.0
CESS_RATE = 0.04

MAX_80C = 150000.0
MAX_80CCD1B = 50000.0
MAX_80D = 25000.0


def _to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _compute_salary_income(salary_breakdown: Dict[str, Any], period: str) -> float:
    basic = _to_float(salary_breakdown.get("basic", 0))
    hra = _to_float(salary_breakdown.get("hra", 0))
    allowances = _to_float(salary_breakdown.get("allowances", 0))
    monthly_salary = basic + hra + allowances
    if period == "annual":
        return monthly_salary
    return monthly_salary * 12


def _compute_additional_income(additional_income_streams: List[Dict[str, Any]]) -> float:
    total = 0.0
    for income in additional_income_streams or []:
        if not isinstance(income, dict):
            continue
        annual_amount = _to_float(income.get("annual_amount", 0))
        monthly_amount = _to_float(income.get("monthly_amount", 0))
        fallback_amount = _to_float(income.get("amount", 0))
        if annual_amount > 0:
            total += annual_amount
        elif monthly_amount > 0:
            total += monthly_amount * 12
        else:
            total += fallback_amount
    return total


def _compute_tax_by_slabs(taxable_income: float, slabs: List[tuple]) -> float:
    if taxable_income <= 0:
        return 0.0

    tax = 0.0
    previous_limit = 0.0
    for upper_limit, rate in slabs:
        if taxable_income <= previous_limit:
            break
        slab_amount = min(taxable_income, upper_limit) - previous_limit
        tax += max(0.0, slab_amount) * rate
        previous_limit = upper_limit
    return tax * (1 + CESS_RATE)


def _tax_bracket_from_taxable_income(taxable_income: float) -> str:
    if taxable_income > 1000000:
        return "30%"
    if taxable_income > 500000:
        return "20%"
    return "5%"


def analyze_individual_tax(payload: Dict[str, Any]) -> Dict[str, Any]:
    salary_breakdown = payload.get("salary_breakdown", {}) if isinstance(payload.get("salary_breakdown"), dict) else {}
    deductions = payload.get("deductions", {}) if isinstance(payload.get("deductions"), dict) else {}
    additional_income_streams = payload.get("additional_income_streams", [])
    risk_profile = str(payload.get("risk_profile", "moderate")).lower()
    salary_period = str(payload.get("salary_period", "monthly")).lower()
    future_income_change = payload.get("future_income_change") if isinstance(payload.get("future_income_change"), dict) else None

    salary_income = _compute_salary_income(salary_breakdown, salary_period)
    side_income = _compute_additional_income(additional_income_streams if isinstance(additional_income_streams, list) else [])
    total_income = salary_income + side_income

    used_80c = min(MAX_80C, _to_float(deductions.get("80C", 0)))
    used_80d = min(MAX_80D, _to_float(deductions.get("80D", 0)))
    used_80ccd1b = min(MAX_80CCD1B, _to_float(deductions.get("80CCD1B", deductions.get("80ccd1b", 0))))

    other_deductions = 0.0
    for key, value in deductions.items():
        normalized = str(key).upper()
        if normalized in {"80C", "80D", "80CCD1B"}:
            continue
        other_deductions += max(0.0, _to_float(value))

    total_old_regime_deductions = used_80c + used_80d + used_80ccd1b + other_deductions

    taxable_old = max(0.0, total_income - STANDARD_DEDUCTION_OLD - total_old_regime_deductions)
    taxable_new = max(0.0, total_income - STANDARD_DEDUCTION_NEW)

    tax_old = round(_compute_tax_by_slabs(taxable_old, OLD_REGIME_SLABS), 2)
    tax_new = round(_compute_tax_by_slabs(taxable_new, NEW_REGIME_SLABS), 2)

    recommended_regime = "old" if tax_old <= tax_new else "new"
    estimated_tax_saved = round(abs(tax_old - tax_new), 2)
    base_taxable_for_bracket = taxable_old if recommended_regime == "old" else taxable_new
    tax_bracket = _tax_bracket_from_taxable_income(base_taxable_for_bracket)

    missed_deductions: List[Dict[str, Any]] = []
    if used_80c < MAX_80C:
        missed_deductions.append({
            "section": "80C",
            "unused_limit": round(MAX_80C - used_80c, 2),
            "note": "You can invest more in eligible 80C instruments up to Rs 1.5 lakh.",
        })
    if used_80d <= 0:
        missed_deductions.append({
            "section": "80D",
            "unused_limit": MAX_80D,
            "note": "Health insurance premium deduction appears unused.",
        })
    if used_80ccd1b < MAX_80CCD1B:
        missed_deductions.append({
            "section": "80CCD(1B)",
            "unused_limit": round(MAX_80CCD1B - used_80ccd1b, 2),
            "note": "NPS deduction can provide additional tax relief up to Rs 50,000.",
        })

    recommendations: List[Dict[str, str]] = [
        {
            "instrument": "ELSS",
            "why": "Helps optimize 80C usage with equity-oriented growth potential.",
            "risk_fit": "moderate" if risk_profile in {"moderate", "high"} else "use selectively",
        },
        {
            "instrument": "NPS",
            "why": "Provides extra deduction under 80CCD(1B) with long-term retirement corpus building.",
            "liquidity": "low",
        },
        {
            "instrument": "Health Insurance",
            "why": "Unlocks 80D deduction while improving protection against medical shocks.",
            "risk_fit": "all",
        },
    ]

    has_side_income = side_income > 0
    if has_side_income:
        recommendations.append({
            "instrument": "Advance Tax and Expense Segregation",
            "why": "Maintain separate records for side incomes and claim valid business/professional expenses.",
            "risk_fit": "all",
        })

    future_impact = "No future income change provided."
    if future_income_change:
        income_delta = _to_float(future_income_change.get("expected_annual_income_change", 0))
        career_shift = str(future_income_change.get("career_shift", "")).strip()

        if income_delta > 0:
            future_impact = "Expected income growth detected. Front-load tax-efficient investments now to build deduction discipline."
            recommendations.append({
                "instrument": "Future-Income Tax Staging",
                "why": "Since income is expected to rise, increase tax-saving SIP/NPS contributions gradually from this year.",
                "risk_fit": "moderate",
            })
        elif income_delta < 0:
            future_impact = "Expected income decline detected. Prefer liquidity and avoid over-locking funds in long lock-in products."
        else:
            future_impact = "Future income expected to remain stable. Continue balanced annual tax planning."

        if career_shift:
            future_impact = f"{future_impact} Career shift note: {career_shift}."

    return {
        "tax_analysis": {
            "total_income": round(total_income, 2),
            "taxable_income_old_regime": round(taxable_old, 2),
            "taxable_income_new_regime": round(taxable_new, 2),
            "tax_old_regime": tax_old,
            "tax_new_regime": tax_new,
            "recommended_regime": recommended_regime,
            "estimated_tax_saved": estimated_tax_saved,
        },
        "tax_bracket": tax_bracket,
        "missed_deductions": missed_deductions,
        "recommendations": recommendations,
        "income_profile": {
            "multiple_income_streams": has_side_income,
            "future_income_impact": future_impact,
        },
    }

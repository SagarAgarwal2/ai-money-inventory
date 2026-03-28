from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from services.fire_service import generate_fire_roadmap
from services.llm_reasoning_service import (
    LLMReasoningError,
    generate_fire_calculation_and_logic,
)

# ── FIRE Router ─────────────────────────────────────────────────────────
router = APIRouter()


def _to_number(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def _normalize_fire_result(llm_result: Dict[str, Any]) -> Dict[str, Any]:
    summary = llm_result.get("summary", {}) if isinstance(llm_result.get("summary"), dict) else {}
    fire_number = llm_result.get("fire_number", {}) if isinstance(llm_result.get("fire_number"), dict) else {}
    goal_results = llm_result.get("goal_results", []) if isinstance(llm_result.get("goal_results"), list) else []
    phases = llm_result.get("phases", []) if isinstance(llm_result.get("phases"), list) else []
    sip_allocation = llm_result.get("sip_allocation", []) if isinstance(llm_result.get("sip_allocation"), list) else []
    tax_savings = llm_result.get("tax_savings", {}) if isinstance(llm_result.get("tax_savings"), dict) else {}

    normalized_goals = []
    for g in goal_results:
        if not isinstance(g, dict):
            continue
        normalized_goals.append({
            "goal_name": str(g.get("goal_name", "Goal")),
            "goal_type": str(g.get("goal_type", "general")),
            "current_cost_inr": _to_number(g.get("current_cost_inr", 0)),
            "years_to_goal": int(_to_number(g.get("years_to_goal", 0))),
            "inflation_rate_pct": _to_number(g.get("inflation_rate_pct", 0)),
            "future_cost_inr": _to_number(g.get("future_cost_inr", 0)),
            "existing_allocation_inr": _to_number(g.get("existing_allocation_inr", 0)),
            "projected_existing_inr": _to_number(g.get("projected_existing_inr", 0)),
            "corpus_gap_inr": _to_number(g.get("corpus_gap_inr", 0)),
            "required_monthly_sip_inr": _to_number(g.get("required_monthly_sip_inr", 0)),
            "recommended_asset_class": str(g.get("recommended_asset_class", "hybrid")),
            "expected_return_pct": _to_number(g.get("expected_return_pct", 0)),
            "success_probability_pct": _to_number(g.get("success_probability_pct", 0)),
        })

    normalized_phases = []
    for p in phases:
        if not isinstance(p, dict):
            continue
        actions = p.get("actions", []) if isinstance(p.get("actions"), list) else []
        normalized_phases.append({
            "phase": int(_to_number(p.get("phase", len(normalized_phases) + 1), len(normalized_phases) + 1)),
            "title": str(p.get("title", "Plan Phase")),
            "subtitle": str(p.get("subtitle", "")),
            "actions": [str(a) for a in actions if isinstance(a, str)][:6],
            "monthly_commitment": _to_number(p.get("monthly_commitment", 0)),
        })

    normalized_alloc = []
    for a in sip_allocation:
        if not isinstance(a, dict):
            continue
        normalized_alloc.append({
            "fund_type": str(a.get("fund_type", "Other")),
            "allocation_pct": _to_number(a.get("allocation_pct", 0)),
            "monthly_sip_inr": _to_number(a.get("monthly_sip_inr", 0)),
        })

    return {
        "summary": {
            "monthly_income": _to_number(summary.get("monthly_income", 0)),
            "monthly_expenses": _to_number(summary.get("monthly_expenses", 0)),
            "investable_surplus": _to_number(summary.get("investable_surplus", 0)),
            "recommended_total_sip": _to_number(summary.get("recommended_total_sip", 0)),
            "surplus_utilization_pct": _to_number(summary.get("surplus_utilization_pct", 0)),
        },
        "fire_number": {
            "fire_corpus_inr": _to_number(fire_number.get("fire_corpus_inr", 0)),
            "monthly_expenses_today": _to_number(fire_number.get("monthly_expenses_today", 0)),
            "monthly_expenses_at_retirement": _to_number(fire_number.get("monthly_expenses_at_retirement", 0)),
            "years_to_retirement": int(_to_number(fire_number.get("years_to_retirement", 0))),
            "retirement_years": int(_to_number(fire_number.get("retirement_years", 0))),
        },
        "goal_results": normalized_goals,
        "phases": normalized_phases,
        "sip_allocation": normalized_alloc,
        "tax_savings": {
            "section_80C": _to_number(tax_savings.get("section_80C", 0)),
            "section_80CCD": _to_number(tax_savings.get("section_80CCD", 0)),
            "section_80D": _to_number(tax_savings.get("section_80D", 0)),
            "total_deduction": _to_number(tax_savings.get("total_deduction", 0)),
        },
        "ai_logic": {
            "provider": "groq",
            "used_for": ["calculation", "logic"],
            "rationale": llm_result.get("rationale", []),
        },
    }


class GoalInput(BaseModel):
    name: str
    type: str = "general"
    current_cost_inr: float
    years_to_goal: int
    existing_allocation_inr: float = 0


class FirePlanInput(BaseModel):
    age: int
    monthly_income: float
    monthly_expenses: float
    existing_corpus: float = 0
    existing_loans_emi: float = 0
    risk_profile: str = "moderate"
    retirement_age: int = 60
    goals: List[GoalInput] = []


@router.post("/plan")
async def generate_plan(inputs: FirePlanInput):
    data = inputs.dict()
    data["goals"] = [g.dict() for g in inputs.goals]
    try:
        llm = await generate_fire_calculation_and_logic(
            user_inputs=data,
        )
        result = _normalize_fire_result(llm.get("result", {}))
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result["sebi_disclaimer"] = "Projections are based on assumed historical returns. Actual returns may vary. This is not SEBI-registered investment advice."
    return result


@router.get("/demo")
async def demo_fire_plan():
    """Demo FIRE plan for a 32-year-old Bengaluru software engineer."""
    demo_inputs = {
        "age": 32,
        "monthly_income": 150000,
        "monthly_expenses": 70000,
        "existing_corpus": 800000,
        "existing_loans_emi": 20000,
        "risk_profile": "moderate",
        "retirement_age": 55,
        "goals": [
            {"name": "Child Education", "type": "education", "current_cost_inr": 2500000, "years_to_goal": 15, "existing_allocation_inr": 0},
            {"name": "Home Purchase", "type": "real_estate", "current_cost_inr": 8000000, "years_to_goal": 5, "existing_allocation_inr": 500000},
        ],
    }
    result = generate_fire_roadmap(demo_inputs)
    result["sebi_disclaimer"] = "This is a demo plan. All projections assume historical average returns. This is not SEBI-registered investment advice."
    return result

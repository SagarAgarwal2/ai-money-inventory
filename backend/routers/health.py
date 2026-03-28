from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from services.health_score_service import compute_money_health_score
from services.llm_reasoning_service import (
    LLMReasoningError,
    generate_health_calculation_and_logic,
)

router = APIRouter()


def _safe_int(value, default=0):
    try:
        return int(round(float(value)))
    except (TypeError, ValueError):
        return default


def _normalize_health_result(llm_result: dict) -> dict:
    scores = llm_result.get("scores", {}) if isinstance(llm_result.get("scores"), dict) else {}
    details = llm_result.get("details", {}) if isinstance(llm_result.get("details"), dict) else {}
    priority_actions = llm_result.get("priority_actions", []) if isinstance(llm_result.get("priority_actions"), list) else []

    normalized_scores = {
        "emergency": _safe_int(scores.get("emergency", 0)),
        "insurance": _safe_int(scores.get("insurance", 0)),
        "diversification": _safe_int(scores.get("diversification", 0)),
        "debt": _safe_int(scores.get("debt", 0)),
        "tax": _safe_int(scores.get("tax", 0)),
        "retirement": _safe_int(scores.get("retirement", 0)),
    }

    normalized_actions = []
    for action in priority_actions:
        if not isinstance(action, dict):
            continue
        normalized_actions.append(
            {
                "title": str(action.get("title", "Action")),
                "description": str(action.get("description", "")),
                "score_impact": str(action.get("score_impact", "+0 pts")),
                "difficulty": str(action.get("difficulty", "Medium")),
                "priority": _safe_int(action.get("priority", len(normalized_actions) + 1), len(normalized_actions) + 1),
            }
        )

    for dim in ["emergency", "insurance", "diversification", "debt", "tax", "retirement"]:
        if dim not in details or not isinstance(details.get(dim), dict):
            details[dim] = {
                "score": normalized_scores[dim],
                "max": 15,
                "status": "Needs Attention",
                "color": "orange",
                "action": "No action generated.",
            }

    return {
        "total_score": _safe_int(llm_result.get("total_score", sum(normalized_scores.values()))),
        "max_score": _safe_int(llm_result.get("max_score", 100), 100),
        "overall_status": str(llm_result.get("overall_status", "Needs Attention")),
        "overall_color": str(llm_result.get("overall_color", "#f59e0b")),
        "scores": normalized_scores,
        "details": details,
        "priority_actions": sorted(normalized_actions, key=lambda x: x["priority"])[:5],
        "ai_logic": {
            "provider": "groq",
            "used_for": ["calculation", "logic"],
            "rationale": llm_result.get("rationale", []),
        },
    }


class HealthScoreInput(BaseModel):
    monthly_income: float = 100000
    monthly_expenses: float = 60000
    liquid_savings: float = 0
    term_cover: float = 0
    health_cover: float = 0
    asset_classes: List[str] = []
    all_in_fd: bool = False
    emi_to_income_ratio: float = 0
    has_high_interest_debt: bool = False
    sec_80c_used: float = 0
    sec_80d_used: float = 0
    sec_80ccd_used: float = 0
    current_corpus: float = 0
    required_corpus_at_60: float = 5000000
    years_to_retirement: int = 25


@router.post("/score")
async def compute_score(inputs: HealthScoreInput):
    input_data = inputs.dict()
    try:
        llm = await generate_health_calculation_and_logic(
            user_inputs=input_data,
        )
        result = _normalize_health_result(llm.get("result", {}))
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    result["sebi_disclaimer"] = "This score is for informational purposes only and is not SEBI-registered financial advice."
    return result


@router.get("/demo")
async def demo_score():
    """Demo health score for a typical salaried employee."""
    demo = {
        "monthly_income": 120000,
        "monthly_expenses": 65000,
        "liquid_savings": 150000,
        "term_cover": 10000000,
        "health_cover": 500000,
        "asset_classes": ["equity_mf", "debt_mf", "ppf", "fd"],
        "all_in_fd": False,
        "emi_to_income_ratio": 0.25,
        "has_high_interest_debt": False,
        "sec_80c_used": 100000,
        "sec_80d_used": 25000,
        "sec_80ccd_used": 0,
        "current_corpus": 1200000,
        "required_corpus_at_60": 30000000,
        "years_to_retirement": 27,
    }
    result = compute_money_health_score(demo)
    result["sebi_disclaimer"] = "This score is for informational purposes only and is not SEBI-registered financial advice."
    return result

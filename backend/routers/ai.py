from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm_reasoning_service import LLMReasoningError, generate_explanation, generate_comprehensive_analysis

router = APIRouter()


class ExplainRequest(BaseModel):
    module: Literal["portfolio", "fire", "health"]
    computed_result: Dict[str, Any]
    user_context: Optional[Dict[str, Any]] = None


class GoalInput(BaseModel):
    name: str
    type: str = "general"
    current_cost_inr: float
    years_to_goal: int
    existing_allocation_inr: float = 0


class ComprehensiveAnalysisRequest(BaseModel):
    """Full financial profile for comprehensive analysis."""
    # FIRE planning inputs
    age: int
    monthly_income: float
    monthly_expenses: float
    existing_corpus: float = 0
    existing_loans_emi: float = 0
    risk_profile: str = "moderate"
    retirement_age: int = 60
    goals: List[GoalInput] = []

    # Money health inputs
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
    required_corpus_at_60: float = 5000000
    years_to_retirement: int = 25

    # Portfolio data
    portfolio: List[Dict[str, Any]] = []

    # User profile metadata
    location: Optional[str] = None
    occupation: Optional[str] = None
    family_size: Optional[int] = None
    dependents: Optional[int] = None


@router.post("/explain")
async def explain_result(payload: ExplainRequest):
    """Generate plain-language explanation for precomputed analytics using Groq."""
    try:
        result = await generate_explanation(
            module=payload.module,
            computed_result=payload.computed_result,
            user_context=payload.user_context,
        )
        return result
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/analyze-full")
async def full_financial_analysis(inputs: ComprehensiveAnalysisRequest):
    """Perform comprehensive financial analysis across FIRE, Health, and Portfolio using Groq."""
    try:
        fire_inputs = {
            "age": inputs.age,
            "monthly_income": inputs.monthly_income,
            "monthly_expenses": inputs.monthly_expenses,
            "existing_corpus": inputs.existing_corpus,
            "existing_loans_emi": inputs.existing_loans_emi,
            "risk_profile": inputs.risk_profile,
            "retirement_age": inputs.retirement_age,
            "goals": [g.dict() for g in inputs.goals],
        }

        health_inputs = {
            "monthly_income": inputs.monthly_income,
            "monthly_expenses": inputs.monthly_expenses,
            "liquid_savings": inputs.liquid_savings,
            "term_cover": inputs.term_cover,
            "health_cover": inputs.health_cover,
            "asset_classes": inputs.asset_classes,
            "all_in_fd": inputs.all_in_fd,
            "emi_to_income_ratio": inputs.emi_to_income_ratio,
            "has_high_interest_debt": inputs.has_high_interest_debt,
            "sec_80c_used": inputs.sec_80c_used,
            "sec_80d_used": inputs.sec_80d_used,
            "sec_80ccd_used": inputs.sec_80ccd_used,
            "current_corpus": inputs.existing_corpus,
            "required_corpus_at_60": inputs.required_corpus_at_60,
            "years_to_retirement": inputs.years_to_retirement,
        }

        user_profile = {
            "age": inputs.age,
            "location": inputs.location,
            "occupation": inputs.occupation,
            "family_size": inputs.family_size,
            "dependents": inputs.dependents,
        }

        result = await generate_comprehensive_analysis(
            fire_inputs=fire_inputs,
            health_inputs=health_inputs,
            portfolio_data={"holdings": inputs.portfolio},
            user_profile=user_profile,
        )

        result["sebi_disclaimer"] = "This analysis is for informational purposes only and is not SEBI-registered investment advice."
        return result

    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.get("/demo-full-analysis")
async def demo_comprehensive_analysis():
    """Demo comprehensive analysis for a 32-year-old Bengaluru software engineer."""
    demo = {
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
        "liquid_savings": 300000,
        "term_cover": 10000000,
        "health_cover": 500000,
        "asset_classes": ["equity_mf", "debt_mf", "ppf"],
        "emi_to_income_ratio": 0.20,
        "has_high_interest_debt": False,
        "sec_80c_used": 100000,
        "sec_80d_used": 25000,
        "sec_80ccd_used": 0,
        "required_corpus_at_60": 50000000,
        "years_to_retirement": 23,
        "portfolio": [
            {"scheme_name": "Mirae Asset Large Cap Fund", "category": "Equity", "amount": 400000, "nav": 850, "units": 470, "xirr": 15.2},
            {"scheme_name": "Parag Parikh Flexi Cap Fund", "category": "Equity", "amount": 300000, "nav": 1200, "units": 250, "xirr": 14.8},
            {"scheme_name": "ICICI Prudential Short Term Fund", "category": "Debt", "amount": 100000, "nav": 1080, "units": 92, "xirr": 6.5},
        ],
        "location": "Bengaluru",
        "occupation": "Software Engineer",
        "family_size": 3,
        "dependents": 1,
    }

    try:
        result = await full_financial_analysis(ComprehensiveAnalysisRequest(**demo))
        return result
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.llm_reasoning_service import (
    LLMReasoningError,
    generate_combined_planner_insights,
    generate_couple_money_planner_analysis,
    generate_student_sip_analysis,
    generate_tax_wizard_analysis,
)

router = APIRouter()


class SalaryBreakdown(BaseModel):
    basic: float = 0
    hra: float = 0
    allowances: float = 0


class AdditionalIncome(BaseModel):
    source: str = "other"
    annual_amount: float = 0


class FutureIncomeChange(BaseModel):
    expected_annual_income_change: float = 0
    career_shift: Optional[str] = None


class TaxWizardRequest(BaseModel):
    salary_breakdown: SalaryBreakdown
    deductions: Dict[str, float] = Field(default_factory=dict)
    risk_profile: str = "moderate"
    additional_income_streams: List[AdditionalIncome] = Field(default_factory=list)
    future_income_change: Optional[FutureIncomeChange] = None
    salary_period: Literal["monthly", "annual"] = "monthly"


class PartnerInput(BaseModel):
    name: str
    salary_breakdown: Optional[SalaryBreakdown] = None
    deductions: Dict[str, float] = Field(default_factory=dict)
    risk_profile: str = "moderate"
    additional_income_streams: List[AdditionalIncome] = Field(default_factory=list)
    future_income_change: Optional[FutureIncomeChange] = None
    salary_period: Literal["monthly", "annual"] = "monthly"
    tax_analysis: Optional[Dict[str, Any]] = None


class CouplePlannerRequest(BaseModel):
    partner1: PartnerInput
    partner2: PartnerInput
    mode: Literal["tax_optimized", "equal"] = "tax_optimized"


class StudentPlannerRequest(BaseModel):
    monthly_budget: float
    investment_duration: int
    risk_appetite: Literal["high", "moderate", "low"] = "moderate"
    user_type: str = "student"
    question: Optional[str] = None
    questions: List[str] = Field(default_factory=list)


class UnifiedPlannerRequest(BaseModel):
    tax_wizard: TaxWizardRequest
    couple_planner: CouplePlannerRequest
    student_module: StudentPlannerRequest


@router.post("/tax-wizard")
async def tax_wizard(request: TaxWizardRequest):
    try:
        return await generate_tax_wizard_analysis(request.dict())
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/couple-money-planner")
async def couple_money_planner(request: CouplePlannerRequest):
    try:
        return await generate_couple_money_planner_analysis(
            partner1=request.partner1.dict(),
            partner2=request.partner2.dict(),
            mode=request.mode,
        )
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/student-sip-planner")
async def student_sip_planner(request: StudentPlannerRequest):
    try:
        payload = request.dict()
        question = (payload.get("question") or "").strip()
        questions = payload.get("questions", []) or []
        if question:
            questions = [question] + [q for q in questions if str(q).strip()]
        payload["questions"] = questions
        return await generate_student_sip_analysis(payload)
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/unified-financial-intelligence")
async def unified_financial_intelligence(request: UnifiedPlannerRequest):
    try:
        tax_wizard_summary = await generate_tax_wizard_analysis(request.tax_wizard.dict())

        couple_strategy = await generate_couple_money_planner_analysis(
            partner1=request.couple_planner.partner1.dict(),
            partner2=request.couple_planner.partner2.dict(),
            mode=request.couple_planner.mode,
        )

        student_payload = request.student_module.dict()
        student_module = await generate_student_sip_analysis(student_payload)

        combined_insights = await generate_combined_planner_insights(
            tax_wizard_summary=tax_wizard_summary,
            couple_strategy=couple_strategy,
            student_module=student_module,
        )

        return {
            "provider": "groq",
            "tax_wizard_summary": tax_wizard_summary,
            "couple_strategy": couple_strategy,
            "student_module": student_module,
            "combined_insights": combined_insights,
            "disclaimer": "This is not SEBI-registered financial advice",
        }
    except LLMReasoningError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

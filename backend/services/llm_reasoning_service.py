"""
LLM Reasoning Service (Groq)
- Converts deterministic analytics output into plain-language summaries.
- Keeps math in core services; LLM is used only for explanation and prioritization.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

import httpx

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")


class LLMReasoningError(RuntimeError):
    """Raised when LLM reasoning generation fails."""


def _get_api_key() -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise LLMReasoningError("GROQ_API_KEY not configured")
    return api_key


async def _groq_chat_completion(
    *,
    messages: List[Dict[str, str]],
    temperature: float = 0.2,
    timeout: float = 30.0,
) -> Dict[str, Any]:
    req_payload = {
        "model": DEFAULT_GROQ_MODEL,
        "temperature": temperature,
        "response_format": {"type": "json_object"},
        "messages": messages,
    }

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            resp = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {_get_api_key()}",
                    "Content-Type": "application/json",
                },
                json=req_payload,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as exc:
        raise LLMReasoningError("Groq API request failed") from exc

    try:
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        raise LLMReasoningError("Invalid response format from Groq API") from exc


def _build_system_prompt() -> str:
    return (
        "You are a financial explanation assistant for Indian retail investors. "
        "You MUST NOT recompute numerical values. Use only provided computed values. "
        "Output strict JSON with keys: summary, key_findings, priority_actions, risk_flags, disclaimer. "
        "key_findings and priority_actions and risk_flags must be arrays of short strings. "
        "Always include disclaimer: This is not SEBI-registered investment advice."
    )


def _build_user_prompt(module: str, computed_result: Dict[str, Any], user_context: Optional[Dict[str, Any]]) -> str:
    payload = {
        "module": module,
        "user_context": user_context or {},
        "computed_result": computed_result,
        "output_style": {
            "tone": "clear, practical, concise",
            "max_summary_words": 120,
            "max_items": 5,
        },
    }
    return json.dumps(payload, ensure_ascii=True)


async def generate_explanation(
    module: str,
    computed_result: Dict[str, Any],
    user_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Generate structured explanation from precomputed analytics using Groq."""
    parsed = await _groq_chat_completion(
        messages=[
            {"role": "system", "content": _build_system_prompt()},
            {
                "role": "user",
                "content": _build_user_prompt(module, computed_result, user_context),
            },
        ],
        temperature=0.2,
    )

    parsed.setdefault("summary", "")
    parsed.setdefault("key_findings", [])
    parsed.setdefault("priority_actions", [])
    parsed.setdefault("risk_flags", [])
    parsed["disclaimer"] = "This is not SEBI-registered investment advice."

    return {
        "provider": "groq",
        "model": DEFAULT_GROQ_MODEL,
        "explanation": parsed,
    }


def _fire_calc_system_prompt() -> str:
    return (
        "You are a financial planning engine for Indian retail investors. "
        "Compute FIRE and goal plan outputs from provided user input JSON only. "
        "Output strict JSON with keys: "
        "summary, fire_number, goal_results, phases, sip_allocation, tax_savings, rationale. "
        "All numeric values must be numbers, not strings. "
        "summary must include monthly_income, monthly_expenses, investable_surplus, recommended_total_sip, surplus_utilization_pct. "
        "fire_number must include fire_corpus_inr, monthly_expenses_today, monthly_expenses_at_retirement, years_to_retirement, retirement_years. "
        "goal_results must be a list of objects with keys goal_name, goal_type, current_cost_inr, years_to_goal, inflation_rate_pct, future_cost_inr, existing_allocation_inr, projected_existing_inr, corpus_gap_inr, required_monthly_sip_inr, recommended_asset_class, expected_return_pct, success_probability_pct. "
        "Keep phases max 4, each with: phase, title, subtitle, actions, monthly_commitment. "
        "Keep sip_allocation as list of {fund_type, allocation_pct, monthly_sip_inr}. "
        "tax_savings must include section_80C, section_80CCD, section_80D, total_deduction. "
        "Do not include markdown."
    )


def _health_calc_system_prompt() -> str:
    return (
        "You are a financial wellness scoring engine for Indian retail investors. "
        "Compute complete scoring and logic outputs from provided user input JSON only. "
        "Output strict JSON with keys: total_score, max_score, overall_status, overall_color, scores, details, priority_actions, rationale. "
        "scores must contain emergency, insurance, diversification, debt, tax, retirement with integer values. "
        "details must contain matching dimension keys where each value is an object with score, max, status, color, action plus any optional context fields. "
        "priority_actions must be a list of objects with keys title, description, score_impact, difficulty, priority. "
        "total_score must be 0-100 and max_score must be 100. "
        "All numeric values must be numbers. Do not include markdown."
    )


async def generate_fire_calculation_and_logic(
    user_inputs: Dict[str, Any],
) -> Dict[str, Any]:
    payload = {
        "module": "fire",
        "user_inputs": user_inputs,
        "rules": {
            "currency": "INR",
            "max_actions_per_phase": 6,
            "keep_disclaimer_external": True,
        },
    }
    parsed = await _groq_chat_completion(
        messages=[
            {"role": "system", "content": _fire_calc_system_prompt()},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
        ],
        temperature=0.1,
    )

    return {
        "provider": "groq",
        "model": DEFAULT_GROQ_MODEL,
        "result": {
            "summary": parsed.get("summary", {}),
            "fire_number": parsed.get("fire_number", {}),
            "goal_results": parsed.get("goal_results", []),
            "phases": parsed.get("phases", []),
            "sip_allocation": parsed.get("sip_allocation", []),
            "tax_savings": parsed.get("tax_savings", {}),
            "rationale": parsed.get("rationale", []),
        },
    }


async def generate_health_calculation_and_logic(
    user_inputs: Dict[str, Any],
) -> Dict[str, Any]:
    payload = {
        "module": "health",
        "user_inputs": user_inputs,
        "rules": {
            "score_range": {"min": 0, "max": 100},
            "max_actions": 5,
            "difficulty_values": ["Easy", "Medium", "Hard"],
        },
    }
    parsed = await _groq_chat_completion(
        messages=[
            {"role": "system", "content": _health_calc_system_prompt()},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
        ],
        temperature=0.1,
    )

    return {
        "provider": "groq",
        "model": DEFAULT_GROQ_MODEL,
        "result": {
            "total_score": parsed.get("total_score", 0),
            "max_score": parsed.get("max_score", 100),
            "overall_status": parsed.get("overall_status", "Needs Attention"),
            "overall_color": parsed.get("overall_color", "#f59e0b"),
            "scores": parsed.get("scores", {}),
            "details": parsed.get("details", {}),
            "priority_actions": parsed.get("priority_actions", []),
            "rationale": parsed.get("rationale", []),
        },
    }


def _comprehensive_analysis_system_prompt() -> str:
    return (
        "You are a comprehensive financial advisor for Indian retail investors. "
        "Analyze the complete financial profile provided (FIRE goals, health score, portfolio). "
        "Output strict JSON with keys: "
        "executive_summary, financial_health_assessment, retirement_readiness_gap, portfolio_strengths, portfolio_risks, "
        "integrated_action_plan, risk_factors, opportunities, 90_day_quick_wins, 12_month_roadmap, rationale. "
        "Provide actionable, SEBI-compliant insights. "
        "executive_summary: 150-200 words condensed overview. "
        "financial_health_assessment: detailed assessment across all dimensions. "
        "portfolio_risks: list of 3-5 key risks identified. "
        "portfolio_strengths: list of 3-5 positive attributes. "
        "integrated_action_plan: list of 5-7 coordinated actions across FIRE+Health+Portfolio. "
        "opportunities: list of 3-5 wealth creation/optimization opportunities. "
        "90_day_quick_wins: quick actions that can be taken in 90 days. "
        "12_month_roadmap: detailed strategic roadmap for next 12 months. "
        "All lists must contain strings only. All numeric values must be numbers. Do not include markdown."
    )


async def generate_comprehensive_analysis(
    fire_inputs: Optional[Dict[str, Any]] = None,
    health_inputs: Optional[Dict[str, Any]] = None,
    portfolio_data: Optional[Dict[str, Any]] = None,
    user_profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Perform comprehensive financial analysis across all modules using Groq."""
    payload = {
        "fire_inputs": fire_inputs or {},
        "health_inputs": health_inputs or {},
        "portfolio_data": portfolio_data or {},
        "user_profile": user_profile or {},
        "analysis_date": "2026-03-28",
        "analysis_scope": "comprehensive financial wellness and wealth planning",
        "compliance": {
            "sebi_disclaimer_required": True,
            "currency": "INR",
            "target_audience": "Indian retail investors",
        },
    }

    parsed = await _groq_chat_completion(
        messages=[
            {"role": "system", "content": _comprehensive_analysis_system_prompt()},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=True)},
        ],
        temperature=0.3,
    )

    return {
        "provider": "groq",
        "model": DEFAULT_GROQ_MODEL,
        "analysis_type": "comprehensive",
        "result": {
            "executive_summary": parsed.get("executive_summary", ""),
            "financial_health_assessment": parsed.get("financial_health_assessment", ""),
            "retirement_readiness_gap": parsed.get("retirement_readiness_gap", ""),
            "portfolio_strengths": parsed.get("portfolio_strengths", []),
            "portfolio_risks": parsed.get("portfolio_risks", []),
            "integrated_action_plan": parsed.get("integrated_action_plan", []),
            "risk_factors": parsed.get("risk_factors", []),
            "opportunities": parsed.get("opportunities", []),
            "90_day_quick_wins": parsed.get("90_day_quick_wins", []),
            "12_month_roadmap": parsed.get("12_month_roadmap", ""),
            "rationale": parsed.get("rationale", []),
        },
    }

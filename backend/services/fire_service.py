"""
FIRE Path Planner Service
- Goal corpus calculator with inflation adjustment
- SIP requirement (PMT formula)
- Monte Carlo simulation for probability bands
- Phase-wise roadmap generator
"""
import math
import random
from typing import Dict, List

INFLATION_RATES = {
    "general": 0.06,
    "education": 0.09,
    "medical": 0.12,
    "real_estate": 0.08,
}

RETURN_ASSUMPTIONS = {
    "equity_real": 0.12,     # Large cap equity expected return
    "equity_midsmall": 0.14, # Mid/small cap
    "hybrid": 0.10,
    "debt": 0.07,
    "liquid": 0.06,
    "elss": 0.12,
}

VOLATILITY = {
    "equity_real": 0.18,
    "equity_midsmall": 0.22,
    "hybrid": 0.12,
    "debt": 0.04,
    "liquid": 0.01,
}


def future_value_lump_sum(present_value: float, rate: float, years: float) -> float:
    return present_value * (1 + rate) ** years


def pmt(fv: float, rate_monthly: float, n_months: int) -> float:
    """Monthly SIP required to reach FV."""
    if rate_monthly == 0 or n_months == 0:
        return fv / n_months if n_months > 0 else 0
    return fv * rate_monthly / ((1 + rate_monthly) ** n_months - 1)


def monte_carlo_probability(sip_monthly: float, rate_annual: float, vol_annual: float, months: int, target_corpus: float, n_sims: int = 1000) -> float:
    """Returns probability (0-1) of reaching target corpus given monthly SIP."""
    success = 0
    rate_monthly = rate_annual / 12
    vol_monthly = vol_annual / math.sqrt(12)

    for _ in range(n_sims):
        corpus = 0
        for _ in range(months):
            r = random.gauss(rate_monthly, vol_monthly)
            corpus = corpus * (1 + r) + sip_monthly
        if corpus >= target_corpus:
            success += 1

    return round(success / n_sims, 3)


def calculate_goal_corpus(goal: Dict) -> Dict:
    """Calculate required corpus for a goal with inflation adjustment."""
    goal_type = goal.get("type", "general")
    current_cost = float(goal.get("current_cost_inr", 0))
    years_to_goal = int(goal.get("years_to_goal", 10))
    existing_allocation = float(goal.get("existing_allocation_inr", 0))

    inflation = INFLATION_RATES.get(goal_type, INFLATION_RATES["general"])
    future_cost = future_value_lump_sum(current_cost, inflation, years_to_goal)

    # Project existing allocation
    asset_class = _goal_to_asset_class(years_to_goal)
    expected_return = RETURN_ASSUMPTIONS[asset_class]
    projected_existing = future_value_lump_sum(existing_allocation, expected_return, years_to_goal)

    gap = max(0, future_cost - projected_existing)

    # SIP required
    rate_monthly = expected_return / 12
    n_months = years_to_goal * 12
    required_sip = pmt(gap, rate_monthly, n_months) if gap > 0 else 0

    # Monte Carlo probability
    vol = VOLATILITY.get(asset_class, 0.15)
    probability = monte_carlo_probability(required_sip, expected_return, vol, n_months, gap) if gap > 0 else 1.0

    return {
        "goal_name": goal.get("name", goal_type),
        "goal_type": goal_type,
        "current_cost_inr": current_cost,
        "years_to_goal": years_to_goal,
        "inflation_rate_pct": inflation * 100,
        "future_cost_inr": round(future_cost, 0),
        "existing_allocation_inr": existing_allocation,
        "projected_existing_inr": round(projected_existing, 0),
        "corpus_gap_inr": round(gap, 0),
        "required_monthly_sip_inr": round(required_sip, 0),
        "recommended_asset_class": asset_class,
        "expected_return_pct": expected_return * 100,
        "success_probability_pct": probability * 100,
    }


def _goal_to_asset_class(years: int) -> str:
    if years < 3:
        return "liquid"
    elif years < 7:
        return "hybrid"
    else:
        return "equity_real"


def calculate_fire_number(inputs: Dict) -> Dict:
    """Calculate FIRE (Financial Independence, Retire Early) corpus needed."""
    monthly_expenses = float(inputs.get("monthly_expenses", 50000))
    current_age = int(inputs.get("current_age", 30))
    retirement_age = int(inputs.get("retirement_age", 60))
    life_expectancy = int(inputs.get("life_expectancy", 85))
    inflation_rate = float(inputs.get("inflation_rate", 0.06))
    post_retirement_return = float(inputs.get("post_retirement_return", 0.08))

    years_to_retirement = retirement_age - current_age
    retirement_years = life_expectancy - retirement_age

    # Monthly expenses at retirement (inflation-adjusted)
    future_monthly_expenses = future_value_lump_sum(monthly_expenses, inflation_rate, years_to_retirement)

    # Annual expenses at retirement
    annual_expenses_at_retirement = future_monthly_expenses * 12

    # FIRE corpus = annual expenses / (post-retirement return - inflation) [perpetuity model]
    real_return = post_retirement_return - inflation_rate
    if real_return > 0:
        fire_corpus = annual_expenses_at_retirement / real_return
    else:
        # Use present value of annuity
        r = post_retirement_return / 12
        n = retirement_years * 12
        fire_corpus = future_monthly_expenses * ((1 - (1 + r) ** (-n)) / r)

    return {
        "fire_corpus_inr": round(fire_corpus, 0),
        "monthly_expenses_today": monthly_expenses,
        "monthly_expenses_at_retirement": round(future_monthly_expenses, 0),
        "years_to_retirement": years_to_retirement,
        "retirement_years": retirement_years,
    }


def generate_fire_roadmap(inputs: Dict) -> Dict:
    """Generate complete FIRE roadmap with phases."""
    age = int(inputs.get("age", 30))
    monthly_income = float(inputs.get("monthly_income", 100000))
    monthly_expenses = float(inputs.get("monthly_expenses", 60000))
    existing_corpus = float(inputs.get("existing_corpus", 0))
    risk_profile = inputs.get("risk_profile", "moderate")
    goals = inputs.get("goals", [])
    existing_loans = float(inputs.get("existing_loans_emi", 0))
    retirement_age = int(inputs.get("retirement_age", 60))

    investable_surplus = monthly_income - monthly_expenses - existing_loans
    emergency_fund_target = monthly_expenses * 6  # 6 months
    term_cover_needed = monthly_income * 12 * 15  # 15x annual income

    # FIRE number
    fire_inputs = {
        "monthly_expenses": monthly_expenses,
        "current_age": age,
        "retirement_age": retirement_age,
    }
    fire = calculate_fire_number(fire_inputs)
    fire_corpus = fire["fire_corpus_inr"]

    # SIP for FIRE goal
    years_to_fire = retirement_age - age
    equity_return = RETURN_ASSUMPTIONS["equity_real"]
    gap_after_existing = max(0, fire_corpus - future_value_lump_sum(existing_corpus, equity_return, years_to_fire))
    fire_sip = pmt(gap_after_existing, equity_return / 12, years_to_fire * 12) if gap_after_existing > 0 else 0

    # Goal SIPs
    goal_results = [calculate_goal_corpus(g) for g in goals]
    total_goal_sip = sum(g["required_monthly_sip_inr"] for g in goal_results)

    # 80C utilization
    elss_sip = min(12500, investable_surplus * 0.3)  # ₹1.5L/year = ₹12,500/month

    # Build phases
    phases = [
        {
            "phase": 1,
            "title": "Foundation (Month 1-3)",
            "subtitle": "Build financial base before investing",
            "actions": [
                f"Close high-interest debt (>12% p.a.) before starting SIPs",
                f"Build emergency fund: ₹{emergency_fund_target:,.0f} in liquid/overnight fund",
                f"Activate term insurance: ₹{term_cover_needed/10000000:.1f} Cr cover",
                f"Fill 80C gap via ELSS SIP: ₹{elss_sip:,.0f}/month",
            ],
            "monthly_commitment": round(elss_sip, 0),
        },
        {
            "phase": 2,
            "title": "Goal SIPs (Month 4-12)",
            "subtitle": "Start goal-specific systematic investments",
            "actions": [
                f"FIRE/Retirement SIP: ₹{fire_sip:,.0f}/month in Flexi Cap + Large Cap mix",
                *[f"{g['goal_name']} SIP: ₹{g['required_monthly_sip_inr']:,.0f}/month ({g['recommended_asset_class'].replace('_',' ').title()})" for g in goal_results],
                "Review and step-up SIP by 10% each April",
            ],
            "monthly_commitment": round(fire_sip + total_goal_sip, 0),
        },
        {
            "phase": 3,
            "title": "Acceleration (Year 2-5)",
            "subtitle": "Optimize and accelerate corpus growth",
            "actions": [
                "Shift regular plan to direct plan (save ~1% TER annually)",
                "Add NPS Tier-1: ₹50,000/year for additional 80CCD(1B) deduction",
                "Rebalance annually if equity drifts >5% from target",
                "Tax harvesting: book LTCG up to ₹1.25L annually (zero-tax threshold)",
            ],
            "monthly_commitment": round(fire_sip + total_goal_sip + elss_sip, 0),
        },
    ]

    # SIP allocation breakdown
    total_sip = fire_sip + total_goal_sip + elss_sip
    allocation_split = _generate_sip_allocation(total_sip, risk_profile, years_to_fire)

    return {
        "summary": {
            "monthly_income": monthly_income,
            "monthly_expenses": monthly_expenses,
            "investable_surplus": round(investable_surplus, 0),
            "recommended_total_sip": round(total_sip, 0),
            "surplus_utilization_pct": round(total_sip / investable_surplus * 100, 1) if investable_surplus > 0 else 0,
        },
        "fire_number": fire,
        "goal_results": goal_results,
        "phases": phases,
        "sip_allocation": allocation_split,
        "tax_savings": {
            "section_80C": min(150000, elss_sip * 12),
            "section_80CCD": 50000,
            "section_80D": 25000,
            "total_deduction": min(150000, elss_sip * 12) + 75000,
        },
    }


def _generate_sip_allocation(total_sip: float, risk: str, years: int) -> List[Dict]:
    if risk == "aggressive" or years > 15:
        weights = {"Large Cap Index": 0.30, "Flexi Cap": 0.25, "Mid Cap": 0.20, "Small Cap": 0.10, "ELSS": 0.15}
    elif risk == "conservative" or years < 5:
        weights = {"Large Cap": 0.20, "Hybrid/Balanced": 0.35, "Short Term Debt": 0.30, "ELSS": 0.15}
    else:
        weights = {"Large Cap": 0.25, "Flexi Cap": 0.25, "Mid Cap": 0.15, "Hybrid": 0.15, "ELSS": 0.15, "Debt": 0.05}

    return [
        {"fund_type": k, "allocation_pct": round(v * 100), "monthly_sip_inr": round(total_sip * v, 0)}
        for k, v in weights.items()
    ]

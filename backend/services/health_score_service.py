"""
Money Health Score Service
6-dimension financial wellness scoring system.
Dimensions: Emergency, Insurance, Diversification, Debt, Tax, Retirement
"""
from typing import Dict, List


def compute_money_health_score(inputs: Dict) -> Dict:
    """
    Compute comprehensive 6-dimension money health score.
    Input fields (all optional with sensible defaults):
    - monthly_expenses, liquid_savings, monthly_income
    - term_cover, health_cover
    - asset_classes (list), all_in_fd
    - emi_to_income_ratio, has_high_interest_debt
    - sec_80c_used, sec_80d_used, sec_80ccd_used, old_vs_new_regime
    - current_corpus, required_corpus_at_60, years_to_retirement
    """
    scores = {}
    details = {}

    # 1. Emergency Preparedness (max 20)
    monthly_exp = float(inputs.get("monthly_expenses", 50000))
    liquid = float(inputs.get("liquid_savings", 0))
    months_covered = liquid / monthly_exp if monthly_exp > 0 else 0

    if months_covered >= 6:
        e_score = 20
        e_status = "Excellent"
        e_color = "green"
    elif months_covered >= 3:
        e_score = 12
        e_status = "Good"
        e_color = "yellow"
    elif months_covered >= 1:
        e_score = 6
        e_status = "Needs Attention"
        e_color = "orange"
    else:
        e_score = 0
        e_status = "Critical"
        e_color = "red"

    scores["emergency"] = e_score
    details["emergency"] = {
        "score": e_score, "max": 20, "status": e_status, "color": e_color,
        "months_covered": round(months_covered, 1),
        "target_months": 6,
        "action": f"Build ₹{max(0, (6 - months_covered) * monthly_exp):,.0f} more in liquid fund" if months_covered < 6 else "Emergency fund is adequate",
    }

    # 2. Insurance Coverage (max 20)
    annual_income = float(inputs.get("monthly_income", 100000)) * 12
    term_cover = float(inputs.get("term_cover", 0))
    health_cover = float(inputs.get("health_cover", 0))

    term_adequacy = term_cover / (annual_income * 15) if annual_income > 0 else 0
    health_adequacy = 1 if health_cover >= 500000 else health_cover / 500000

    i_score = round((term_adequacy * 10 + health_adequacy * 10))
    i_score = max(0, min(20, i_score))
    i_status = "Excellent" if i_score >= 16 else "Good" if i_score >= 10 else "Needs Attention" if i_score >= 5 else "Critical"

    scores["insurance"] = i_score
    details["insurance"] = {
        "score": i_score, "max": 20, "status": i_status,
        "color": "green" if i_score >= 16 else "yellow" if i_score >= 10 else "orange" if i_score >= 5 else "red",
        "term_cover_inr": term_cover,
        "recommended_term_cover_inr": annual_income * 15,
        "health_cover_inr": health_cover,
        "action": "Term cover adequate" if term_adequacy >= 1 else f"Increase term cover to ₹{annual_income * 15 / 10000000:.1f} Cr",
    }

    # 3. Investment Diversification (max 15)
    asset_classes = inputs.get("asset_classes", [])
    all_in_fd = bool(inputs.get("all_in_fd", False))
    num_classes = len(set(asset_classes)) if asset_classes else (0 if all_in_fd else 1)

    if all_in_fd or num_classes <= 1:
        d_score = 3
        d_status = "Poor"
    elif num_classes == 2:
        d_score = 8
        d_status = "Moderate"
    elif num_classes == 3:
        d_score = 12
        d_status = "Good"
    else:
        d_score = 15
        d_status = "Excellent"

    scores["diversification"] = d_score
    details["diversification"] = {
        "score": d_score, "max": 15, "status": d_status,
        "color": "green" if d_score >= 12 else "yellow" if d_score >= 8 else "orange" if d_score >= 3 else "red",
        "asset_classes_present": asset_classes,
        "num_classes": num_classes,
        "action": "Consider adding equity mutual funds for long-term growth" if d_score < 8 else "Good diversification across asset classes",
    }

    # 4. Debt Health (max 15)
    emi_ratio = float(inputs.get("emi_to_income_ratio", 0))
    has_high_interest = bool(inputs.get("has_high_interest_debt", False))

    if emi_ratio > 0.5 or has_high_interest:
        debt_score = 3
        debt_status = "Danger Zone"
    elif emi_ratio > 0.4:
        debt_score = 7
        debt_status = "Stretched"
    elif emi_ratio > 0.3:
        debt_score = 10
        debt_status = "Manageable"
    elif emi_ratio > 0:
        debt_score = 13
        debt_status = "Healthy"
    else:
        debt_score = 15
        debt_status = "Debt Free"

    scores["debt"] = debt_score
    details["debt"] = {
        "score": debt_score, "max": 15, "status": debt_status,
        "color": "green" if debt_score >= 13 else "yellow" if debt_score >= 10 else "orange" if debt_score >= 7 else "red",
        "emi_to_income_ratio_pct": round(emi_ratio * 100, 1),
        "action": "Prioritize closing high-interest debt before investing" if has_high_interest else
                  f"EMI at {emi_ratio*100:.0f}% of income — target below 30%",
    }

    # 5. Tax Efficiency (max 15)
    sec_80c = float(inputs.get("sec_80c_used", 0))
    sec_80d = float(inputs.get("sec_80d_used", 0))
    sec_80ccd = float(inputs.get("sec_80ccd_used", 0))

    utilization_80c = min(1.0, sec_80c / 150000)
    utilization_80d = min(1.0, sec_80d / 25000)
    utilization_nps = min(1.0, sec_80ccd / 50000)

    tax_score = round(utilization_80c * 8 + utilization_80d * 4 + utilization_nps * 3)
    tax_score = max(0, min(15, tax_score))
    tax_status = "Optimal" if tax_score >= 13 else "Good" if tax_score >= 9 else "Partially Utilized" if tax_score >= 5 else "Under-Utilized"

    missed_80c = max(0, 150000 - sec_80c)
    missed_80d = max(0, 25000 - sec_80d)
    missed_nps = max(0, 50000 - sec_80ccd)
    potential_tax_saving = (missed_80c + missed_80d + missed_nps) * 0.30  # 30% slab estimate

    scores["tax"] = tax_score
    details["tax"] = {
        "score": tax_score, "max": 15, "status": tax_status,
        "color": "green" if tax_score >= 13 else "yellow" if tax_score >= 9 else "orange" if tax_score >= 5 else "red",
        "sec_80c_used": sec_80c,
        "sec_80d_used": sec_80d,
        "sec_80ccd_used": sec_80ccd,
        "potential_tax_saving_inr": round(potential_tax_saving, 0),
        "action": f"Invest ₹{missed_80c:,.0f} more in ELSS to max 80C deduction" if missed_80c > 0 else "80C fully utilized",
    }

    # 6. Retirement Readiness (max 15)
    current_corpus = float(inputs.get("current_corpus", 0))
    required_corpus = float(inputs.get("required_corpus_at_60", 5000000))
    years_left = int(inputs.get("years_to_retirement", 25))

    # Project current corpus at 12% equity return
    projected_corpus = current_corpus * (1.12 ** years_left) if current_corpus > 0 else 0
    retirement_pct = min(1.0, projected_corpus / required_corpus) if required_corpus > 0 else 0

    ret_score = round(retirement_pct * 15)
    ret_score = max(0, min(15, ret_score))
    ret_status = "On Track" if ret_score >= 12 else "Behind" if ret_score >= 7 else "At Risk" if ret_score >= 3 else "Critical"

    scores["retirement"] = ret_score
    details["retirement"] = {
        "score": ret_score, "max": 15, "status": ret_status,
        "color": "green" if ret_score >= 12 else "yellow" if ret_score >= 7 else "orange" if ret_score >= 3 else "red",
        "current_corpus_inr": current_corpus,
        "projected_corpus_inr": round(projected_corpus, 0),
        "required_corpus_inr": required_corpus,
        "on_track_pct": round(retirement_pct * 100, 1),
        "action": f"On track — projected ₹{projected_corpus/10000000:.1f} Cr vs required ₹{required_corpus/10000000:.1f} Cr" if ret_score >= 12
                  else f"Start SIP immediately — gap of ₹{max(0, required_corpus - projected_corpus)/10000000:.1f} Cr",
    }

    # Composite score
    total = sum(scores.values())
    if total >= 81:
        overall_status = "Excellent"
        overall_color = "#22c55e"
    elif total >= 61:
        overall_status = "On Track"
        overall_color = "#84cc16"
    elif total >= 41:
        overall_status = "Needs Attention"
        overall_color = "#f59e0b"
    else:
        overall_status = "Critical"
        overall_color = "#ef4444"

    # Priority actions (sorted by impact × ease)
    priority_actions = _generate_priority_actions(details, scores, inputs)

    return {
        "total_score": total,
        "max_score": 100,
        "overall_status": overall_status,
        "overall_color": overall_color,
        "scores": scores,
        "details": details,
        "priority_actions": priority_actions,
    }


def _generate_priority_actions(details: Dict, scores: Dict, inputs: Dict) -> List[Dict]:
    actions = []

    if scores["emergency"] < 12:
        monthly_exp = float(inputs.get("monthly_expenses", 50000))
        liquid = float(inputs.get("liquid_savings", 0))
        gap = max(0, 6 * monthly_exp - liquid)
        actions.append({
            "title": "Build Emergency Fund",
            "description": f"Start ₹{min(gap, gap/6):,.0f}/month liquid fund SIP → reach 6-month buffer in 6 months",
            "score_impact": f"+{20 - scores['emergency']} pts",
            "difficulty": "Easy",
            "priority": 1,
        })

    if scores["tax"] < 10:
        missed = float(inputs.get("monthly_income", 100000)) * 12 * 0.3
        actions.append({
            "title": "Maximize Tax Deductions",
            "description": f"Invest in ELSS + NPS to save up to ₹{details['tax']['potential_tax_saving_inr']:,.0f} in taxes this year",
            "score_impact": f"+{15 - scores['tax']} pts",
            "difficulty": "Easy",
            "priority": 2,
        })

    if scores["insurance"] < 10:
        actions.append({
            "title": "Increase Insurance Cover",
            "description": details["insurance"]["action"],
            "score_impact": f"+{20 - scores['insurance']} pts",
            "difficulty": "Medium",
            "priority": 3,
        })

    if scores["retirement"] < 10:
        actions.append({
            "title": "Boost Retirement SIP",
            "description": details["retirement"]["action"],
            "score_impact": f"+{15 - scores['retirement']} pts",
            "difficulty": "Medium",
            "priority": 4,
        })

    if scores["diversification"] < 10:
        actions.append({
            "title": "Diversify Investments",
            "description": details["diversification"]["action"],
            "score_impact": f"+{15 - scores['diversification']} pts",
            "difficulty": "Easy",
            "priority": 5,
        })

    if scores["debt"] < 10:
        actions.append({
            "title": "Reduce Debt Burden",
            "description": details["debt"]["action"],
            "score_impact": f"+{15 - scores['debt']} pts",
            "difficulty": "Hard",
            "priority": 6,
        })

    actions.sort(key=lambda x: x["priority"])
    return actions[:5]

"""
Portfolio Analytics Service
- Overlap analysis using Jaccard similarity
- Expense ratio drag calculation
- Asset allocation analysis and rebalancing suggestions
- Benchmark comparison
"""
from datetime import date
from typing import Dict, List
import math

# ── Mock top-50 holdings for major funds (simplified for demo) ──────────
FUND_HOLDINGS_DB = {
    "mirae asset large cap": {"HDFCBANK", "RELIANCE", "INFY", "TCS", "ICICIBANK", "KOTAKBANK", "AXISBANK", "LT", "BAJFINANCE", "MARUTI", "SBIN", "HINDUNILVR", "TITAN", "ASIANPAINT", "NESTLEIND", "WIPRO", "TECHM", "SUNPHARMA", "DRREDDY", "DIVISLAB"},
    "parag parikh flexi cap": {"HDFCBANK", "RELIANCE", "ALPHABET", "META", "MICROSOFT", "BAJFINANCE", "ICICIBANK", "COALINDIA", "ONGC", "POWERGRID", "IDFCFIRSTB", "SBIN", "MARUTI", "PIIND", "PERSISTENT"},
    "hdfc mid-cap opportunities": {"CHOLAMANDALAM", "PIIND", "PERSISTENT", "MPHASIS", "MAXHEALTH", "LUPIN", "AUBANK", "FEDERALBNK", "HDFCBANK", "RELIANCE", "AARTIIND", "JUBILANTFOO", "WHIRLPOOL", "KANSAINER", "SWANENERGY"},
    "axis small cap": {"KFINTECH", "GARFIBRES", "TECHNOE", "JKCEMENT", "SAFARI", "EPIGRAL", "VIJAYA", "CRAFTSMAN", "LAXMIMACH", "SWARAJENG", "GREENPANEL", "GOCOLORS", "RADICO", "MARUTI", "HDFCBANK"},
    "mirae asset tax saver": {"HDFCBANK", "RELIANCE", "INFY", "TCS", "ICICIBANK", "KOTAKBANK", "AXISBANK", "BAJFINANCE", "SBIN", "HINDUNILVR", "TITAN", "ASIANPAINT", "WIPRO", "TECHM", "SUNPHARMA"},
    "icici prudential short term": set(),  # Debt fund - no equity holdings
}

# Expense ratios (TER) for common funds: regular vs direct
EXPENSE_RATIO_DB = {
    "mirae asset large cap fund - regular": 1.58,
    "mirae asset large cap fund - direct": 0.54,
    "parag parikh flexi cap fund - regular": 1.67,
    "parag parikh flexi cap fund - direct": 0.64,
    "hdfc mid-cap opportunities fund - regular": 1.67,
    "hdfc mid-cap opportunities fund - direct": 0.86,
    "axis small cap fund - regular": 1.76,
    "axis small cap fund - direct": 0.54,
    "mirae asset tax saver fund - regular": 1.62,
    "mirae asset tax saver fund - direct": 0.48,
    "icici prudential short term fund - regular": 0.65,
    "icici prudential short term fund - direct": 0.25,
}

# Nifty 50 TRI approximate XIRR benchmarks by period
BENCHMARK_XIRR = {
    "3yr": 18.5,
    "5yr": 16.2,
    "10yr": 13.8,
    "overall": 14.5,
}


def get_fund_holdings(scheme_name: str) -> set:
    name_lower = scheme_name.lower()
    for key, holdings in FUND_HOLDINGS_DB.items():
        if any(word in name_lower for word in key.split()):
            return holdings
    # Default: generate a plausible set
    return {"HDFCBANK", "RELIANCE", "INFY", "TCS", "ICICIBANK"}


def jaccard_similarity(set_a: set, set_b: set) -> float:
    if not set_a or not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union > 0 else 0.0


def compute_overlap_matrix(funds: List[Dict]) -> Dict:
    """Compute pairwise Jaccard similarity between all equity funds."""
    equity_funds = [f for f in funds if f.get("category") not in ("Debt", "Liquid/Cash")]

    matrix = []
    fund_names = [f["scheme_name"] for f in equity_funds]
    holdings_map = {f["scheme_name"]: get_fund_holdings(f["scheme_name"]) for f in equity_funds}

    high_overlap_pairs = []

    for i, f1 in enumerate(equity_funds):
        row = []
        for j, f2 in enumerate(equity_funds):
            if i == j:
                row.append(100.0)
            else:
                sim = jaccard_similarity(holdings_map[f1["scheme_name"]], holdings_map[f2["scheme_name"]]) * 100
                row.append(round(sim, 1))
                if i < j and sim > 40:
                    high_overlap_pairs.append({
                        "fund_a": f1["scheme_name"].split("-")[0].strip(),
                        "fund_b": f2["scheme_name"].split("-")[0].strip(),
                        "overlap_pct": round(sim, 1),
                        "shared_stocks": sorted(holdings_map[f1["scheme_name"]] & holdings_map[f2["scheme_name"]]),
                    })
        matrix.append(row)

    # Top concentrated stocks across portfolio
    all_stocks = {}
    for fund_name, holdings in holdings_map.items():
        short_name = fund_name.split("-")[0].strip()
        for stock in holdings:
            if stock not in all_stocks:
                all_stocks[stock] = []
            all_stocks[stock].append(short_name)

    concentrated = [
        {"stock": stock, "appears_in": funds_list, "count": len(funds_list)}
        for stock, funds_list in all_stocks.items()
        if len(funds_list) >= 2
    ]
    concentrated.sort(key=lambda x: -x["count"])

    return {
        "fund_names": [n.split("-")[0].strip() for n in fund_names],
        "matrix": matrix,
        "high_overlap_pairs": high_overlap_pairs,
        "concentrated_stocks": concentrated[:10],
    }


def compute_expense_drag(funds: List[Dict]) -> List[Dict]:
    """Compute expense ratio drag per fund and potential direct plan savings."""
    results = []
    for fund in funds:
        name_lower = fund["scheme_name"].lower()
        current_value = fund.get("current_value", 0) or 0

        # Detect if regular or direct plan
        is_regular = "regular" in name_lower
        is_direct = "direct" in name_lower

        # Get TER
        ter = 1.5  # default
        for key, ratio in EXPENSE_RATIO_DB.items():
            if any(word in name_lower for word in key.split("-")[0].split()):
                if ("regular" in key and is_regular) or ("direct" in key and is_direct):
                    ter = ratio
                    break

        annual_drag = current_value * ter / 100
        drag_10yr = current_value * ((1 + ter / 100) ** 10 - 1)

        # Direct plan savings (if currently regular)
        direct_ter = ter * 0.4 if is_regular else ter  # approx direct = 40% of regular
        saving_annual = current_value * (ter - direct_ter) / 100 if is_regular else 0

        results.append({
            "scheme_name": fund["scheme_name"].split("-")[0].strip(),
            "is_regular_plan": is_regular,
            "ter_pct": ter,
            "current_value": current_value,
            "annual_drag_inr": round(annual_drag, 0),
            "drag_10yr_inr": round(drag_10yr, 0),
            "potential_saving_annual": round(saving_annual, 0),
            "direct_plan_available": is_regular,
        })

    return results


def compute_asset_allocation(funds: List[Dict], user_age: int = 35) -> Dict:
    """Analyze current asset allocation vs age-appropriate target."""
    category_value = {}
    total = 0

    for fund in funds:
        val = fund.get("current_value", 0) or 0
        cat = fund.get("category", "Other")

        # Map to broad asset class
        if cat in ("Large Cap", "Mid Cap", "Small Cap", "Flexi Cap", "ELSS", "Index Fund", "Equity - Other", "International"):
            broad = "Equity"
        elif cat in ("Debt",):
            broad = "Debt"
        elif cat in ("Hybrid",):
            broad = "Hybrid"
        elif cat in ("Liquid/Cash",):
            broad = "Liquid"
        else:
            broad = "Other"

        category_value[broad] = category_value.get(broad, 0) + val
        total += val

    current_allocation = {k: round(v / total * 100, 1) if total > 0 else 0 for k, v in category_value.items()}

    # Age-based target (100 - age rule)
    target_equity = max(30, 100 - user_age)
    target_debt = 100 - target_equity
    target_allocation = {"Equity": target_equity, "Debt": target_debt}

    current_equity = current_allocation.get("Equity", 0) + current_allocation.get("Hybrid", 0) * 0.6
    deviation = current_equity - target_equity

    rebalance_actions = []
    if abs(deviation) > 5:
        direction = "overweight" if deviation > 0 else "underweight"
        rebalance_actions.append({
            "action": f"Equity is {direction} by {abs(deviation):.1f}% vs age-appropriate target",
            "recommendation": "Shift STP from equity to debt over 12 months" if deviation > 0 else "Increase equity SIP allocation",
            "urgency": "high" if abs(deviation) > 15 else "medium",
        })

    return {
        "current_allocation": current_allocation,
        "target_allocation": target_allocation,
        "equity_deviation_pct": round(deviation, 1),
        "rebalance_actions": rebalance_actions,
        "total_portfolio_value": round(total, 2),
    }


def generate_rebalancing_plan(portfolio: Dict, xirr_results: List[Dict]) -> List[Dict]:
    """Generate actionable rebalancing recommendations."""
    recommendations = []

    for xirr_r in xirr_results:
        xirr_val = xirr_r.get("xirr", 0)
        fund_name = xirr_r.get("scheme_name", "")
        category = xirr_r.get("category", "")

        # Benchmark underperformance
        benchmark = BENCHMARK_XIRR["overall"]
        if category in ("Debt", "Liquid/Cash"):
            benchmark = 7.0

        if xirr_val < benchmark - 3 and xirr_val > 0:
            recommendations.append({
                "type": "benchmark_underperformance",
                "fund": fund_name,
                "finding": f"XIRR {xirr_val:.1f}% vs benchmark {benchmark:.1f}%",
                "action": "Consider switching to index fund alternative",
                "priority": "high",
                "impact_inr": None,
            })

        # Regular plan detection
        if "regular" in fund_name.lower():
            recommendations.append({
                "type": "regular_plan",
                "fund": fund_name,
                "finding": "Regular plan detected — higher expense ratio",
                "action": "Switch to Direct plan to reduce TER drag",
                "priority": "medium",
                "impact_inr": None,
            })

    return recommendations

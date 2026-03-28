from fastapi import APIRouter, UploadFile, File, HTTPException
from datetime import date
from services.cams_parser import parse_cams_pdf, get_demo_portfolio
from services.xirr_engine import compute_portfolio_xirr
from services.portfolio_analytics import (
    compute_overlap_matrix, compute_expense_drag,
    compute_asset_allocation, generate_rebalancing_plan
)

router = APIRouter()


@router.get("/demo")
async def get_demo_analysis():
    """Return analysis on demo portfolio (no upload required)."""
    portfolio = get_demo_portfolio()
    return await _analyze_portfolio(portfolio)


@router.post("/analyze")
async def analyze_portfolio(file: UploadFile = File(...), user_age: int = 35):
    """Upload CAMS PDF and get full portfolio analysis."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are accepted")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large (max 10MB)")
    portfolio = parse_cams_pdf(pdf_bytes)
    return await _analyze_portfolio(portfolio, user_age)


async def _analyze_portfolio(portfolio: dict, user_age: int = 35) -> dict:
    funds = portfolio.get("funds", [])
    today = date.today()

    # Compute XIRR per fund
    xirr_results = []
    for fund in funds:
        xirr_data = compute_portfolio_xirr(
            transactions=fund.get("transactions", []),
            current_value=fund.get("current_value", 0) or 0,
            current_date=today,
        )
        xirr_results.append({
            "scheme_name": fund["scheme_name"],
            "category": fund.get("category", "Unknown"),
            **xirr_data,
        })

    # Compute portfolio-level XIRR
    all_transactions = []
    total_current_value = 0
    for fund in funds:
        all_transactions.extend(fund.get("transactions", []))
        total_current_value += fund.get("current_value", 0) or 0

    portfolio_xirr = compute_portfolio_xirr(all_transactions, total_current_value, today)

    # Overlap analysis
    overlap = compute_overlap_matrix(funds)

    # Expense drag
    expense_drag = compute_expense_drag(funds)
    total_annual_drag = sum(e["annual_drag_inr"] for e in expense_drag)
    total_potential_saving = sum(e["potential_saving_annual"] for e in expense_drag)

    # Asset allocation
    allocation = compute_asset_allocation(funds, user_age)

    # Rebalancing plan
    rebalancing = generate_rebalancing_plan(portfolio, xirr_results)

    return {
        "investor_name": portfolio.get("investor_name", "Investor"),
        "summary": portfolio.get("summary", {}),
        "portfolio_xirr": portfolio_xirr,
        "benchmark_xirr": 14.5,
        "xirr_vs_benchmark": round(portfolio_xirr["xirr"] - 14.5, 2),
        "fund_xirr_breakdown": xirr_results,
        "overlap_analysis": overlap,
        "expense_drag": {
            "fund_breakdown": expense_drag,
            "total_annual_drag_inr": round(total_annual_drag, 0),
            "total_potential_saving_inr": round(total_potential_saving, 0),
        },
        "asset_allocation": allocation,
        "rebalancing_recommendations": rebalancing,
        "parse_warnings": portfolio.get("parse_warnings", []),
        "sebi_disclaimer": "This analysis is AI-generated and NOT SEBI-registered investment advice. Consult a qualified financial advisor before making investment decisions.",
    }

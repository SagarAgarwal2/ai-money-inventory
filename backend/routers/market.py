from fastapi import APIRouter, Query, HTTPException
from services.market_service import fetch_all_nav, search_fund_by_name, get_nav_by_code

router = APIRouter()


@router.get("/nav/search")
async def search_nav(q: str = Query(..., min_length=3)):
    """Search funds by name — live from AMFI."""
    results = await search_fund_by_name(q, top_k=10)
    return {"query": q, "results": results}


@router.get("/nav/{scheme_code}")
async def get_nav(scheme_code: str):
    """Get NAV for a specific scheme code."""
    fund = await get_nav_by_code(scheme_code)
    if not fund:
        return {"error": "Fund not found"}
    return fund


@router.get("/stats")
async def market_stats():
    """Get total fund count from AMFI — confirms live data connection."""
    try:
        all_funds = await fetch_all_nav()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "total_funds": len(all_funds),
        "data_source": "AMFI (amfiindia.com)",
        "note": "Live NAV data updated daily by 9 PM IST",
    }

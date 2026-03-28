"""
Market Data Service
- Fetches live NAV from AMFI public API
- Fetches Nifty 50 benchmark data
- Caches results to avoid excessive API calls
"""
import httpx
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Optional
import re

# In-memory cache
_nav_cache: Dict = {}
_cache_timestamp: Optional[datetime] = None
CACHE_TTL_MINUTES = 60

AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

async def fetch_all_nav() -> Dict[str, dict]:
    """Fetch all mutual fund NAVs from AMFI. Returns dict keyed by scheme code."""
    global _nav_cache, _cache_timestamp

    # Return cache if fresh
    if _cache_timestamp and (datetime.now() - _cache_timestamp) < timedelta(minutes=CACHE_TTL_MINUTES):
        return _nav_cache

    # AMFI may redirect to portal.amfiindia.com; follow redirects to keep API stable.
    try:
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(AMFI_NAV_URL)
            resp.raise_for_status()
            text = resp.text
    except httpx.HTTPError as exc:
        # Serve stale cache if available instead of failing hard on transient upstream errors.
        if _nav_cache:
            return _nav_cache
        raise RuntimeError("Unable to fetch NAV data from AMFI") from exc

    funds = {}
    current_amc = ""
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        # AMC header lines have no semicolons
        if ";" not in line:
            current_amc = line
            continue
        parts = line.split(";")
        if len(parts) < 6:
            continue
        try:
            scheme_code = parts[0].strip()
            isin_growth = parts[1].strip()
            isin_div = parts[2].strip()
            scheme_name = parts[3].strip()
            nav_str = parts[4].strip()
            date_str = parts[5].strip()
            nav = float(nav_str) if nav_str not in ("-", "", "N.A.") else None
            funds[scheme_code] = {
                "scheme_code": scheme_code,
                "isin_growth": isin_growth,
                "isin_div": isin_div,
                "scheme_name": scheme_name,
                "nav": nav,
                "nav_date": date_str,
                "amc": current_amc,
            }
        except (ValueError, IndexError):
            continue

    _nav_cache = funds
    _cache_timestamp = datetime.now()
    return funds


async def search_fund_by_name(name: str, top_k: int = 5) -> list:
    """Fuzzy search funds by name."""
    all_funds = await fetch_all_nav()
    name_lower = name.lower()
    matches = []
    for code, fund in all_funds.items():
        score = sum(1 for word in name_lower.split() if word in fund["scheme_name"].lower())
        if score > 0:
            matches.append((score, fund))
    matches.sort(key=lambda x: -x[0])
    return [m[1] for m in matches[:top_k]]


async def get_nav_by_code(scheme_code: str) -> Optional[dict]:
    all_funds = await fetch_all_nav()
    return all_funds.get(scheme_code)


async def get_fund_categories() -> Dict[str, list]:
    """Group all funds by category."""
    all_funds = await fetch_all_nav()
    categories: Dict[str, list] = {}
    for fund in all_funds.values():
        name = fund["scheme_name"].lower()
        if "liquid" in name:
            cat = "Liquid"
        elif "debt" in name or "bond" in name or "gilt" in name or "income" in name:
            cat = "Debt"
        elif "hybrid" in name or "balanced" in name or "conservative" in name:
            cat = "Hybrid"
        elif "elss" in name or "tax" in name:
            cat = "ELSS"
        elif "index" in name or "nifty" in name or "sensex" in name:
            cat = "Index"
        elif "international" in name or "global" in name or "us " in name:
            cat = "International"
        elif "small cap" in name:
            cat = "Small Cap"
        elif "mid cap" in name:
            cat = "Mid Cap"
        elif "large cap" in name:
            cat = "Large Cap"
        elif "flexi" in name or "multi cap" in name or "diversified" in name:
            cat = "Flexi Cap"
        else:
            cat = "Other"
        categories.setdefault(cat, []).append(fund)
    return categories


def classify_fund(scheme_name: str) -> str:
    name = scheme_name.lower()
    if "liquid" in name or "overnight" in name or "money market" in name:
        return "Liquid/Cash"
    if "elss" in name or "tax saver" in name or "tax saving" in name:
        return "ELSS"
    if "index" in name or "nifty 50" in name or "sensex" in name or "nifty next" in name:
        return "Index Fund"
    if "international" in name or "global" in name or "us equity" in name or "nasdaq" in name:
        return "International"
    if "small cap" in name:
        return "Small Cap"
    if "mid cap" in name:
        return "Mid Cap"
    if "large cap" in name:
        return "Large Cap"
    if "flexi cap" in name or "multi cap" in name or "focused" in name:
        return "Flexi Cap"
    if "hybrid" in name or "balanced" in name or "aggressive" in name:
        return "Hybrid"
    if "debt" in name or "bond" in name or "gilt" in name or "duration" in name or "credit" in name:
        return "Debt"
    return "Equity - Other"

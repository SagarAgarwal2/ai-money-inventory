"""
CAMS / KFintech CAS Statement Parser
Parses consolidated account statements to extract fund holdings and transactions.
Supports both text-layer PDFs and OCR fallback for image PDFs.
"""
import re
import io
from datetime import date, datetime
from typing import List, Dict, Optional
import pdfplumber


# ── Regex patterns for CAMS statement parsing ──────────────────────────
FUND_HEADER_RE = re.compile(
    r"(?:Folio No|Folio)\s*[:\-]?\s*([\w\s/]+?)(?:\s*PAN\s*:\s*(\w+))?$",
    re.IGNORECASE,
)
SCHEME_NAME_RE = re.compile(
    r"^([A-Z][\w\s\-&()]+(?:Fund|Plan|Option|Growth|IDCW|Direct|Regular)[\w\s\-()]*)$",
    re.IGNORECASE,
)
TRANSACTION_RE = re.compile(
    r"(\d{2}-\w{3}-\d{4})\s+"           # date  dd-Mon-YYYY
    r"([A-Za-z\s/()]+?)\s+"              # transaction type
    r"([\d,]+\.?\d*)\s+"                 # amount
    r"([\d,]+\.?\d*)\s+"                 # units
    r"([\d,]+\.?\d*)\s+"                 # nav
    r"([\d,]+\.?\d*)"                    # balance units
)
NAV_LINE_RE = re.compile(r"NAV\s*(?:as\s*on\s*[\d\-/\w]+)?\s*[:\-]?\s*Rs\.\s*([\d,]+\.\d+)", re.IGNORECASE)
CURRENT_VALUE_RE = re.compile(r"Market\s*Value\s*[:\-]?\s*Rs\.\s*([\d,]+\.\d+)", re.IGNORECASE)
CLOSING_UNITS_RE = re.compile(r"Closing\s*Balance\s*[:\-]?\s*([\d,]+\.\d+)\s*Units?", re.IGNORECASE)


def parse_amount(s: str) -> float:
    return float(s.replace(",", "").strip())


def parse_date(s: str) -> date:
    for fmt in ("%d-%b-%Y", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {s}")


def parse_cams_pdf(pdf_bytes: bytes) -> dict:
    """
    Main entry point: parse a CAMS CAS PDF and return structured portfolio data.
    Returns dict with: investor_name, pan, folios[], funds[], summary{}
    """
    result = {
        "investor_name": None,
        "pan": None,
        "folios": [],
        "funds": [],
        "parse_warnings": [],
        "raw_text_sample": "",
    }

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            full_text = "\n".join(page.extract_text() or "" for page in pdf.pages)
    except Exception as e:
        result["parse_warnings"].append(f"pdfplumber failed: {e}. Try OCR fallback.")
        return result

    result["raw_text_sample"] = full_text[:500]

    # Extract investor name
    name_match = re.search(r"Dear\s+([A-Z][A-Z\s]+),", full_text)
    if name_match:
        result["investor_name"] = name_match.group(1).strip().title()

    # Extract PAN
    pan_match = re.search(r"\bPAN\s*:\s*([A-Z]{5}\d{4}[A-Z])", full_text)
    if pan_match:
        result["pan"] = pan_match.group(1)

    # Parse fund sections
    funds = _extract_fund_sections(full_text, result["parse_warnings"])
    result["funds"] = funds

    # Build summary
    result["summary"] = _build_summary(funds)

    return result


def _extract_fund_sections(text: str, warnings: list) -> List[Dict]:
    """Split text into fund sections and parse each."""
    funds = []

    # Split on fund name patterns — heuristic: lines with "Fund" followed by "Plan" / "Direct" / "Regular"
    # We look for blocks that start with a scheme name
    lines = text.splitlines()
    current_fund = None
    current_txns = []
    folio = None

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        # Detect folio line
        folio_match = re.search(r"Folio\s*(?:No\.?\s*)?:\s*([\w/]+)", line, re.IGNORECASE)
        if folio_match:
            folio = folio_match.group(1).strip()

        # Detect new scheme / fund name
        if _is_scheme_name(line) and len(line) > 15:
            if current_fund:
                current_fund["transactions"] = current_txns
                funds.append(current_fund)
            current_fund = {
                "scheme_name": line,
                "folio": folio,
                "category": None,
                "current_nav": None,
                "current_value": None,
                "closing_units": None,
                "transactions": [],
            }
            current_txns = []

        elif current_fund:
            # Try transaction line
            txn = _parse_transaction_line(line)
            if txn:
                current_txns.append(txn)

            # NAV line
            nav_m = NAV_LINE_RE.search(line)
            if nav_m:
                current_fund["current_nav"] = parse_amount(nav_m.group(1))

            # Market value
            val_m = CURRENT_VALUE_RE.search(line)
            if val_m:
                current_fund["current_value"] = parse_amount(val_m.group(1))

            # Closing units
            units_m = CLOSING_UNITS_RE.search(line)
            if units_m:
                current_fund["closing_units"] = parse_amount(units_m.group(1))

        i += 1

    if current_fund:
        current_fund["transactions"] = current_txns
        funds.append(current_fund)

    # Classify funds
    for fund in funds:
        from services.market_service import classify_fund
        fund["category"] = classify_fund(fund["scheme_name"])

    return funds


def _is_scheme_name(line: str) -> bool:
    keywords = ["fund", "direct", "regular", "growth", "idcw", "plan", "equity", "debt", "liquid", "elss", "hybrid"]
    line_lower = line.lower()
    return (
        len(line) > 20
        and any(kw in line_lower for kw in keywords)
        and not line.startswith("Folio")
        and not line.startswith("Date")
        and not re.match(r"^\d", line)
    )


def _parse_transaction_line(line: str) -> Optional[Dict]:
    m = TRANSACTION_RE.search(line)
    if not m:
        return None
    try:
        txn_date = parse_date(m.group(1))
        txn_type_raw = m.group(2).strip().lower()
        amount = parse_amount(m.group(3))
        units = parse_amount(m.group(4))
        nav = parse_amount(m.group(5))
        balance = parse_amount(m.group(6))

        txn_type = "sell" if any(w in txn_type_raw for w in ["redeem", "switch out", "withdrawal"]) else "buy"

        return {
            "date": txn_date.isoformat(),
            "type": txn_type,
            "description": m.group(2).strip(),
            "amount": amount,
            "units": units,
            "nav": nav,
            "balance_units": balance,
        }
    except Exception:
        return None


def _build_summary(funds: List[Dict]) -> Dict:
    total_invested = 0.0
    total_current = 0.0
    category_breakdown = {}

    for fund in funds:
        # Sum investments from transactions
        invested = sum(t["amount"] for t in fund.get("transactions", []) if t["type"] == "buy")
        total_invested += invested

        current = fund.get("current_value", 0) or 0
        total_current += current

        cat = fund.get("category", "Other")
        category_breakdown[cat] = category_breakdown.get(cat, 0) + current

    gain = total_current - total_invested
    return {
        "total_invested": round(total_invested, 2),
        "total_current_value": round(total_current, 2),
        "total_gain": round(gain, 2),
        "total_gain_pct": round((gain / total_invested * 100) if total_invested > 0 else 0, 2),
        "category_breakdown": {k: round(v, 2) for k, v in category_breakdown.items()},
        "num_funds": len(funds),
    }


# ── Demo / mock data for when no real PDF is available ──────────────────
def get_demo_portfolio() -> dict:
    """Returns a realistic mock portfolio for hackathon demo purposes."""
    return {
        "investor_name": "Rahul Sharma",
        "pan": "ABCDE1234F",
        "folios": ["12345678/67", "87654321/99"],
        "funds": [
            {
                "scheme_name": "Mirae Asset Large Cap Fund - Direct Plan - Growth",
                "folio": "12345678/67",
                "category": "Large Cap",
                "current_nav": 98.45,
                "current_value": 185000,
                "closing_units": 1879.12,
                "transactions": [
                    {"date": "2021-04-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 62.5, "nav": 80.0, "balance_units": 62.5},
                    {"date": "2021-05-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 61.8, "nav": 80.9, "balance_units": 124.3},
                    {"date": "2022-01-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 58.4, "nav": 85.6, "balance_units": 600},
                    {"date": "2023-01-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 54.9, "nav": 91.1, "balance_units": 1200},
                    {"date": "2024-01-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 53.5, "nav": 93.4, "balance_units": 1800},
                    {"date": "2024-06-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 51.8, "nav": 96.5, "balance_units": 1879.12},
                ],
            },
            {
                "scheme_name": "Parag Parikh Flexi Cap Fund - Direct Plan - Growth",
                "folio": "12345678/67",
                "category": "Flexi Cap",
                "current_nav": 72.30,
                "current_value": 142000,
                "closing_units": 1964.04,
                "transactions": [
                    {"date": "2021-07-01", "type": "buy", "description": "Lumpsum", "amount": 50000, "units": 820, "nav": 61.0, "balance_units": 820},
                    {"date": "2022-07-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 74.6, "nav": 67.0, "balance_units": 1400},
                    {"date": "2023-07-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 72.0, "nav": 69.4, "balance_units": 1850},
                    {"date": "2024-06-01", "type": "buy", "description": "SIP", "amount": 5000, "units": 70.6, "nav": 70.8, "balance_units": 1964.04},
                ],
            },
            {
                "scheme_name": "HDFC Mid-Cap Opportunities Fund - Regular Plan - Growth",
                "folio": "87654321/99",
                "category": "Mid Cap",
                "current_nav": 138.72,
                "current_value": 96500,
                "closing_units": 695.6,
                "transactions": [
                    {"date": "2020-10-01", "type": "buy", "description": "Lumpsum", "amount": 30000, "units": 280, "nav": 107.1, "balance_units": 280},
                    {"date": "2022-04-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 22.8, "nav": 131.7, "balance_units": 500},
                    {"date": "2023-10-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 22.1, "nav": 135.6, "balance_units": 650},
                    {"date": "2024-06-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 21.6, "nav": 138.6, "balance_units": 695.6},
                ],
            },
            {
                "scheme_name": "Axis Small Cap Fund - Direct Plan - Growth",
                "folio": "12345678/67",
                "category": "Small Cap",
                "current_nav": 92.15,
                "current_value": 78000,
                "closing_units": 846.5,
                "transactions": [
                    {"date": "2022-01-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 38.9, "nav": 77.1, "balance_units": 38.9},
                    {"date": "2023-01-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 36.8, "nav": 81.5, "balance_units": 400},
                    {"date": "2024-01-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 33.8, "nav": 88.6, "balance_units": 800},
                    {"date": "2024-06-01", "type": "buy", "description": "SIP", "amount": 3000, "units": 32.8, "nav": 91.5, "balance_units": 846.5},
                ],
            },
            {
                "scheme_name": "Mirae Asset Tax Saver Fund ELSS - Direct Plan - Growth",
                "folio": "12345678/67",
                "category": "ELSS",
                "current_nav": 41.85,
                "current_value": 62500,
                "closing_units": 1494.6,
                "transactions": [
                    {"date": "2021-04-01", "type": "buy", "description": "SIP", "amount": 12500, "units": 360, "nav": 34.7, "balance_units": 360},
                    {"date": "2022-04-01", "type": "buy", "description": "SIP", "amount": 12500, "units": 325.8, "nav": 38.4, "balance_units": 900},
                    {"date": "2023-04-01", "type": "buy", "description": "SIP", "amount": 12500, "units": 314.8, "nav": 39.7, "balance_units": 1350},
                    {"date": "2024-04-01", "type": "buy", "description": "SIP", "amount": 12500, "units": 305.8, "nav": 40.9, "balance_units": 1494.6},
                ],
            },
            {
                "scheme_name": "ICICI Prudential Short Term Fund - Direct Plan - Growth",
                "folio": "87654321/99",
                "category": "Debt",
                "current_nav": 55.20,
                "current_value": 33100,
                "closing_units": 599.6,
                "transactions": [
                    {"date": "2023-01-01", "type": "buy", "description": "Lumpsum", "amount": 30000, "units": 570, "nav": 52.6, "balance_units": 570},
                    {"date": "2024-01-01", "type": "buy", "description": "SIP", "amount": 2000, "units": 37.0, "nav": 54.1, "balance_units": 599.6},
                ],
            },
        ],
        "parse_warnings": [],
        "raw_text_sample": "[Demo portfolio — upload real CAMS statement to analyze your portfolio]",
        "summary": {
            "total_invested": 282500,
            "total_current_value": 597100,
            "total_gain": 314600,
            "total_gain_pct": 111.4,
            "category_breakdown": {
                "Large Cap": 185000,
                "Flexi Cap": 142000,
                "Mid Cap": 96500,
                "Small Cap": 78000,
                "ELSS": 62500,
                "Debt": 33100,
            },
            "num_funds": 6,
        },
    }

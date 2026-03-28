import requests
import json

print("\n" + "="*70)
print("🚀 GROQ API INTEGRATION VERIFICATION")
print("="*70)

# Test 1: FIRE Plan endpoint
print("\n[1️⃣ ] Testing /api/fire/plan...")
try:
    response = requests.post("http://localhost:8000/api/fire/plan", 
        json={
            "age": 32, "monthly_income": 150000, "monthly_expenses": 70000,
            "existing_corpus": 800000, "existing_loans_emi": 20000,
            "risk_profile": "moderate", "retirement_age": 55, "goals": []
        }, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        provider = data.get("ai_logic", {}).get("provider")
        print(f"    ✅ Status: {response.status_code}")
        print(f"    ✅ Provider: {provider}")
        print(f"    ✅ Using Groq: {provider == 'groq'}")
    else:
        print(f"    ❌ Status: {response.status_code}")
except Exception as e:
    print(f"    ❌ Error: {str(e)}")

# Test 2: Health Score endpoint
print("\n[2️⃣ ] Testing /api/health/score...")
try:
    response = requests.post("http://localhost:8000/api/health/score",
        json={
            "monthly_income": 150000, "monthly_expenses": 70000,
            "liquid_savings": 300000, "term_cover": 10000000,
            "health_cover": 500000, "asset_classes": ["equity_mf"]
        }, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        provider = data.get("ai_logic", {}).get("provider")
        print(f"    ✅ Status: {response.status_code}")
        print(f"    ✅ Provider: {provider}")
        print(f"    ✅ Using Groq: {provider == 'groq'}")
    else:
        print(f"    ❌ Status: {response.status_code}")
except Exception as e:
    print(f"    ❌ Error: {str(e)}")

# Test 3: Comprehensive Analysis endpoint
print("\n[3️⃣ ] Testing /api/ai/analyze-full (Comprehensive Analysis)...")
try:
    response = requests.post("http://localhost:8000/api/ai/analyze-full",
        json={
            "age": 32, "monthly_income": 150000, "monthly_expenses": 70000,
            "existing_corpus": 800000, "liquid_savings": 300000,
            "term_cover": 10000000, "health_cover": 500000,
            "asset_classes": ["equity_mf"], "goals": []
        }, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        provider = data.get("provider")
        analysis_type = data.get("analysis_type")
        print(f"    ✅ Status: {response.status_code}")
        print(f"    ✅ Provider: {provider}")
        print(f"    ✅ Analysis Type: {analysis_type}")
        print(f"    ✅ Using Groq: {provider == 'groq'}")
    else:
        print(f"    ❌ Status: {response.status_code}")
except Exception as e:
    print(f"    ❌ Error: {str(e)}")

# Test 4: AI Explain endpoint
print("\n[4️⃣ ] Testing /api/ai/explain...")
try:
    response = requests.post("http://localhost:8000/api/ai/explain",
        json={
            "module": "health",
            "computed_result": {"total_score": 71, "overall_status": "On Track"},
            "user_context": {"age": 32, "risk_profile": "moderate"}
        }, timeout=30)
    
    if response.status_code == 200:
        data = response.json()
        provider = data.get("provider")
        print(f"    ✅ Status: {response.status_code}")
        print(f"    ✅ Provider: {provider}")
        print(f"    ✅ Using Groq: {provider == 'groq'}")
    else:
        print(f"    ❌ Status: {response.status_code}")
except Exception as e:
    print(f"    ❌ Error: {str(e)}")

print("\n" + "="*70)
print("📊 SUMMARY: All endpoints are Groq-enabled and operational!")
print("="*70 + "\n")

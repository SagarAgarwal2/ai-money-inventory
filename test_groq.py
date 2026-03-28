import requests
import json
import sys

url = "http://localhost:8000/api/fire/plan"

payload = {
    "age": 32,
    "monthly_income": 150000,
    "monthly_expenses": 70000,
    "existing_corpus": 800000,
    "existing_loans_emi": 20000,
    "risk_profile": "moderate",
    "retirement_age": 55,
    "goals": [
        {
            "name": "Child Education",
            "type": "education",
            "current_cost_inr": 2500000,
            "years_to_goal": 15,
            "existing_allocation_inr": 0
        }
    ]
}

try:
    print("📡 Testing if Groq API is being used...")
    print("=" * 60)
    
    response = requests.post(url, json=payload, timeout=30)
    
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        
        if "ai_logic" in data:
            provider = data.get("ai_logic", {}).get("provider")
            used_for = data.get("ai_logic", {}).get("used_for", [])
            
            print(f"\n✅ Groq Integration Found!")
            print(f"   Provider: {provider}")
            print(f"   Used for: {', '.join(used_for)}")
            
            if provider == "groq":
                print("\n✅ SUCCESS: Groq API IS being used!")
                sys.exit(0)
            else:
                print(f"\n❌ WARNING: Not using Groq (using {provider} instead)")
                sys.exit(1)
        else:
            print("\n❌ ERROR: No 'ai_logic' field in response")
            print(f"Response keys: {list(data.keys())}")
            sys.exit(1)
    else:
        print(f"\n❌ ERROR: API returned status {response.status_code}")
        print(f"Response: {response.text}")
        sys.exit(1)
        
except requests.exceptions.ConnectionError:
    print("❌ ERROR: Cannot connect to API at http://localhost:8000")
    print("Make sure the backend is running: uvicorn main:app --reload")
    sys.exit(1)
except Exception as e:
    print(f"❌ ERROR: {str(e)}")
    sys.exit(1)

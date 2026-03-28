# 🎓 Detailed Implementation Guide: Scenario Modeling

## Overview
Allow users to ask "What if my salary drops 30%?" or "What if markets crash 50?" and get instant AI-powered financial impact analysis.

## API Specification

### Endpoint: `POST /api/scenarios/simulate`

**Request Body:**
```json
{
  "base_profile": {
    "age": 32,
    "retirement_age": 60,
    "monthly_income": 100000,
    "monthly_expenses": 50000,
    "current_corpus": 5000000,
    "existing_loans": 2000000,
    "existing_loans_emi": 25000,
    "risk_profile": "moderate"
  },
  "scenario_type": "income_drop",
  "parameters": {
    "income_change_percent": -30,
    "duration_months": 12,
    "emergency_fund_months": 6
  },
  "goals": [
    {
      "name": "Retirement at 60",
      "target_amount": 2500000,
      "timeline_years": 28
    }
  ]
}
```

**Response:**
```json
{
  "scenario_name": "Income drops 30% for 12 months",
  "impact_analysis": {
    "new_monthly_savings": 10000,
    "retirement_delayed_years": 2,
    "success_probability": 0.65,
    "emergency_fund_sufficient": true,
    "fund_exhaustion_timeline_years": 8
  },
  "recommendations": [
    "Reduce monthly expenses to ₹35,000 (30% reduction)",
    "Pause new SIPs for 12 months, resume after income recovery",
    "Keep 8 months emergency fund (2 extra months buffer)",
    "Increase retirement age to 62 for safety margin"
  ],
  "action_items": [
    {
      "priority": "high",
      "action": "Build emergency fund to 8 months (₹280k)",
      "timeline": "3 months"
    }
  ],
  "ai_logic": {
    "provider": "groq",
    "analysis": [
      "Income drop from ₹100k to ₹70k reduces monthly savings significantly",
      "Current corpus of ₹50L will last ~8 years at reduced savings",
      "Retirement goal of ₹25L requires acceleration or delay",
      "65% success probability is acceptable for moderate risk profile"
    ],
    "assumptions": [
      "7% annual market returns (historical Nifty average)",
      "3% inflation on expenses",
      "Income returns to normal after 12 months"
    ]
  }
}
```

## Backend Implementation

### Step 1: Create `scenario_engine.py` in `backend/services/`

```python
# backend/services/scenario_engine.py
from typing import Dict, List
from pydantic import BaseModel
import math

class ScenarioImpactResult(BaseModel):
    scenario_name: str
    impact_analysis: Dict
    recommendations: List[str]
    action_items: List[Dict]
    ai_logic: Dict

class ScenarioInput(BaseModel):
    base_profile: Dict
    scenario_type: str  # "income_drop", "market_crash", "life_event", etc.
    parameters: Dict
    goals: List[Dict]

async def simulate_scenario_impact(
    scenario_input: ScenarioInput
) -> ScenarioImpactResult:
    """
    Calculate scenario impact using Groq AI reasoning
    
    Scenario Types:
    - income_drop: Salary reduction scenario
    - market_crash: Portfolio value drop simulation
    - life_event: Marriage, kids, house purchase
    - recession: Broader economic downturn
    - job_loss: Complete income loss
    """
    
    # Call Groq to analyze scenario
    groq_analysis = await generate_scenario_analysis(scenario_input)
    
    # Parse response and structure results
    result = ScenarioImpactResult(
        scenario_name=scenario_input.parameters.get("name", "Custom Scenario"),
        impact_analysis=groq_analysis.get("impact"),
        recommendations=groq_analysis.get("recommendations", []),
        action_items=groq_analysis.get("action_items", []),
        ai_logic=groq_analysis.get("ai_logic", {})
    )
    
    return result

async def generate_scenario_analysis(scenario_input: ScenarioInput) -> Dict:
    """Call Groq API to analyze scenario impacts"""
    from ..services.llm_reasoning_service import _groq_chat_completion
    
    system_prompt = _build_scenario_analysis_prompt()
    user_message = f"""
    Analyze this financial scenario and its impact:
    
    {json.dumps(scenario_input.dict(), indent=2)}
    
    Provide detailed analysis in this JSON format:
    {{
        "impact": {{
            "new_monthly_savings": <number>,
            "retirement_delayed_years": <number>,
            "success_probability": <0-1>,
            "emergency_fund_sufficient": <bool>,
            "fund_exhaustion_timeline_years": <number>
        }},
        "recommendations": ["<action1>", "<action2>", ...],
        "action_items": [
            {{"priority": "high|medium|low", "action": "<text>", "timeline": "<text>"}}
        ],
        "ai_logic": {{
            "provider": "groq",
            "analysis": ["<reasoning1>", "<reasoning2>", ...],
            "assumptions": ["<assumption1>", "<assumption2>", ...]
        }}
    }}
    """
    
    response = await _groq_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.3
    )
    
    return json.loads(response)

def _build_scenario_analysis_prompt() -> str:
    return """
    You are an expert financial advisor analyzing scenario impacts on a person's financial goals.
    
    Given a base financial profile and a scenario change, analyze:
    1. How the scenario affects monthly savings rate
    2. Impact on retirement timeline
    3. Probability of achieving financial goals
    4. Duration emergency fund will last
    5. Specific action items to mitigate risks
    
    Return valid JSON with impact analysis, recommendations, and reasoning.
    Be specific with numbers. Assume 7% annual market returns and 3% inflation.
    """
```

### Step 2: Create Router Endpoint in `backend/routers/scenarios.py`

```python
# backend/routers/scenarios.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict
from ..services.scenario_engine import simulate_scenario_impact, ScenarioInput

router = APIRouter(prefix="/api/scenarios", tags=["scenarios"])

class ScenarioRequest(BaseModel):
    base_profile: Dict
    scenario_type: str
    parameters: Dict
    goals: List[Dict]

@router.post("/simulate")
async def run_scenario(request: ScenarioRequest):
    """
    Simulate financial scenario impact using Groq AI
    
    Scenario Types:
    - income_drop: Reduce monthly income by X%
    - market_crash: Portfolio drops by X%
    - life_event: Marriage, kids, home purchase
    - recession: 20-30% income reduction + market drop
    - job_loss: Complete income loss immediately
    """
    try:
        scenario_input = ScenarioInput(**request.dict())
        result = await simulate_scenario_impact(scenario_input)
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@router.get("/demo-scenarios")
async def get_scenario_examples():
    """Return example scenarios users can run"""
    return {
        "scenarios": [
            {
                "name": "Job Loss - Immediate",
                "description": "What if I lost my job today?",
                "icon": "briefcase-off"
            },
            {
                "name": "Stock Market Crash - 50%",
                "description": "Market drops 50% like 2008. Do I still make it?",
                "icon": "trending-down"
            },
            {
                "name": "Salary Cut - 30%",
                "description": "Company reduces salary by 30%.",
                "icon": "arrow-down"
            },
            {
                "name": "Getting Married",
                "description": "Spouse has ₹50L corpus, combined spending.",
                "icon": "heart"
            },
            {
                "name": "First Child",
                "description": "₹25L education cost in 18 years.",
                "icon": "smile"
            },
            {
                "name": "Home Purchase",
                "description": "₹40L down payment, ₹40L home loan EMI.",
                "icon": "home"
            }
        ]
    }
```

### Step 3: Update `backend/main.py` to include scenarios router

```python
from .routers import scenarios

app.include_router(scenarios.router)
```

### Step 4: Update requirements.txt (if needed)
Already has all dependencies (httpx, pydantic, etc.)

## Frontend Implementation (React)

### Component: `ScenarioSimulator.jsx`

```jsx
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function ScenarioSimulator({ userProfile }) {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scenarios = [
    { id: 'job_loss', name: '😰 Job Loss', description: 'Immediate income loss' },
    { id: 'market_crash', name: '📉 Market Crash 50%', description: 'Major bear market' },
    { id: 'salary_cut', name: '💼 Salary Cut 30%', description: '1 year salary reduction' },
    { id: 'marriage', name: '💒 Getting Married', description: 'Partner integration' },
    { id: 'first_child', name: '👶 First Child', description: 'Education costs ahead' },
    { id: 'home_purchase', name: '🏠 Home Purchase', description: 'Mortgage + down payment' }
  ];

  const handleSimulate = async (scenarioId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/scenarios/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_profile: userProfile,
          scenario_type: scenarioId,
          parameters: getScenarioParams(scenarioId),
          goals: userProfile.goals || []
        })
      });
      
      const data = await response.json();
      setScenarioResult(data);
    } catch (error) {
      console.error('Scenario simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScenarioParams = (scenarioId) => {
    switch(scenarioId) {
      case 'job_loss':
        return { income_change_percent: -100, duration_months: 0 };
      case 'market_crash':
        return { portfolio_drop_percent: -50 };
      case 'salary_cut':
        return { income_change_percent: -30, duration_months: 12 };
      // ... other scenarios
    }
  };

  return (
    <div className="scenario-simulator">
      <h2>📊 Financial Scenario Simulator</h2>
      <p>See how different situations affect your financial goals</p>
      
      <div className="scenario-grid">
        {scenarios.map(scenario => (
          <button
            key={scenario.id}
            className="scenario-card"
            onClick={() => handleSimulate(scenario.id)}
            disabled={loading}
          >
            <div className="name">{scenario.name}</div>
            <div className="description">{scenario.description}</div>
          </button>
        ))}
      </div>

      {scenarioResult && (
        <div className="scenario-results">
          <h3>Impact Analysis: {scenarioResult.scenario_name}</h3>
          
          <div className="impact-metrics">
            <MetricCard
              label="Success Probability"
              value={`${(scenarioResult.impact_analysis.success_probability * 100).toFixed(0)}%`}
              color={scenarioResult.impact_analysis.success_probability > 0.70 ? 'green' : 'orange'}
            />
            <MetricCard
              label="Retirement Delayed"
              value={`${scenarioResult.impact_analysis.retirement_delayed_years} years`}
            />
            <MetricCard
              label="New Monthly Savings"
              value={`₹${scenarioResult.impact_analysis.new_monthly_savings.toLocaleString()}`}
            />
          </div>

          <div className="recommendations">
            <h4>💡 Recommendations</h4>
            <ul>
              {scenarioResult.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          <div className="action-items">
            <h4>✅ Action Items</h4>
            {scenarioResult.action_items.map((item, i) => (
              <div key={i} className={`action-${item.priority}`}>
                <span className="priority">{item.priority.toUpperCase()}</span>
                <span className="action">{item.action}</span>
                <span className="timeline">{item.timeline}</span>
              </div>
            ))}
          </div>

          <div className="ai-reasoning">
            <h4>🤖 AI Reasoning</h4>
            <ul>
              {scenarioResult.ai_logic.analysis.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Testing

```bash
# Test API
curl -X POST http://localhost:8000/api/scenarios/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "base_profile": {
      "age": 32,
      "monthly_income": 100000,
      "monthly_expenses": 50000,
      "current_corpus": 5000000
    },
    "scenario_type": "job_loss",
    "parameters": {},
    "goals": []
  }'
```

## Expected Unique Value

✨ **This feature makes you unique because:**
1. Users can test their financial plan against realistic scenarios
2. Groq AI provides personalized recommendations, not generic advice
3. Shows impact on retirement timeline (quantified)
4. Provides specific action items (not just analysis)
5. Builds confidence by testing for resilience

## Next Feature: Tax Optimizer
Once scenario modeling is complete, tax optimization becomes lower-hanging fruit:
- Database of Indian tax rules
- Groq-powered deduction strategy
- ₹₹ amount saved calculation
- Timeline-based action items

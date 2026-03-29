from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import portfolio, fire, health, market, ai, planner

load_dotenv()

app = FastAPI(title="AI Money Mentor API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # change later to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio X-Ray"])
app.include_router(fire.router, prefix="/api/fire", tags=["FIRE Planner"])
app.include_router(health.router, prefix="/api/health", tags=["Money Health Score"])
app.include_router(market.router, prefix="/api/market", tags=["Market Data"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI Reasoning"])
app.include_router(planner.router, prefix="/api/planner", tags=["Financial Planner"])

@app.get("/")
def root():
    return {"status": "AI Money Mentor API running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
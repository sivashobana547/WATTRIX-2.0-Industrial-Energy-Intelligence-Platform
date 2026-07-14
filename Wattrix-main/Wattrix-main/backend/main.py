"""
WATTRIX Backend — FastAPI Server
Run: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from simulator import generate_all_machines, generate_historical_data, get_machine_info
from ai_models import AnomalyDetector, EnergyForecaster, run_predictive_maintenance, calculate_carbon
from agent import get_agent_recommendations

# ── App State ──────────────────────────────────────────────────────────────
app_state = {
    "latest_readings": [],
    "history": [],
    "anomaly_detector": None,
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: generate history + train anomaly detector
    print("🔧 WATTRIX starting up...")
    history = generate_historical_data(hours=6)
    app_state["history"] = history
    app_state["latest_readings"] = generate_all_machines()

    detector = AnomalyDetector()
    detector.fit(history)
    app_state["anomaly_detector"] = detector
    print("✅ AI models initialized. WATTRIX ready.")
    yield
    print("🛑 WATTRIX shutting down.")

app = FastAPI(title="WATTRIX API", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Helper ─────────────────────────────────────────────────────────────────
def refresh_readings():
    readings = generate_all_machines()
    app_state["latest_readings"] = readings
    app_state["history"].extend(readings)
    # Keep only last 24h worth of data (~14400 records for 10 machines)
    if len(app_state["history"]) > 14400:
        app_state["history"] = app_state["history"][-14400:]
    return readings

# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "WATTRIX Industrial Energy Intelligence API", "version": "2.0"}


@app.get("/api/machines")
def get_machines():
    """List all registered machines"""
    return {"machines": get_machine_info()}


@app.get("/api/live")
def get_live_readings():
    """Get latest real-time readings for all machines"""
    readings = refresh_readings()
    return {
        "timestamp": readings[0]["timestamp"] if readings else None,
        "machines": readings,
        "total_power_kw": round(sum(r["power_kw"] for r in readings), 3),
        "active_count": sum(1 for r in readings if r["status"] not in ["idle"]),
    }


@app.get("/api/anomalies")
def get_anomalies():
    """Run anomaly detection on latest readings"""
    readings = refresh_readings()
    detector = app_state["anomaly_detector"]
    if not detector or not detector.is_fitted:
        return {"error": "Model not ready"}
    results = detector.predict(readings)
    anomalies = [r for r in results if r["is_anomaly"]]
    return {
        "total_machines": len(results),
        "anomalies_detected": len(anomalies),
        "results": results,
    }


@app.get("/api/maintenance")
def get_maintenance_alerts():
    """Run predictive maintenance checks"""
    readings = refresh_readings()
    alerts = run_predictive_maintenance(readings)
    return {
        "total_alerts": len(alerts),
        "alerts": alerts,
    }


@app.get("/api/forecast/{machine_id}")
def get_forecast(machine_id: int, hours: int = 24):
    """Get energy consumption forecast for a machine"""
    forecaster = EnergyForecaster()
    forecast = forecaster.forecast(app_state["history"], machine_id, hours)
    return {
        "machine_id": machine_id,
        "hours_ahead": hours,
        "forecast": forecast,
    }


@app.get("/api/carbon")
def get_carbon():
    """Get carbon footprint for current readings"""
    readings = app_state["latest_readings"] or refresh_readings()
    carbon = calculate_carbon(readings)
    return carbon


@app.get("/api/history/{machine_id}")
def get_history(machine_id: int, limit: int = 60):
    """Get recent history for a specific machine"""
    machine_history = [
        r for r in app_state["history"] if r["machine_id"] == machine_id
    ][-limit:]
    return {"machine_id": machine_id, "records": machine_history}


@app.get("/api/overview")
def get_overview():
    """Factory overview — summary stats"""
    readings = refresh_readings()
    total_power = sum(r["power_kw"] for r in readings)
    carbon = calculate_carbon(readings)
    status_counts = {}
    for r in readings:
        status_counts[r["status"]] = status_counts.get(r["status"], 0) + 1
    return {
        "total_machines": len(readings),
        "total_power_kw": round(total_power, 2),
        "status_breakdown": status_counts,
        "carbon": carbon,
        "machines": readings,
    }


@app.get("/api/agent")
async def get_agent_insights():
    """Get Agentic AI recommendations"""
    readings = refresh_readings()
    detector = app_state["anomaly_detector"]
    anomalies = detector.predict(readings) if detector and detector.is_fitted else []
    alerts = run_predictive_maintenance(readings)
    carbon = calculate_carbon(readings)
    result = await get_agent_recommendations(readings, alerts, anomalies, carbon)
    return result

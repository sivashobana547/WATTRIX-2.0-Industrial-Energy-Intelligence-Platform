# WATTRIX 2.0 — Industrial Energy Intelligence Platform

WATTRIX is an AI-powered industrial energy monitoring and analytics platform that tracks machine-level electricity consumption in real time and delivers intelligent optimization insights. It integrates IoT simulation, stream-ready architecture, machine learning models, and an agentic AI advisor into a single industrial-grade system.

## Problem Statement

Industries consume 40–50% of global electricity, yet most facilities rely on centralized meters that provide only aggregated data. This makes it impossible to identify which machines are inefficient, consuming abnormal power, or approaching failure.

WATTRIX solves this by providing:

- Machine-level real-time energy visibility
- AI-based anomaly detection and predictive maintenance
- Energy consumption forecasting
- Carbon footprint monitoring
- Agentic AI recommendations for operational optimization

## Features

- Real-time monitoring of 10 simulated industrial machines
- Isolation Forest anomaly detection trained on historical data
- 24-hour energy consumption forecasting using hourly seasonality modeling
- Predictive maintenance with 5 rule categories (bearing wear, overload, voltage sag, low power factor, idle waste)
- Agentic AI energy advisor powered by Groq LLaMA (with rule-based fallback)
- Carbon footprint estimation using India CEA emission factor (0.82 kg CO2/kWh)
- Industrial dark-theme React dashboard with live auto-updating charts
- FastAPI backend with full Swagger documentation
- Synthetic dataset of 100,800 rows across 7 days with injected fault profiles

## Tech Stack

**Backend**
- Python 3.10+
- FastAPI
- Uvicorn
- Scikit-learn (Isolation Forest)
- Pandas / NumPy
- HTTPX

**Frontend**
- React (Vite)
- Recharts
- Inline CSS / CSS variables

**AI Layer**
- Isolation Forest — anomaly detection
- Hourly seasonality model — energy forecasting
- Rule-based engine — predictive maintenance
- Groq LLaMA 3 (8B) — agentic recommendations

**Data**
- Fully synthetic simulation (no external dataset required)
- Realistic shift patterns, Gaussian noise, fault injection
- Exportable as CSV (100,800 rows x 15 columns)

## Project Structure

```
wattrix/
├── backend/
│   ├── main.py            # FastAPI server with all API endpoints
│   ├── simulator.py       # Industrial machine data simulator
│   ├── ai_models.py       # Anomaly detection, forecasting, maintenance, carbon
│   ├── agent.py           # Agentic AI advisor (Groq / fallback)
│   └── requirements.txt   # Python dependencies
├── frontend/
│   └── src/
│       ├── WattrixDashboard.jsx   # Full React dashboard
│       └── App.jsx                # Entry point
└── README.md
```

## Setup and Installation

### Prerequisites

- Python 3.10 or above
- Node.js 18 or above
- npm

### Backend

```bash
cd wattrix/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at: `http://localhost:8000`  
Swagger docs at: `http://localhost:8000/docs`

### Frontend

```bash
cd wattrix/frontend
npm install
npm install recharts
npm run dev
```

Dashboard runs at: `http://localhost:5173`

### Optional — Groq API Key (for live AI recommendations)

Create a `.env` file inside `backend/`:

```
GROQ_API_KEY=your_key_here
```

Get a free key at `console.groq.com`. If skipped, the system uses rule-based recommendations automatically.

---

## API Endpoints

| Endpoint | Description |
|---|---|
| GET /api/live | Real-time readings for all 10 machines |
| GET /api/anomalies | Anomaly detection results |
| GET /api/maintenance | Predictive maintenance alerts |
| GET /api/forecast/{machine_id} | 24-hour energy forecast |
| GET /api/carbon | Carbon footprint data |
| GET /api/overview | Full factory summary |
| GET /api/agent | Agentic AI recommendations |
| GET /docs | Swagger UI |

## Dashboard Modules

- **Overview** — Total power, active machines, anomaly count, CO2/hour, live power chart, machine status grid
- **Machines** — Per-machine metrics (voltage, current, power, power factor) and 24-hour forecast
- **Analytics** — Machine power comparison, anomaly score bars, live power trend
- **Maintenance** — Active alerts, machine health scores, severity indicators
- **Carbon** — CO2 emissions per machine, monthly projections, emission factor details
- **AI Advisor** — Agentic AI findings and recommendations, per-machine intelligence panel

## Dataset

The simulator generates a labeled dataset with the following schema:

| Column | Description |
|---|---|
| timestamp | Reading datetime (1 per minute) |
| machine_id | Machine identifier (1–10) |
| machine_name | Human-readable machine name |
| machine_type | Equipment category |
| voltage_V | Line voltage in volts |
| current_A | Current draw in amperes |
| power_kW | Active power in kilowatts |
| power_factor | Power factor (0–1) |
| energy_kWh | Energy consumed in interval |
| co2_kg | Estimated CO2 for interval |
| status | normal / warning / critical / idle |
| anomaly_score | Model anomaly score (0–1) |
| fault_type | none / bearing_wear / overload / voltage_sag |
| hour | Hour of day (0–23) |
| shift | night / morning / day |

Fault profiles are injected on:
- Machine 2 (Hydraulic Press) — bearing wear
- Machine 5 (Compressor A) — overload spikes
- Machine 8 (Lathe Machine) — voltage sag

## Architecture

```
Simulated Sensors (10 machines)
        |
   simulator.py
        |
   FastAPI Backend (main.py)
        |
   ┌────┴────────────────┐
   |                     |
AI Models (ai_models.py) Agent (agent.py)
   |                     |
   └────────┬────────────┘
            |
     React Dashboard
     (WattrixDashboard.jsx)
```

---

## Authors

- Team WATTRIX
- Built for Industry-Level Hackathon — 2026

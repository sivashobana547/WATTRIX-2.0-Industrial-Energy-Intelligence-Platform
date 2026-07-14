# ⚡ WATTRIX 2.0 — Industrial Energy Intelligence Platform

WATTRIX is an AI-powered industrial energy monitoring and analytics platform that tracks machine-level electricity consumption in real time and delivers intelligent optimization insights. It combines IoT simulation, machine learning, predictive maintenance, carbon analytics, and an Agentic AI advisor into a single industrial-grade platform.

---

## 📌 Problem Statement

Industries consume nearly **40–50% of global electricity**, yet most manufacturing plants rely on centralized energy meters that only provide overall power consumption. This makes it difficult to identify:

- Machines consuming abnormal power
- Equipment operating inefficiently
- Early signs of machine failure
- Energy wastage and carbon emissions

WATTRIX addresses these challenges by providing intelligent machine-level energy monitoring with AI-driven insights.

---

# ✨ Features

- ⚡ Real-time monitoring of 10 simulated industrial machines
- 🤖 Isolation Forest based anomaly detection
- 📈 24-hour energy consumption forecasting
- 🔧 Predictive maintenance with five fault categories
- 🧠 Agentic AI advisor powered by Groq LLaMA (with rule-based fallback)
- 🌱 Carbon footprint estimation using India's CEA emission factor
- 📊 Interactive industrial dashboard built with React
- 🚀 FastAPI backend with Swagger documentation
- 📁 Synthetic dataset containing 100,800 industrial sensor records

---

# 🛠 Tech Stack

## Backend

- Python 3.10+
- FastAPI
- Uvicorn
- Scikit-learn
- Pandas
- NumPy
- HTTPX

---

## Frontend

- React (Vite)
- Recharts
- CSS Variables
- Responsive Dashboard

---

## AI & Machine Learning

- Isolation Forest (Anomaly Detection)
- Hourly Seasonality Energy Forecasting
- Rule-Based Predictive Maintenance
- Groq LLaMA 3 (8B) Agentic AI Advisor

---

## Data

- Fully Synthetic Industrial IoT Dataset
- 10 Simulated Machines
- Fault Injection
- Shift-based Energy Profiles
- CSV Export Support

---

# 📂 Project Structure

```text
wattrix/
│
├── backend/
│   ├── main.py
│   ├── simulator.py
│   ├── ai_models.py
│   ├── agent.py
│   └── requirements.txt
│
├── frontend/
│   └── src/
│       ├── WattrixDashboard.jsx
│       └── App.jsx
│
└── README.md
```

---

# ⚙️ Installation

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

---

## Backend Setup

```bash
cd backend

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

Backend:

```
http://localhost:8000
```

Swagger Documentation:

```
http://localhost:8000/docs
```

---

## Frontend Setup

```bash
cd frontend

npm install

npm install recharts

npm run dev
```

Frontend:

```
http://localhost:5173
```

---

# 🔑 Optional Groq API

Create a `.env` file inside the backend directory.

```env
GROQ_API_KEY=your_api_key_here
```

If no API key is provided, WATTRIX automatically switches to the built-in rule-based recommendation engine.

---

# 📡 API Endpoints

| Endpoint | Description |
|-----------|-------------|
| GET /api/live | Live readings of all machines |
| GET /api/anomalies | Detect machine anomalies |
| GET /api/maintenance | Predictive maintenance alerts |
| GET /api/forecast/{machine_id} | 24-hour energy forecast |
| GET /api/carbon | Carbon footprint analytics |
| GET /api/overview | Factory-wide overview |
| GET /api/agent | AI-powered recommendations |
| GET /docs | Swagger Documentation |

---

# 📊 Dashboard Modules

### 🏭 Overview

- Factory power consumption
- Active machines
- Total anomalies
- Carbon emissions
- Live power graph
- Machine status grid

---

### ⚡ Machines

- Voltage
- Current
- Power
- Power Factor
- Individual machine forecast

---

### 📈 Analytics

- Machine power comparison
- Anomaly scores
- Energy trends
- Historical visualization

---

### 🔧 Predictive Maintenance

- Machine health score
- Active alerts
- Fault severity
- Recommended maintenance actions

---

### 🌱 Carbon Analytics

- CO₂ emissions
- Monthly emission projections
- Per-machine carbon footprint
- India CEA emission factor

---

### 🤖 AI Energy Advisor

- AI-generated operational insights
- Optimization recommendations
- Machine-level analysis
- Rule-based fallback support

---

# 📁 Dataset

The simulator automatically generates **100,800 industrial sensor records**.

### Dataset Schema

| Column | Description |
|----------|------------|
| timestamp | Reading timestamp |
| machine_id | Machine ID |
| machine_name | Machine Name |
| machine_type | Equipment Type |
| voltage_V | Voltage |
| current_A | Current |
| power_kW | Active Power |
| power_factor | Power Factor |
| energy_kWh | Energy Consumption |
| co2_kg | Carbon Emission |
| status | Machine Status |
| anomaly_score | Isolation Forest Score |
| fault_type | Injected Fault |
| hour | Hour of Day |
| shift | Factory Shift |

---

# 🚨 Injected Fault Profiles

| Machine | Fault |
|----------|-------|
| Hydraulic Press | Bearing Wear |
| Compressor A | Overload |
| Lathe Machine | Voltage Sag |

---

# 🏗 Architecture

```text
              Simulated Sensors
             (10 Industrial Machines)
                      │
                      ▼
               simulator.py
                      │
                      ▼
             FastAPI Backend
                (main.py)
                      │
        ┌─────────────┴─────────────┐
        │                           │
        ▼                           ▼
 AI Models (ai_models.py)    AI Agent (agent.py)
        │                           │
        └─────────────┬─────────────┘
                      │
                      ▼
           React Dashboard (Frontend)
```

---

# 🎯 Key Highlights

- Machine-Level Energy Monitoring
- AI-Based Fault Detection
- Predictive Maintenance
- Energy Forecasting
- Carbon Emission Analytics
- Agentic AI Recommendations
- REST APIs with Swagger
- Interactive Industrial Dashboard
- Synthetic Industrial IoT Simulation

---

# 👥 Authors

**Team WATTRIX**

Developed as part of an **Industry-Level Hackathon 2026**.

---

## ⭐ If you found this project useful, don't forget to Star the repository!

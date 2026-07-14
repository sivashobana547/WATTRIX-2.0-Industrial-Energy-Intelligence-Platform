# WATTRIX 2.0 — Setup Guide (Windows)

## PROJECT STRUCTURE
```
wattrix/
├── backend/
│   ├── main.py          ← FastAPI server
│   ├── simulator.py     ← Sensor data simulator
│   ├── ai_models.py     ← Anomaly detection, forecasting, maintenance
│   ├── agent.py         ← Agentic AI (Groq)
│   └── requirements.txt
└── frontend/
    └── src/
        └── WattrixDashboard.jsx  ← Full React dashboard
```

---

## STEP 1 — Backend Setup

Open a terminal in the `wattrix/backend/` folder.

### Install Python dependencies
```
pip install -r requirements.txt
```

### (Optional) Set Groq API Key for real AI recommendations
1. Go to https://console.groq.com → Sign up free → Create API key
2. Create a `.env` file in backend/:
```
GROQ_API_KEY=your_key_here
```
If you skip this, the system uses rule-based recommendations automatically.

### Start the backend server
```
uvicorn main:app --reload --port 8000
```

You should see:
```
🔧 WATTRIX starting up...
✅ AI models initialized. WATTRIX ready.
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Test it (open in browser)
```
http://localhost:8000/api/live
http://localhost:8000/api/anomalies
http://localhost:8000/api/agent
http://localhost:8000/docs   ← Swagger UI (impressive for demos!)
```

---

## STEP 2 — Frontend Setup

Open a NEW terminal in the `wattrix/frontend/` folder.

### Create React app (first time only)
```
npx create-react-app . --template cra-template
```

OR with Vite (faster, recommended):
```
npm create vite@latest . -- --template react
```

### Install dependencies
```
npm install recharts
```

### Replace App.jsx/App.js with:
```jsx
import WattrixDashboard from './WattrixDashboard';
export default function App() {
  return <WattrixDashboard />;
}
```

### Copy WattrixDashboard.jsx into src/

### Start the frontend
```
npm start
```
OR for Vite:
```
npm run dev
```

Dashboard opens at: http://localhost:3000

---

## STEP 3 — Connect Frontend to Backend (Optional)

The dashboard works standalone with simulated data.

To connect to live backend data, in WattrixDashboard.jsx:
```js
const [apiMode, setApiMode] = useState(true);  // Change false → true
```

Make sure backend is running on port 8000.

---

## DEMO FLOW FOR JUDGES

1. Open dashboard → show Factory Overview with live updating data
2. Go to Machines tab → click Hydraulic Press or Compressor A → show anomaly
3. Go to Maintenance tab → show predictive alerts
4. Go to Analytics tab → show anomaly score bars
5. Go to Carbon tab → show CO2 emissions
6. Go to AI Advisor tab → show Agentic AI recommendations
7. Show backend Swagger at http://localhost:8000/docs

**Total demo time: ~5 minutes**

---

## API ENDPOINTS REFERENCE

| Endpoint | Description |
|---|---|
| GET /api/live | Real-time readings for all machines |
| GET /api/anomalies | Anomaly detection results |
| GET /api/maintenance | Predictive maintenance alerts |
| GET /api/forecast/{id} | 24-hour energy forecast |
| GET /api/carbon | Carbon footprint data |
| GET /api/overview | Full factory summary |
| GET /api/agent | AI recommendations |
| GET /docs | Swagger API documentation |

---

## WHAT IMPRESSES JUDGES

✅ Live auto-updating dashboard (every 3 seconds)
✅ 10 simulated industrial machines with realistic fault injection
✅ Isolation Forest anomaly detection (real ML)
✅ Energy forecasting (hourly seasonality model)
✅ Predictive maintenance with 5 rule categories
✅ Agentic AI advisor (Groq LLaMA / fallback rule engine)
✅ Carbon footprint with India grid emission factor
✅ FastAPI backend with full Swagger docs
✅ Industrial dark-theme UI that looks production-ready

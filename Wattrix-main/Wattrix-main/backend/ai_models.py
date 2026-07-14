import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# 1. ANOMALY DETECTION (Isolation Forest)
# ─────────────────────────────────────────────

class AnomalyDetector:
    def __init__(self, contamination=0.1):
        self.model = IsolationForest(
            contamination=contamination,
            n_estimators=100,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_fitted = False

    def fit(self, readings: list):
        """Train on a list of machine reading dicts"""
        features = self._extract_features(readings)
        scaled = self.scaler.fit_transform(features)
        self.model.fit(scaled)
        self.is_fitted = True

    def predict(self, readings: list):
        """Returns anomaly score (-1 = anomaly, 1 = normal) for each reading"""
        features = self._extract_features(readings)
        scaled = self.scaler.transform(features)
        scores = self.model.decision_function(scaled)
        labels = self.model.predict(scaled)
        # Normalize score to 0-1 (higher = more anomalous)
        norm_scores = 1 - (scores - scores.min()) / (scores.max() - scores.min() + 1e-9)
        results = []
        for i, r in enumerate(readings):
            results.append({
                "machine_id": r["machine_id"],
                "machine_name": r["machine_name"],
                "anomaly_score": round(float(norm_scores[i]), 3),
                "is_anomaly": bool(labels[i] == -1),
                "status": r["status"],
            })
        return results

    def _extract_features(self, readings):
        return np.array([
            [r["power_kw"], r["current"], r["voltage"], r["power_factor"]]
            for r in readings
        ])


# ─────────────────────────────────────────────
# 2. ENERGY FORECASTING (simple but effective)
# ─────────────────────────────────────────────

class EnergyForecaster:
    """
    Uses a weighted moving average + hourly seasonality pattern.
    No heavy ML dependency — runs instantly on simulated data.
    """

    def forecast(self, historical_readings: list, machine_id: int, hours_ahead: int = 24):
        df = pd.DataFrame(historical_readings)
        df = df[df["machine_id"] == machine_id].copy()
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        df = df.sort_values("timestamp")

        if len(df) < 12:
            return self._fallback_forecast(machine_id, hours_ahead)

        # Compute hourly averages
        df["hour"] = df["timestamp"].dt.hour
        hourly_avg = df.groupby("hour")["power_kw"].mean().to_dict()

        now = datetime.utcnow()
        forecast = []
        for h in range(hours_ahead):
            future_ts = now + timedelta(hours=h + 1)
            hour_key = future_ts.hour
            base = hourly_avg.get(hour_key, df["power_kw"].mean())
            noise = np.random.normal(0, base * 0.03)
            forecast.append({
                "timestamp": future_ts.isoformat(),
                "hour": hour_key,
                "predicted_power_kw": round(max(base + noise, 0.1), 3),
                "predicted_energy_kwh": round(max(base + noise, 0.1), 3),
            })
        return forecast

    def _fallback_forecast(self, machine_id: int, hours_ahead: int):
        from simulator import MACHINES
        machine = next((m for m in MACHINES if m["id"] == machine_id), None)
        baseline = machine["baseline_power"] if machine else 5.0
        now = datetime.utcnow()
        return [
            {
                "timestamp": (now + timedelta(hours=h + 1)).isoformat(),
                "hour": (now + timedelta(hours=h + 1)).hour,
                "predicted_power_kw": round(baseline * np.random.uniform(0.8, 1.1), 3),
                "predicted_energy_kwh": round(baseline * np.random.uniform(0.8, 1.1), 3),
            }
            for h in range(hours_ahead)
        ]


# ─────────────────────────────────────────────
# 3. PREDICTIVE MAINTENANCE
# ─────────────────────────────────────────────

MAINTENANCE_RULES = {
    "bearing_wear": {
        "condition": lambda r: r["current"] > r["power_kw"] * 1000 / (415 * 1.732 * 0.85) * 1.15,
        "message": "Abnormal current draw detected. Possible bearing wear or mechanical friction.",
        "severity": "warning",
        "action": "Schedule bearing inspection within 48 hours.",
    },
    "overload": {
        "condition": lambda r: r["power_kw"] > 0 and r["anomaly_score"] > 0.80,
        "message": "Machine operating above rated capacity. Overload condition detected.",
        "severity": "critical",
        "action": "Reduce machine load immediately. Inspect motor windings.",
    },
    "voltage_sag": {
        "condition": lambda r: r["voltage"] < 400,
        "message": "Low voltage detected. Risk of motor damage and reduced efficiency.",
        "severity": "warning",
        "action": "Check power supply and distribution panel connections.",
    },
    "power_factor_low": {
        "condition": lambda r: r["power_factor"] < 0.78,
        "message": "Low power factor detected. Reactive power losses are high.",
        "severity": "info",
        "action": "Install or check power factor correction capacitors.",
    },
    "idle_waste": {
        "condition": lambda r: r["status"] == "idle" and r["power_kw"] > 0.5,
        "message": "Machine is idle but consuming significant power.",
        "severity": "info",
        "action": "Schedule auto-shutdown during idle periods to save energy.",
    },
}

def run_predictive_maintenance(readings: list):
    alerts = []
    for r in readings:
        machine_alerts = []
        for rule_name, rule in MAINTENANCE_RULES.items():
            try:
                if rule["condition"](r):
                    machine_alerts.append({
                        "rule": rule_name,
                        "message": rule["message"],
                        "severity": rule["severity"],
                        "action": rule["action"],
                    })
            except Exception:
                pass
        if machine_alerts:
            alerts.append({
                "machine_id": r["machine_id"],
                "machine_name": r["machine_name"],
                "timestamp": r.get("timestamp", datetime.utcnow().isoformat()),
                "alerts": machine_alerts,
            })
    return alerts


# ─────────────────────────────────────────────
# 4. CARBON FOOTPRINT CALCULATOR
# ─────────────────────────────────────────────

INDIA_EMISSION_FACTOR = 0.82  # kg CO2 per kWh

def calculate_carbon(readings: list):
    total_energy = sum(r["energy_kwh"] for r in readings)
    total_co2 = total_energy * INDIA_EMISSION_FACTOR
    per_machine = {
        r["machine_name"]: {
            "energy_kwh": round(r["energy_kwh"], 4),
            "co2_kg": round(r["energy_kwh"] * INDIA_EMISSION_FACTOR, 4),
        }
        for r in readings
    }
    return {
        "total_energy_kwh": round(total_energy, 4),
        "total_co2_kg": round(total_co2, 4),
        "per_machine": per_machine,
        "equivalent_trees": round(total_co2 / 21.77, 2),  # avg tree absorbs 21.77 kg/year
    }

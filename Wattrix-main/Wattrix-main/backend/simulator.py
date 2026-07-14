import random
import math
import time
from datetime import datetime, timedelta
import json

MACHINES = [
    {"id": 1, "name": "CNC Machine A", "type": "CNC", "baseline_power": 5.2},
    {"id": 2, "name": "Hydraulic Press", "type": "Press", "baseline_power": 8.7},
    {"id": 3, "name": "Conveyor Motor", "type": "Motor", "baseline_power": 3.1},
    {"id": 4, "name": "HVAC Unit 1", "type": "HVAC", "baseline_power": 6.4},
    {"id": 5, "name": "Compressor A", "type": "Compressor", "baseline_power": 11.2},
    {"id": 6, "name": "Welding Robot", "type": "Robot", "baseline_power": 4.8},
    {"id": 7, "name": "Pump Station", "type": "Pump", "baseline_power": 2.9},
    {"id": 8, "name": "Lathe Machine", "type": "Lathe", "baseline_power": 3.6},
    {"id": 9, "name": "Cooling Tower", "type": "Cooling", "baseline_power": 7.3},
    {"id": 10, "name": "Assembly Robot", "type": "Robot", "baseline_power": 5.9},
]

# Fault profiles for predictive maintenance simulation
FAULT_PROFILES = {
    2: "bearing_wear",    # Hydraulic Press
    5: "overload",        # Compressor A
    8: "voltage_sag",     # Lathe Machine
}

def generate_machine_reading(machine, timestamp=None, fault_inject=True):
    if timestamp is None:
        timestamp = datetime.utcnow()

    machine_id = machine["id"]
    baseline = machine["baseline_power"]
    hour = timestamp.hour

    # Simulate shift pattern: low at night, high during day
    shift_factor = 0.3 if (hour < 6 or hour > 22) else (0.7 if hour < 8 else 1.0)

    # Add natural noise
    noise = random.gauss(0, 0.05 * baseline)
    power = baseline * shift_factor + noise

    voltage = random.gauss(415, 3)   # 3-phase industrial voltage
    current = power * 1000 / (voltage * 1.732 * 0.85)  # P = V * I * sqrt(3) * PF
    power_factor = random.gauss(0.85, 0.02)
    energy_kwh = power * (1 / 60)  # energy per minute in kWh

    status = "normal"
    anomaly_score = 0.0

    # Inject faults for specific machines
    if fault_inject and machine_id in FAULT_PROFILES:
        fault = FAULT_PROFILES[machine_id]
        if fault == "bearing_wear":
            # Gradual power increase + current spikes
            power *= random.uniform(1.15, 1.35)
            current *= random.uniform(1.2, 1.4)
            status = "warning"
            anomaly_score = random.uniform(0.65, 0.85)
        elif fault == "overload":
            # Sudden power spike
            if random.random() < 0.3:
                power *= random.uniform(1.4, 1.8)
                status = "critical"
                anomaly_score = random.uniform(0.85, 0.99)
        elif fault == "voltage_sag":
            voltage *= random.uniform(0.88, 0.94)
            status = "warning"
            anomaly_score = random.uniform(0.6, 0.75)

    # Idle machines
    if shift_factor == 0.3 and random.random() < 0.4:
        power *= 0.05
        current *= 0.05
        status = "idle"
        anomaly_score = 0.0

    co2_kg = energy_kwh * 0.82  # India grid emission factor

    return {
        "machine_id": machine_id,
        "machine_name": machine["name"],
        "machine_type": machine["type"],
        "timestamp": timestamp.isoformat(),
        "voltage": round(voltage, 2),
        "current": round(max(current, 0), 2),
        "power_kw": round(max(power, 0.1), 3),
        "energy_kwh": round(energy_kwh, 4),
        "power_factor": round(min(max(power_factor, 0.7), 1.0), 3),
        "status": status,
        "anomaly_score": round(anomaly_score, 3),
        "co2_kg": round(co2_kg, 4),
    }

def generate_all_machines(timestamp=None):
    return [generate_machine_reading(m, timestamp) for m in MACHINES]

def generate_historical_data(hours=24):
    """Generate historical data for the past N hours (one reading per minute)"""
    records = []
    now = datetime.utcnow()
    for minute in range(hours * 60):
        ts = now - timedelta(minutes=(hours * 60 - minute))
        for reading in generate_all_machines(ts):
            records.append(reading)
    return records

def get_machine_info():
    return MACHINES

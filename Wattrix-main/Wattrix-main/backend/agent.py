"""
Agentic AI Energy Advisor using Groq (free, fast LLM API)
Sign up free at: https://console.groq.com
"""

import os
import json
import httpx
from datetime import datetime

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-8b-8192"  # Free, fast model on Groq

SYSTEM_PROMPT = """You are WATTRIX AI — an expert industrial energy intelligence advisor.
You analyze real-time machine energy data from a factory and provide:
1. Clear diagnosis of energy anomalies
2. Specific maintenance recommendations
3. Energy optimization strategies
4. Cost-saving opportunities

Always be concise, technical, and actionable. Format your response as JSON with keys:
- summary: 1-2 sentence overview
- findings: list of key findings (max 4)
- recommendations: list of actionable recommendations (max 4)
- priority: "low" | "medium" | "high" | "critical"

Respond ONLY with valid JSON, no markdown, no extra text."""


async def get_agent_recommendations(readings: list, alerts: list, anomalies: list, carbon: dict):
    """Call Groq API to get intelligent energy recommendations"""

    if not GROQ_API_KEY:
        return _fallback_recommendations(readings, alerts, anomalies)

    # Build context for the agent
    critical_machines = [a for a in anomalies if a["is_anomaly"]]
    high_power = sorted(readings, key=lambda x: x["power_kw"], reverse=True)[:3]
    idle_machines = [r for r in readings if r["status"] == "idle"]

    context = {
        "timestamp": datetime.utcnow().isoformat(),
        "total_machines": len(readings),
        "anomalies_detected": len(critical_machines),
        "maintenance_alerts": len(alerts),
        "total_power_kw": round(sum(r["power_kw"] for r in readings), 2),
        "total_co2_kg": carbon.get("total_co2_kg", 0),
        "top_consumers": [{"name": m["machine_name"], "power_kw": m["power_kw"]} for m in high_power],
        "idle_machines": [r["machine_name"] for r in idle_machines],
        "critical_anomalies": [
            {"machine": a["machine_name"], "score": a["anomaly_score"]}
            for a in critical_machines
        ],
        "maintenance_needed": [
            {"machine": a["machine_name"], "issue": a["alerts"][0]["rule"] if a["alerts"] else "unknown"}
            for a in alerts[:3]
        ],
    }

    user_message = f"Analyze this factory energy data and provide recommendations:\n{json.dumps(context, indent=2)}"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    "max_tokens": 600,
                    "temperature": 0.3,
                },
            )
            result = response.json()
            content = result["choices"][0]["message"]["content"]
            # Clean up any markdown fences
            content = content.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
            return json.loads(content)
    except Exception as e:
        return _fallback_recommendations(readings, alerts, anomalies)


def _fallback_recommendations(readings, alerts, anomalies):
    """Rule-based fallback when no API key is set"""
    critical = [a for a in anomalies if a["anomaly_score"] > 0.8]
    warnings = [a for a in alerts if any(al["severity"] == "warning" for al in a.get("alerts", []))]
    idle = [r for r in readings if r["status"] == "idle"]
    total_power = sum(r["power_kw"] for r in readings)

    findings = []
    recommendations = []
    priority = "low"

    if critical:
        names = ", ".join(c["machine_name"] for c in critical[:2])
        findings.append(f"{len(critical)} machine(s) showing critical anomalies: {names}")
        recommendations.append(f"Immediately inspect {critical[0]['machine_name']} — anomaly score {critical[0]['anomaly_score']}")
        priority = "critical"

    if warnings:
        findings.append(f"{len(warnings)} machine(s) require maintenance attention")
        recommendations.append(f"Schedule maintenance for {warnings[0]['machine_name']}")
        if priority == "low":
            priority = "medium"

    if idle:
        idle_power = sum(r["power_kw"] for r in idle)
        findings.append(f"{len(idle)} machine(s) idle but consuming {round(idle_power, 2)} kW")
        recommendations.append("Enable auto-shutdown for idle machines to reduce wasted energy")

    top = sorted(readings, key=lambda x: x["power_kw"], reverse=True)
    if top:
        findings.append(f"Top consumer: {top[0]['machine_name']} at {top[0]['power_kw']} kW")
        recommendations.append(f"Audit {top[0]['machine_name']} for energy efficiency improvements")

    if not findings:
        findings = ["All machines operating within normal parameters"]
        recommendations = ["Continue monitoring. Consider scheduling next preventive maintenance cycle."]

    return {
        "summary": f"Factory consuming {round(total_power, 1)} kW total. {len(critical)} critical issue(s) detected.",
        "findings": findings,
        "recommendations": recommendations,
        "priority": priority,
    }

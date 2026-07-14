import { useState, useEffect, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";

// ── Mock data generator (runs without backend) ─────────────────────────────
const MACHINES = [
  { id: 1, name: "CNC Machine A",    type: "CNC",        baseline: 5.2 },
  { id: 2, name: "Hydraulic Press",  type: "Press",      baseline: 8.7 },
  { id: 3, name: "Conveyor Motor",   type: "Motor",      baseline: 3.1 },
  { id: 4, name: "HVAC Unit 1",      type: "HVAC",       baseline: 6.4 },
  { id: 5, name: "Compressor A",     type: "Compressor", baseline: 11.2 },
  { id: 6, name: "Welding Robot",    type: "Robot",      baseline: 4.8 },
  { id: 7, name: "Pump Station",     type: "Pump",       baseline: 2.9 },
  { id: 8, name: "Lathe Machine",    type: "Lathe",      baseline: 3.6 },
  { id: 9, name: "Cooling Tower",    type: "Cooling",    baseline: 7.3 },
  { id: 10, name: "Assembly Robot",  type: "Robot",      baseline: 5.9 },
];

const FAULT_MACHINES = new Set([2, 5, 8]);

function generateReading(machine, tick) {
  const hour = new Date().getHours();
  const shift = (hour < 6 || hour > 22) ? 0.3 : (hour < 8 ? 0.7 : 1.0);
  const noise = (Math.random() - 0.5) * 0.1 * machine.baseline;
  let power = machine.baseline * shift + noise;
  let voltage = 415 + (Math.random() - 0.5) * 6;
  let anomalyScore = 0;
  let status = "normal";

  if (FAULT_MACHINES.has(machine.id)) {
    if (machine.id === 2) { power *= 1.25; anomalyScore = 0.72; status = "warning"; }
    if (machine.id === 5 && Math.random() < 0.3) { power *= 1.6; anomalyScore = 0.91; status = "critical"; }
    if (machine.id === 8) { voltage *= 0.91; anomalyScore = 0.67; status = "warning"; }
  }
  if (shift === 0.3 && Math.random() < 0.4) { power *= 0.05; status = "idle"; anomalyScore = 0; }

  const current = (power * 1000) / (voltage * 1.732 * 0.85);
  return {
    id: machine.id, name: machine.name, type: machine.type,
    power: +Math.max(power, 0.1).toFixed(3),
    voltage: +voltage.toFixed(1),
    current: +Math.max(current, 0).toFixed(2),
    pf: +(0.85 + (Math.random() - 0.5) * 0.04).toFixed(3),
    energy: +(Math.max(power, 0.1) / 60).toFixed(4),
    co2: +(Math.max(power, 0.1) / 60 * 0.82).toFixed(4),
    anomalyScore: +anomalyScore.toFixed(3),
    status,
    time: new Date().toLocaleTimeString(),
  };
}

function generateAllMachines(tick = 0) {
  return MACHINES.map(m => generateReading(m, tick));
}

function generateForecast(machine) {
  return Array.from({ length: 24 }, (_, h) => {
    const hour = (new Date().getHours() + h + 1) % 24;
    const shift = (hour < 6 || hour > 22) ? 0.3 : (hour < 8 ? 0.7 : 1.0);
    return {
      hour: `${String(hour).padStart(2, "0")}:00`,
      predicted: +(machine.baseline * shift * (1 + (Math.random() - 0.5) * 0.08)).toFixed(2),
    };
  });
}

// ── Constants ──────────────────────────────────────────────────────────────
const STATUS_COLOR = { normal: "#22c55e", warning: "#f59e0b", critical: "#ef4444", idle: "#6b7280" };
const STATUS_BG    = { normal: "#052e16", warning: "#451a03", critical: "#450a0a", idle: "#1c1917" };
const CHART_COLORS = ["#06b6d4","#f59e0b","#22c55e","#a855f7","#ef4444","#3b82f6","#10b981","#f97316","#e879f9","#84cc16"];
const API = "http://localhost:8000/api";

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ label, value, unit, icon, color = "#06b6d4", sub }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
      border: `1px solid ${color}33`,
      borderRadius: 12, padding: "20px 24px",
      boxShadow: `0 0 20px ${color}11`,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#64748b", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
          <div style={{ color, fontSize: 28, fontWeight: 800, fontFamily: "'Space Mono', monospace" }}>
            {value}<span style={{ fontSize: 14, marginLeft: 4, color: "#94a3b8" }}>{unit}</span>
          </div>
          {sub && <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ fontSize: 28, opacity: 0.7 }}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const color = STATUS_COLOR[status] || "#6b7280";
  return (
    <span style={{
      background: STATUS_BG[status] || "#1c1917",
      color, border: `1px solid ${color}55`,
      borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      textTransform: "uppercase", letterSpacing: 1,
    }}>
      {status === "normal" ? "● " : status === "critical" ? "⚠ " : status === "warning" ? "▲ " : "◌ "}
      {status}
    </span>
  );
}

function MachineCard({ machine, onClick, selected }) {
  const c = STATUS_COLOR[machine.status];
  return (
    <div onClick={() => onClick(machine)} style={{
      background: selected ? "#1e293b" : "#0f172a",
      border: `1px solid ${selected ? c : c + "44"}`,
      borderRadius: 10, padding: "14px 16px", cursor: "pointer",
      boxShadow: selected ? `0 0 16px ${c}33` : "none",
      transition: "all 0.2s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 700 }}>{machine.name}</div>
          <div style={{ color: "#475569", fontSize: 10, marginTop: 2 }}>{machine.type}</div>
        </div>
        <StatusBadge status={machine.status} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
        <div><span style={{ color: "#475569" }}>Power </span><span style={{ color: "#06b6d4", fontFamily: "monospace", fontWeight: 700 }}>{machine.power} kW</span></div>
        <div><span style={{ color: "#475569" }}>Current </span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{machine.current} A</span></div>
        <div><span style={{ color: "#475569" }}>Voltage </span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{machine.voltage} V</span></div>
        <div><span style={{ color: "#475569" }}>PF </span><span style={{ color: "#94a3b8", fontFamily: "monospace" }}>{machine.pf}</span></div>
      </div>
      {machine.anomalyScore > 0.5 && (
        <div style={{ marginTop: 8, background: "#450a0a", borderRadius: 6, padding: "4px 8px" }}>
          <span style={{ color: "#fca5a5", fontSize: 10 }}>⚠ Anomaly Score: {(machine.anomalyScore * 100).toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}

function AlertCard({ machine }) {
  const severity = machine.status === "critical" ? "critical" : machine.anomalyScore > 0.6 ? "warning" : "info";
  const colors = { critical: "#ef4444", warning: "#f59e0b", info: "#3b82f6" };
  const c = colors[severity];
  return (
    <div style={{
      background: `${c}11`, border: `1px solid ${c}44`,
      borderRadius: 8, padding: "12px 14px", marginBottom: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{machine.name}</span>
        <span style={{ color: "#475569", fontSize: 10 }}>{machine.time}</span>
      </div>
      <div style={{ color: "#94a3b8", fontSize: 11 }}>
        {machine.status === "critical" && "⚠ Critical overload detected. Immediate inspection required."}
        {machine.status === "warning" && "▲ Abnormal energy consumption pattern. Schedule maintenance."}
        {machine.anomalyScore > 0.6 && machine.status === "normal" && "◉ Anomaly detected in power consumption curve."}
      </div>
    </div>
  );
}

// ── MAIN APP ───────────────────────────────────────────────────────────────

export default function WattrixDashboard() {
  const [readings, setReadings] = useState(() => generateAllMachines());
  const [history, setHistory] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [agentInsight, setAgentInsight] = useState(null);
  const [tick, setTick] = useState(0);
  const [apiMode, setApiMode] = useState(false);

  // Polling: refresh every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (apiMode) {
        try {
          const res = await fetch(`${API}/live`);
          const data = await res.json();
          if (data.machines) setReadings(data.machines.map(m => ({
            id: m.machine_id, name: m.machine_name, type: m.machine_type,
            power: m.power_kw, voltage: m.voltage, current: m.current,
            pf: m.power_factor, energy: m.energy_kwh, co2: m.co2_kg,
            anomalyScore: m.anomaly_score, status: m.status,
            time: new Date(m.timestamp).toLocaleTimeString(),
          })));
        } catch { setApiMode(false); }
      } else {
        const newReadings = generateAllMachines(tick);
        setReadings(newReadings);
        setTick(t => t + 1);
        // Rolling history for live chart
        setHistory(h => {
          const totalPower = newReadings.reduce((s, r) => s + r.power, 0);
          const entry = { time: new Date().toLocaleTimeString(), total: +totalPower.toFixed(2) };
          const updated = [...h, entry];
          return updated.length > 30 ? updated.slice(-30) : updated;
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [tick, apiMode]);

  // Load agent insights periodically
  useEffect(() => {
    const loadInsight = async () => {
      if (apiMode) {
        try {
          const res = await fetch(`${API}/agent`);
          setAgentInsight(await res.json());
        } catch {}
      } else {
        // Fallback rule-based insight
        const critical = readings.filter(r => r.status === "critical");
        const warnings = readings.filter(r => r.status === "warning");
        const idle = readings.filter(r => r.status === "idle");
        setAgentInsight({
          summary: `Factory consuming ${readings.reduce((s,r)=>s+r.power,0).toFixed(1)} kW. ${critical.length} critical, ${warnings.length} warnings.`,
          findings: [
            critical.length ? `${critical.map(r=>r.name).join(", ")} — critical overload detected` : "No critical faults",
            warnings.length ? `${warnings.map(r=>r.name).join(", ")} — showing anomalous power draw` : "All machines within tolerance",
            idle.length ? `${idle.length} machine(s) idle — ${idle.reduce((s,r)=>s+r.power,0).toFixed(2)} kW wasted` : "No idle waste detected",
            "Peak factory load occurring between 08:00–18:00 shift hours",
          ],
          recommendations: [
            critical.length ? `Inspect ${critical[0]?.name} immediately — motor overload risk` : "Run scheduled maintenance this week",
            warnings.length ? `Schedule bearing check on ${warnings[0]?.name} within 48 hours` : "All bearings nominal",
            idle.length ? "Configure auto-shutdown timers for idle machines" : "Energy utilization is optimal",
            "Consider power factor correction — estimated 8% energy cost savings",
          ],
          priority: critical.length ? "critical" : warnings.length ? "medium" : "low",
        });
      }
    };
    loadInsight();
    const i = setInterval(loadInsight, 15000);
    return () => clearInterval(i);
  }, [readings, apiMode]);

  const totalPower = readings.reduce((s, r) => s + r.power, 0);
  const totalCO2 = readings.reduce((s, r) => s + r.co2, 0) * 60; // per hour
  const anomalies = readings.filter(r => r.anomalyScore > 0.5);
  const criticals = readings.filter(r => r.status === "critical");
  const forecast = selectedMachine ? generateForecast(MACHINES.find(m => m.id === selectedMachine.id) || MACHINES[0]) : generateForecast(MACHINES[0]);

  const pieData = readings.map((r, i) => ({ name: r.name.split(" ")[0], value: r.power, color: CHART_COLORS[i] }));
  const priorityColor = { low: "#22c55e", medium: "#f59e0b", high: "#ef4444", critical: "#ef4444" };

  const tabs = [
    { id: "overview",     label: "Overview" },
    { id: "machines",     label: "Machines" },
    { id: "analytics",    label: "Analytics" },
    { id: "maintenance",  label: "Maintenance" },
    { id: "carbon",       label: "Carbon" },
    { id: "agent",        label: "AI Advisor" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#020817", color: "#e2e8f0",
      fontFamily: "'Inter', system-ui, sans-serif",
      width: "100%",
      overflowX: "hidden",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap');
        ::-webkit-scrollbar { width: 6px; background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020817; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(90deg, #020817 0%, #0f172a 50%, #020817 100%)",
        borderBottom: "1px solid #1e293b",
        padding: "0 32px", display: "flex", alignItems: "center",
        justifyContent: "space-between", height: 64,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, background: "linear-gradient(135deg, #06b6d4, #0ea5e9)",
            borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>⚡</div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, color: "#06b6d4", letterSpacing: 2 }}>WATTRIX</div>
            <div style={{ color: "#475569", fontSize: 10, letterSpacing: 3, textTransform: "uppercase" }}>Industrial Energy Intelligence</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
            <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 600 }}>LIVE</span>
          </div>
          <div style={{ color: "#475569", fontSize: 11 }}>{new Date().toLocaleString()}</div>
          {criticals.length > 0 && (
            <div style={{ background: "#450a0a", border: "1px solid #ef4444", borderRadius: 6, padding: "4px 12px", color: "#ef4444", fontSize: 11, fontWeight: 700 }}>
              ⚠ {criticals.length} CRITICAL ALERT{criticals.length > 1 ? "S" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: "#0f172a", borderBottom: "1px solid #1e293b",
        padding: "0 32px", display: "flex", gap: 4,
      }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            background: activeTab === tab.id ? "#1e293b" : "transparent",
            color: activeTab === tab.id ? "#06b6d4" : "#64748b",
            border: "none", borderBottom: activeTab === tab.id ? "2px solid #06b6d4" : "2px solid transparent",
            padding: "14px 20px", cursor: "pointer", fontSize: 13, fontWeight: 600,
            transition: "all 0.2s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Body */}
      <div style={{ padding: "24px 32px" }}>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
              <StatCard label="Total Power" value={totalPower.toFixed(1)} unit="kW" icon="⚡" color="#06b6d4" sub={`${readings.length} machines connected`} />
              <StatCard label="Active Machines" value={readings.filter(r=>r.status!=="idle").length} unit="" icon="🏭" color="#22c55e" sub={`${readings.filter(r=>r.status==="idle").length} idle`} />
              <StatCard label="Anomalies" value={anomalies.length} unit="" icon="⚠️" color={anomalies.length > 0 ? "#ef4444" : "#22c55e"} sub={criticals.length > 0 ? `${criticals.length} critical` : "All clear"} />
              <StatCard label="CO₂/Hour" value={(totalCO2 * 60).toFixed(2)} unit="kg" icon="🌿" color="#a855f7" sub="India grid factor: 0.82" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 24 }}>
              {/* Live Power Chart */}
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Live Total Power (kW)</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={history}>
                    <defs>
                      <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} />
                    <YAxis stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="total" stroke="#06b6d4" fill="url(#powerGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Power distribution pie */}
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Power Distribution</div>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 8 }}>
                  {pieData.slice(0, 6).map((d, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#64748b" }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Machine status grid */}
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Machine Status Grid</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {readings.map(m => (
                  <div key={m.id} onClick={() => { setSelectedMachine(m); setActiveTab("machines"); }} style={{
                    background: STATUS_BG[m.status] || "#0f172a",
                    border: `1px solid ${STATUS_COLOR[m.status]}44`,
                    borderRadius: 8, padding: "12px", cursor: "pointer",
                    textAlign: "center",
                  }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>
                      {m.type === "CNC" ? "⚙️" : m.type === "Press" ? "🔩" : m.type === "Motor" ? "🔄" : m.type === "HVAC" ? "❄️" : m.type === "Compressor" ? "💨" : m.type === "Robot" ? "🤖" : m.type === "Pump" ? "💧" : m.type === "Lathe" ? "🔧" : m.type === "Cooling" ? "🌡️" : "⚡"}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: 10, marginBottom: 4 }}>{m.name.split(" ").slice(0,2).join(" ")}</div>
                    <div style={{ color: STATUS_COLOR[m.status], fontSize: 13, fontWeight: 800, fontFamily: "monospace" }}>{m.power} kW</div>
                    <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MACHINES ── */}
        {activeTab === "machines" && (
          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>All Machines</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {readings.map(m => (
                  <MachineCard key={m.id} machine={m} onClick={setSelectedMachine} selected={selectedMachine?.id === m.id} />
                ))}
              </div>
            </div>
            <div>
              {selectedMachine ? (
                <div>
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 24, marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <div style={{ color: "#e2e8f0", fontSize: 20, fontWeight: 800 }}>{selectedMachine.name}</div>
                        <div style={{ color: "#475569", fontSize: 12 }}>Machine ID: {selectedMachine.id} · Type: {selectedMachine.type}</div>
                      </div>
                      <StatusBadge status={selectedMachine.status} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                      {[
                        { label: "Power", value: `${selectedMachine.power} kW`, color: "#06b6d4" },
                        { label: "Voltage", value: `${selectedMachine.voltage} V`, color: "#22c55e" },
                        { label: "Current", value: `${selectedMachine.current} A`, color: "#f59e0b" },
                        { label: "Power Factor", value: selectedMachine.pf, color: "#a855f7" },
                      ].map((item, i) => (
                        <div key={i} style={{ background: "#1e293b", borderRadius: 8, padding: "12px 16px" }}>
                          <div style={{ color: "#475569", fontSize: 10, marginBottom: 4 }}>{item.label}</div>
                          <div style={{ color: item.color, fontFamily: "monospace", fontSize: 18, fontWeight: 700 }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                    <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>24-Hour Power Forecast</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={forecast}>
                        <defs>
                          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="hour" stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} />
                        <YAxis stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                        <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                        <Area type="monotone" dataKey="predicted" stroke="#a855f7" fill="url(#forecastGrad)" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: "#334155", fontSize: 14 }}>
                  ← Select a machine to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === "analytics" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Machine Power Comparison (kW)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={readings.map(r => ({ name: r.name.replace(" ", "\n").split(" ")[0], power: r.power, fill: STATUS_COLOR[r.status] }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                  <Bar dataKey="power" radius={[4, 4, 0, 0]}>
                    {readings.map((r, i) => <Cell key={i} fill={STATUS_COLOR[r.status]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Anomaly Scores</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {readings.sort((a, b) => b.anomalyScore - a.anomalyScore).map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ color: "#64748b", fontSize: 11, width: 120, flexShrink: 0 }}>{r.name.split(" ")[0]}</div>
                      <div style={{ flex: 1, background: "#1e293b", borderRadius: 99, height: 6, overflow: "hidden" }}>
                        <div style={{
                          width: `${r.anomalyScore * 100}%`,
                          height: "100%",
                          background: r.anomalyScore > 0.8 ? "#ef4444" : r.anomalyScore > 0.5 ? "#f59e0b" : "#22c55e",
                          borderRadius: 99, transition: "width 0.5s",
                        }} />
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: 11, fontFamily: "monospace", width: 36 }}>{(r.anomalyScore * 100).toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
                <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>Live Power Trend</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={history.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#334155" tick={{ fontSize: 9, fill: "#475569" }} />
                    <YAxis stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── MAINTENANCE ── */}
        {activeTab === "maintenance" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Active Alerts</div>
              {readings.filter(r => r.status !== "normal" || r.anomalyScore > 0.5).length === 0 ? (
                <div style={{ background: "#052e16", border: "1px solid #22c55e44", borderRadius: 10, padding: 20, color: "#22c55e" }}>
                  ✅ All machines operating normally. No maintenance required.
                </div>
              ) : (
                readings.filter(r => r.status !== "normal" || r.anomalyScore > 0.5).map(m => (
                  <AlertCard key={m.id} machine={m} />
                ))
              )}
            </div>
            <div>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Machine Health Overview</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {readings.map(r => {
                  const health = r.anomalyScore > 0.8 ? 20 : r.anomalyScore > 0.5 ? 55 : r.status === "idle" ? 90 : 95 + Math.random() * 5;
                  const hColor = health < 40 ? "#ef4444" : health < 70 ? "#f59e0b" : "#22c55e";
                  return (
                    <div key={r.id} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                          <span style={{ color: hColor, fontSize: 12, fontWeight: 700 }}>{health.toFixed(0)}%</span>
                        </div>
                        <div style={{ background: "#1e293b", borderRadius: 99, height: 4 }}>
                          <div style={{ width: `${health}%`, height: "100%", background: hColor, borderRadius: 99, transition: "width 1s" }} />
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CARBON ── */}
        {activeTab === "carbon" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              <StatCard label="CO₂ This Hour" value={(totalCO2 * 60).toFixed(2)} unit="kg" icon="🌍" color="#22c55e" />
              <StatCard label="CO₂ Today (est)" value={(totalCO2 * 60 * 8).toFixed(1)} unit="kg" icon="📊" color="#f59e0b" sub="Based on 8hr shift" />
              <StatCard label="Trees Needed/Day" value={((totalCO2 * 60 * 8) / 21.77 * 365).toFixed(0)} unit="" icon="🌳" color="#a855f7" sub="To offset daily emissions" />
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>CO₂ Emissions Per Machine (kg/hr)</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={readings.map(r => ({ name: r.name.split(" ")[0], co2: +(r.co2 * 60).toFixed(3) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                  <YAxis stroke="#334155" tick={{ fontSize: 10, fill: "#475569" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8 }} formatter={(v) => [`${v} kg/hr`, "CO₂"]} />
                  <Bar dataKey="co2" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Emission Factor Info</div>
              <div style={{ color: "#64748b", fontSize: 13, lineHeight: 2 }}>
                <div>🔴 Emission factor used: <span style={{ color: "#06b6d4" }}>0.82 kg CO₂/kWh</span> (India Central Electricity Authority 2023)</div>
                <div>🌱 1 tree absorbs approx. <span style={{ color: "#22c55e" }}>21.77 kg CO₂/year</span></div>
                <div>⚡ Total factory energy now: <span style={{ color: "#f59e0b" }}>{totalPower.toFixed(2)} kW</span></div>
                <div>📅 Projected monthly CO₂: <span style={{ color: "#a855f7" }}>{(totalCO2 * 60 * 8 * 26).toFixed(0)} kg</span> (26 working days)</div>
              </div>
            </div>
          </div>
        )}

        {/* ── AI ADVISOR ── */}
        {activeTab === "agent" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{
              background: "linear-gradient(135deg, #0f172a, #1e293b)",
              border: `1px solid ${agentInsight ? priorityColor[agentInsight.priority] + "55" : "#1e293b"}`,
              borderRadius: 12, padding: 24,
              boxShadow: agentInsight ? `0 0 30px ${priorityColor[agentInsight.priority]}11` : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #06b6d4, #0ea5e9)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🤖</div>
                <div>
                  <div style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 16 }}>WATTRIX AI Energy Advisor</div>
                  <div style={{ color: "#475569", fontSize: 11 }}>Powered by Groq LLaMA · Updates every 15 seconds</div>
                </div>
                {agentInsight && (
                  <div style={{ marginLeft: "auto", background: `${priorityColor[agentInsight.priority]}22`, border: `1px solid ${priorityColor[agentInsight.priority]}`, borderRadius: 6, padding: "4px 12px", color: priorityColor[agentInsight.priority], fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
                    {agentInsight.priority} priority
                  </div>
                )}
              </div>

              {agentInsight ? (
                <>
                  <div style={{ background: "#020817", borderRadius: 8, padding: 16, marginBottom: 16, borderLeft: `3px solid #06b6d4` }}>
                    <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>SUMMARY</div>
                    <div style={{ color: "#e2e8f0", fontSize: 14 }}>{agentInsight.summary}</div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>🔍 KEY FINDINGS</div>
                      {agentInsight.findings?.map((f, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <div style={{ color: "#475569", fontSize: 11, flexShrink: 0 }}>{i + 1}.</div>
                          <div style={{ color: "#cbd5e1", fontSize: 13 }}>{f}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div style={{ color: "#94a3b8", fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>⚡ RECOMMENDATIONS</div>
                      {agentInsight.recommendations?.map((r, i) => (
                        <div key={i} style={{ background: "#1e293b", borderRadius: 6, padding: "8px 12px", marginBottom: 6, display: "flex", gap: 8, alignItems: "flex-start" }}>
                          <span style={{ color: "#06b6d4", fontSize: 11 }}>→</span>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ color: "#334155", textAlign: "center", padding: 40 }}>Analyzing factory data...</div>
              )}
            </div>

            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 20 }}>
              <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Real-time Machine Intelligence</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {readings.filter(r => r.status !== "normal" || r.anomalyScore > 0.3).map(r => (
                  <div key={r.id} style={{ background: "#1e293b", borderRadius: 8, padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{r.name}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div style={{ color: "#64748b", fontSize: 11 }}>
                      {r.status === "critical" && "⚠ Overload — Reduce load immediately, inspect windings"}
                      {r.status === "warning" && "▲ Abnormal draw — Schedule maintenance within 48h"}
                      {r.status === "idle" && "◌ Idle — Enable auto-shutdown to save energy"}
                      {r.anomalyScore > 0.3 && r.status === "normal" && `◉ Anomaly score ${(r.anomalyScore*100).toFixed(0)}% — Monitor closely`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

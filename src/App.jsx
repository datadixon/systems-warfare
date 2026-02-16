import { useState, useEffect, useCallback, useRef } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

/*
 * ═══════════════════════════════════════════════════════════════════════
 *  SYSTEMS WARFARE: AUTONOMOUS DECISION ARCHITECTURE
 *  A Professional Military Education Simulation
 *
 *  Designed to surface the systems-level dynamics of autonomous warfare:
 *  - The speed-control paradox (delegate for tempo vs retain for judgment)
 *  - Cross-domain cascade effects
 *  - Nonlinear trust dynamics in human-machine teaming
 *  - The say-do gap between intended doctrine and actual behavior
 *
 *  Built on research from RAND, CSIS, DARPA, and PLA doctrine analysis.
 * ═══════════════════════════════════════════════════════════════════════
 */

// ─── THEME ───

const T = {
  bg: "#060c1a", surface: "#0c1829", surfaceAlt: "#101f35",
  border: "#1a2d4a", borderLight: "#243752",
  gold: "#d4a843", goldDim: "#a07c2e", goldGlow: "#d4a84340",
  blue: "#3b9ddd", blueDim: "#2a6d9e",
  red: "#d94444", green: "#3bba6f", orange: "#d98e3b",
  text: "#c4d0de", textDim: "#7a8b9e", textBright: "#e8eef6",
  mono: "'Fira Code', 'Courier New', monospace",
  heading: "'Oswald', 'Arial Narrow', sans-serif",
  body: "'Source Sans 3', 'Segoe UI', sans-serif",
};

const FONTS_CSS = `@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Oswald:wght@300;400;500;600;700&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');`;

// ─── AUTONOMY LEVELS (Sheridan Scale adapted) ───

const AUTO = [
  { lv: 1, name: "Full Human", desc: "All decisions require explicit manual approval.", spd: 0.15, risk: 0.04, esc: 0.00 },
  { lv: 2, name: "Human Selects", desc: "AI presents options. Human selects and authorizes.", spd: 0.28, risk: 0.07, esc: 0.01 },
  { lv: 3, name: "Human Approves", desc: "AI recommends one COA. Human approves or rejects.", spd: 0.42, risk: 0.11, esc: 0.02 },
  { lv: 4, name: "Human Consent", desc: "AI acts unless human vetoes within window.", spd: 0.58, risk: 0.18, esc: 0.04 },
  { lv: 5, name: "Human Monitors", desc: "AI executes autonomously. Human observes and can intervene.", spd: 0.74, risk: 0.28, esc: 0.06 },
  { lv: 6, name: "AI Informs", desc: "AI acts independently and reports after the fact.", spd: 0.87, risk: 0.40, esc: 0.09 },
  { lv: 7, name: "AI Autonomous", desc: "Fully autonomous. Human out of loop.", spd: 0.96, risk: 0.55, esc: 0.14 },
];

const DOMAINS = {
  air:      { name: "Air",      icon: "✈", color: "#3b9ddd", desc: "Fighters, CCA drones, air defense" },
  maritime: { name: "Maritime", icon: "⚓", color: "#4dc9f6", desc: "Surface fleet, submarines, USVs/UUVs" },
  cyber:    { name: "Cyber",    icon: "⟁", color: "#d98e3b", desc: "Network ops, offensive cyber, EW" },
  space:    { name: "Space",    icon: "◉", color: "#b07cd8", desc: "Satellite ISR, GPS, SATCOM" },
  land:     { name: "Land",     icon: "⬡", color: "#3bba6f", desc: "Ground forces, SHORAD, logistics" },
};
const DK = Object.keys(DOMAINS);

// ─── CRITICAL DECISIONS (timed dilemmas — the simulation's pedagogical core) ───

const CRITICAL_DECISIONS = [
  {
    title: "PRE-AUTHORIZE ENGAGEMENT RULES",
    context: "Before forces enter the threat envelope, you must establish Rules of Engagement for autonomous systems. This decision sets the baseline for all subsequent autonomous action.",
    timer: 45,
    options: [
      { id: "restrictive", label: "RESTRICTIVE", desc: "All autonomous lethal action requires explicit human authorization.", effects: { trust: 8, escalation: -2, speedMod: -0.12, riskMod: -0.04 }, color: T.green },
      { id: "conditional", label: "CONDITIONAL", desc: "Autonomous engagement of confirmed military targets. Human approval for ambiguous contacts.", effects: { trust: 0, escalation: 0, speedMod: 0, riskMod: 0 }, color: T.gold },
      { id: "permissive", label: "PERMISSIVE", desc: "Autonomous systems authorized for independent engagement within ROE parameters.", effects: { trust: -6, escalation: 8, speedMod: 0.10, riskMod: 0.06 }, color: T.red },
    ],
    timeoutId: "restrictive", timeoutPenalty: "Indecision defaults to most restrictive rules — your forces enter the battlespace at maximum latency.",
  },
  {
    title: "PLA USV COLLISION INCIDENT",
    context: "An AI-coordinated PLA unmanned surface vessel has rammed a Philippine supply ship in disputed waters. Manila demands a US response. Beijing denies involvement, claims the USV acted autonomously outside command authority. 35 seconds to decide.",
    timer: 35,
    options: [
      { id: "diplomatic", label: "DIPLOMATIC PROTEST", desc: "File formal protest. Maintain defensive posture. Signal restraint.", effects: { trust: 2, escalation: -4, speedMod: 0, riskMod: 0, political: -8, alliance: -5 }, color: T.blue },
      { id: "showforce", label: "SHOW OF FORCE", desc: "Deploy autonomous surface patrol to enforce freedom of navigation.", effects: { trust: 0, escalation: 6, speedMod: 0, riskMod: 0.03, political: 5, alliance: 4 }, color: T.gold },
      { id: "matchauto", label: "MATCH AUTONOMY", desc: "Deploy own autonomous USV swarm to mirror PLA operations. Escalate symmetrically.", effects: { trust: -4, escalation: 12, speedMod: 0.05, riskMod: 0.06, political: 3, alliance: -6 }, color: T.red },
    ],
    timeoutId: "diplomatic", timeoutPenalty: "No response issued. PLA interprets silence as acquiescence. Adversary boldness increases.",
  },
  {
    title: "47 ASBMs INBOUND — 22 SECONDS TO IMPACT",
    context: "USS Chancellorsville Aegis AI detects 47 anti-ship ballistic missiles targeting the strike group. AI recommends weapons-free autonomous engagement. Full human authorization chain requires 14 seconds. Missiles impact in 22. You have 15 seconds to decide.",
    timer: 15,
    options: [
      { id: "weaponsfree", label: "WEAPONS FREE", desc: "Full autonomous engagement authority. AI engages all identified threats.", effects: { trust: -3, escalation: 12, speedMod: 0.15, riskMod: 0.08, effectiveness: 0.92 }, color: T.red },
      { id: "selective", label: "SELECTIVE AUTO", desc: "AI engages confirmed military. Flags ambiguous contacts. 3-5 may get through.", effects: { trust: 2, escalation: 6, speedMod: 0.06, riskMod: 0.03, effectiveness: 0.74 }, color: T.gold },
      { id: "manual", label: "MANUAL AUTH", desc: "Commander authorizes each engagement. 8-12 missiles get through. Ship damage likely.", effects: { trust: 6, escalation: 2, speedMod: -0.08, riskMod: -0.04, effectiveness: 0.45 }, color: T.green },
    ],
    timeoutId: "manual", timeoutPenalty: "TIMEOUT: No authorization issued in time. Aegis defaults to point-defense only. Multiple impacts on strike group. 347 casualties.",
  },
  {
    title: "AUTONOMOUS STRIKE HIT CIVILIAN VESSELS",
    context: "Post-strike analysis confirms autonomous USV swarm engaged 3 civilian cargo ships misidentified as PLA landing craft. 89 civilian casualties. International media has the footage. Your autonomous systems await new engagement parameters.",
    timer: 30,
    options: [
      { id: "suspend", label: "SUSPEND AUTO OPS", desc: "Pull all autonomous systems to human-in-the-loop. Accept massive tempo loss.", effects: { trust: 18, escalation: -8, speedMod: -0.20, riskMod: -0.10, political: 8, alliance: 10 }, color: T.green },
      { id: "restrict", label: "RESTRICT & CONTINUE", desc: "Tighten engagement parameters. Require dual-sensor confirmation. Maintain ops tempo.", effects: { trust: 6, escalation: -2, speedMod: -0.06, riskMod: -0.04, political: 2, alliance: 3 }, color: T.gold },
      { id: "maintain", label: "MAINTAIN TEMPO", desc: "Accept incident cost. War demands speed. Autonomous operations continue at current level.", effects: { trust: -15, escalation: 8, speedMod: 0.05, riskMod: 0.03, political: -18, alliance: -15 }, color: T.red },
    ],
    timeoutId: "restrict", timeoutPenalty: "No guidance issued. Field commanders default to mixed response — some units suspend, others continue. Inconsistent posture.",
  },
  {
    title: "AI RECOMMENDS PREEMPTIVE STRIKE — 180 SECOND WINDOW",
    context: "Your autonomous ISR network detects PLA second-wave amphibious staging. AI calculates 87% probability of launch within 3 hours. Recommends immediate preemptive strike on staging areas. Window closes in 180 seconds as vessels disperse. Full human review requires 12 minutes.",
    timer: 20,
    options: [
      { id: "fullstrike", label: "AUTONOMOUS STRIKE", desc: "Delegate preemptive strike authority to autonomous systems. Maximum effect.", effects: { trust: -8, escalation: 25, speedMod: 0.12, riskMod: 0.12, effectiveness: 0.90 }, color: T.red },
      { id: "partialstrike", label: "VERIFIED PARTIAL", desc: "Strike confirmed military targets only with human verification. Accept reduced effect.", effects: { trust: 4, escalation: 10, speedMod: 0, riskMod: 0.02, effectiveness: 0.55 }, color: T.gold },
      { id: "holdfire", label: "HOLD FIRE", desc: "Reject AI recommendation. Prepare defensive posture. Second wave launches.", effects: { trust: 8, escalation: -3, speedMod: -0.10, riskMod: -0.06, effectiveness: 0.20 }, color: T.green },
    ],
    timeoutId: "holdfire", timeoutPenalty: "TIMEOUT: Window closed. PLA second wave launches unopposed. Defensive preparations inadequate. Taiwan's western beaches under assault.",
  },
  {
    title: "CEASEFIRE TERMS OFFERED",
    context: "Beijing proposes ceasefire through backchannels. Terms: mutual withdrawal from the Strait, Taiwan maintains status quo, both sides suspend autonomous operations in the AOR. Your AI assesses this as a 40/60 proposition — favorable on balance but allows PLA to reconstitute.",
    timer: 40,
    options: [
      { id: "accept", label: "ACCEPT TERMS", desc: "End hostilities on current terms. Lock in current position. Begin diplomatic process.", effects: { trust: 5, escalation: -20, political: 15, alliance: 12 }, color: T.green },
      { id: "counter", label: "COUNTER-PROPOSE", desc: "Demand PLA withdraw beyond median line. Verifiable autonomous weapons moratorium.", effects: { trust: 0, escalation: 5, political: 8, alliance: 6 }, color: T.gold },
      { id: "press", label: "PRESS ADVANTAGE", desc: "Reject ceasefire. Use autonomous systems to press remaining advantage.", effects: { trust: -10, escalation: 22, political: -20, alliance: -18 }, color: T.red },
    ],
    timeoutId: "accept", timeoutPenalty: "No response to ceasefire offer. Beijing interprets silence as acceptance. Terms default to their proposal.",
  },
];

// ─── SCENARIO TURNS ───

const TURNS = [
  { title: "CRISIS INITIATION", date: "D-72 Hours",
    briefing: "PLA forces conduct 'exercises' at unprecedented scale. INDOPACOM shifts to WATCHCON 1. Intelligence confirms amphibious preparations at Fujian ports. Your carrier strike groups transit from Japan. The PLA's AI-enabled reconnaissance network has established persistent surveillance across the First Island Chain.",
    adversary: "PLA deploys AI-coordinated ISR constellation. 200+ fishing militia vessels enter the Strait. Cyber probing intensifies.",
    events: [
      { type: "intel", text: "NSA intercepts confirm PLA Eastern Theater Command activates 'System Destruction Warfare' protocols." },
      { type: "logistics", text: "Pre-positioned stocks at Guam: 847 LRASM, 2,100 SM-6, 340 Tomahawk. 72-hour expenditure rate under contested conditions: 40% of total." },
    ],
    tempo: 0.45, crisis: 0.3, commsDelta: -5 },
  { title: "GRAY ZONE ESCALATION", date: "D-48 Hours",
    briefing: "PLA autonomous maritime swarms establish a de facto exclusion zone. Chinese coast guard coordinated by AI conduct aggressive intercepts. Satellite imagery shows landing craft loading at multiple ports. Your autonomous ISR assets are being aggressively jammed.",
    adversary: "PLA activates AI-coordinated EW across Taiwan Strait. GPS degradation begins. Autonomous USV swarms establish maritime picket.",
    events: [
      { type: "cyber", text: "Chinese cyber units penetrate INDOPACOM logistics network. Supply chain tracking compromised for 4 hours before detection." },
      { type: "political", text: "Congress demands briefing. Media reports 'autonomous weapons confrontation.' Public pressure mounts for both action and restraint." },
    ],
    tempo: 0.6, crisis: 0.5, commsDelta: -12 },
  { title: "THE FIRST SALVO", date: "D-Day",
    briefing: "PLA launches coordinated strikes against Taiwan's air defenses using AI-targeted cruise missiles. Cyber attacks disable portions of Taiwan's power grid. Autonomous drone swarms numbering in thousands begin SEAD. The adversary achieves multi-domain convergence at a speed your traditional C2 cannot match.",
    adversary: "1,200+ ballistic/cruise missiles at Taiwan. AI-coordinated drone swarms (3,000+ platforms) conduct SEAD. Cyber attacks target allied SATCOM.",
    events: [
      { type: "cascade", text: "PLA cyber attack degrades allied space-based ISR by 40%. Autonomous targeting systems now operate with degraded sensor input." },
      { type: "trust", text: "Autonomous air defense at Kadena correctly intercepts 23 of 24 cruise missiles. The 24th impacts a fuel depot." },
    ],
    tempo: 0.82, crisis: 0.8, commsDelta: -25 },
  { title: "CONTESTED CONVERGENCE", date: "D+2",
    briefing: "Battle for air and maritime superiority fully joined. PLA amphibious forces loading under AI-coordinated air cover. Communications severely degraded — autonomous systems at higher delegation continue; those requiring human approval experience critical delays.",
    adversary: "PLA AI coordinates simultaneous attacks across all five domains. Autonomous sub hunter-killer groups engage allied SSNs. AI-directed EW creates 6-minute radar blind spots.",
    events: [
      { type: "dilemma", text: "Your autonomous cyber AI identifies a zero-day exploit in PLA C2. Exploitation could disable enemy coordination for hours — risks escalation to critical infrastructure." },
      { type: "logistics", text: "LRASM stocks at 52%. Resupply convoy 96 hours out. Autonomous logistics AI recommends rationing that cuts strike capacity 30%." },
    ],
    tempo: 0.88, crisis: 0.9, commsDelta: -8 },
  { title: "THE AUTONOMOUS CRISIS", date: "D+5",
    briefing: "Critical incident: allied autonomous system engaged a target subsequently identified as a PLA hospital ship. Beijing threatens nuclear escalation. Simultaneously, your defense network detects second-wave preparations. The AI recommends immediate preemptive strike. You have seconds.",
    adversary: "PLA exploits hospital ship incident for information warfare. Second amphibious wave assembles. Nuclear-capable DF-26 units disperse from garrisons.",
    events: [
      { type: "critical", text: "FLASH: Hospital ship engagement confirmed. 340 PLA casualties. Beijing issues nuclear ultimatum — 6-hour deadline." },
      { type: "cascade", text: "Alliance fracturing. Japan suspends Kadena access. Australia pulls naval assets to defensive posture." },
    ],
    tempo: 0.93, crisis: 1.0, commsDelta: 5 },
  { title: "STRATEGIC RECKONING", date: "D+8",
    briefing: "The crisis reaches its culminating point. Your delegation decisions throughout this conflict have produced cascading consequences across every domain. The balance between speed and control has determined whether this resolves through ceasefire or wider war.",
    adversary: "PLA AI calculates force correlation. Decision point: press or accept pause. PLA leadership overrides AI recommendation based on political calculation.",
    events: [
      { type: "resolution", text: "Backchannel communications established. Both sides assess damage and calculate positions." },
      { type: "reflection", text: "The gap between your intended doctrine and actual employment under pressure is now quantifiable." },
    ],
    tempo: 0.65, crisis: 0.6, commsDelta: 15 },
];

// ─── GAME ENGINE ───

function computeResults(state, turnData, critChoice) {
  const res = { domains: {}, global: {}, cascades: [], incidents: [] };
  let totEff = 0, escD = 0, trustD = 0;

  // Adversary adaptation: target player's weakest domain
  const weakest = DK.reduce((a, b) => state.domains[a].readiness < state.domains[b].readiness ? a : b);

  DK.forEach(dk => {
    const d = state.domains[dk];
    const a = AUTO[d.autonomyLevel];
    const pressure = turnData.tempo * turnData.crisis * (dk === weakest ? 1.25 : 1.0);
    const comms = state.commsIntegrity / 100;

    // Speed effectiveness
    const spdEff = Math.min(1.4, (a.spd + (critChoice?.effects?.speedMod || 0)) / Math.max(pressure, 0.1));

    // Comms-adjusted: low autonomy + low comms = severely degraded
    const commsAdj = d.autonomyLevel < 3 ? comms * 0.8 : Math.max(comms, 0.45 + d.autonomyLevel * 0.08);

    // Trust factor (nonlinear — below 30 trust causes steep penalty)
    const trustF = state.trust > 30 ? state.trust / 100 : (state.trust / 100) * 0.6;

    // Resource factor
    const resF = Math.min(state.resources.ammunition / 40, 1) * Math.min(state.resources.fuel / 35, 1);

    const rawEff = spdEff * commsAdj * trustF * resF;
    const noise = 0.82 + Math.random() * 0.36; // fog of war randomness
    const eff = Math.max(0.05, Math.min(1.0, rawEff * noise));
    totEff += eff;

    // Incident probability: autonomy level * pressure * risk modifier * (inverse of comms clarity)
    const riskMod = critChoice?.effects?.riskMod || 0;
    const incProb = (a.risk + riskMod) * pressure * (1.05 - comms * 0.25);
    const hasInc = Math.random() < incProb && d.autonomyLevel >= 3;

    if (hasInc) {
      trustD -= 10 + d.autonomyLevel * 4; // nonlinear: higher autonomy = worse trust hit
      escD += 6 + d.autonomyLevel * 2;
      res.incidents.push({ domain: dk, autoLv: d.autonomyLevel + 1, severity: d.autonomyLevel >= 5 ? "CRITICAL" : "MODERATE",
        text: `Autonomous ${DOMAINS[dk].name} system engaged unverified target at autonomy level ${d.autonomyLevel + 1}. Collateral damage reported.` });
    }

    escD += a.esc * pressure * 12;
    if (!hasInc && d.autonomyLevel >= 4) trustD += 1.5; // trust builds slowly

    const rdyD = -pressure * 9 * (1 - eff * 0.55) + (eff > 0.65 ? 3 : -4);
    const thrD = pressure * 11 - eff * 13;

    res.domains[dk] = {
      effectiveness: Math.round(eff * 100),
      readinessDelta: Math.round(rdyD),
      threatDelta: Math.round(thrD),
      incident: hasInc,
      tempo: spdEff > 0.85 ? "MATCHED" : spdEff > 0.55 ? "LAGGING" : "OUTPACED",
      fogConfidence: Math.round(50 + comms * 30 + (d.autonomyLevel >= 4 ? 15 : 0) + Math.random() * 10), // fog of war: how confident are we in this number?
    };
  });

  // ─── Cascades ───
  const spEff = res.domains.space?.effectiveness || 50;
  const cyEff = res.domains.cyber?.effectiveness || 50;
  const arEff = res.domains.air?.effectiveness || 50;
  const mrEff = res.domains.maritime?.effectiveness || 50;

  if (spEff < 45) {
    res.cascades.push({ from: "Space", to: "Air", text: "Degraded space ISR reduces air targeting accuracy", impact: -12 });
    res.cascades.push({ from: "Space", to: "Maritime", text: "GPS degradation reduces autonomous USV navigation precision", impact: -8 });
  }
  if (cyEff < 50) {
    res.cascades.push({ from: "Cyber", to: "All C2", text: "Compromised networks increase latency across all command systems", impact: -6 });
  }
  if (arEff > 65 && mrEff > 65) {
    res.cascades.push({ from: "Air + Maritime", to: "Land", text: "Air-maritime superiority enables ground force resupply and reinforcement", impact: 16 });
  }
  if (mrEff < 40) {
    res.cascades.push({ from: "Maritime", to: "Land", text: "PLA establishes sea control — amphibious assault window opens", impact: -22 });
  }
  if (arEff < 35 && spEff < 40) {
    res.cascades.push({ from: "Air + Space", to: "All", text: "Loss of air/space superiority — adversary achieves information dominance", impact: -18 });
  }

  const avgEff = totEff / 5;
  const ammoExp = Math.round(turnData.crisis * 16 + avgEff * 6);
  const fuelExp = Math.round(turnData.crisis * 9 + 4);
  const hasAnyInc = res.incidents.length > 0;

  // Apply critical decision effects
  const cdEsc = critChoice?.effects?.escalation || 0;
  const cdTrust = critChoice?.effects?.trust || 0;
  const cdPol = critChoice?.effects?.political || 0;
  const cdAll = critChoice?.effects?.alliance || 0;

  res.global = {
    trustDelta: Math.round(trustD + cdTrust),
    escalationDelta: Math.round(Math.max(escD, turnData.crisis * 4) + cdEsc),
    commsDelta: turnData.commsDelta,
    ammoDelta: -ammoExp, fuelDelta: -fuelExp,
    politicalDelta: (hasAnyInc ? -14 : (avgEff > 0.65 ? 4 : -6)) + cdPol,
    allianceDelta: (hasAnyInc ? -10 : (escD > 18 ? -7 : 3)) + cdAll,
    overallEff: Math.round(avgEff * 100),
  };
  return res;
}

// ─── UI PRIMITIVES ───

const Panel = ({ title, children, accent = T.gold, style }) => (
  <div style={{ background: `linear-gradient(135deg, ${T.surface}, ${T.bg})`, border: `1px solid ${accent}22`, borderRadius: 5, padding: "13px 15px", ...style }}>
    {title && <div style={{ borderBottom: `1px solid ${accent}18`, paddingBottom: 7, marginBottom: 9 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: accent, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.14em" }}>{title}</span>
    </div>}
    {children}
  </div>
);

const Bar_ = ({ label, val, max = 100, color, h = 7 }) => {
  const p = Math.max(0, Math.min(100, (val / max) * 100));
  const c = color || (p > 55 ? T.green : p > 28 ? T.orange : T.red);
  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ fontSize: 10, color: c, fontFamily: T.mono, fontWeight: 600 }}>{Math.round(val)}</span>
      </div>
      <div style={{ width: "100%", height: h, background: T.bg, borderRadius: 2, overflow: "hidden", border: `1px solid ${T.border}` }}>
        <div style={{ width: `${p}%`, height: "100%", background: `linear-gradient(90deg, ${c}99, ${c})`, borderRadius: 2, transition: "width 0.7s ease" }} />
      </div>
    </div>
  );
};

const Btn = ({ children, onClick, color = T.gold, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? T.bg : `${color}12`, border: `1px solid ${disabled ? T.border : color}`,
    color: disabled ? T.textDim : color, padding: "10px 22px", borderRadius: 4,
    fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
    textTransform: "uppercase", cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.15s", ...style,
  }}>{children}</button>
);

const Delta = ({ v }) => v ? <span style={{ fontSize: 10, fontFamily: T.mono, fontWeight: 600, color: v > 0 ? T.green : T.red, marginLeft: 5 }}>{v > 0 ? "+" : ""}{v}</span> : null;

// ─── MAIN COMPONENT ───

export default function SystemsWarfare() {
  const [phase, setPhase] = useState("title");
  const [turn, setTurn] = useState(0);
  const [doctrine, setDoctrine] = useState(null); // doctrine pledge (set once)
  const [critTimer, setCritTimer] = useState(0);
  const [critChoice, setCritChoice] = useState(null);
  const [critTimedOut, setCritTimedOut] = useState(false);
  const [execStep, setExecStep] = useState(0);
  const [results, setResults] = useState(null);
  const [showCascades, setShowCascades] = useState(false);
  const timerRef = useRef(null);
  const execRef = useRef(null);

  const [gs, setGs] = useState({
    domains: {
      air: { autonomyLevel: 2, readiness: 85, threat: 20 },
      maritime: { autonomyLevel: 2, readiness: 80, threat: 25 },
      cyber: { autonomyLevel: 3, readiness: 70, threat: 30 },
      space: { autonomyLevel: 1, readiness: 90, threat: 15 },
      land: { autonomyLevel: 1, readiness: 75, threat: 20 },
    },
    resources: { ammunition: 100, fuel: 100, politicalCapital: 80, allianceCohesion: 85 },
    trust: 65, escalation: 10, commsIntegrity: 95,
    history: [], critHistory: [],
  });

  const td = TURNS[turn];
  const cd = CRITICAL_DECISIONS[turn];

  // ─── CRITICAL DECISION TIMER ───
  const startCritTimer = useCallback(() => {
    setCritTimer(cd.timer);
    setCritChoice(null);
    setCritTimedOut(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCritTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCritTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cd]);

  const makeCritChoice = (opt) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setCritChoice(opt);
  };

  const confirmCritical = () => {
    const chosen = critTimedOut
      ? cd.options.find(o => o.id === cd.timeoutId)
      : critChoice;

    setGs(prev => ({
      ...prev,
      critHistory: [...prev.critHistory, {
        turn: turn + 1, title: cd.title, chosenId: chosen.id, chosenLabel: chosen.label,
        timedOut: critTimedOut, timeRemaining: critTimedOut ? 0 : critTimer, timerTotal: cd.timer,
        effects: chosen.effects,
      }],
    }));
    setCritChoice(chosen);
    setPhase("planning");
  };

  // ─── EXECUTE TURN ───
  const executeTurn = useCallback(() => {
    setPhase("execution");
    setExecStep(0);
    const chosenCrit = gs.critHistory[gs.critHistory.length - 1];
    const chosenOpt = cd.options.find(o => o.id === chosenCrit?.chosenId);
    const r = computeResults(gs, td, chosenOpt);
    setResults(r);

    let step = 0;
    execRef.current = setInterval(() => {
      step++;
      setExecStep(step);
      if (step >= 5) {
        clearInterval(execRef.current);
        setGs(prev => {
          const nd = { ...prev.domains };
          DK.forEach(dk => {
            const dr = r.domains[dk];
            nd[dk] = { ...nd[dk],
              readiness: Math.max(0, Math.min(100, nd[dk].readiness + dr.readinessDelta)),
              threat: Math.max(0, Math.min(100, nd[dk].threat + dr.threatDelta)),
            };
          });
          const g = r.global;
          return { ...prev, domains: nd,
            trust: Math.max(0, Math.min(100, prev.trust + g.trustDelta)),
            escalation: Math.max(0, Math.min(100, prev.escalation + g.escalationDelta)),
            commsIntegrity: Math.max(10, Math.min(100, prev.commsIntegrity + g.commsDelta)),
            resources: {
              ammunition: Math.max(0, Math.min(100, prev.resources.ammunition + g.ammoDelta)),
              fuel: Math.max(0, Math.min(100, prev.resources.fuel + g.fuelDelta)),
              politicalCapital: Math.max(0, Math.min(100, prev.resources.politicalCapital + g.politicalDelta)),
              allianceCohesion: Math.max(0, Math.min(100, prev.resources.allianceCohesion + g.allianceDelta)),
            },
            history: [...prev.history, {
              turn: turn + 1, autoLevels: Object.fromEntries(DK.map(dk => [dk, prev.domains[dk].autonomyLevel])),
              results: r, trust: prev.trust + g.trustDelta, escalation: prev.escalation + g.escalationDelta,
              comms: prev.commsIntegrity + g.commsDelta,
            }],
          };
        });
        setPhase("results");
      }
    }, 900);
  }, [gs, td, cd, turn]);

  const advanceTurn = () => {
    if (turn >= TURNS.length - 1) { setPhase("aar"); return; }
    setTurn(t => t + 1);
    setResults(null);
    setShowCascades(false);
    setPhase("briefing");
  };

  const setAutoLevel = (dk, lv) => setGs(p => ({ ...p, domains: { ...p.domains, [dk]: { ...p.domains[dk], autonomyLevel: lv } } }));

  useEffect(() => () => { clearInterval(timerRef.current); clearInterval(execRef.current); }, []);

  const resetSim = () => {
    setPhase("title"); setTurn(0); setDoctrine(null); setResults(null); setCritChoice(null);
    setGs({ domains: { air:{autonomyLevel:2,readiness:85,threat:20}, maritime:{autonomyLevel:2,readiness:80,threat:25}, cyber:{autonomyLevel:3,readiness:70,threat:30}, space:{autonomyLevel:1,readiness:90,threat:15}, land:{autonomyLevel:1,readiness:75,threat:20} },
      resources:{ammunition:100,fuel:100,politicalCapital:80,allianceCohesion:85}, trust:65,escalation:10,commsIntegrity:95, history:[],critHistory:[] });
  };

  // ═══════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════

  // ─── TITLE ───
  if (phase === "title") return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 30% 20%, #0d1a30, ${T.bg})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30 }}>
      <style>{FONTS_CSS}{`body{margin:0;background:${T.bg}} *{box-sizing:border-box}`}</style>
      <div style={{ textAlign: "center", maxWidth: 680 }}>
        <div style={{ fontSize: 10, color: T.goldDim, fontFamily: T.mono, letterSpacing: "0.35em", marginBottom: 20 }}>PROFESSIONAL MILITARY EDUCATION</div>
        <h1 style={{ fontFamily: T.heading, fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 700, color: T.textBright, lineHeight: 1.05, margin: 0, letterSpacing: "0.04em" }}>
          SYSTEMS <span style={{ color: T.gold }}>WARFARE</span>
        </h1>
        <div style={{ fontFamily: T.mono, fontSize: "clamp(11px, 2vw, 14px)", color: T.orange, fontWeight: 500, letterSpacing: "0.18em", marginTop: 6, marginBottom: 32 }}>AUTONOMOUS DECISION ARCHITECTURE</div>
        <div style={{ textAlign: "left", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 6, padding: "22px 24px", marginBottom: 28 }}>
          <p style={{ fontFamily: T.body, color: T.text, fontSize: 15, lineHeight: 1.75, marginTop: 0 }}>
            You are the Combined Force Commander for <strong style={{ color: T.gold }}>OPERATION PACIFIC SENTINEL</strong>. A Taiwan Strait crisis is escalating toward open conflict. Both sides deploy AI-enabled autonomous weapons across all domains.
          </p>
          <p style={{ fontFamily: T.body, color: T.text, fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            Your core dilemma: <span style={{ color: T.orange, fontWeight: 600 }}>delegate authority to autonomous systems for speed, or retain human control at the cost of tempo.</span> The adversary's AI operates at machine speed. Every second of human deliberation has consequences. Indecision is itself a decision.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 }}>
          {DK.map(dk => <div key={dk} style={{ background: `${DOMAINS[dk].color}0c`, border: `1px solid ${DOMAINS[dk].color}30`, borderRadius: 4, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13 }}>{DOMAINS[dk].icon}</span>
            <span style={{ fontSize: 9, color: DOMAINS[dk].color, fontFamily: T.mono, fontWeight: 600, letterSpacing: "0.08em" }}>{DOMAINS[dk].name.toUpperCase()}</span>
          </div>)}
        </div>
        <Btn onClick={() => setPhase("doctrine")} style={{ padding: "14px 44px", fontSize: 13 }}>▶ BEGIN SIMULATION</Btn>
        <div style={{ marginTop: 18, fontSize: 9, color: T.textDim, fontFamily: T.mono, letterSpacing: "0.06em" }}>6 TURNS · 5 DOMAINS · 7 AUTONOMY LEVELS · TIMED CRITICAL DECISIONS · CASCADING CONSEQUENCES</div>
      </div>
    </div>
  );

  // ─── DOCTRINE COMMITMENT (say-do gap baseline) ───
  if (phase === "doctrine") {
    return <DoctrinePledge onCommit={(levels) => { setDoctrine(levels); setPhase("briefing"); }} />;
  }

  // ─── MAIN GAME LAYOUT ───
  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: T.body, color: T.text }}>
      <style>{FONTS_CSS}{`body{margin:0;background:${T.bg}} *{box-sizing:border-box} input[type=range]{height:6px;accent-color:${T.gold}}`}</style>

      {/* HEADER */}
      <div style={{ background: `${T.surface}ee`, borderBottom: `1px solid ${T.border}`, padding: "7px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: T.heading, fontWeight: 600, fontSize: 15, color: T.textBright, letterSpacing: "0.03em" }}>SYSTEMS<span style={{ color: T.gold }}>WARFARE</span></span>
          <span style={{ fontFamily: T.mono, fontSize: 10, color: T.orange, letterSpacing: "0.08em", fontWeight: 500 }}>TURN {turn + 1}/6 — {td.title}</span>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {[
            { l: "TRUST", v: gs.trust, c: gs.trust > 50 ? T.green : gs.trust > 25 ? T.orange : T.red },
            { l: "ESC", v: gs.escalation, c: gs.escalation < 40 ? T.green : gs.escalation < 70 ? T.orange : T.red },
            { l: "COMMS", v: gs.commsIntegrity, c: gs.commsIntegrity > 55 ? T.blue : T.orange },
            { l: "PHASE", v: phase.toUpperCase(), c: T.gold, noNum: true },
          ].map((x, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>{x.l}</span>
            <span style={{ fontSize: 12, color: x.c, fontFamily: T.mono, fontWeight: 700, textShadow: `0 0 8px ${x.c}30` }}>{x.noNum ? x.v : Math.round(x.v)}</span>
          </div>)}
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 42px)" }}>
        {/* SIDEBAR */}
        <div style={{ width: 240, minWidth: 200, background: "#050a16", borderRight: `1px solid ${T.border}`, padding: 12, overflowY: "auto", flexShrink: 0, fontSize: 13 }}>
          <Panel title="Resources" accent={T.orange} style={{ marginBottom: 10 }}>
            <Bar_ label="Munitions" val={gs.resources.ammunition} color={T.orange} />
            <Bar_ label="Fuel/Logistics" val={gs.resources.fuel} color={T.gold} />
            <Bar_ label="Political Capital" val={gs.resources.politicalCapital} color="#b07cd8" />
            <Bar_ label="Alliance Cohesion" val={gs.resources.allianceCohesion} color={T.blue} />
          </Panel>
          <Panel title="Trust in Autonomous Systems" accent={T.green} style={{ marginBottom: 10 }}>
            <Bar_ label="System Trust" val={gs.trust} h={9} color={gs.trust > 50 ? T.green : T.red} />
            <p style={{ fontSize: 10, color: T.textDim, lineHeight: 1.35, margin: "5px 0 0" }}>
              {gs.trust > 65 ? "High confidence. Officers accepting delegation." : gs.trust > 35 ? "Moderate. Hesitancy at higher autonomy levels." : "Low trust. Manual overrides increasing across domains."}
            </p>
          </Panel>
          <Panel title="Escalation" accent={T.red} style={{ marginBottom: 10 }}>
            <Bar_ label="Escalation Level" val={gs.escalation} h={9} color={gs.escalation < 40 ? T.green : gs.escalation < 70 ? T.orange : T.red} />
            <p style={{ fontSize: 10, color: T.textDim, lineHeight: 1.35, margin: "5px 0 0" }}>
              {gs.escalation < 35 ? "Conventional scope. Managed." : gs.escalation < 65 ? "Climbing. Strategic signaling critical." : gs.escalation < 85 ? "DANGER: Approaching nuclear threshold." : "CRITICAL: Nuclear threshold breached."}
            </p>
          </Panel>
          <Panel title="Domains" accent={T.blue}>
            {DK.map(dk => <div key={dk} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
                <span style={{ fontSize: 11 }}>{DOMAINS[dk].icon}</span>
                <span style={{ fontSize: 9, color: DOMAINS[dk].color, fontFamily: T.mono, fontWeight: 600 }}>{DOMAINS[dk].name.toUpperCase()}</span>
                <span style={{ fontSize: 8, color: T.textDim, fontFamily: T.mono, marginLeft: "auto" }}>A:{gs.domains[dk].autonomyLevel + 1}</span>
              </div>
              <Bar_ label="Rdy" val={gs.domains[dk].readiness} h={4} />
              <Bar_ label="Thr" val={gs.domains[dk].threat} h={4} color={T.red} />
            </div>)}
          </Panel>
        </div>

        {/* MAIN */}
        <div style={{ flex: 1, padding: "14px 20px", overflowY: "auto" }}>
          <div style={{ maxWidth: 880 }}>

            {/* ═══ BRIEFING ═══ */}
            {phase === "briefing" && <>
              <PhaseHeader title={td.title} sub={td.date} color={T.orange} />
              <Panel title="Intelligence Brief" accent={T.orange} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: T.text, margin: 0, fontFamily: T.body }}>{td.briefing}</p>
              </Panel>
              <Panel title="Red Force Activity" accent={T.red} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13, lineHeight: 1.55, color: "#cc9999", margin: 0 }}>
                  <span style={{ color: T.red, fontFamily: T.mono, fontSize: 10, fontWeight: 700 }}>ADVERSARY: </span>{td.adversary}
                </p>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Tag color={T.orange}>TEMPO: {Math.round(td.tempo * 100)}%</Tag>
                  <Tag color={T.red}>CRISIS: {Math.round(td.crisis * 100)}%</Tag>
                </div>
              </Panel>
              <Panel title="Key Events" accent="#b07cd8" style={{ marginBottom: 18 }}>
                {td.events.map((e, i) => <EventCard key={i} event={e} />)}
              </Panel>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={() => { setPhase("critical"); startCritTimer(); }}>PROCEED TO CRITICAL DECISION →</Btn>
              </div>
            </>}

            {/* ═══ CRITICAL DECISION (timed) ═══ */}
            {phase === "critical" && <>
              <PhaseHeader title="CRITICAL DECISION" sub="Time-sensitive decision required" color={T.red} />

              {/* COUNTDOWN */}
              <div style={{
                textAlign: "center", padding: "18px 20px", marginBottom: 14, borderRadius: 6,
                background: critTimedOut ? `${T.red}15` : critTimer <= 5 ? `${T.red}12` : critTimer <= 15 ? `${T.orange}0a` : `${T.surface}`,
                border: `2px solid ${critTimedOut ? T.red : critTimer <= 5 ? T.red : critTimer <= 15 ? T.orange : T.border}`,
                transition: "all 0.3s",
              }}>
                {critTimedOut ? (
                  <div style={{ fontFamily: T.heading, fontSize: 28, color: T.red, fontWeight: 700, letterSpacing: "0.05em" }}>TIME EXPIRED</div>
                ) : critChoice ? (
                  <div style={{ fontFamily: T.mono, fontSize: 16, color: T.green, fontWeight: 600 }}>DECISION LOCKED: {critChoice.label}</div>
                ) : (
                  <>
                    <div style={{ fontFamily: T.heading, fontSize: "clamp(48px, 8vw, 72px)", fontWeight: 700, color: critTimer <= 5 ? T.red : critTimer <= 15 ? T.orange : T.gold, lineHeight: 1, textShadow: `0 0 20px ${critTimer <= 5 ? T.red : T.gold}40`, animation: critTimer <= 10 ? "pulse 0.8s infinite" : "none" }}>
                      {critTimer}
                    </div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.15em", marginTop: 4 }}>SECONDS REMAINING</div>
                  </>
                )}
              </div>

              <Panel title={cd.title} accent={T.red} style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: T.text, margin: 0, fontFamily: T.body }}>{cd.context}</p>
              </Panel>

              {/* OPTIONS */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {cd.options.map(opt => (
                  <button key={opt.id} onClick={() => !critTimedOut && makeCritChoice(opt)}
                    disabled={critTimedOut}
                    style={{
                      background: critChoice?.id === opt.id ? `${opt.color}20` : `${T.surface}`,
                      border: `2px solid ${critChoice?.id === opt.id ? opt.color : T.border}`,
                      borderRadius: 5, padding: "14px 16px", cursor: critTimedOut ? "not-allowed" : "pointer",
                      textAlign: "left", transition: "all 0.15s", opacity: critTimedOut ? 0.5 : 1,
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", border: `2px solid ${opt.color}`, background: critChoice?.id === opt.id ? opt.color : "transparent" }} />
                      <span style={{ fontFamily: T.heading, fontSize: 15, fontWeight: 600, color: opt.color, letterSpacing: "0.04em" }}>{opt.label}</span>
                    </div>
                    <p style={{ fontSize: 13, color: T.textDim, margin: 0, lineHeight: 1.45, fontFamily: T.body, paddingLeft: 18 }}>{opt.desc}</p>
                  </button>
                ))}
              </div>

              {critTimedOut && <div style={{ padding: "10px 14px", background: `${T.red}10`, border: `1px solid ${T.red}30`, borderRadius: 4, marginBottom: 14 }}>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.red, fontWeight: 700 }}>TIMEOUT: </span>
                <span style={{ fontSize: 13, color: "#cc8888" }}>{cd.timeoutPenalty}</span>
              </div>}

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Btn onClick={confirmCritical} disabled={!critChoice && !critTimedOut} color={critTimedOut ? T.red : T.gold}>
                  {critTimedOut ? "ACCEPT TIMEOUT CONSEQUENCE →" : "CONFIRM & SET AUTONOMY LEVELS →"}
                </Btn>
              </div>
            </>}

            {/* ═══ PLANNING ═══ */}
            {phase === "planning" && <>
              <PhaseHeader title="DELEGATION DECISIONS" sub="Set autonomy levels for each domain" color={T.blue} />
              <div style={{ background: `${T.orange}0a`, border: `1px solid ${T.orange}25`, borderRadius: 5, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <span style={{ fontSize: 15, marginTop: 1 }}>⏱</span>
                <div style={{ fontSize: 12, color: T.text, lineHeight: 1.5 }}>
                  Adversary tempo at <strong style={{ color: T.red }}>{Math.round(td.tempo * 100)}%</strong>. Comms at <strong style={{ color: gs.commsIntegrity > 55 ? T.blue : T.orange }}>{Math.round(gs.commsIntegrity)}%</strong>.
                  {gs.commsIntegrity < 60 && <span style={{ color: T.orange }}> Low-autonomy systems experiencing severe delays.</span>}
                </div>
              </div>

              {DK.map(dk => {
                const d = gs.domains[dk]; const dom = DOMAINS[dk]; const a = AUTO[d.autonomyLevel];
                const commsWarn = d.autonomyLevel < 3 && gs.commsIntegrity < 55;
                const docDiff = doctrine ? d.autonomyLevel - doctrine[dk] : 0;
                return (
                  <div key={dk} style={{ background: `${T.bg}cc`, border: `1px solid ${dom.color}20`, borderRadius: 5, padding: 13, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ fontSize: 16 }}>{dom.icon}</span>
                        <span style={{ color: dom.color, fontFamily: T.mono, fontSize: 11, fontWeight: 600, letterSpacing: "0.06em" }}>{dom.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {doctrine && docDiff !== 0 && <span style={{ fontSize: 9, fontFamily: T.mono, color: Math.abs(docDiff) > 1 ? T.orange : T.textDim, background: `${T.orange}10`, padding: "2px 6px", borderRadius: 3 }}>
                          {docDiff > 0 ? "↑" : "↓"}{Math.abs(docDiff)} FROM DOCTRINE
                        </span>}
                        <span style={{ color: T.textBright, fontFamily: T.mono, fontSize: 10, fontWeight: 700, background: `${dom.color}18`, padding: "3px 8px", borderRadius: 3, border: `1px solid ${dom.color}30` }}>
                          LVL {d.autonomyLevel + 1}: {a.name}
                        </span>
                      </div>
                    </div>
                    <input type="range" min={0} max={6} value={d.autonomyLevel} onChange={e => setAutoLevel(dk, +e.target.value)} style={{ width: "100%", accentColor: dom.color }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textDim, fontFamily: T.mono, marginTop: 2 }}>
                      <span>HUMAN CONTROL</span><span>AI AUTONOMOUS</span>
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 7, fontSize: 10, fontFamily: T.mono }}>
                      <span style={{ color: a.spd > 0.7 ? T.green : a.spd > 0.4 ? T.orange : T.red }}>SPD:{Math.round(a.spd * 100)}%</span>
                      <span style={{ color: a.risk < 0.15 ? T.green : a.risk < 0.3 ? T.orange : T.red }}>RISK:{Math.round(a.risk * 100)}%</span>
                      <span style={{ color: T.textDim }}>ESC:+{(a.esc * 100).toFixed(0)}%</span>
                    </div>
                    {commsWarn && <div style={{ marginTop: 6, padding: "5px 8px", background: `${T.orange}10`, border: `1px solid ${T.orange}30`, borderRadius: 3, fontSize: 10, color: T.orange, fontFamily: T.mono }}>
                      ⚠ COMMS DEGRADED — {Math.round((1 - gs.commsIntegrity / 100) * 100)}% latency increase at this autonomy level
                    </div>}
                  </div>
                );
              })}

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <Btn onClick={() => setPhase("briefing")} color={T.textDim}>← REVIEW BRIEF</Btn>
                <Btn onClick={executeTurn} color={T.orange} style={{ padding: "12px 30px" }}>⚡ EXECUTE TURN</Btn>
              </div>
            </>}

            {/* ═══ EXECUTION ═══ */}
            {phase === "execution" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "55vh", textAlign: "center" }}>
                <div style={{ fontSize: 10, color: T.orange, fontFamily: T.mono, letterSpacing: "0.2em", marginBottom: 14 }}>EXECUTING TURN {turn + 1}</div>
                <h2 style={{ fontFamily: T.heading, fontSize: "clamp(18px, 3vw, 26px)", color: T.textBright, margin: "0 0 28px", fontWeight: 500, letterSpacing: "0.03em" }}>
                  {["Deploying autonomous systems...", "Adversary AI engaging...", "Computing cross-domain cascades...", "Assessing consequences...", "Turn complete."][Math.min(execStep, 4)]}
                </h2>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
                  {DK.map((dk, i) => (
                    <div key={dk} style={{ textAlign: "center", opacity: execStep >= 1 ? 1 : 0.25, transition: `opacity 0.4s ${i * 0.12}s` }}>
                      <div style={{ width: 50, height: 50, borderRadius: "50%", border: `2px solid ${DOMAINS[dk].color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, background: `${DOMAINS[dk].color}10`, margin: "0 auto 5px", boxShadow: execStep >= 1 && execStep < 5 ? `0 0 12px ${DOMAINS[dk].color}30` : "none" }}>
                        {DOMAINS[dk].icon}
                      </div>
                      <div style={{ fontSize: 8, color: DOMAINS[dk].color, fontFamily: T.mono, fontWeight: 600 }}>{DOMAINS[dk].name.toUpperCase()}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 3 }}>
                  {[0,1,2,3,4].map(s => <div key={s} style={{ width: 60, height: 3, borderRadius: 2, background: execStep > s ? T.gold : T.border, transition: "background 0.4s" }} />)}
                </div>
              </div>
            )}

            {/* ═══ RESULTS ═══ */}
            {phase === "results" && results && <>
              <PhaseHeader title={`TURN ${turn + 1} RESULTS`} sub={`Overall Effectiveness: ${results.global.overallEff}%`} color={T.green} />

              {/* Domain results grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8, marginBottom: 14 }}>
                {DK.map(dk => {
                  const dr = results.domains[dk]; const dom = DOMAINS[dk];
                  return (
                    <Panel key={dk} accent={dom.color} style={{ padding: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 14 }}>{dom.icon}</span>
                        <span style={{ color: dom.color, fontFamily: T.mono, fontSize: 11, fontWeight: 600 }}>{dom.name}</span>
                        {dr.incident && <Tag color={T.red}>INCIDENT</Tag>}
                      </div>
                      <div style={{ fontSize: 24, fontFamily: T.heading, fontWeight: 700, color: dr.effectiveness > 65 ? T.green : dr.effectiveness > 40 ? T.orange : T.red, marginBottom: 3 }}>
                        {dr.effectiveness}%
                      </div>
                      <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, marginBottom: 4 }}>
                        EFFECTIVENESS <span style={{ color: T.textDim, opacity: 0.6 }}>(confidence: {dr.fogConfidence}%)</span>
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 10, fontFamily: T.mono }}>
                        <span>RDY:<Delta v={dr.readinessDelta} /></span>
                        <span>THR:<Delta v={dr.threatDelta} /></span>
                      </div>
                      <div style={{ marginTop: 5, fontSize: 10, fontFamily: T.mono, color: dr.tempo === "MATCHED" ? T.green : dr.tempo === "LAGGING" ? T.orange : T.red, fontWeight: 600 }}>
                        TEMPO: {dr.tempo}
                      </div>
                    </Panel>
                  );
                })}
              </div>

              {/* Global effects */}
              <Panel title="Global Effects" accent={T.gold} style={{ marginBottom: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 7 }}>
                  {[
                    { l: "Trust", d: results.global.trustDelta }, { l: "Escalation", d: results.global.escalationDelta },
                    { l: "Munitions", d: results.global.ammoDelta }, { l: "Fuel", d: results.global.fuelDelta },
                    { l: "Political Cap", d: results.global.politicalDelta }, { l: "Alliance", d: results.global.allianceDelta },
                  ].map((x, i) => <div key={i} style={{ background: T.bg, padding: "7px 10px", borderRadius: 3, border: `1px solid ${T.border}` }}>
                    <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono }}>{x.l}</div>
                    <div style={{ fontSize: 18, fontFamily: T.heading, fontWeight: 600, color: x.l === "Escalation" ? (x.d <= 5 ? T.green : T.red) : (x.d >= 0 ? T.green : T.red) }}>
                      {x.d > 0 ? "+" : ""}{x.d}
                    </div>
                  </div>)}
                </div>
              </Panel>

              {/* Incidents */}
              {results.incidents.length > 0 && <Panel title="⚠ Autonomous System Incidents" accent={T.red} style={{ marginBottom: 14 }}>
                {results.incidents.map((inc, i) => <div key={i} style={{ padding: "9px 12px", background: `${T.red}08`, border: `1px solid ${T.red}25`, borderRadius: 4, marginBottom: 6 }}>
                  <div style={{ fontSize: 9, color: T.red, fontFamily: T.mono, fontWeight: 700, marginBottom: 3 }}>{inc.severity} — {DOMAINS[inc.domain].name} — AUTO LVL {inc.autoLv}</div>
                  <p style={{ fontSize: 12, color: "#cc9999", lineHeight: 1.45, margin: 0 }}>{inc.text}</p>
                </div>)}
              </Panel>}

              {/* Cascades */}
              {results.cascades.length > 0 && <>
                <Btn onClick={() => setShowCascades(!showCascades)} color={T.textDim} style={{ width: "100%", marginBottom: 10 }}>
                  {showCascades ? "▼" : "▶"} CROSS-DOMAIN CASCADES ({results.cascades.length})
                </Btn>
                {showCascades && <Panel title="Cascade Effects" accent="#b07cd8" style={{ marginBottom: 14 }}>
                  {results.cascades.map((c, i) => <div key={i} style={{ padding: "8px 10px", background: "#b07cd808", border: "1px solid #b07cd818", borderRadius: 4, marginBottom: 5, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 10, color: "#b07cd8", fontFamily: T.mono, fontWeight: 700, minWidth: 90 }}>{c.from} → {c.to}</span>
                    <span style={{ fontSize: 11, color: T.textDim, flex: 1 }}>{c.text}</span>
                    <span style={{ fontSize: 12, fontFamily: T.mono, fontWeight: 700, color: c.impact > 0 ? T.green : T.red }}>{c.impact > 0 ? "+" : ""}{c.impact}</span>
                  </div>)}
                </Panel>}
              </>}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                <Btn onClick={advanceTurn}>{turn >= TURNS.length - 1 ? "PROCEED TO AFTER-ACTION REVIEW →" : `ADVANCE TO TURN ${turn + 2} →`}</Btn>
              </div>
            </>}

            {/* ═══ AFTER-ACTION REVIEW ═══ */}
            {phase === "aar" && <AARView gs={gs} doctrine={doctrine} onReset={resetSim} />}

          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
    </div>
  );
}

// ═══ SUB-COMPONENTS ═══

function PhaseHeader({ title, sub, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 26, background: color, borderRadius: 2 }} />
      <div>
        <h2 style={{ margin: 0, fontFamily: T.heading, fontSize: 19, color: T.textBright, fontWeight: 600, letterSpacing: "0.03em" }}>{title}</h2>
        <span style={{ fontSize: 11, color, fontFamily: T.mono }}>{sub}</span>
      </div>
    </div>
  );
}

function Tag({ children, color }) {
  return <span style={{ fontSize: 9, fontFamily: T.mono, color, background: `${color}12`, padding: "2px 7px", borderRadius: 3, border: `1px solid ${color}30`, fontWeight: 600, letterSpacing: "0.06em" }}>{children}</span>;
}

function EventCard({ event }) {
  const colors = { critical: T.red, dilemma: T.orange, cascade: "#b07cd8", intel: T.blue, logistics: T.gold, cyber: T.orange, political: "#b07cd8", trust: T.green, resolution: T.green, reflection: T.gold };
  const c = colors[event.type] || T.blue;
  return (
    <div style={{ padding: "9px 11px", background: event.type === "critical" ? `${T.red}08` : T.bg, border: `1px solid ${c}20`, borderRadius: 4, marginBottom: 6 }}>
      <span style={{ fontSize: 9, fontFamily: T.mono, color: c, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.08em" }}>
        {event.type === "critical" ? "⚠ CRITICAL" : event.type === "dilemma" ? "◆ DECISION" : event.type === "cascade" ? "⟁ CASCADE" : "● " + event.type.toUpperCase()}
      </span>
      <p style={{ fontSize: 13, color: T.text, lineHeight: 1.45, margin: "5px 0 0", fontFamily: T.body }}>{event.text}</p>
    </div>
  );
}

// ─── DOCTRINE PLEDGE ───

function DoctrinePledge({ onCommit }) {
  const [levels, setLevels] = useState({ air: 2, maritime: 2, cyber: 3, space: 1, land: 1 });

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% 30%, #0d1a30, ${T.bg})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 30 }}>
      <style>{FONTS_CSS}{`body{margin:0;background:${T.bg}} *{box-sizing:border-box} input[type=range]{height:6px;accent-color:${T.gold}}`}</style>
      <div style={{ maxWidth: 700, width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: T.goldDim, fontFamily: T.mono, letterSpacing: "0.25em", marginBottom: 8 }}>DOCTRINE COMMITMENT</div>
          <h2 style={{ fontFamily: T.heading, fontSize: 26, color: T.textBright, fontWeight: 600, margin: "0 0 10px", letterSpacing: "0.03em" }}>
            STATE YOUR <span style={{ color: T.gold }}>INTENDED</span> DOCTRINE
          </h2>
          <p style={{ fontFamily: T.body, fontSize: 14, color: T.textDim, lineHeight: 1.6, maxWidth: 560, margin: "0 auto" }}>
            Before entering the crisis, set the autonomy levels you <em>intend</em> to maintain across each domain. These represent your doctrinal commitment — your stated policy for how autonomous systems should operate. At the end of the simulation, we will compare these commitments to your <strong style={{ color: T.orange }}>actual decisions under pressure</strong>.
          </p>
        </div>

        {DK.map(dk => {
          const dom = DOMAINS[dk]; const a = AUTO[levels[dk]];
          return (
            <div key={dk} style={{ background: T.surface, border: `1px solid ${dom.color}20`, borderRadius: 5, padding: 13, marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 16 }}>{dom.icon}</span>
                  <span style={{ color: dom.color, fontFamily: T.mono, fontSize: 11, fontWeight: 600 }}>{dom.name}</span>
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.textBright, background: `${dom.color}18`, padding: "3px 8px", borderRadius: 3 }}>
                  LVL {levels[dk] + 1}: {a.name}
                </span>
              </div>
              <input type="range" min={0} max={6} value={levels[dk]} onChange={e => setLevels(p => ({ ...p, [dk]: +e.target.value }))} style={{ width: "100%", accentColor: dom.color }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: T.textDim, fontFamily: T.mono, marginTop: 2 }}>
                <span>HUMAN</span><span>AUTONOMOUS</span>
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Btn onClick={() => onCommit(levels)} style={{ padding: "14px 40px", fontSize: 12 }}>COMMIT DOCTRINE & BEGIN →</Btn>
          <p style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginTop: 12 }}>This commitment cannot be changed. Your actual behavior will be compared against it.</p>
        </div>
      </div>
    </div>
  );
}

// ─── AFTER-ACTION REVIEW ───

function AARView({ gs, doctrine, onReset }) {
  // Build chart data
  const chartData = gs.history.map(h => ({
    name: `T${h.turn}`,
    Trust: Math.round(Math.max(0, Math.min(100, h.trust))),
    Escalation: Math.round(Math.max(0, Math.min(100, h.escalation))),
    Comms: Math.round(Math.max(10, Math.min(100, h.comms))),
  }));

  // Say-do gap data
  const gapData = doctrine ? DK.map(dk => {
    const docLevel = doctrine[dk] + 1;
    const avgActual = gs.history.length > 0
      ? gs.history.reduce((sum, h) => sum + (h.autoLevels[dk] + 1), 0) / gs.history.length
      : docLevel;
    return { domain: DOMAINS[dk].name, Doctrine: docLevel, Actual: Math.round(avgActual * 10) / 10, delta: Math.round((avgActual - doctrine[dk]) * 10) / 10 };
  }) : [];

  // Outcome text
  const outcome = gs.escalation >= 85
    ? { label: "CATASTROPHIC", color: T.red, text: "Autonomous system actions contributed to escalation beyond the nuclear threshold. Speed was achieved at the cost of strategic control. History's warning about information technologies enabling centralized destruction faster than human judgment can intervene has been validated." }
    : gs.escalation >= 60
    ? { label: "DANGEROUS", color: T.orange, text: "Nuclear exchange avoided, but autonomous incidents and escalation have created lasting instability. Alliance cohesion damaged. This outcome mirrors the historical pattern where new weapons technologies outpace the doctrinal and organizational adaptation required to employ them wisely." }
    : gs.trust < 25
    ? { label: "CONSERVATIVE", color: T.blue, text: "By maintaining low autonomy, you preserved human control but sacrificed tempo. The adversary's AI consistently outpaced your decision cycle. This is the say-do gap made manifest: doctrine calls for speed at the speed of relevance, but institutional risk aversion prevented delegation." }
    : gs.resources.ammunition < 15
    ? { label: "PYRRHIC", color: T.orange, text: "Effective autonomous employment achieved tactical success at unsustainable resource expenditure. Autonomous systems accelerated consumption without autonomous logistics to match — the tempo-sustainability paradox that CSIS wargames consistently identify." }
    : { label: "BALANCED", color: T.green, text: "You navigated the delegation dilemma with measured escalation and maintained alliance cohesion. This represents effective human-machine teaming — delegating where speed mattered while retaining judgment at escalation decision points. The challenge: translating this into repeatable, trainable doctrine." };

  return (
    <div>
      <PhaseHeader title="AFTER-ACTION REVIEW" sub="Systems Warfare Simulation Complete" color="#b07cd8" />

      {/* Outcome */}
      <Panel title={`Strategic Outcome: ${outcome.label}`} accent={outcome.color} style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 14, lineHeight: 1.7, color: T.text, margin: 0, fontFamily: T.body }}>{outcome.text}</p>
      </Panel>

      {/* End State */}
      <Panel title="End State" accent={T.gold} style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
          {[
            { l: "Trust", v: gs.trust, c: gs.trust > 50 ? T.green : T.red },
            { l: "Escalation", v: gs.escalation, c: gs.escalation < 60 ? T.green : T.red },
            { l: "Comms", v: gs.commsIntegrity, c: gs.commsIntegrity > 50 ? T.blue : T.orange },
            { l: "Munitions", v: gs.resources.ammunition, c: gs.resources.ammunition > 30 ? T.orange : T.red },
            { l: "Political", v: gs.resources.politicalCapital, c: "#b07cd8" },
            { l: "Alliance", v: gs.resources.allianceCohesion, c: T.blue },
          ].map((x, i) => <div key={i} style={{ textAlign: "center", padding: 10, background: T.bg, borderRadius: 4, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 26, fontFamily: T.heading, fontWeight: 700, color: x.c }}>{Math.round(x.v)}</div>
            <div style={{ fontSize: 9, color: T.textDim, fontFamily: T.mono, marginTop: 3 }}>{x.l}</div>
          </div>)}
        </div>
      </Panel>

      {/* Trajectory Chart */}
      {chartData.length > 0 && <Panel title="Trust / Escalation / Comms — Trajectory Over Time" accent={T.blue} style={{ marginBottom: 14 }}>
        <div style={{ width: "100%", height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="name" stroke={T.textDim} tick={{ fontSize: 10, fontFamily: T.mono }} />
              <YAxis domain={[0, 100]} stroke={T.textDim} tick={{ fontSize: 10, fontFamily: T.mono }} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontFamily: T.mono, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: T.mono }} />
              <ReferenceLine y={70} stroke={T.red} strokeDasharray="3 3" label={{ value: "DANGER", fill: T.red, fontSize: 9 }} />
              <Line type="monotone" dataKey="Trust" stroke={T.green} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Escalation" stroke={T.red} strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="Comms" stroke={T.blue} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>}

      {/* Say-Do Gap Chart */}
      {gapData.length > 0 && <Panel title="THE SAY-DO GAP — Doctrine Commitment vs. Actual Behavior" accent={T.orange} style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12, color: T.textDim, lineHeight: 1.45, marginTop: 0, marginBottom: 10, fontFamily: T.body }}>
          Before the crisis, you committed to specific autonomy levels. This chart shows your stated doctrine versus your average actual delegation under pressure. The gap between them is the most important output of this simulation.
        </p>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={gapData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="domain" stroke={T.textDim} tick={{ fontSize: 10, fontFamily: T.mono }} />
              <YAxis domain={[0, 7]} stroke={T.textDim} tick={{ fontSize: 10, fontFamily: T.mono }} label={{ value: "Autonomy Level", angle: -90, position: "insideLeft", fill: T.textDim, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 4, fontFamily: T.mono, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10, fontFamily: T.mono }} />
              <Bar dataKey="Doctrine" fill={T.blue} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Actual" fill={T.orange} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {gapData.map(d => <div key={d.domain} style={{ fontSize: 10, fontFamily: T.mono, color: Math.abs(d.delta) > 1 ? T.orange : T.textDim }}>
            {d.domain}: {d.delta > 0 ? "+" : ""}{d.delta} {Math.abs(d.delta) > 1.5 ? "⚠ SIGNIFICANT GAP" : ""}
          </div>)}
        </div>
      </Panel>}

      {/* Critical Decision Timeline */}
      {gs.critHistory.length > 0 && <Panel title="Critical Decision Timeline" accent={T.red} style={{ marginBottom: 14 }}>
        {gs.critHistory.map((ch, i) => (
          <div key={i} style={{ padding: "10px 12px", background: ch.timedOut ? `${T.red}08` : T.bg, border: `1px solid ${ch.timedOut ? T.red : T.border}25`, borderRadius: 4, marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontFamily: T.heading, fontSize: 13, color: T.textBright, fontWeight: 600 }}>T{ch.turn}: {ch.title}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {ch.timedOut && <Tag color={T.red}>TIMED OUT</Tag>}
                <span style={{ fontSize: 10, fontFamily: T.mono, color: ch.timeRemaining > ch.timerTotal * 0.5 ? T.green : ch.timeRemaining > ch.timerTotal * 0.2 ? T.orange : T.red }}>
                  {ch.timeRemaining}s / {ch.timerTotal}s
                </span>
              </div>
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: ch.timedOut ? T.red : T.gold }}>{ch.chosenLabel}</span>
          </div>
        ))}
      </Panel>}

      {/* Delegation History Table */}
      <Panel title="Autonomy Delegation History" accent={T.blue} style={{ marginBottom: 14 }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: T.mono }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                <th style={{ textAlign: "left", padding: "7px 5px", color: T.textDim, fontWeight: 600 }}>TURN</th>
                {DK.map(dk => <th key={dk} style={{ textAlign: "center", padding: "7px 5px", color: DOMAINS[dk].color, fontWeight: 600, fontSize: 9 }}>{DOMAINS[dk].icon} {DOMAINS[dk].name.toUpperCase()}</th>)}
              </tr>
            </thead>
            <tbody>
              {doctrine && <tr style={{ borderBottom: `1px solid ${T.gold}20` }}>
                <td style={{ padding: "7px 5px", color: T.gold, fontWeight: 600 }}>DOCTRINE</td>
                {DK.map(dk => <td key={dk} style={{ textAlign: "center", padding: "7px 5px", color: T.gold }}>{doctrine[dk] + 1} — {AUTO[doctrine[dk]].name}</td>)}
              </tr>}
              {gs.history.map((h, i) => <tr key={i} style={{ borderBottom: `1px solid ${T.border}40` }}>
                <td style={{ padding: "7px 5px", color: T.text }}>T{h.turn}</td>
                {DK.map(dk => {
                  const lv = h.autoLevels[dk];
                  const docDiff = doctrine ? lv - doctrine[dk] : 0;
                  return <td key={dk} style={{ textAlign: "center", padding: "7px 5px", color: lv >= 5 ? T.orange : lv >= 3 ? T.gold : T.green, background: Math.abs(docDiff) > 1 ? `${T.orange}10` : "transparent" }}>
                    {lv + 1} — {AUTO[lv].name.split(" ")[0]} {Math.abs(docDiff) > 1 && <span style={{ color: T.orange, fontSize: 8 }}>({docDiff > 0 ? "+" : ""}{docDiff})</span>}
                  </td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Systems Insights */}
      <Panel title="Systems Warfare Insights" accent={T.orange} style={{ marginBottom: 14 }}>
        {[
          { t: "The Speed-Control Paradox", ico: "⏱", text: "Higher autonomy matched adversary tempo but increased escalation risk. Lower autonomy preserved control but ceded initiative. There is no optimum — only tradeoffs that must be consciously chosen, pre-authorized, and accepted." },
          { t: "Cross-Domain Cascades", ico: "⟁", text: "Failures cascaded unpredictably. Space degradation reduced air targeting. Cyber compromise affected logistics. Maritime weakness opened amphibious windows. Systems warfare means no domain fights alone — and no domain fails alone." },
          { t: "Trust Is Nonlinear", ico: "◉", text: "Trust built slowly through successful operations but collapsed sharply after incidents. A single autonomous failure under fog of war undid turns of accumulated confidence — and the manual-override response recreated the tempo disadvantage trust was meant to prevent." },
          { t: "The Say-Do Gap", ico: "⬡", text: "Compare your doctrine commitment with actual behavior. Most officers either escalate delegation beyond comfort under pressure — or retreat to manual control that doctrine says won't work. The gap between intended and actual behavior is this simulation's most important output." },
          { t: "Communications Force Your Hand", ico: "⚡", text: "As comms degraded, low-autonomy systems became ineffective while high-autonomy systems continued. The adversary forced your delegation level by jamming your communications. Your autonomy doctrine is not entirely your choice." },
        ].map((ins, i) => (
          <div key={i} style={{ padding: "11px 13px", background: T.bg, border: `1px solid ${T.orange}15`, borderRadius: 4, borderLeft: `3px solid ${T.orange}`, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 13 }}>{ins.ico}</span>
              <span style={{ fontSize: 12, color: T.orange, fontFamily: T.heading, fontWeight: 600, letterSpacing: "0.03em" }}>{ins.t}</span>
            </div>
            <p style={{ fontSize: 13, color: T.text, lineHeight: 1.55, margin: 0, fontFamily: T.body }}>{ins.text}</p>
          </div>
        ))}
      </Panel>

      {/* Discussion Questions */}
      <Panel title="Facilitated Discussion Questions" accent="#b07cd8" style={{ marginBottom: 14 }}>
        {[
          "At what point did you increase autonomy beyond your doctrine commitment? What forced that decision — adversary tempo, communications degradation, or political pressure?",
          "When the 15-second ASBM timer appeared, what did you feel? How does that visceral pressure compare to the abstract concept of 'decision speed' in doctrine?",
          "After the civilian vessel incident, did you over-correct toward human control? How long did it take trust to recover — and was the tempo cost of recovery acceptable?",
          "Examine the cross-domain cascades. Which second-order effects surprised you? Where did you think about the system holistically versus domain by domain?",
          "If the adversary can force your autonomy levels by degrading your communications, who actually controls your doctrine?",
          "How would pre-crisis autonomous weapons agreements change this scenario? Would those constraints survive first contact?",
          "What organizational changes — career incentives, training, promotion criteria, C2 structure — would prepare commanders to make these delegation decisions under this kind of pressure?",
        ].map((q, i) => (
          <div key={i} style={{ padding: "9px 11px", background: "#b07cd806", border: `1px solid #b07cd815`, borderRadius: 4, marginBottom: 5 }}>
            <span style={{ fontSize: 10, color: "#b07cd8", fontFamily: T.mono, fontWeight: 700, marginRight: 6 }}>Q{i + 1}.</span>
            <span style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontFamily: T.body }}>{q}</span>
          </div>
        ))}
      </Panel>

      <div style={{ textAlign: "center", paddingBottom: 40, marginTop: 16 }}>
        <Btn onClick={onReset} color={T.orange} style={{ padding: "14px 32px" }}>↻ REPLAY SIMULATION</Btn>
        <p style={{ fontSize: 10, color: T.textDim, fontFamily: T.mono, marginTop: 10 }}>Randomized elements ensure different outcomes each playthrough.</p>
      </div>
    </div>
  );
}

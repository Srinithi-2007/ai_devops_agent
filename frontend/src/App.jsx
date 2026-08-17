import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Activity,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Database,
  LayoutDashboard,
  BarChart3,
  WifiOff,
  Terminal,
  Sparkles,
  ChevronRight,
  User,
  Bell,
  Command,
  X,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_BASE = "http://localhost:8000";
const USE_MOCK = true;

const SERVICES = ["payment-api", "auth-service", "checkout-service", "notification-service"];
const SEVERITIES = ["SEV-1", "SEV-2", "SEV-3", "SEV-4"];
const STATUSES = ["Investigating", "Monitoring", "Resolved"];

const DEPENDENCY_MAP = {
  "payment-api": ["checkout-service"],
  "checkout-service": ["payment-api"],
  "auth-service": [],
  "notification-service": ["payment-api"],
};

const ERROR_LIBRARY = [
  {
    title: "Payment gateway timeout spike",
    service: "payment-api",
    error: "Gateway timeout after 30000ms connecting to upstream processor",
    root_cause: "Upstream payment processor exceeded latency SLA under load",
    fix: "Added a circuit breaker and exponential-backoff retry on the processor client",
    impact: "Checkout success rate dropped ~18% for the duration of the incident.",
    supporting: [
      "Payment API p99 latency increased 240% starting at incident time",
      "Timeout error rate increased 6x across payment-api pods",
      "Checkout service remained healthy with no code changes",
      "A similar pattern was observed in a previous incident on this service",
    ],
    contradicting: ["No outage reported on the external payment provider's status page"],
    contributing_factors: [
      "Recent traffic spike from a marketing campaign",
      "Connection pool sized for average load, not peak",
    ],
  },
  {
    title: "Auth token verification failures",
    service: "auth-service",
    error: "401 Unauthorized: token signature verification failed",
    root_cause: "Auth service clock drift caused premature JWT expiry",
    fix: "Enabled NTP sync on auth pods and widened token clock-skew tolerance",
    impact: "Login and checkout auth checks failed intermittently for affected users.",
    supporting: [
      "Clock drift of 47 seconds detected between auth pods and the NTP reference",
      "Failure rate correlated tightly with the token expiry boundary",
      "Restarting affected pods restored expected clock sync",
    ],
    contradicting: [],
    contributing_factors: [
      "NTP sync daemon crash-looped on two nodes",
      "No automated clock-drift alerting was in place",
    ],
  },
  {
    title: "Checkout DB connection pool exhaustion",
    service: "checkout-service",
    error: "Connection pool exhausted: 0 of 20 connections available",
    root_cause: "A long-running query held connections open through a checkout traffic burst",
    fix: "Added a statement timeout and increased pool size for peak windows",
    impact: "Checkout submissions queued and slowed until the pool was reset.",
    supporting: [
      "Active connections hit the pool ceiling (20/20) for six consecutive minutes",
      "One query held a connection open 40x longer than the p95 baseline",
      "Pool exhaustion coincided exactly with the traffic burst window",
    ],
    contradicting: [],
    contributing_factors: [
      "No statement timeout configured on long-running queries",
      "Pool size unchanged since before recent traffic growth",
    ],
  },
  {
    title: "Guest checkout validation crash",
    service: "checkout-service",
    error: "NullPointerException at OrderValidator.validateItems(line 214)",
    root_cause: "Cart payload missing an itemized tax field for guest checkouts",
    fix: "Added a null-guard and a default tax object for unauthenticated carts",
    impact: "Guest (unauthenticated) checkouts failed validation; logged-in checkouts were unaffected.",
    supporting: [
      "100% of failures came from carts with no itemized tax field",
      "Failures only affected guest sessions, never authenticated ones",
      "Error rate dropped to zero immediately after rolling back the last guest-checkout deploy",
    ],
    contradicting: ["A small number of authenticated sessions logged the same warning; cause unconfirmed"],
    contributing_factors: [
      "Recent deploy changed the guest cart payload shape",
      "No schema validation on incoming cart payloads",
    ],
  },
  {
    title: "Notification provider rate limiting",
    service: "notification-service",
    error: "429 Too Many Requests from notification provider API",
    root_cause: "A burst of retry notifications after an outage triggered the provider's rate limit",
    fix: "Introduced jittered backoff and a rate-limited send queue",
    impact: "Delayed delivery of order and payment notifications; no data loss.",
    supporting: [
      "Outbound notification volume spiked 5x after a prior outage's retry backlog",
      "The provider began returning 429s in lockstep with the volume spike",
      "The backlog drained once send rate was throttled client-side",
    ],
    contradicting: [],
    contributing_factors: [
      "Retry logic lacked jitter, causing synchronized retry bursts",
      "No client-side rate limiting existed before this incident",
    ],
  },
  {
    title: "Transaction table deadlock",
    service: "payment-api",
    error: "Deadlock detected on transactions table, transaction rolled back",
    root_cause: "Two services acquired row locks in opposite order on the same table",
    fix: "Standardized row-lock acquisition order across both write paths",
    impact: "A subset of payment writes rolled back and retried, seen as a brief checkout delay.",
    supporting: [
      "Deadlock graph showed two services locking rows in opposite order",
      "Both write paths touch the transactions table during checkout",
      "Retried transactions succeeded on the first retry in every observed case",
    ],
    contradicting: [],
    contributing_factors: [
      "Two independent services write to the same table with no shared locking convention",
      "No deadlock alerting existed prior to this incident",
    ],
  },
];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pickOne(arr) {
  return arr[randomBetween(0, arr.length - 1)];
}
function pickSeverity() {
  return pickOne(["SEV-1", "SEV-2", "SEV-2", "SEV-3", "SEV-3", "SEV-3", "SEV-4", "SEV-4"]);
}
function pickStatus() {
  return pickOne(["Resolved", "Resolved", "Resolved", "Investigating", "Investigating", "Monitoring"]);
}
function buildConfidenceBreakdown() {
  return {
    evidence_strength: randomBetween(45, 95),
    historical_similarity: randomBetween(35, 95),
    log_correlation: randomBetween(40, 90),
    service_correlation: randomBetween(35, 90),
    data_completeness: randomBetween(30, 95),
  };
}
function avgBreakdown(b) {
  const vals = Object.values(b);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

function buildTimeline(inc) {
  const t0 = new Date(inc.created_at).getTime();
  const min = 60000;
  const events = [
    {
      id: "t0",
      time: t0,
      type: "system",
      label: "Detection",
      source: "Anomaly Detector",
      service: inc.service,
      severity: inc.severity,
      description: `Anomaly detector flagged an elevated error rate on ${inc.service}.`,
    },
    {
      id: "t1",
      time: t0 + 1 * min,
      type: "raw",
      label: "First Alert",
      source: "Alertmanager",
      service: inc.service,
      description: `Alert fired: error rate exceeded threshold on ${inc.service}.`,
    },
    {
      id: "t2",
      time: t0 + 3 * min,
      type: "raw",
      label: "Service Degradation",
      source: "Metrics",
      service: inc.service,
      severity: inc.severity,
      description: `p99 latency and error rate crossed SLO on ${inc.service}.`,
    },
    {
      id: "t3",
      time: t0 + 4 * min,
      type: "raw",
      label: "Related Logs",
      source: "Log Collector",
      service: inc.service,
      description: inc.error,
    },
    {
      id: "t4",
      time: t0 + 6 * min,
      type: "ai",
      label: "AI Correlation",
      source: "AI Analysis Service",
      service: inc.service,
      confidence: inc.confidence_breakdown.historical_similarity,
      description: "Correlated against similar historical incidents in memory.",
    },
    {
      id: "t5",
      time: t0 + 7 * min,
      type: "ai",
      label: "Root Cause Hypothesis",
      source: "AI Analysis Service",
      service: inc.service,
      confidence: inc.confidence,
      description: inc.root_cause,
    },
  ];
  if (inc.status !== "Investigating") {
    events.push({
      id: "t6",
      time: t0 + 12 * min,
      type: "human",
      label: "Engineer Investigation",
      source: "On-call Engineer",
      service: inc.service,
      description: "Reviewed the AI hypothesis and supporting evidence, began remediation.",
    });
  }
  if (inc.status === "Resolved") {
    const resolveOffset = (inc.duration_minutes || 20) * min;
    events.push({
      id: "t7",
      time: t0 + resolveOffset,
      type: "human",
      label: "Resolution",
      source: "On-call Engineer",
      service: inc.service,
      description: inc.fix,
    });
    events.push({
      id: "t8",
      time: t0 + resolveOffset + 2 * min,
      type: "system",
      label: "Post-Incident Memory",
      source: "Memory Extractor",
      service: inc.service,
      description: "Incident memory extracted and stored for future similarity search.",
    });
  }
  return events;
}

function generateMockIncidents(count = 16) {
  const now = Date.now();
  return Array.from({ length: count }).map((_, i) => {
    const template = ERROR_LIBRARY[i % ERROR_LIBRARY.length];
    const minutesAgo = randomBetween(1, 60 * 6);
    const created_at = new Date(now - minutesAgo * 60000).toISOString();
    const severity = pickSeverity();
    const status = pickStatus();
    const duration_minutes = status === "Resolved" ? randomBetween(4, 45) : null;
    const resolved_at =
      status === "Resolved" ? new Date(new Date(created_at).getTime() + duration_minutes * 60000).toISOString() : null;
    const confidence_breakdown = buildConfidenceBreakdown();
    const confidence = avgBreakdown(confidence_breakdown);
    const secondary = DEPENDENCY_MAP[template.service] || [];
    const affected_services =
      secondary.length && Math.random() > 0.4 ? [template.service, secondary[0]] : [template.service];

    const base = {
      id: `INC-${1000 + i}`,
      title: template.title,
      service: template.service,
      affected_services,
      error: template.error,
      summary: `${template.title} detected in production, currently ${status.toLowerCase()}.`,
      root_cause: template.root_cause,
      fix: template.fix,
      impact: template.impact,
      evidence: { supporting: template.supporting, contradicting: template.contradicting },
      contributing_factors: template.contributing_factors,
      severity,
      status,
      confidence,
      confidence_breakdown,
      created_at,
      resolved_at,
      duration_minutes,
    };

    base.timeline = buildTimeline(base);
    base.resolution =
      status === "Resolved"
        ? {
            recovery_minutes: duration_minutes,
            actions: [
              {
                action: "Reviewed AI root cause hypothesis and supporting evidence",
                actor: "On-call Engineer",
                result: "Confirmed likely cause",
              },
              {
                action: template.fix,
                actor: Math.random() > 0.5 ? "On-call Engineer" : "Runbook automation",
                result: "Error rate returned to baseline",
              },
            ],
          }
        : null;
    base.memory_generated =
      status === "Resolved"
        ? `This incident confirmed that "${template.root_cause}" on ${template.service} is resolved by: ${template.fix}. Stored for similarity matching on future ${template.service} incidents.`
        : "Investigation in progress — memory will be generated once this incident is resolved and verified.";

    return base;
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

let MOCK_DB = generateMockIncidents();

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const api = {
  async getIncidents() {
    if (USE_MOCK) {
      await delay(500);
      return MOCK_DB;
    }
    const res = await fetch(`${API_BASE}/incidents`);
    if (!res.ok) throw new Error(`Failed to load incidents (${res.status})`);
    return res.json();
  },

  async getSimilar(id) {
    if (USE_MOCK) {
      await delay(450);
      const current = MOCK_DB.find((i) => i.id === id);
      const others = MOCK_DB.filter((inc) => inc.id !== id && inc.service === current?.service);
      const pool = others.length >= 3 ? others : MOCK_DB.filter((inc) => inc.id !== id);
      return pool
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((inc) => ({
          id: inc.id,
          error: inc.error,
          previous_root_cause: inc.root_cause,
          previous_fix: inc.fix,
          resolution_minutes: inc.duration_minutes || randomBetween(5, 25),
          worked: Math.random() > 0.2,
          severity: inc.severity,
          similarity_pct: randomBetween(62, 97),
        }))
        .sort((a, b) => b.similarity_pct - a.similarity_pct);
    }
    const res = await fetch(`${API_BASE}/similar/${id}`);
    if (!res.ok) throw new Error(`Failed to load similar incidents (${res.status})`);
    return res.json();
  },

  async postFeedback(id, useful) {
    if (USE_MOCK) {
      await delay(350);
      const inc = MOCK_DB.find((i) => i.id === id);
      const delta = useful ? 5 : -5;
      const newConfidence = Math.max(0, Math.min(100, (inc?.confidence ?? 50) + delta));
      if (inc) inc.confidence = newConfidence;
      return { id, new_confidence: newConfidence };
    }
    const res = await fetch(`${API_BASE}/feedback/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ useful }),
    });
    if (!res.ok) throw new Error(`Failed to submit feedback (${res.status})`);
    return res.json();
  },
};

const T = {
  bg: "#0B0D12",
  panel: "#12151C",
  panelBorder: "#1F232C",
  raw: "#F0B429",
  ai: "#A78BFA",
  human: "#60A5FA",
  system: "#94A3B8",
  good: "#34D399",
  warn: "#F0B429",
  bad: "#F87171",
  textPrimary: "#E7E9EE",
  textMuted: "#8B909C",
};

const TYPE_COLOR = { raw: T.raw, ai: T.ai, human: T.human, system: T.system };
const TYPE_ICON = { raw: Terminal, ai: Sparkles, human: User, system: Activity };
const TYPE_LABEL = { raw: "Raw signal", ai: "AI-derived", human: "Human action", system: "System event" };

const SEVERITY_COLOR = { "SEV-1": T.bad, "SEV-2": "#FB923C", "SEV-3": T.warn, "SEV-4": T.textMuted };
const STATUS_COLOR = { Investigating: T.warn, Monitoring: T.human, Resolved: T.good };

function confidenceColor(pct) {
  if (pct < 40) return T.bad;
  if (pct < 70) return T.warn;
  return T.good;
}

function formatRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
function formatClock(ms) {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDuration(mins) {
  if (mins == null) return "—";
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function breakdownLabel(key) {
  return {
    evidence_strength: "Evidence strength",
    historical_similarity: "Historical similarity",
    log_correlation: "Log correlation",
    service_correlation: "Service correlation",
    data_completeness: "Data completeness",
  }[key];
}

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-xl ${className}`} style={{ background: T.panel, border: `1px solid ${T.panelBorder}` }}>
      {children}
    </div>
  );
}

function Badge({ children, color }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
      style={{ background: `${color}1A`, color, border: `1px solid ${color}33` }}
    >
      {children}
    </span>
  );
}

function SeverityBadge({ severity }) {
  return <Badge color={SEVERITY_COLOR[severity]}>{severity}</Badge>;
}

function StatusBadge({ status }) {
  return (
    <Badge color={STATUS_COLOR[status]}>
      {status === "Investigating" && <PulseDot live />}
      {status}
    </Badge>
  );
}

function ConfidenceBar({ value, size = "md" }) {
  const color = confidenceColor(value);
  const height = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className={`flex-1 rounded-full ${height} overflow-hidden`} style={{ background: "#1C2028" }}>
        <div className={`${height} rounded-full transition-all duration-500`} style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-mono tabular-nums" style={{ color, minWidth: "2.5ch" }}>
        {value}%
      </span>
    </div>
  );
}

function SimilarityRing({ value }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = confidenceColor(value);
  return (
    <div className="relative w-14 h-14 shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#1C2028" strokeWidth="5" />
        <circle
          cx="28"
          cy="28"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold" style={{ color: T.textPrimary }}>
        {value}%
      </div>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const color = toast.type === "error" ? T.bad : T.good;
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg px-4 py-3 shadow-2xl text-sm"
      style={{ background: T.panel, border: `1px solid ${color}55`, color: T.textPrimary }}
    >
      {toast.type === "error" ? <AlertTriangle size={16} color={color} /> : <CheckCircle2 size={16} color={color} />}
      {toast.message}
    </div>
  );
}

function PulseDot({ live }) {
  return (
    <span className="relative flex h-2 w-2">
      {live && <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: "currentColor" }} />}
      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "currentColor" }} />
    </span>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "#1C2028" }}>
        <Database size={20} color={T.textMuted} />
      </div>
      <div className="text-sm font-medium" style={{ color: T.textPrimary }}>{title}</div>
      <div className="text-xs mt-1 max-w-sm" style={{ color: T.textMuted }}>{subtitle}</div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: `${T.bad}1A` }}>
        <WifiOff size={20} color={T.bad} />
      </div>
      <div className="text-sm font-medium" style={{ color: T.textPrimary }}>Can't reach the server</div>
      <div className="text-xs mt-1 max-w-sm" style={{ color: T.textMuted }}>{message}</div>
      <button
        onClick={onRetry}
        className="mt-4 px-4 py-2 rounded-lg text-sm transition-colors duration-150 hover:brightness-125"
        style={{ background: T.bad, color: "#1A0000" }}
      >
        Retry
      </button>
    </div>
  );
}

function detectEmergingPattern(incidents) {
  if (incidents.length < 4) return null;
  const counts = {};
  incidents.forEach((inc) => {
    counts[inc.title] = (counts[inc.title] || 0) + 1;
  });
  const [title, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (count < 3) return null;
  const services = new Set(incidents.filter((i) => i.title === title).map((i) => i.service));
  return {
    title,
    count,
    services: services.size,
    confidence: Math.min(96, 60 + count * 8),
  };
}

function PatternBanner({ pattern }) {
  if (!pattern) return null;
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4"
      style={{ background: `${T.ai}12`, border: `1px solid ${T.ai}33` }}
    >
      <AlertTriangle size={16} color={T.ai} className="shrink-0" />
      <div className="flex-1 text-xs" style={{ color: T.textPrimary }}>
        <span className="font-medium" style={{ color: T.ai }}>Emerging pattern —</span>{" "}
        "{pattern.title}" has recurred {pattern.count} times across {pattern.services} service{pattern.services > 1 ? "s" : ""}.
      </div>
      <Badge color={T.ai}>AI estimate · {pattern.confidence}%</Badge>
    </div>
  );
}

function buildNotifications(incidents, pattern) {
  const notes = [];
  incidents
    .filter((i) => i.severity === "SEV-1")
    .slice(0, 2)
    .forEach((i) =>
      notes.push({ id: `crit-${i.id}`, type: "critical", text: `Critical incident on ${i.service}: ${i.title}`, time: i.created_at, incidentId: i.id })
    );
  incidents
    .filter((i) => i.confidence < 40)
    .slice(0, 2)
    .forEach((i) =>
      notes.push({ id: `low-${i.id}`, type: "low-confidence", text: `Low-confidence AI analysis on ${i.service} needs review`, time: i.created_at, incidentId: i.id })
    );
  if (pattern) {
    notes.push({ id: "pattern", type: "pattern", text: `New recurring pattern detected: "${pattern.title}"`, time: new Date().toISOString(), incidentId: null });
  }
  return notes.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
}

const NOTIF_ICON = { critical: AlertTriangle, "low-confidence": Sparkles, pattern: TrendingUp };
const NOTIF_COLOR = { critical: T.bad, "low-confidence": T.ai, pattern: T.warn };

function NotificationBell({ notifications, open, setOpen, onSelect }) {
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors duration-150 hover:brightness-125"
        style={{ background: "#1C2028", border: `1px solid ${T.panelBorder}` }}
        title="Notifications"
      >
        <Bell size={15} color={T.textMuted} />
        {notifications.length > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-medium"
            style={{ background: T.bad, color: "#1A0000" }}
          >
            {notifications.length}
          </span>
        )}
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-lg shadow-2xl z-50 overflow-hidden"
          style={{ background: T.panel, border: `1px solid ${T.panelBorder}` }}
        >
          <div className="px-3 py-2 text-xs font-medium" style={{ borderBottom: `1px solid ${T.panelBorder}`, color: T.textMuted }}>
            Notifications
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-6 text-xs text-center" style={{ color: T.textMuted }}>You're all caught up.</div>
          ) : (
            <div className="max-h-80 overflow-auto">
              {notifications.map((n) => {
                const Icon = NOTIF_ICON[n.type];
                const color = NOTIF_COLOR[n.type];
                return (
                  <button
                    key={n.id}
                    onClick={() => n.incidentId && onSelect(n.incidentId)}
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 hover:brightness-125"
                    style={{ borderBottom: `1px solid ${T.panelBorder}` }}
                  >
                    <Icon size={14} color={color} className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs leading-snug" style={{ color: T.textPrimary }}>{n.text}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: T.textMuted }}>{formatRelativeTime(n.time)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CommandPalette({ open, onClose, incidents, onSelect }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return incidents.slice(0, 6);
    const q = query.toLowerCase();
    return incidents
      .filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.error.toLowerCase().includes(q) ||
          i.service.toLowerCase().includes(q) ||
          i.root_cause.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [query, incidents]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-28 px-4" style={{ background: "#00000099" }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: T.panel, border: `1px solid ${T.panelBorder}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
          <Search size={15} color={T.textMuted} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && onClose()}
            placeholder='Search incident memory — try "payment" or "timeout"'
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: T.textPrimary }}
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1C2028", color: T.textMuted }}>ESC</kbd>
        </div>
        <div className="max-h-96 overflow-auto">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-xs text-center" style={{ color: T.textMuted }}>No incidents match that search.</div>
          ) : (
            results.map((inc) => (
              <button
                key={inc.id}
                onClick={() => { onSelect(inc.id); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-150 hover:brightness-125"
                style={{ borderBottom: `1px solid ${T.panelBorder}` }}
              >
                <SeverityBadge severity={inc.severity} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>{inc.title}</div>
                  <div className="text-[11px] font-mono truncate" style={{ color: T.textMuted }}>{inc.service} · {inc.id}</div>
                </div>
                <ConfidenceBar value={inc.confidence} size="sm" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function NavRail({ page, setPage, onOpenPalette }) {
  const items = [
    { id: "dashboard", label: "Incidents", icon: LayoutDashboard },
    { id: "stats", label: "Memory", icon: BarChart3 },
  ];
  return (
    <div className="w-56 shrink-0 h-full flex flex-col py-5 px-3" style={{ background: T.panel, borderRight: `1px solid ${T.panelBorder}` }}>
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${T.raw}1A` }}>
          <Terminal size={16} color={T.raw} />
        </div>
        <div>
          <div className="text-sm font-semibold" style={{ color: T.textPrimary }}>Incident Memory</div>
          <div className="text-[11px]" style={{ color: T.textMuted }}>AI DevOps Console</div>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, icon: Icon }) => {
          const active = page === id || (id === "dashboard" && page === "detail");
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors duration-150 text-left"
              style={{ background: active ? "#1C2028" : "transparent", color: active ? T.textPrimary : T.textMuted }}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <button
        onClick={onOpenPalette}
        className="flex items-center gap-2.5 px-3 py-2 mt-2 rounded-lg text-xs transition-colors duration-150 hover:brightness-125"
        style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, color: T.textMuted }}
      >
        <Search size={13} />
        <span className="flex-1 text-left">Search memory</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "#1C2028" }}>
          <Command size={9} />K
        </kbd>
      </button>

      <div className="mt-auto px-2 text-[11px] leading-relaxed" style={{ color: T.textMuted }}>
        {Object.entries(TYPE_LABEL).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLOR[key] }} /> {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage({ incidents, loading, error, onRetry, lastUpdated, onOpenIncident, onSearchFocusChange, pattern }) {
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  const filtered = useMemo(() => {
    let rows = incidents.filter((inc) => {
      const matchesService = serviceFilter === "all" || inc.service === serviceFilter;
      const matchesSeverity = severityFilter === "all" || inc.severity === severityFilter;
      const matchesSearch =
        inc.error.toLowerCase().includes(search.toLowerCase()) || inc.title.toLowerCase().includes(search.toLowerCase());
      return matchesService && matchesSeverity && matchesSearch;
    });
    rows = [...rows].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === "created_at") {
        av = new Date(av).getTime();
        bv = new Date(bv).getTime();
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [incidents, search, serviceFilter, severityFilter, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  const columns = [
    { key: "severity", label: "Severity" },
    { key: "service", label: "Service" },
    { key: "title", label: "Incident" },
    { key: "status", label: "Status" },
    { key: "confidence", label: "Confidence" },
    { key: "created_at", label: "Seen" },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-7 pb-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: T.textPrimary }}>Incident Dashboard</h1>
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: error ? T.bad : T.good }}>
            <PulseDot live={!error} />
            <span style={{ color: T.textMuted }}>{error ? "Disconnected" : `Updated ${formatRelativeTime(lastUpdated)}`}</span>
          </div>
        </div>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors duration-150 hover:brightness-125"
          style={{ background: "#1C2028", color: T.textPrimary }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="px-8 py-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={T.textMuted} />
          <input
            value={search}
            onFocus={() => onSearchFocusChange(true)}
            onBlur={() => onSearchFocusChange(false)}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, color: T.textPrimary }}
          />
        </div>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, color: T.textPrimary }}
        >
          <option value="all">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, color: T.textPrimary }}
        >
          <option value="all">All services</option>
          {SERVICES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs ml-auto" style={{ color: T.textMuted }}>{filtered.length} of {incidents.length} incidents</span>
      </div>

      <div className="flex-1 overflow-auto px-8 py-5">
        {error ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : loading && incidents.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-lg animate-pulse" style={{ background: T.panel }} />)}
          </div>
        ) : (
          <>
            <PatternBanner pattern={pattern} />
            {filtered.length === 0 ? (
              <EmptyState
                title={incidents.length === 0 ? "No incidents yet" : "No matches"}
                subtitle={incidents.length === 0 ? "Once the log pipeline sends errors, they'll show up here automatically." : "Try a different search term or clear the filters."}
              />
            ) : (
              <table className="w-full text-sm border-separate" style={{ borderSpacing: "0 6px" }}>
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className="text-left px-3 pb-2 text-xs font-medium cursor-pointer select-none"
                        style={{ color: T.textMuted }}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && <ChevronRight size={12} style={{ transform: sortDir === "asc" ? "rotate(-90deg)" : "rotate(90deg)" }} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inc) => (
                    <tr
                      key={inc.id}
                      onClick={() => onOpenIncident(inc.id)}
                      className="cursor-pointer transition-colors duration-150 hover:brightness-110"
                      style={{ background: T.panel }}
                    >
                      <td className="px-3 py-3 rounded-l-lg"><SeverityBadge severity={inc.severity} /></td>
                      <td className="px-3 py-3 font-mono text-xs" style={{ color: T.textPrimary }}>{inc.service}</td>
                      <td className="px-3 py-3 max-w-xs">
                        <div className="text-xs font-medium truncate" style={{ color: T.textPrimary }}>{inc.title}</div>
                        <div className="text-[11px] font-mono truncate" style={{ color: T.raw }} title={inc.error}>{inc.error}</div>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={inc.status} /></td>
                      <td className="px-3 py-3"><ConfidenceBar value={inc.confidence} size="sm" /></td>
                      <td className="px-3 py-3 rounded-r-lg text-xs whitespace-nowrap" style={{ color: T.textMuted }}>{formatRelativeTime(inc.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ConfidenceBreakdownPanel({ breakdown }) {
  const lowest = Object.entries(breakdown).sort((a, b) => a[1] - b[1])[0];
  return (
    <div className="mt-3 p-3 rounded-lg" style={{ background: T.bg, border: `1px solid ${T.panelBorder}` }}>
      <div className="flex flex-col gap-2.5">
        {Object.entries(breakdown).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <div className="text-xs w-40" style={{ color: T.textMuted }}>{breakdownLabel(key)}</div>
            <ConfidenceBar value={val} size="sm" />
          </div>
        ))}
      </div>
      {lowest[1] < 50 && (
        <div className="text-[11px] mt-3 pt-3" style={{ color: T.warn, borderTop: `1px solid ${T.panelBorder}` }}>
          Low {breakdownLabel(lowest[0]).toLowerCase()} is reducing overall confidence.
        </div>
      )}
    </div>
  );
}

function RootCauseAnalysis({ incident }) {
  return (
    <Card className="col-span-2 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} color={T.ai} />
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.ai }}>AI Root Cause Analysis</span>
      </div>
      <div className="text-[11px] mb-4" style={{ color: T.textMuted }}>
        This is a hypothesis, not a confirmed fact — review the evidence before acting.
      </div>

      <div className="mb-4">
        <div className="text-xs mb-1" style={{ color: T.textMuted }}>Primary hypothesis</div>
        <div className="text-sm" style={{ color: T.textPrimary }}>{incident.root_cause}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: T.good }}>
            <CheckCircle2 size={12} /> Supporting evidence
          </div>
          <ul className="flex flex-col gap-1.5">
            {incident.evidence.supporting.map((e, i) => (
              <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: T.textPrimary }}>
                <span style={{ color: T.good }}>•</span> {e}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-xs mb-2 flex items-center gap-1.5" style={{ color: T.bad }}>
            <XCircle size={12} /> Contradicting evidence
          </div>
          {incident.evidence.contradicting.length === 0 ? (
            <div className="text-xs" style={{ color: T.textMuted }}>None found.</div>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {incident.evidence.contradicting.map((e, i) => (
                <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: T.textPrimary }}>
                  <span style={{ color: T.bad }}>•</span> {e}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <div className="text-xs mb-2" style={{ color: T.textMuted }}>Contributing factors</div>
        <div className="flex flex-wrap gap-2">
          {incident.contributing_factors.map((f, i) => (
            <span key={i} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#1C2028", color: T.textPrimary }}>{f}</span>
          ))}
        </div>
      </div>
    </Card>
  );
}

function TimelineView({ events }) {
  const [expanded, setExpanded] = useState(() => new Set([events[events.length - 1]?.id]));
  function toggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  return (
    <div className="flex flex-col">
      {events.map((ev, idx) => {
        const Icon = TYPE_ICON[ev.type];
        const color = TYPE_COLOR[ev.type];
        const isOpen = expanded.has(ev.id);
        const isLast = idx === events.length - 1;
        return (
          <div key={ev.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}1A`, border: `1px solid ${color}55` }}>
                <Icon size={13} color={color} />
              </div>
              {!isLast && <div className="w-px flex-1 my-1" style={{ background: T.panelBorder }} />}
            </div>
            <button onClick={() => toggle(ev.id)} className="flex-1 text-left pb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium" style={{ color: T.textPrimary }}>{ev.label}</span>
                <Badge color={color}>{TYPE_LABEL[ev.type]}</Badge>
                {ev.severity && <SeverityBadge severity={ev.severity} />}
                {ev.confidence != null && <span className="text-[11px] font-mono" style={{ color: confidenceColor(ev.confidence) }}>{ev.confidence}%</span>}
                <span className="text-[11px] font-mono ml-auto" style={{ color: T.textMuted }}>{formatClock(ev.time)}</span>
                {isOpen ? <ChevronUp size={13} color={T.textMuted} /> : <ChevronDown size={13} color={T.textMuted} />}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: T.textMuted }}>{ev.source}</div>
              {isOpen && (
                <div className="text-xs mt-2 p-2.5 rounded-lg font-mono leading-relaxed" style={{ background: T.bg, border: `1px solid ${T.panelBorder}`, color: T.textPrimary }}>
                  {ev.description}
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function RelatedIncidentsPanel({ similar, loading, error }) {
  const [expandedId, setExpandedId] = useState(null);
  if (error) return <div className="text-xs" style={{ color: T.bad }}>{error}</div>;
  if (loading) {
    return (
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="flex-1 h-28 rounded-lg animate-pulse" style={{ background: T.bg }} />)}
      </div>
    );
  }
  if (similar.length === 0) return <div className="text-xs" style={{ color: T.textMuted }}>No sufficiently similar incidents found in memory yet.</div>;
  return (
    <div className="grid grid-cols-3 gap-3">
      {similar.map((s) => {
        const open = expandedId === s.id;
        return (
          <div key={s.id} className="p-3 rounded-lg" style={{ background: T.bg, border: `1px solid ${T.panelBorder}` }}>
            <div className="flex gap-3">
              <SimilarityRing value={s.similarity_pct} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[11px] font-mono" style={{ color: T.textMuted }}>{s.id}</span>
                  <SeverityBadge severity={s.severity} />
                </div>
                <div className="text-xs font-mono truncate" style={{ color: T.raw }} title={s.error}>{s.error}</div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <Badge color={s.worked ? T.good : T.bad}>{s.worked ? "Fix worked" : "Fix didn't hold"}</Badge>
              <span className="text-[11px]" style={{ color: T.textMuted }}>Resolved in {formatDuration(s.resolution_minutes)}</span>
            </div>
            <button
              onClick={() => setExpandedId(open ? null : s.id)}
              className="text-[11px] mt-2 underline decoration-dotted"
              style={{ color: T.ai }}
            >
              {open ? "Hide previous resolution" : "View previous resolution"}
            </button>
            {open && (
              <div className="text-[11px] mt-2 p-2 rounded-lg leading-relaxed" style={{ background: T.panel, color: T.textPrimary }}>
                <span style={{ color: T.textMuted }}>Root cause: </span>{s.previous_root_cause}
                <br />
                <span style={{ color: T.textMuted }}>Fix applied: </span>{s.previous_fix}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IncidentDetailPage({ incident, onBack, showToast, onConfidenceUpdate }) {
  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [similarError, setSimilarError] = useState(null);
  const [pendingFeedback, setPendingFeedback] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingSimilar(true);
    setSimilarError(null);
    api.getSimilar(incident.id)
      .then((data) => { if (!cancelled) setSimilar(data); })
      .catch((err) => { if (!cancelled) setSimilarError(err.message || "Failed to load similar incidents"); })
      .finally(() => { if (!cancelled) setLoadingSimilar(false); });
    return () => { cancelled = true; };
  }, [incident.id]);

  async function handleFeedback(useful) {
    if (pendingFeedback) return;
    setPendingFeedback(true);
    const previous = incident.confidence;
    const optimistic = Math.max(0, Math.min(100, previous + (useful ? 5 : -5)));
    onConfidenceUpdate(incident.id, optimistic);
    try {
      const res = await api.postFeedback(incident.id, useful);
      onConfidenceUpdate(incident.id, res.new_confidence);
      showToast({ type: "success", message: useful ? "Marked useful — confidence increased" : "Marked not useful — confidence decreased" });
    } catch (err) {
      onConfidenceUpdate(incident.id, previous);
      showToast({ type: "error", message: "Couldn't save feedback. Try again." });
    } finally {
      setPendingFeedback(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-8 pt-7 pb-5" style={{ borderBottom: `1px solid ${T.panelBorder}` }}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-4 transition-colors duration-150 hover:brightness-125" style={{ color: T.textMuted }}>
          <ChevronLeft size={14} /> Back to dashboard
        </button>

        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold" style={{ color: T.textPrimary }}>{incident.title}</h1>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <div className="text-xs mt-1 font-mono" style={{ color: T.textMuted }}>{incident.id} · {incident.service}</div>
            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: T.textMuted }}>
              <span className="flex items-center gap-1"><Clock size={12} /> Detected {formatRelativeTime(incident.created_at)}</span>
              <span>Duration: {formatDuration(incident.duration_minutes)}</span>
              <span>Affects: {incident.affected_services.join(", ")}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <button onClick={() => setShowBreakdown((v) => !v)} className="text-xs mb-1 underline decoration-dotted" style={{ color: T.textMuted }}>
              Confidence score {showBreakdown ? <ChevronUp size={11} className="inline" /> : <ChevronDown size={11} className="inline" />}
            </button>
            <ConfidenceBar value={incident.confidence} />
            {showBreakdown && (
              <div className="w-64 text-left">
                <ConfidenceBreakdownPanel breakdown={incident.confidence_breakdown} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 grid grid-cols-2 gap-5">
        <Card className="col-span-2 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Terminal size={14} color={T.raw} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.raw }}>Raw error</span>
          </div>
          <pre className="text-xs font-mono whitespace-pre-wrap p-3 rounded-lg" style={{ background: T.bg, color: T.textPrimary, border: `1px solid ${T.panelBorder}` }}>
            {incident.error}
          </pre>
        </Card>

        <Card className="col-span-2 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} color={T.ai} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.ai }}>AI summary</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-[11px] mb-1" style={{ color: T.textMuted }}>What happened</div>
              <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{incident.summary}</p>
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: T.textMuted }}>Why it happened</div>
              <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{incident.root_cause}</p>
            </div>
            <div>
              <div className="text-[11px] mb-1" style={{ color: T.textMuted }}>Impact</div>
              <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{incident.impact}</p>
            </div>
          </div>
        </Card>

        <RootCauseAnalysis incident={incident} />

        <Card className="col-span-2 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} color={T.ai} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.ai }}>Recommended fix</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFeedback(true)}
                disabled={pendingFeedback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 disabled:opacity-50 hover:brightness-125"
                style={{ background: `${T.good}1A`, color: T.good, border: `1px solid ${T.good}33` }}
              >
                <ThumbsUp size={13} /> Useful
              </button>
              <button
                onClick={() => handleFeedback(false)}
                disabled={pendingFeedback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors duration-150 disabled:opacity-50 hover:brightness-125"
                style={{ background: `${T.bad}1A`, color: T.bad, border: `1px solid ${T.bad}33` }}
              >
                <ThumbsDown size={13} /> Not useful
              </button>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: T.textPrimary }}>{incident.fix}</p>
        </Card>

        <Card className="col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} color={T.textMuted} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.textMuted }}>Incident timeline</span>
          </div>
          <TimelineView events={incident.timeline} />
        </Card>

        <Card className="col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={14} color={T.textMuted} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.textMuted }}>Related incidents — have we seen this before?</span>
          </div>
          <RelatedIncidentsPanel similar={similar} loading={loadingSimilar} error={similarError} />
        </Card>

        {incident.resolution && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 size={14} color={T.good} />
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.good }}>Resolution</span>
            </div>
            <div className="flex flex-col gap-3">
              {incident.resolution.actions.map((a, i) => (
                <div key={i} className="text-xs">
                  <div style={{ color: T.textPrimary }}>{a.action}</div>
                  <div className="mt-0.5" style={{ color: T.textMuted }}>{a.actor} · {a.result}</div>
                </div>
              ))}
            </div>
            <div className="text-xs mt-3 pt-3" style={{ borderTop: `1px solid ${T.panelBorder}`, color: T.textMuted }}>
              Total recovery time: <span style={{ color: T.textPrimary }}>{formatDuration(incident.resolution.recovery_minutes)}</span>
            </div>
          </Card>
        )}

        <Card className={`p-5 ${incident.resolution ? "" : "col-span-2"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Database size={14} color={T.ai} />
            <span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.ai }}>Memory generated</span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: T.textPrimary }}>{incident.memory_generated}</p>
        </Card>
      </div>
    </div>
  );
}

function StatsPage({ incidents }) {
  const stats = useMemo(() => {
    if (incidents.length === 0) return null;
    const avgConfidence = Math.round(incidents.reduce((sum, i) => sum + i.confidence, 0) / incidents.length);
    const byService = SERVICES.map((s) => ({ service: s.replace("-service", "").replace("-api", ""), count: incidents.filter((i) => i.service === s).length }));
    const rootCauseCounts = {};
    incidents.forEach((i) => { rootCauseCounts[i.title] = (rootCauseCounts[i.title] || 0) + 1; });
    const topRootCauses = Object.entries(rootCauseCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cause, count]) => ({ cause, count }));
    const sortedByTime = [...incidents].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const trend = sortedByTime.map((i, idx) => ({ idx: idx + 1, confidence: i.confidence }));
    const resolved = incidents.filter((i) => i.status === "Resolved");
    const mttr = resolved.length ? Math.round(resolved.reduce((s, i) => s + i.duration_minutes, 0) / resolved.length) : null;
    return { avgConfidence, byService, topRootCauses, trend, total: incidents.length, mttr, resolvedPct: Math.round((resolved.length / incidents.length) * 100) };
  }, [incidents]);

  if (!stats) return <div className="flex-1 flex items-center justify-center"><EmptyState title="Not enough data yet" subtitle="Stats will appear once incidents start coming in." /></div>;

  return (
    <div className="flex-1 overflow-auto px-8 py-7">
      <h1 className="text-xl font-semibold mb-1" style={{ color: T.textPrimary }}>Memory Dashboard</h1>
      <p className="text-xs mb-6" style={{ color: T.textMuted }}>Aggregate view of everything the system remembers.</p>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card className="p-5"><div className="text-xs mb-1" style={{ color: T.textMuted }}>Total incidents</div><div className="text-2xl font-semibold font-mono" style={{ color: T.textPrimary }}>{stats.total}</div></Card>
        <Card className="p-5"><div className="text-xs mb-1" style={{ color: T.textMuted }}>Avg confidence</div><div className="text-2xl font-semibold font-mono" style={{ color: confidenceColor(stats.avgConfidence) }}>{stats.avgConfidence}%</div></Card>
        <Card className="p-5"><div className="text-xs mb-1" style={{ color: T.textMuted }}>Services affected</div><div className="text-2xl font-semibold font-mono" style={{ color: T.textPrimary }}>{stats.byService.filter((s) => s.count > 0).length}</div></Card>
        <Card className="p-5"><div className="text-xs mb-1" style={{ color: T.textMuted }}>Avg MTTR</div><div className="text-2xl font-semibold font-mono" style={{ color: T.textPrimary }}>{stats.mttr != null ? formatDuration(stats.mttr) : "—"}</div></Card>
        <Card className="p-5"><div className="text-xs mb-1" style={{ color: T.textMuted }}>Resolved</div><div className="text-2xl font-semibold font-mono" style={{ color: T.good }}>{stats.resolvedPct}%</div></Card>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><BarChart3 size={14} color={T.textMuted} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.textMuted }}>Incidents by service</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.byService}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.panelBorder} vertical={false} />
              <XAxis dataKey="service" tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={{ stroke: T.panelBorder }} tickLine={false} />
              <YAxis tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.textPrimary }} cursor={{ fill: "#1C2028" }} />
              <Bar dataKey="count" fill={T.raw} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp size={14} color={T.textMuted} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.textMuted }}>Confidence trend</span></div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.panelBorder} vertical={false} />
              <XAxis dataKey="idx" tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={{ stroke: T.panelBorder }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: T.textMuted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: T.panel, border: `1px solid ${T.panelBorder}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: T.textPrimary }} />
              <Line type="monotone" dataKey="confidence" stroke={T.ai} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4"><Sparkles size={14} color={T.textMuted} /><span className="text-xs font-medium uppercase tracking-wide" style={{ color: T.textMuted }}>Most common root causes</span></div>
        <div className="flex flex-col gap-2">
          {stats.topRootCauses.map((rc, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="text-xs w-56 truncate" style={{ color: T.textPrimary }} title={rc.cause}>{rc.cause}</div>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "#1C2028" }}>
                <div className="h-2 rounded-full" style={{ width: `${(rc.count / stats.topRootCauses[0].count) * 100}%`, background: T.ai }} />
              </div>
              <div className="text-xs font-mono w-6 text-right" style={{ color: T.textMuted }}>{rc.count}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function IncidentMemoryDashboard() {
  const [page, setPage] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [toast, setToast] = useState(null);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const searchFocusedRef = useRef(false);

  const showToast = useCallback((t) => { setToast(t); setTimeout(() => setToast(null), 2800); }, []);

  const loadIncidents = useCallback(async () => {
    if (simulateOffline) { setLoading(false); setError("Connection to the backend was lost. (Simulated for demo.)"); return; }
    setLoading(true);
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      setError(null);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err.message || "Something went wrong loading incidents.");
    } finally {
      setLoading(false);
    }
  }, [simulateOffline]);

  useEffect(() => { loadIncidents(); }, [loadIncidents]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!searchFocusedRef.current && page === "dashboard") loadIncidents();
    }, 12000);
    return () => clearInterval(interval);
  }, [loadIncidents, page]);

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleConfidenceUpdate(id, newConfidence) {
    setIncidents((prev) => prev.map((inc) => (inc.id === id ? { ...inc, confidence: newConfidence } : inc)));
  }
  function openIncident(id) {
    setSelectedId(id);
    setPage("detail");
    setNotifOpen(false);
  }

  const selectedIncident = incidents.find((i) => i.id === selectedId);
  const pattern = useMemo(() => detectEmergingPattern(incidents), [incidents]);
  const notifications = useMemo(() => buildNotifications(incidents, pattern), [incidents, pattern]);

  return (
    <div className="w-full h-full flex font-sans relative" style={{ background: T.bg, minHeight: "640px", color: T.textPrimary }}>
      <NavRail page={page} setPage={(p) => { setPage(p); setSelectedId(null); }} onOpenPalette={() => setPaletteOpen(true)} />

      {page === "dashboard" && (
        <DashboardPage
          incidents={incidents}
          loading={loading}
          error={error}
          onRetry={loadIncidents}
          lastUpdated={lastUpdated}
          onOpenIncident={openIncident}
          onSearchFocusChange={(focused) => { searchFocusedRef.current = focused; }}
          pattern={pattern}
        />
      )}

      {page === "detail" && selectedIncident && (
        <IncidentDetailPage
          incident={selectedIncident}
          onBack={() => setPage("dashboard")}
          showToast={showToast}
          onConfidenceUpdate={handleConfidenceUpdate}
        />
      )}

      {page === "stats" && <StatsPage incidents={incidents} />}

      <div className="fixed top-4 right-4 flex items-center gap-2 z-40">
        <NotificationBell notifications={notifications} open={notifOpen} setOpen={setNotifOpen} onSelect={openIncident} />
        <button
          onClick={() => setSimulateOffline((v) => !v)}
          className="text-[10px] px-2.5 py-1.5 rounded-md transition-colors duration-150 hover:brightness-125"
          style={{
            background: simulateOffline ? `${T.bad}22` : "#1C2028",
            color: simulateOffline ? T.bad : T.textMuted,
            border: `1px solid ${simulateOffline ? T.bad + "55" : T.panelBorder}`,
          }}
          title="Dev-only: demonstrates the offline/error state"
        >
          {simulateOffline ? "Restore connection" : "Simulate offline"}
        </button>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} incidents={incidents} onSelect={openIncident} />
      <Toast toast={toast} />
    </div>
  );
}

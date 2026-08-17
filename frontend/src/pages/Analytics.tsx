import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, TrendingUp, PieChart as PieIcon, Activity, Clock } from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'

const byService = [
  { service: 'payment', count: 42, resolved: 38 },
  { service: 'api-gw', count: 31, resolved: 27 },
  { service: 'ml-infer', count: 28, resolved: 24 },
  { service: 'data-pipe', count: 23, resolved: 21 },
  { service: 'notif', count: 18, resolved: 16 },
  { service: 'auth', count: 12, resolved: 12 },
]

const errorCats = [
  { name: 'Timeout', value: 38, color: '#3b82f6' },
  { name: 'OOM', value: 22, color: '#8b5cf6' },
  { name: 'Connection', value: 18, color: '#06b6d4' },
  { name: 'Auth', value: 12, color: '#10b981' },
  { name: 'Data', value: 10, color: '#f59e0b' },
]

const confidenceTrend = [
  { date: 'Aug 1', confidence: 71 }, { date: 'Aug 3', confidence: 74 },
  { date: 'Aug 5', confidence: 76 }, { date: 'Aug 7', confidence: 79 },
  { date: 'Aug 9', confidence: 81 }, { date: 'Aug 11', confidence: 83 },
  { date: 'Aug 13', confidence: 85 }, { date: 'Aug 15', confidence: 87 },
  { date: 'Aug 17', confidence: 89 },
]

const perDay = [
  { date: 'Aug 10', incidents: 8, resolved: 7 },
  { date: 'Aug 11', incidents: 12, resolved: 10 },
  { date: 'Aug 12', incidents: 7, resolved: 7 },
  { date: 'Aug 13', incidents: 15, resolved: 12 },
  { date: 'Aug 14', incidents: 9, resolved: 9 },
  { date: 'Aug 15', incidents: 18, resolved: 15 },
  { date: 'Aug 16', incidents: 11, resolved: 10 },
  { date: 'Aug 17', incidents: 6, resolved: 5 },
]

const TOOLTIP_STYLE = {
  background: '#0d1424', border: '1px solid rgba(59,130,246,0.25)', borderRadius: 8,
  color: '#94a3b8', fontSize: 11, fontFamily: 'JetBrains Mono',
}

const activityTimeline = [
  { time: '08:23', event: 'INC-2847 analyzed', type: 'analysis', confidence: 94 },
  { time: '07:45', event: 'Memory write: embedding stored in CockroachDB', type: 'memory', confidence: null },
  { time: '07:12', event: 'INC-2846 resolved via AI recommendation', type: 'resolved', confidence: 87 },
  { time: '06:55', event: 'Vector search: 847 embeddings scanned', type: 'search', confidence: null },
  { time: '06:30', event: 'INC-2845 opened — Redis stream timeout', type: 'new', confidence: null },
  { time: '05:48', event: 'Feedback loop: confidence updated +2%', type: 'feedback', confidence: null },
]

const typeColor: Record<string, string> = {
  analysis: '#8b5cf6', memory: '#3b82f6', resolved: '#10b981',
  search: '#06b6d4', new: '#f59e0b', feedback: '#f43f5e',
}

export default function Analytics() {
  return (
    <MainLayout title="Analytics" subtitle="Incident trends, AI performance, and memory utilization">
      <div className="space-y-5 animate-fade-in">
        {/* Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} style={{ color: '#3b82f6' }} />
              <h3 className="text-sm font-semibold text-white">Incidents by Service</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byService} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis dataKey="service" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="count" name="Total" fill="#3b82f6" radius={[3, 3, 0, 0]} opacity={0.8} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <PieIcon size={14} style={{ color: '#8b5cf6' }} />
              <h3 className="text-sm font-semibold text-white">Error Categories</h3>
            </div>
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={200}>
                <PieChart>
                  <Pie data={errorCats} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {errorCats.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.85} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {errorCats.map(cat => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cat.color }} />
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.7)' }}>{cat.name}</span>
                    <span className="text-xs font-mono ml-auto" style={{ color: 'rgba(148,163,184,0.5)' }}>{cat.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} style={{ color: '#06b6d4' }} />
              <h3 className="text-sm font-semibold text-white">AI Confidence Trend</h3>
              <span className="ml-auto text-xs font-mono" style={{ color: '#34d399' }}>↑ +18% this month</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={confidenceTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="confidence" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} style={{ color: '#f59e0b' }} />
              <h3 className="text-sm font-semibold text-white">Incidents per Day</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={perDay}>
                <defs>
                  <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(59,130,246,0.08)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Area type="monotone" dataKey="incidents" name="Total" stroke="#3b82f6" fill="url(#gradTotal)" strokeWidth={2} />
                <Area type="monotone" dataKey="resolved" name="Resolved" stroke="#10b981" fill="url(#gradResolved)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Timeline */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} style={{ color: '#a78bfa' }} />
            <h3 className="text-sm font-semibold text-white">Activity Timeline</h3>
          </div>
          <div className="relative">
            <div className="absolute left-[72px] top-0 bottom-0 w-px" style={{ background: 'rgba(59,130,246,0.15)' }} />
            <div className="space-y-4">
              {activityTimeline.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <span className="text-[11px] font-mono w-14 shrink-0 mt-0.5 text-right" style={{ color: 'rgba(148,163,184,0.4)' }}>{item.time}</span>
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 relative z-10" style={{ background: typeColor[item.type] }} />
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: 'rgba(148,163,184,0.75)' }}>{item.event}</span>
                    {item.confidence && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa' }}>
                        {item.confidence}% conf
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

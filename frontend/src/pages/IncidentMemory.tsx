import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Database, Search, Filter, Eye, Trash2, Download, Brain } from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp, type Incident } from '@/context/AppContext'

const SERVICES = ['All', 'payment-service', 'api-gateway', 'notification-worker', 'ml-inference', 'data-pipeline', 'auth-service']
const SEVERITIES = ['All', 'critical', 'high', 'medium', 'low']

export default function IncidentMemory() {
  const { incidents } = useApp()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [service, setService] = useState('All')
  const [severity, setSeverity] = useState('All')
  const [page, setPage] = useState(1)
  const PER_PAGE = 5

  const filtered = incidents.filter(i => {
    const matchSearch = !search ||
      i.id.toLowerCase().includes(search.toLowerCase()) ||
      i.error.toLowerCase().includes(search.toLowerCase()) ||
      i.summary.toLowerCase().includes(search.toLowerCase()) ||
      i.rootCause.toLowerCase().includes(search.toLowerCase())
    const matchService = service === 'All' || i.service === service
    const matchSev = severity === 'All' || i.severity === severity
    return matchSearch && matchService && matchSev
  })

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const totalPages = Math.ceil(filtered.length / PER_PAGE)

  const Select = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) => (
    <select
      value={value}
      onChange={e => { onChange(e.target.value); setPage(1) }}
      className="px-3 py-2 text-xs rounded-lg outline-none"
      style={{ background: '#0d1424', border: '1px solid rgba(59,130,246,0.2)', color: '#94a3b8' }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  )

  return (
    <MainLayout title="Incident Memory" subtitle="847 incidents stored in CockroachDB vector memory">
      <div className="space-y-5 animate-fade-in">
        {/* Header stat */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Memories', value: '847', icon: Database, color: '#8b5cf6' },
            { label: 'Vector Embeddings', value: '847', icon: Brain, color: '#3b82f6' },
            { label: 'Avg Similarity Score', value: '91.4%', icon: Search, color: '#06b6d4' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</p>
                <p className="text-lg font-bold font-mono text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(148,163,184,0.5)' }} />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search incident ID, error, root cause..."
              className="w-full pl-8 pr-4 py-2 text-xs rounded-lg outline-none"
              style={{ background: '#070b16', border: '1px solid rgba(59,130,246,0.15)', color: '#94a3b8' }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={13} style={{ color: 'rgba(148,163,184,0.5)' }} />
            <Select value={service} onChange={setService} options={SERVICES} />
            <Select value={severity} onChange={setSeverity} options={SEVERITIES} />
          </div>
          <span className="text-xs ml-auto" style={{ color: 'rgba(148,163,184,0.5)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Table */}
        <div className="glass rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'rgba(59,130,246,0.05)', borderBottom: '1px solid rgba(59,130,246,0.1)' }}>
                {['Incident ID', 'Service', 'Raw Error', 'AI Summary', 'Root Cause', 'Recommendation', 'Confidence', 'Created', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide whitespace-nowrap" style={{ color: 'rgba(148,163,184,0.5)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <Database size={32} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm" style={{ color: 'rgba(148,163,184,0.5)' }}>No incidents match your filters</p>
                  </td>
                </tr>
              ) : paged.map(inc => (
                <tr key={inc.id} className="hover:bg-white/[0.02] transition-colors" style={{ borderBottom: '1px solid rgba(59,130,246,0.06)' }}>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-semibold" style={{ color: '#60a5fa' }}>{inc.id}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-white whitespace-nowrap">{inc.service}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[140px]">
                    <span className="text-xs block truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.error.slice(0, 40)}...</span>
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    <span className="text-xs block truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.summary.slice(0, 50)}...</span>
                  </td>
                  <td className="px-4 py-3 max-w-[150px]">
                    <span className="text-xs block truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.rootCause.slice(0, 40)}...</span>
                  </td>
                  <td className="px-4 py-3 max-w-[150px]">
                    <span className="text-xs block truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.recommendation.slice(0, 40)}...</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}>
                        <div className="h-full rounded-full" style={{ width: `${inc.confidence}%`, background: inc.confidence >= 90 ? '#10b981' : '#3b82f6' }} />
                      </div>
                      <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.7)' }}>{inc.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.5)' }}>
                      {new Date(inc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => navigate(`/incident/${inc.id}`)} className="p-1.5 rounded hover:bg-blue-500/10" title="View">
                        <Eye size={12} style={{ color: '#60a5fa' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-emerald-500/10" title="Export">
                        <Download size={12} style={{ color: '#34d399' }} />
                      </button>
                      <button className="p-1.5 rounded hover:bg-rose-500/10" title="Delete">
                        <Trash2 size={12} style={{ color: '#f87171' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '1px solid rgba(59,130,246,0.1)' }}>
              <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className="w-7 h-7 rounded text-xs font-mono transition-colors"
                    style={{
                      background: p === page ? '#3b82f6' : 'rgba(59,130,246,0.1)',
                      color: p === page ? 'white' : '#94a3b8',
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}

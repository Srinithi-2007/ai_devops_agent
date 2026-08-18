import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Brain, ThumbsUp, ThumbsDown, RefreshCw, Download, Terminal, Lightbulb, Search, GitBranch } from 'lucide-react'
import MainLayout from '@/layouts/MainLayout'
import { useApp } from '@/context/AppContext'
import ConfidenceGauge from '@/components/ConfidenceGauge'

function Section({ label, icon: Icon, color, children }: { label: string; icon: any; color: string; children: React.ReactNode }) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(59,130,246,0.1)', background: `${color}08` }}>
        <Icon size={14} style={{ color }} />
        <h3 className="text-sm font-semibold text-white">{label}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

export default function IncidentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { incidents, setIncidents, addNotification, analyzeIncident } = useApp()
  const inc = incidents.find(i => i.id === id)

  const [similarIncidents, setSimilarIncidents] = useState<any[]>([])

  useEffect(() => {
    if (!id) return
    const fetchSimilar = async () => {
      try {
        const url = localStorage.getItem('API_BASE_URL') || 'http://localhost:5000'
        const res = await fetch(`${url}/similar/${id}`)
        if (!res.ok) throw new Error('Failed to fetch similar incidents')
        const data = await res.json()
        const mapped = data.map((apiInc: any) => ({
          id: apiInc.id,
          service: apiInc.service,
          error: apiInc.error,
          similarity: Math.round(apiInc.similarity * 100),
          resolvedAt: apiInc.created_at || new Date().toISOString()
        }))
        setSimilarIncidents(mapped)
      } catch (err: any) {
        console.error('Failed to load similar incidents:', err)
      }
    }
    fetchSimilar()
  }, [id])

  const handleFeedback = async (useful: boolean) => {
    if (!id) return
    try {
      const url = localStorage.getItem('API_BASE_URL') || 'http://localhost:5000'
      const res = await fetch(`${url}/feedback/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useful })
      })
      if (!res.ok) throw new Error('Feedback submission failed')
      const result = await res.json()
      
      // Update local state
      if (inc) {
        inc.confidence = result.confidence
        setIncidents([...incidents])
      }
      addNotification('success', `Feedback recorded — confidence updated to ${result.confidence}%`)
    } catch (err: any) {
      console.error(err)
      addNotification('error', `Failed to submit feedback: ${err.message}`)
    }
  }

  if (!inc) return (
    <MainLayout title="Incident Not Found">
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-white mb-4">Incident {id} not found</p>
        <button onClick={() => navigate('/')} className="text-blue-400 text-sm hover:underline">← Back to Dashboard</button>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout title={inc.id} subtitle={`${inc.service} · ${inc.severity.toUpperCase()} severity`}>
      <div className="space-y-5 animate-fade-in">
        {/* Back + actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm transition-colors hover:text-white"
            style={{ color: 'rgba(148,163,184,0.6)' }}
          >
            <ArrowLeft size={15} />
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}
            >
              <ThumbsUp size={14} />
              Useful
            </button>
            <button
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.25)', color: '#f87171' }}
            >
              <ThumbsDown size={14} />
              Not Useful
            </button>
            <button
              onClick={analyzeIncident}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa' }}
            >
              <RefreshCw size={14} />
              Reanalyze
            </button>
            <button
              onClick={() => addNotification('info', 'Generating incident report PDF...')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
            >
              <Download size={14} />
              Report
            </button>
          </div>
        </div>

        {/* AI flow */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Main analysis */}
          <div className="lg:col-span-2 space-y-4">
            <Section label="Raw Log" icon={Terminal} color="#f59e0b">
              <pre className="text-xs font-mono p-3 rounded-lg overflow-x-auto" style={{ background: '#070b16', color: '#fbbf24', lineHeight: 1.6 }}>
                {`[ERROR] ${new Date(inc.createdAt).toISOString()}\nService: ${inc.service}\nHost: pod-${inc.service}-7d9f4b-xkq2p\n\n${inc.error}\n\nStack trace:\n  at ${inc.service}.main(Handler.java:142)\n  at io.vertx.core.impl.ContextImpl.executeTask(ContextImpl.java:369)\n  at io.vertx.core.impl.EventLoopContext.execute(EventLoopContext.java:43)`}
              </pre>
            </Section>

            <Section label="AI Summary" icon={Brain} color="#8b5cf6">
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>{inc.summary}</p>
            </Section>

            <Section label="Root Cause Analysis" icon={Search} color="#3b82f6">
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>{inc.rootCause}</p>
            </Section>

            {similarIncidents && similarIncidents.length > 0 && (
              <Section label="Similar Incidents Retrieved from Memory" icon={GitBranch} color="#06b6d4">
                <div className="space-y-3">
                  {similarIncidents.map(sim => (
                    <div key={sim.id} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono font-semibold" style={{ color: '#22d3ee' }}>{sim.id}</span>
                          <span className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>{sim.service}</span>
                        </div>
                        <p className="text-xs truncate" style={{ color: 'rgba(148,163,184,0.7)' }}>{sim.error}</p>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-sm font-bold font-mono" style={{ color: '#22d3ee' }}>{sim.similarity}%</div>
                        <div className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>similarity</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px]" style={{ color: 'rgba(148,163,184,0.4)' }}>resolved</div>
                        <div className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>
                          {new Date(sim.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section label="Recommended Fix" icon={Lightbulb} color="#10b981">
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>{inc.recommendation}</p>
            </Section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="glass rounded-xl p-5 flex flex-col items-center">
              <h3 className="text-sm font-semibold text-white mb-4">AI Confidence</h3>
              <ConfidenceGauge value={inc.confidence} size={120} />
              <div className="mt-4 w-full space-y-2">
                {[
                  { label: 'Root Cause Match', v: Math.round(inc.confidence * 0.98) },
                  { label: 'Memory Retrieval', v: Math.round(inc.confidence * 0.95) },
                  { label: 'Fix Accuracy', v: Math.round(inc.confidence * 0.92) },
                ].map(({ label, v }) => (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[11px]" style={{ color: 'rgba(148,163,184,0.6)' }}>{label}</span>
                      <span className="text-[11px] font-mono" style={{ color: 'rgba(148,163,184,0.7)' }}>{v}%</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: 'rgba(59,130,246,0.15)' }}>
                      <div className="h-full rounded-full" style={{ width: `${v}%`, background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white">Incident Metadata</h3>
              {[
                { label: 'ID', value: inc.id },
                { label: 'Service', value: inc.service },
                { label: 'Severity', value: inc.severity.toUpperCase() },
                { label: 'Status', value: inc.status },
                { label: 'Memories Retrieved', value: similarIncidents?.length ?? 0 },
                { label: 'Created', value: new Date(inc.createdAt).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>{label}</span>
                  <span className="text-xs font-mono" style={{ color: 'rgba(148,163,184,0.85)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3">Engineer Feedback</h3>
              <p className="text-xs mb-4" style={{ color: 'rgba(148,163,184,0.6)' }}>
                Your feedback trains the AI — each response improves future confidence scores.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleFeedback(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                  style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399' }}
                >
                  <ThumbsUp size={13} />
                  Useful
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium"
                  style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f87171' }}
                >
                  <ThumbsDown size={13} />
                  Not Useful
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

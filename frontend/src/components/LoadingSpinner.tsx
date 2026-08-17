export function LoadingSpinner({ size = 20 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-t-transparent animate-spin"
      style={{ width: size, height: size, borderColor: 'rgba(59,130,246,0.3)', borderTopColor: '#3b82f6' }}
    />
  )
}

export function SkeletonRow() {
  return (
    <div className="flex gap-3 px-4 py-3">
      {[80, 120, 60, 180, 100, 80, 90].map((w, i) => (
        <div key={i} className="skeleton h-4 rounded" style={{ width: w, flexShrink: 0 }} />
      ))}
    </div>
  )
}

export function AnalyzingOverlay() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(59,130,246,0.2)', borderTopColor: '#3b82f6' }} />
        <div className="absolute inset-2 w-12 h-12 rounded-full border-2 animate-spin" style={{ borderColor: 'rgba(139,92,246,0.2)', borderTopColor: '#8b5cf6', animationDirection: 'reverse', animationDuration: '0.8s' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-white mb-1">Analyzing with Amazon Bedrock</p>
        <p className="text-xs" style={{ color: 'rgba(148,163,184,0.6)' }}>Retrieving similar incidents from CockroachDB...</p>
      </div>
      <div className="flex gap-1">
        {['Embedding', 'Vector Search', 'RAG', 'Analysis'].map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#3b82f6', animationDelay: `${i * 0.3}s` }} />
            <span className="text-[10px] font-mono" style={{ color: 'rgba(148,163,184,0.6)' }}>{step}</span>
            {i < 3 && <span className="mx-1" style={{ color: 'rgba(148,163,184,0.3)' }}>→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

interface Props {
  value: number
  size?: number
}

export default function ConfidenceGauge({ value, size = 80 }: Props) {
  const r = (size / 2) - 8
  const circumference = 2 * Math.PI * r
  const arc = circumference * 0.75
  const offset = arc - (arc * value / 100)
  const color = value >= 90 ? '#10b981' : value >= 70 ? '#3b82f6' : value >= 50 ? '#f59e0b' : '#f43f5e'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-[135deg]">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth={6}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeLinecap="round"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${arc} ${circumference - arc}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="text-center -mt-10">
        <div className="text-xl font-bold font-mono" style={{ color }}>{value}%</div>
        <div className="text-[10px]" style={{ color: 'rgba(148,163,184,0.5)' }}>confidence</div>
      </div>
    </div>
  )
}

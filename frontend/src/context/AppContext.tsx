import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

export interface Incident {
  id: string
  service: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  error: string
  summary: string
  rootCause: string
  recommendation: string
  confidence: number
  status: 'resolved' | 'analyzing' | 'open' | 'failed'
  createdAt: string
  similarIncidents?: SimilarIncident[]
}

export interface SimilarIncident {
  id: string
  service: string
  error: string
  similarity: number
  resolvedAt: string
}

export interface HealthService {
  name: string
  status: 'online' | 'warning' | 'offline'
  latency: number
  lastChecked: string
  uptime: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  memories?: SimilarIncident[]
  thinking?: boolean
}

interface AppState {
  incidents: Incident[]
  loading: boolean
  analyzing: boolean
  healthServices: HealthService[]
  chatMessages: ChatMessage[]
  notifications: { id: string; type: 'success' | 'error' | 'info'; message: string }[]
  dashboardStats: { total: number; resolvedByAI: number; memoryStored: number; avgConfidence: number; systemHealth: number }
  setIncidents: (i: Incident[]) => void
  addNotification: (type: 'success' | 'error' | 'info', message: string) => void
  removeNotification: (id: string) => void
  analyzeIncident: () => Promise<void>
  sendChatMessage: (msg: string) => Promise<void>
  refreshHealth: () => Promise<void>
}

const AppContext = createContext<AppState | null>(null)

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-2847',
    service: 'payment-service',
    severity: 'critical',
    error: 'ConnectionPoolExhaustedException: Unable to acquire connection from pool after 30000ms',
    summary: 'Payment service database connection pool exhausted causing complete service failure',
    rootCause: 'Gradual connection leak in transaction handling code combined with traffic spike during flash sale event',
    recommendation: 'Increase pool size to 200, add connection timeout of 5s, implement circuit breaker pattern, and fix transaction cleanup in PaymentProcessor.java:247',
    confidence: 94,
    status: 'resolved',
    createdAt: '2026-08-17T08:23:11Z',
    similarIncidents: [
      { id: 'INC-1923', service: 'order-service', error: 'Connection pool exhausted', similarity: 96, resolvedAt: '2026-07-12T14:30:00Z' },
      { id: 'INC-2104', service: 'user-service', error: 'DB pool timeout', similarity: 88, resolvedAt: '2026-07-28T09:15:00Z' },
    ],
  },
  {
    id: 'INC-2846',
    service: 'api-gateway',
    severity: 'high',
    error: 'RequestTimeoutException: Upstream service /catalog/search exceeded 10s SLA',
    summary: 'API Gateway routing timeouts to catalog search service causing 503 errors for 34% of users',
    rootCause: 'Elasticsearch index fragmentation after large product import batch job created uneven shard distribution',
    recommendation: 'Force merge Elasticsearch indices, redistribute shards, and increase gateway timeout to 15s temporarily',
    confidence: 87,
    status: 'resolved',
    createdAt: '2026-08-17T06:45:00Z',
    similarIncidents: [
      { id: 'INC-2201', service: 'search-service', error: 'ES index fragmentation', similarity: 91, resolvedAt: '2026-08-01T11:20:00Z' },
    ],
  },
  {
    id: 'INC-2845',
    service: 'notification-worker',
    severity: 'medium',
    error: 'RedisCommandTimeoutException: Command XADD timed out after 3000ms',
    summary: 'Notification worker stream writes failing intermittently due to Redis memory pressure',
    rootCause: 'Redis maxmemory policy evicting stream entries prematurely, combined with growing consumer group lag',
    recommendation: 'Set maxmemory-policy to noeviction for stream keys, add XLEN monitoring alert at 100k entries',
    confidence: 79,
    status: 'open',
    createdAt: '2026-08-16T22:10:00Z',
    similarIncidents: [],
  },
  {
    id: 'INC-2844',
    service: 'ml-inference',
    severity: 'high',
    error: 'CUDA out of memory. Tried to allocate 2.50 GiB (GPU 0; 15.90 GiB total capacity)',
    summary: 'ML inference service GPU OOM killing model serving pods in us-east-1',
    rootCause: 'Memory fragmentation from concurrent batch inference requests with varying tensor sizes',
    recommendation: 'Enable CUDA memory fraction limiting, implement request batching with fixed sizes, add GPU memory monitoring',
    confidence: 91,
    status: 'analyzing',
    createdAt: '2026-08-16T19:30:00Z',
    similarIncidents: [
      { id: 'INC-2710', service: 'ml-inference', error: 'GPU OOM', similarity: 97, resolvedAt: '2026-08-10T08:00:00Z' },
    ],
  },
  {
    id: 'INC-2843',
    service: 'data-pipeline',
    severity: 'critical',
    error: 'KafkaException: Leader not available for partition orders-events-7',
    summary: 'Kafka partition leader election failure causing data pipeline backlog of 2.3M events',
    rootCause: 'Broker 3 network partition caused by AWS ENI attachment failure in eu-west-1b AZ',
    recommendation: 'Increase replication factor to 3 for critical topics, enable unclean leader election for orders-events topic',
    confidence: 96,
    status: 'resolved',
    createdAt: '2026-08-16T14:00:00Z',
    similarIncidents: [
      { id: 'INC-1834', service: 'data-pipeline', error: 'Kafka leader election', similarity: 93, resolvedAt: '2026-06-20T16:45:00Z' },
    ],
  },
  {
    id: 'INC-2842',
    service: 'auth-service',
    severity: 'low',
    error: 'JWT validation failed: token signature mismatch for 12 requests',
    summary: 'Intermittent JWT signature failures traced to clock skew between auth nodes',
    rootCause: 'NTP sync drift of 8 seconds on auth-pod-3 after kernel update causing token expiry validation errors',
    recommendation: 'Enforce chrony NTP sync in container startup, add 30s leeway to JWT validation',
    confidence: 82,
    status: 'resolved',
    createdAt: '2026-08-15T11:20:00Z',
    similarIncidents: [],
  },
]

const MOCK_HEALTH: HealthService[] = [
  { name: 'Backend API', status: 'online', latency: 23, lastChecked: new Date().toISOString(), uptime: 99.97 },
  { name: 'CockroachDB', status: 'online', latency: 8, lastChecked: new Date().toISOString(), uptime: 99.99 },
  { name: 'AWS Bedrock', status: 'online', latency: 142, lastChecked: new Date().toISOString(), uptime: 99.9 },
  { name: 'AWS CloudWatch', status: 'warning', latency: 380, lastChecked: new Date().toISOString(), uptime: 98.2 },
  { name: 'API Gateway', status: 'online', latency: 11, lastChecked: new Date().toISOString(), uptime: 99.95 },
  { name: 'Vector Store', status: 'online', latency: 34, lastChecked: new Date().toISOString(), uptime: 99.8 },
]

const MOCK_RESPONSES = [
  {
    content: "Based on memory retrieval across **847 stored incidents**, I've identified this pattern: Connection pool exhaustion in payment services typically correlates with flash sale traffic events. I recommend implementing circuit breakers with a 60% threshold and increasing your pool ceiling to 200 connections. Similar issues were resolved in INC-1923 and INC-2104.",
    memories: [
      { id: 'INC-1923', service: 'order-service', error: 'Connection pool exhausted during checkout', similarity: 96, resolvedAt: '2026-07-12T14:30:00Z' },
      { id: 'INC-2104', service: 'user-service', error: 'DB pool timeout under load', similarity: 88, resolvedAt: '2026-07-28T09:15:00Z' },
    ],
  },
  {
    content: "Analyzing your Kubernetes OOM patterns: I've retrieved 12 similar incidents from CockroachDB memory. The root cause in 83% of cases was unbounded JVM heap without container limits. Set `-Xmx` to 70% of container memory limit, and add `resources.limits.memory` to your deployment spec. This pattern was last seen in INC-2711.",
    memories: [
      { id: 'INC-2711', service: 'java-service', error: 'OOMKilled by container runtime', similarity: 94, resolvedAt: '2026-08-11T09:00:00Z' },
    ],
  },
  {
    content: "Your Kafka lag question: Memory shows that consumer group lag above 500k messages in the `orders-events` topic consistently precedes a cascade failure. Increase consumer parallelism by 3x and temporarily enable `auto.offset.reset=earliest` on the affected consumer group. Estimated recovery: 45 minutes based on historical throughput.",
    memories: [
      { id: 'INC-1834', service: 'data-pipeline', error: 'Kafka partition leader election failure', similarity: 93, resolvedAt: '2026-06-20T16:45:00Z' },
    ],
  },
]

const getApiUrl = () => localStorage.getItem('API_BASE_URL') || 'http://localhost:8000';

export function AppProvider({ children }: { children: ReactNode }) {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [healthServices, setHealthServices] = useState<HealthService[]>(MOCK_HEALTH)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "I'm the AI Operations Agent with access to persistent incident memory in CockroachDB. I can analyze errors, retrieve similar past incidents, and recommend fixes. What would you like to investigate?",
      timestamp: new Date().toISOString(),
    },
  ])
  const [notifications, setNotifications] = useState<AppState['notifications']>([])

  const addNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).slice(2)
    setNotifications(n => [...n, { id, type, message }])
    setTimeout(() => setNotifications(n => n.filter(x => x.id !== id)), 4000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(n => n.filter(x => x.id !== id))
  }, [])

  const fetchIncidents = useCallback(async () => {
    setLoading(true)
    try {
      const url = getApiUrl()
      const res = await fetch(`${url}/incidents`)
      if (!res.ok) throw new Error('Failed to fetch incidents')
      const data = await res.json()
      
      const mapped = data.map((apiInc: any): Incident => ({
        id: apiInc.id,
        service: apiInc.service,
        severity: apiInc.severity || 'medium',
        error: apiInc.error,
        summary: apiInc.root_cause || 'No summary available.',
        rootCause: apiInc.root_cause || 'No root cause determined.',
        recommendation: apiInc.fix || 'No fix recommended.',
        confidence: apiInc.confidence || 50,
        status: apiInc.times_seen > 1 ? 'resolved' : 'open',
        createdAt: apiInc.created_at || new Date().toISOString(),
      }))
      setIncidents(mapped)
    } catch (err: any) {
      console.error(err)
      addNotification('error', `Failed to load incidents from backend: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  const dashboardStats = {
    total: incidents.length,
    resolvedByAI: incidents.filter(i => i.status === 'resolved').length,
    memoryStored: incidents.length,
    avgConfidence: incidents.length ? Math.round(incidents.reduce((s, i) => s + i.confidence, 0) / incidents.length) : 0,
    systemHealth: 98,
  }

  const analyzeIncident = useCallback(async () => {
    setAnalyzing(true)
    addNotification('info', 'Sending incident to backend for analysis...')
    try {
      const url = getApiUrl()
      const services = ['inventory-service', 'checkout-service', 'recommendation-engine']
      const service = services[Math.floor(Math.random() * services.length)]
      const payload = {
        service,
        error: 'SocketTimeoutException: Read timed out after 5000ms connecting to downstream service',
        severity: 'high'
      }
      
      const res = await fetch(`${url}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Analysis request failed')
      const result = await res.json()
      
      addNotification('success', `Analysis complete — stored in memory with ${result.confidence}% confidence`)
      await fetchIncidents()
    } catch (err: any) {
      console.error(err)
      addNotification('error', `Failed to analyze incident: ${err.message}`)
    } finally {
      setAnalyzing(false)
    }
  }, [addNotification, fetchIncidents])

  const sendChatMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content, timestamp: new Date().toISOString() }
    const thinkingMsg: ChatMessage = { id: 'thinking', role: 'assistant', content: '', timestamp: new Date().toISOString(), thinking: true }
    setChatMessages(prev => [...prev, userMsg, thinkingMsg])
    
    try {
      const url = getApiUrl()
      const res = await fetch(`${url}/search?q=${encodeURIComponent(content)}`)
      if (!res.ok) throw new Error('Search failed')
      const matches = await res.json()
      
      let reply = ""
      let memories: SimilarIncident[] = []
      
      if (matches.length > 0) {
        reply = `Based on memory retrieval across **stored incidents**, I've found **${matches.length} matching incident(s)**. Here is what I recommend:`
        memories = matches.slice(0, 3).map((m: any) => ({
          id: m.id,
          service: m.service,
          error: m.error,
          similarity: Math.round(m.confidence || 80),
          resolvedAt: m.created_at
        }))
        
        reply += `\n\n**Recommended Fix (from ${matches[0].id}):**\n${matches[0].fix || 'No fix recorded.'}`
      } else {
        reply = "I scanned the database memory but couldn't find any exact matches for your query. Try searching for other terms like 'timeout', 'connection', or 'JWT'."
      }
      
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
        memories
      }
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(assistantMsg))
    } catch (err: any) {
      console.error(err)
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error communicating with AI operations backend: ${err.message}`,
        timestamp: new Date().toISOString()
      }
      setChatMessages(prev => prev.filter(m => m.id !== 'thinking').concat(assistantMsg))
    }
  }, [])

  const refreshHealth = useCallback(async () => {
    try {
      const url = getApiUrl()
      const start = Date.now()
      const res = await fetch(`${url}/ping`)
      const latency = Date.now() - start
      
      setHealthServices(prev =>
        prev.map(s => {
          if (s.name === 'Backend API') {
            return {
              ...s,
              status: res.ok ? 'online' : 'offline',
              latency: latency,
              lastChecked: new Date().toISOString()
            }
          }
          return {
            ...s,
            lastChecked: new Date().toISOString()
          }
        })
      )
      if (res.ok) {
        addNotification('success', `Health check complete — backend API online (${latency}ms)`)
      } else {
        addNotification('error', 'Backend API health check failed')
      }
    } catch (err: any) {
      setHealthServices(prev =>
        prev.map(s => s.name === 'Backend API' ? { ...s, status: 'offline', lastChecked: new Date().toISOString() } : s)
      )
      addNotification('error', `Backend API unreachable: ${err.message}`)
    }
  }, [addNotification])

  return (
    <AppContext.Provider value={{
      incidents, loading, analyzing, healthServices, chatMessages, notifications, dashboardStats,
      setIncidents, addNotification, removeNotification, analyzeIncident, sendChatMessage, refreshHealth,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

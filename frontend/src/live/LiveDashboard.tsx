import { LiveActivityPanel } from './LiveActivityPanel'
import './live-actions.css'
import { useEffect, useState } from 'react'
import { asList, getJson, type ApiRow } from './api'

type Health = { status?: string; databases?: Record<string, string> }
type Summary = { health: Health | null; totals: Record<string, number | null>; failures: string[] }
const sources: [string, string][] = [
  ['Veículos anunciados', '/vehicles?page=1&limit=1'],
  ['Anúncios publicados', '/advertisements?page=1&limit=1'],
  ['Leads', '/leads?page=1&limit=1'],
  ['Agendamentos', '/appointments?page=1&limit=1'],
  ['Vendas', '/sales?page=1&limit=1'],
  ['Auditorias (amostra)', '/audit-events?limit=100'],
]
export function LiveDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    const tasks = [getJson<Health>('/health', controller.signal), ...sources.map(([,url])=>getJson<unknown>(url,controller.signal))]
    Promise.allSettled(tasks).then(results => {
      if(controller.signal.aborted) return
      const health = results[0].status==='fulfilled' ? results[0].value as Health : null
      const totals: Record<string,number|null> = {}
      const failures: string[] = []
      sources.forEach(([label],i) => {
        const r = results[i+1]
        if(r.status==='fulfilled') {
          const parsed=asList<ApiRow>(r.value)
          totals[label] = parsed.pagination?.total ?? parsed.data.length
        } else { totals[label]=null; failures.push(label) }
      })
      setSummary({health,totals,failures})
    })
    return ()=> controller.abort()
  },[revision])
  return <div className="live-dashboard">
    <div className="live-panel-top"><div><h2>Indicadores do sistema</h2><p>Contagens PostgreSQL e amostra de até 100 auditorias MongoDB</p></div><button onClick={()=>setRevision(r=>r+1)}>Atualizar</button></div>
    {!summary ? <p className="live-info">Consultando PostgreSQL, MongoDB e Cassandra...</p> : <>
      <div className="live-metrics">{Object.entries(summary.totals).map(([label,total])=><article key={label}><span>{label}</span><strong>{total === null ? '—' : total.toLocaleString('pt-BR')}</strong><small>{label.startsWith('Auditorias')?'MongoDB':'PostgreSQL'}</small></article>)}</div>
      <section className="live-status"><h3>Disponibilidade dos bancos</h3>{['postgresql','mongodb','cassandra'].map(db=><div key={db}><strong>{db==='postgresql'?'PostgreSQL':db==='mongodb'?'MongoDB':'Cassandra'}</strong><span className={summary.health?.databases?.[db]==='connected'?'connected':'disconnected'}>{summary.health?.databases?.[db] ?? 'Sem conexão'}</span></div>)}
      {summary.failures.length>0&&<p className="live-error">Algumas consultas falharam: {summary.failures.join(', ')}.</p>}</section>
    </>}
    <LiveActivityPanel/>
    <p className="live-note">O dashboard original do Figma contém métricas simuladas. Esta visão mostra os números efetivamente retornados pelo backend.</p>
  </div>
}

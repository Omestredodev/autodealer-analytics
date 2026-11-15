import { useEffect, useState } from 'react'
import { dateBR, type ApiRow } from './api'
import { getJson } from './api'

type ActivityResponse = { data?: ApiRow[] }
export function LiveActivityPanel() {
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [revision, setRevision] = useState(0)
  const [events, setEvents] = useState<ApiRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    Promise.all([0,1,2,3].map(shard => getJson<ActivityResponse>(`/activity-events?day=${encodeURIComponent(day)}&shard=${shard}&limit=20`,controller.signal)))
      .then(results => {
        if(controller.signal.aborted) return
        const all = results.flatMap(part => part.data ?? [])
        all.sort((a,b) => String(b.occurred_at ?? '').localeCompare(String(a.occurred_at ?? '')))
        setEvents(all)
      })
      .catch(cause => { if(!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Falha ao ler Cassandra') })
      .finally(() => { if(!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [day, revision])
  return <section className="live-activity">
    <div className="live-activity-header"><h3>Atividade recente — Cassandra</h3><label>Dia UTC <input type="date" aria-label="Dia UTC" value={day} onChange={event => setDay(event.target.value)}/></label><button onClick={() => setRevision(value => value+1)}>Atualizar eventos</button></div>
    <p>Até 20 registros por shard (quatro shards). Esta é uma amostra consultada por partição, não uma contagem total global.</p>
    {loading && <p>Consultando os quatro shards...</p>}
    {error && <p className="live-error" role="alert">{error}</p>}
    {!loading && !error && <div className="live-table-scroll"><table><thead><tr><th>Quando (horário local)</th><th>Tipo</th><th>Anúncio</th><th>Veículo</th></tr></thead><tbody>
      {events.slice(0,10).map((event,index) => <tr key={String(event.event_id ?? index)}><td>{dateBR(typeof event.occurred_at==='string'?event.occurred_at:'')}</td><td>{String(event.event_type??'—')}</td><td>{String(event.advertisement_id??'—').slice(0,8)}</td><td>{String(event.vehicle_id??'—').slice(0,8)}</td></tr>)}
      {!events.length&&<tr><td colSpan={4}>Nenhum evento encontrado para este dia.</td></tr>}
    </tbody></table></div>}
  </section>
}

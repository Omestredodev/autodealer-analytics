import { useMemo, useState } from 'react'
import { cellText, dateBR, money, type ApiRow } from './api'
import { useResource } from './useResource'

type Column = { key: string; label: string; format?: 'money' | 'date' | 'short' | 'status' }
type ModuleConfig = { title: string; description: string; url: string; columns: Column[] }
const modules: Record<string, ModuleConfig> = {
  'Veículos': { title: 'Estoque disponível', description: 'Veículos disponíveis com anúncios publicados • PostgreSQL', url: '/vehicles', columns: [
    { key: 'id', label: 'ID', format: 'short' }, { key: 'make', label: 'Marca' }, { key: 'model', label: 'Modelo' }, { key: 'model_year', label: 'Ano' }, { key: 'mileage', label: 'KM' }, { key: 'price', label: 'Preço', format: 'money' }, { key: 'status', label: 'Situação', format: 'status' },
  ] },
  'Anúncios': { title: 'Anúncios publicados', description: 'Anúncios ativos associados a veículos • PostgreSQL', url: '/advertisements', columns: [
    { key: 'id', label: 'ID', format: 'short' }, { key: 'title', label: 'Título' }, { key: 'price', label: 'Preço', format: 'money' }, { key: 'status', label: 'Situação', format: 'status' }, { key: 'published_at', label: 'Publicado em', format: 'date' },
  ] },
  'Leads': { title: 'Leads', description: 'Oportunidades comerciais • PostgreSQL', url: '/leads', columns: [
    { key: 'id', label: 'ID', format: 'short' }, { key: 'customer_id', label: 'Cliente', format: 'short' }, { key: 'advertisement_id', label: 'Anúncio', format: 'short' }, { key: 'source', label: 'Origem' }, { key: 'status', label: 'Situação', format: 'status' }, { key: 'created_at', label: 'Criado em', format: 'date' },
  ] },
  'Agendamentos': { title: 'Agendamentos', description: 'Visitas e test-drives • PostgreSQL', url: '/appointments', columns: [
    { key: 'id', label: 'ID', format: 'short' }, { key: 'customer_id', label: 'Cliente', format: 'short' }, { key: 'vehicle_id', label: 'Veículo', format: 'short' }, { key: 'scheduled_at', label: 'Agendado para', format: 'date' }, { key: 'status', label: 'Situação', format: 'status' },
  ] },
  'Vendas': { title: 'Vendas', description: 'Operações de venda • PostgreSQL', url: '/sales', columns: [
    { key: 'id', label: 'ID', format: 'short' }, { key: 'vehicle_id', label: 'Veículo', format: 'short' }, { key: 'customer_id', label: 'Cliente', format: 'short' }, { key: 'sale_price', label: 'Valor', format: 'money' }, { key: 'status', label: 'Situação', format: 'status' }, { key: 'sold_at', label: 'Concluída em', format: 'date' },
  ] },
  'Auditoria': { title: 'Eventos de auditoria', description: 'Histórico de mudanças • MongoDB', url: '/audit-events', columns: [
    { key: 'eventId', label: 'Evento', format: 'short' }, { key: 'eventType', label: 'Tipo' }, { key: 'entityType', label: 'Entidade' }, { key: 'entityId', label: 'ID da entidade', format: 'short' }, { key: 'occurredAt', label: 'Ocorrência', format: 'date' },
  ] },
}

function FormatValue({row, column}: {row: ApiRow; column: Column}) {
  const raw = row[column.key]
  if (column.format === 'money') return <>{money(raw)}</>
  if (column.format === 'date') return <>{dateBR(raw)}</>
  if (column.format === 'status') return <span className="live-pill">{cellText(raw)}</span>
  if (column.format === 'short') { const value = cellText(raw); return <span title={value}>{value.length > 15 ? `${value.slice(0, 8)}…` : value}</span> }
  return <>{cellText(raw)}</>
}

export function LiveModule({ name }: { name: string }) {
  const config = modules[name] || modules['Veículos']
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [revision, setRevision] = useState(0)
  const path = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '10' })
    if (name === 'Veículos' && brand.trim()) qs.set('make', brand.trim())
    return `${config.url}?${qs.toString()}`
  }, [config.url, page, name, brand])
  const { data, pagination, loading, error } = useResource(path, revision)
  const filtered = useMemo(() => data.filter(row => !query.trim() || Object.values(row).some(value => cellText(value).toLowerCase().includes(query.toLowerCase()))), [data, query])
  const totalPages = pagination?.totalPages ?? 1
  return <section className="live-panel">
    <div className="live-panel-top"><div><h2>{config.title}</h2><p>{config.description}</p></div><button onClick={() => setRevision(r=>r+1)}>Atualizar dados</button></div>
    <div className="live-toolbar">
      <input aria-label="Pesquisar nesta página" placeholder="Pesquisar nos registros desta página" value={query} onChange={e=>setQuery(e.target.value)}/>
      {name === 'Veículos' && <input aria-label="Filtrar marca" placeholder="Filtrar marca (ex.: BMW)" value={brand} onChange={e=>{setPage(1); setBrand(e.target.value)}}/>}
      <span>{pagination?.total === undefined ? `${data.length} carregados` : `${pagination.total.toLocaleString('pt-BR')} registros`}</span>
    </div>
    {loading && <p className="live-info">Consultando o banco...</p>}
    {error && <p role="alert" className="live-error">Não foi possível consultar {config.title.toLowerCase()}: {error}. Confira se o backend está ativo na porta 3333.</p>}
    {!loading && !error && <div className="live-table-scroll"><table className="live-table"><thead><tr>{config.columns.map(col=><th key={col.key}>{col.label}</th>)}</tr></thead><tbody>
      {filtered.map((row,index)=><tr key={String(row.id ?? row.eventId ?? index)}>{config.columns.map(col=><td key={col.key}><FormatValue row={row} column={col}/></td>)}</tr>)}
      {!filtered.length && <tr><td colSpan={config.columns.length}>Nenhum registro encontrado nesta página.</td></tr>}
    </tbody></table></div>}
    <div className="live-pagination"><span>Página {pagination?.page ?? page} de {Math.max(1, totalPages)}</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button><button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></div>
    <p className="live-note">Consulta real aos bancos. Operações de escrita ficam restritas aos testes locais até implementarmos autenticação e permissões.</p>
  </section>
}

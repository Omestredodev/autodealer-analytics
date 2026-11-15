import { useEffect, useMemo, useRef, useState } from 'react'
import { cellText, dateBR, getJson, money, patchJson, type ApiRow, type ApiList } from './api'
import { useResource } from './useResource'
import './live-actions.css'

type Column = { key: string; label: string; format?: 'money' | 'date' | 'short' | 'status' }
type ModuleConfig = { title: string; description: string; url: string; columns: Column[] }
type OperationName = 'Leads' | 'Agendamentos' | 'Vendas'
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

const transitions: Record<OperationName, Record<string, readonly string[]>> = {
  Leads: { NEW: ['IN_PROGRESS', 'LOST'], IN_PROGRESS: ['CONVERTED', 'LOST'], CONVERTED: [], LOST: [] },
  Agendamentos: { SCHEDULED: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['COMPLETED', 'CANCELLED'], CANCELLED: [], COMPLETED: [] },
  Vendas: { PENDING: ['COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: [] },
}
const auditKinds: Record<OperationName, string> = { Leads: 'lead', Agendamentos: 'appointment', Vendas: 'sale' }
const operationNames: OperationName[] = ['Leads', 'Agendamentos', 'Vendas']

type PatchResult = {
  data: ApiRow;
  unchanged?: boolean;
  audit?: { pending?: number; status?: string; eventIds?: string[] };
  correlationId?: string;
}

function FormatValue({ row, column }: { row: ApiRow; column: Column }) {
  const raw = row[column.key]
  if (column.format === 'money') return <>{money(raw)}</>
  if (column.format === 'date') return <>{dateBR(raw)}</>
  if (column.format === 'status') return <span className="live-pill">{cellText(raw)}</span>
  if (column.format === 'short') { const value = cellText(raw); return <span title={value}>{value.length > 15 ? `${value.slice(0, 8)}…` : value}</span> }
  return <>{cellText(raw)}</>
}

export function LiveModule({ name }: { name: string }) {
  const config = modules[name] || modules['Veículos']
  const isOperation = operationNames.includes(name as OperationName)
  const operation = name as OperationName
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [brand, setBrand] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<ApiRow | null>(null)
  const [targetStatus, setTargetStatus] = useState('')
  const [demoEnabled, setDemoEnabled] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [auditItems, setAuditItems] = useState<ApiRow[] | null>(null)
  const [auditing, setAuditing] = useState(false)
  const detailsRef = useRef<HTMLDivElement | null>(null)

  // O painel e renderizado depois da tabela: revela-o ao selecionar um registro.
  useEffect(() => {
    if (selected) detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected])

  useEffect(() => {
    setPage(1); setQuery(''); setBrand(''); setStatusFilter(''); setSelected(null)
    setTargetStatus(''); setConfirming(false); setNotice(''); setActionError(''); setAuditItems(null)
    setDemoEnabled(false)
  }, [name])

  const path = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '10' })
    if (name === 'Veículos' && brand.trim()) qs.set('make', brand.trim())
    if (isOperation && statusFilter) qs.set('status', statusFilter)
    return `${config.url}?${qs.toString()}`
  }, [config.url, page, name, brand, statusFilter, isOperation])

  const { data, pagination, loading, error } = useResource(path, revision)
  const filtered = useMemo(() => data.filter(row => !query.trim() || Object.values(row).some(value => cellText(value).toLowerCase().includes(query.toLowerCase()))), [data, query])
  const totalPages = Math.max(1, pagination?.totalPages ?? 1)
  const currentStatus = String(selected?.status ?? '')
  const allowed = isOperation ? transitions[operation][currentStatus] ?? [] : []
  const canChange = import.meta.env.DEV && isOperation && demoEnabled && allowed.length > 0

  const selectRow = (row: ApiRow) => {
    if (!isOperation) return
    setSelected(row); setTargetStatus(''); setNotice(''); setActionError('')
    setAuditItems(null); setConfirming(false)
  }

  const updateStatus = async () => {
    if (!selected || !canChange || !allowed.includes(targetStatus)) return
    const id = String(selected.id)
    setSaving(true); setConfirming(false); setActionError(''); setNotice('')
    try {
      const result = await patchJson<PatchResult>(`${config.url}/${encodeURIComponent(id)}/status`, { status: targetStatus })
      setSelected(result.data); setTargetStatus(''); setRevision(value => value + 1); setAuditItems(null)
      const pending = result.audit?.pending
      setNotice(result.unchanged ? 'Status já estava atualizado, sem nova auditoria.' :
        pending ? `Status atualizado no PostgreSQL; ${pending} evento(s) aguardando envio ao MongoDB.` :
        'Status atualizado. Auditoria encaminhada ao MongoDB; confira o histórico abaixo.')
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Falha ao alterar o status')
    } finally { setSaving(false) }
  }

  const loadAudit = async () => {
    if (!selected || !isOperation) return
    setAuditing(true); setActionError('')
    try {
      const query = new URLSearchParams({ entityType: auditKinds[operation], entityId: String(selected.id), limit: '20' })
      const payload = await getJson<unknown>(`/audit-events?${query.toString()}`)
      if (Array.isArray(payload)) setAuditItems(payload as ApiRow[])
      else {
        const object = payload as ApiList<ApiRow>
        setAuditItems(Array.isArray(object.data) ? object.data : [])
      }
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Não foi possível carregar auditoria') }
    finally { setAuditing(false) }
  }

  return <section className="live-panel">
    <div className="live-panel-top"><div><h2>{config.title}</h2><p>{config.description}</p></div><button onClick={() => setRevision(value => value + 1)}>Atualizar dados</button></div>
    <div className="live-toolbar">
      <input aria-label="Pesquisar nesta página" placeholder="Pesquisar nos registros desta página" value={query} onChange={event => setQuery(event.target.value)}/>
      {name === 'Veículos' && <input aria-label="Filtrar marca" placeholder="Filtrar marca (ex.: BMW)" value={brand} onChange={event => { setPage(1); setBrand(event.target.value) }}/>}
      {isOperation && <select aria-label="Filtrar por status" value={statusFilter} onChange={event => {setStatusFilter(event.target.value); setPage(1)}}>
        <option value="">Todos os status</option>
        {Object.keys(transitions[operation]).map(status => <option key={status} value={status}>{status}</option>)}
      </select>}
      <span>{pagination?.total === undefined ? `${data.length} carregados` : `${pagination.total.toLocaleString('pt-BR')} registros`}</span>
    </div>
    {isOperation && <div className="live-demo-warning">
      <strong>Ambiente de demonstração:</strong> esta API ainda não possui autenticação. Por segurança, ações de escrita só aparecem no modo de desenvolvimento e exigem habilitação manual.
      {import.meta.env.DEV ? <label><input type="checkbox" checked={demoEnabled} onChange={event => {setDemoEnabled(event.target.checked);setConfirming(false)}}/> Habilitar alterações neste ambiente local</label>
        : <p>Escrita desativada na versão de produção do frontend.</p>}
    </div>}
    {loading && <p className="live-info">Consultando o banco...</p>}
    {error && <p role="alert" className="live-error">Não foi possível consultar {config.title.toLowerCase()}: {error}. Confira a API na porta 3333.</p>}
    {!loading && !error && <div className="live-table-scroll"><table className="live-table"><thead><tr>{config.columns.map(col => <th key={col.key}>{col.label}</th>)}{isOperation && <th>Ações</th>}</tr></thead><tbody>
      {filtered.map((row,index) => <tr key={String(row.id ?? row.eventId ?? index)}>{config.columns.map(col => <td key={col.key}><FormatValue row={row} column={col}/></td>)}
        {isOperation && <td><button type="button" className="live-inline-button" aria-expanded={String(selected?.id ?? '') === String(row.id)} onClick={() => selectRow(row)}>Detalhes / status</button></td>}</tr>)}
      {!filtered.length && <tr><td colSpan={config.columns.length + (isOperation ? 1 : 0)}>Nenhum registro encontrado nesta página.</td></tr>}
    </tbody></table></div>}
    <div className="live-pagination"><span>Página {pagination?.page ?? page} de {totalPages}</span><div><button disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><button disabled={page >= totalPages} onClick={() => setPage(value => value + 1)}>Próxima</button></div></div>
    {isOperation && selected && <div ref={detailsRef} className="live-operation-card" style={{ scrollMarginTop: '96px' }}>
      <div className="live-operation-title"><div><h3>{name}: detalhes da operação</h3><small>ID: {cellText(selected.id)}</small></div><button onClick={() => {setSelected(null);setConfirming(false);setActionError('');setNotice('')}}>Fechar</button></div>
      <div className="live-operation-details">{Object.entries(selected).filter(([key]) => key !== 'id').map(([key,value]) => <div key={key}><span>{key.replace(/_/g, ' ')}</span><strong>{key.includes('price') ? money(value) : key.endsWith('_at') ? dateBR(value) : cellText(value)}</strong></div>)}</div>
      {notice && <p className="live-success" role="status">{notice}</p>}
      {actionError && <p className="live-error" role="alert">{actionError}</p>}
      <div className="live-operation-actions">
        {allowed.length > 0 ? <><label>Próximo status
          <select aria-label="Novo status" disabled={!canChange || saving} value={targetStatus} onChange={event => {setTargetStatus(event.target.value);setConfirming(false)}}><option value="">Selecione...</option>{allowed.map(status => <option key={status} value={status}>{status}</option>)}</select>
        </label><button className="live-primary-action" disabled={!canChange || !targetStatus || saving} onClick={() => setConfirming(true)}>Alterar status</button></> : <p className="live-note">Status terminal: não há transições permitidas.</p>}
        <button onClick={loadAudit} disabled={auditing}>{auditing ? 'Carregando...' : 'Consultar auditoria MongoDB'}</button>
      </div>
      {auditItems && <div className="live-audit-history"><h4>Histórico desta operação ({auditItems.length})</h4>{auditItems.length ? auditItems.map((event,index) => <p key={String(event.eventId ?? index)}><strong>{cellText(event.eventType)}</strong> — {dateBR(event.occurredAt)}</p>) : <p>Ainda não há eventos para este registro.</p>}</div>}
      {confirming && <div className="live-confirm" role="dialog" aria-modal="true" aria-label="Confirmar mudança de status">
        <h4>Confirmar alteração?</h4><p>Deseja alterar <strong>{currentStatus}</strong> para <strong>{targetStatus}</strong>?</p>
        {name === 'Vendas' && targetStatus === 'COMPLETED' && <p><strong>Atenção:</strong> isso marcará o veículo como SOLD e encerrará seus anúncios publicados. A operação modifica dados reais do ambiente de testes.</p>}
        <div><button onClick={() => setConfirming(false)}>Cancelar</button><button className="live-primary-action" disabled={saving} onClick={updateStatus}>{saving ? 'Salvando...' : 'Confirmar alteração'}</button></div>
      </div>}
    </div>}
    <p className="live-note">Dados reais dos bancos. O filtro de pesquisa textual procura somente nos registros carregados na página atual.</p>
  </section>
}

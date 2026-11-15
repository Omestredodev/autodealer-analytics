import { useEffect, useMemo, useRef, useState } from 'react'
import { getJson, patchJson } from './api'
import { describeError, removeBusiness } from './live-business-api'
import './live-business.css'
import './live-history.css'

type Condition = 'OK' | 'ATTENTION' | 'REPAIR'
type Field = 'bodywork' | 'mechanical' | 'tires' | 'documents'
type Checklist = Record<Field, Condition>
type Vehicle = { make: string; model: string; model_year: number; status: string } | null
type Inspection = {
  id: string; vehicleId: string; checklist: Checklist; notes: string;
  status: 'DRAFT' | 'APPROVED'; createdAt: string; updatedAt: string; vehicle?: Vehicle
}
type List = { data: Inspection[]; pagination?: { page: number; total: number; totalPages: number } }
const fields: { key: Field; label: string }[] = [
  { key: 'bodywork', label: 'Lataria' }, { key: 'mechanical', label: 'Mecânica' },
  { key: 'tires', label: 'Pneus' }, { key: 'documents', label: 'Documentação' },
]
const conditions: { value: Condition; label: string }[] = [
  { value: 'OK', label: 'Em ordem' },
  { value: 'ATTENTION', label: 'Requer atenção' },
  { value: 'REPAIR', label: 'Reparo necessário' },
]
const date = (value: string) => new Date(value).toLocaleString('pt-BR')
const conditionLabel = (value: Condition) => conditions.find(v => v.value === value)?.label ?? value
const vehicleName = (inspection: Inspection) => inspection.vehicle
  ? `${inspection.vehicle.make} ${inspection.vehicle.model} · ${inspection.vehicle.model_year}`
  : `Veículo ${inspection.vehicleId.slice(0, 8)} (não localizado no cadastro)`

/** Lista geral de vistorias, independente do veículo selecionado no formulário de criação. */
export function LiveInspectionsHistory({ onNew }: { onNew: (vehicleId?: string) => void }) {
  const [items, setItems] = useState<Inspection[]>([])
  const [status, setStatus] = useState('')
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [appliedVehicle, setAppliedVehicle] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [revision, setRevision] = useState(0)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Inspection | null>(null)
  const detailRef = useRef<HTMLElement | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Checklist | null>(null)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void getJson<{ enabled: boolean }>('/crud/status', controller.signal)
      .then(result => { if (!controller.signal.aborted) setEnabled(result.enabled) })
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const params = new URLSearchParams({ limit: '15', page: String(page) })
    if (status) params.set('status', status)
    if (appliedVehicle) params.set('vehicleId', appliedVehicle)
    void getJson<List>(`/crud/inspections?${params}`, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        setItems(result.data)
        setTotal(result.pagination?.total ?? result.data.length)
        setTotalPages(result.pagination?.totalPages ?? 1)
        setSelected(previous => previous ? result.data.find(item => item.id === previous.id) ?? null : null)
      })
      .catch(cause => { if (!controller.signal.aborted) setError(describeError(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [status, appliedVehicle, page, revision])

  useEffect(() => {
    if (selected) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [selected?.id])

  const visible = useMemo(() => {
    const value = search.trim().toLocaleLowerCase('pt-BR')
    if (!value) return items
    return items.filter(item => `${vehicleName(item)} ${item.notes} ${item.id} ${item.vehicleId}`
      .toLocaleLowerCase('pt-BR').includes(value))
  }, [items, search])
  const writable = import.meta.env.DEV && enabled

  const open = (item: Inspection) => {
    setSelected(item); setEditing(false); setDraft({ ...item.checklist }); setNotes(item.notes)
    setNotice(''); setError('')
  }
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await action()
      setNotice(success); setRevision(x => x + 1); setEditing(false)
    } catch (cause) {
      setError(describeError(cause))
    } finally { setBusy(false) }
  }
  const save = () => {
    if (!selected || !draft || selected.status !== 'DRAFT') return
    void run(async () => {
      await patchJson(`/crud/inspections/${selected.id}`, { checklist: draft, notes })
    }, 'Rascunho atualizado no MongoDB.')
  }
  const approve = () => {
    if (!selected || selected.status !== 'DRAFT') return
    if (!window.confirm('Aprovar a vistoria? Depois disso ela não poderá ser editada ou excluída.')) return
    void run(async () => {
      await patchJson(`/crud/inspections/${selected.id}`, { status: 'APPROVED' })
    }, 'Vistoria aprovada. Seu histórico foi preservado.')
  }
  const remove = () => {
    if (!selected || selected.status !== 'DRAFT') return
    if (!window.confirm('Excluir este rascunho? Essa ação não poderá ser desfeita.')) return
    void run(async () => {
      await removeBusiness(`/crud/inspections/${selected.id}`)
      setSelected(null); setPage(1)
    }, 'Rascunho excluído com sucesso.')
  }
  const applyVehicle = () => {
    const value = vehicleFilter.trim()
    if (value && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value)) {
      setError('Informe um UUID de veículo válido ou deixe o campo vazio.')
      return
    }
    setError(''); setPage(1); setSelected(null); setAppliedVehicle(value)
  }

  return <section className="business-panel business-history">
    <div className="business-head">
      <div><h2>Histórico de vistorias</h2><p>Consulte vistorias de todos os veículos. Os documentos estão no MongoDB e os dados do veículo vêm do PostgreSQL.</p></div>
      <div className="business-actions"><span className="business-badge">MongoDB</span><button className="primary" onClick={() => onNew()}>+ Nova vistoria</button></div>
    </div>
    <div className="business-summary">
      <div><small>Vistorias encontradas</small><strong>{total.toLocaleString('pt-BR')}</strong></div>
      <div><small>Página</small><strong>{page} / {totalPages}</strong></div>
      <div><small>Fonte</small><strong>Documentos reais</strong></div>
    </div>
    <div className="business-history-filters">
      <label className="business-field">Situação
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); setSelected(null) }}>
          <option value="">Todas</option><option value="DRAFT">Rascunhos</option><option value="APPROVED">Aprovadas</option>
        </select>
      </label>
      <label className="business-field">Filtrar pelo UUID do veículo
        <input value={vehicleFilter} onChange={e => setVehicleFilter(e.target.value)} placeholder="UUID do veículo (opcional)" />
      </label>
      <button onClick={applyVehicle}>Aplicar filtro</button>
      <label className="business-field">Pesquisar nesta página
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Modelo, ID ou observação" />
      </label>
      <button onClick={() => setRevision(x => x + 1)}>Atualizar</button>
    </div>
    {error && <p className="business-alert" role="alert">{error}</p>}
    {notice && <p className="business-success" role="status">{notice}</p>}
    {!writable && <p className="business-alert">Leitura disponível; alterações exigem o ambiente local com CRUD habilitado.</p>}
    {loading ? <p>Consultando vistorias...</p> : <div className="business-history-table"><table>
      <thead><tr><th>Veículo</th><th>Criada em</th><th>Situação</th><th>Checklist</th><th>Ações</th></tr></thead>
      <tbody>{visible.map(item => <tr key={item.id}>
        <td><strong>{vehicleName(item)}</strong><small>ID: {item.vehicleId}</small></td>
        <td>{date(item.createdAt)}</td>
        <td><span className={`business-status ${item.status === 'APPROVED' ? 'approved' : 'draft'}`}>
          {item.status === 'APPROVED' ? 'Aprovada' : 'Rascunho'}
        </span></td>
        <td>{fields.filter(f => item.checklist[f.key] !== 'OK').length ? `${fields.filter(f => item.checklist[f.key] !== 'OK').length} ponto(s) de atenção` : 'Tudo em ordem'}</td>
        <td><button onClick={() => open(item)}>Ver detalhes</button></td>
      </tr>)}{!visible.length && <tr><td colSpan={5}>Nenhuma vistoria encontrada nos filtros desta página.</td></tr>}</tbody>
    </table></div>}
    <div className="business-head"><small>{visible.length} exibidas nesta página • {total} no filtro do banco</small>
      <div className="business-actions"><button disabled={page <= 1} onClick={() => { setPage(v => v - 1); setSelected(null) }}>Anterior</button>
        <button disabled={page >= totalPages} onClick={() => { setPage(v => v + 1); setSelected(null) }}>Próxima</button></div>
    </div>
    {selected && <section ref={detailRef} className="business-inspection-detail" aria-label="Detalhes da vistoria">
      <div className="business-head"><div><h3>Detalhes da vistoria</h3><p>{vehicleName(selected)} · {date(selected.createdAt)} · ID {selected.id}</p></div>
        <button onClick={() => { setSelected(null); setEditing(false) }}>Fechar detalhes</button></div>
      <div className="business-form">
        {fields.map(field => <label className="business-field" key={field.key}>{field.label}
          {editing && draft && selected.status === 'DRAFT' ?
            <select value={draft[field.key]} onChange={e => setDraft(old => old ? { ...old, [field.key]: e.target.value as Condition } : old)}>
              {conditions.map(c => <option value={c.value} key={c.value}>{c.label}</option>)}
            </select> : <strong>{conditionLabel(selected.checklist[field.key])}</strong>}
        </label>)}
        <label className="business-field wide">Observações técnicas
          {editing && selected.status === 'DRAFT' ? <textarea value={notes} maxLength={3000} onChange={e => setNotes(e.target.value)} />
            : <p>{selected.notes || 'Sem observações registradas.'}</p>}
        </label>
      </div>
      <div className="business-actions">
        <button onClick={() => onNew(selected.vehicleId)}>Nova vistoria deste veículo</button>
        {selected.status === 'DRAFT' && (editing ? <>
          <button className="primary" disabled={!writable || busy} onClick={save}>Salvar alterações</button>
          <button onClick={() => setEditing(false)}>Cancelar</button>
        </> : <>
          <button disabled={!writable || busy} onClick={() => { setEditing(true); setDraft({ ...selected.checklist }); setNotes(selected.notes) }}>Editar rascunho</button>
          <button disabled={!writable || busy} onClick={approve}>Aprovar</button>
          <button disabled={!writable || busy} onClick={remove}>Excluir rascunho</button>
        </>)}
        {selected.status === 'APPROVED' && <small>Registro aprovado e somente leitura.</small>}
      </div>
    </section>}
  </section>
}

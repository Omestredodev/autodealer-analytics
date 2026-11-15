import { useEffect, useMemo, useRef, useState } from 'react'
import { getJson, money, patchJson, postJson } from './api'
import { describeError } from './live-business-api'
import './live-business.css'
import './live-stock.css'
import type { VehicleSelection } from './LiveRegistrationPage'

type Vehicle = {
  id: string; make: string; model: string; version: string | null; model_year: number;
  status: string; mileage: number; active_ads: number; published_ads: number
}
type Ad = {
  id: string; vehicle_id: string; title: string; description: string | null;
  price: string; status: string; published_at: string | null; featured: boolean;
  make: string; model: string; model_year: number; vehicle_status: string
}
type List<T> = {
  data: T[];
  pagination: { page: number; total: number; totalPages: number; returned: number }
}
type EditAd = { id: string; title: string; description: string; price: string };
const empty = { title: '', description: '', price: '', publish: false };

/** Gerenciamento administrativo. Não altera os contratos dos endpoints do catálogo público. */
export function LiveInventoryManager({ mode, initialVehicle, onCreateAd, onNavigateRegistration, onChanged }: { mode: 'Veículos' | 'Anúncios'; initialVehicle?: VehicleSelection | null; onCreateAd?: (vehicle: VehicleSelection) => void; onNavigateRegistration?: () => void; onChanged: () => void }) {
  const [enabled, setEnabled] = useState(false)
  const [writable, setWritable] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [revision, setRevision] = useState(0)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [ads, setAds] = useState<Ad[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [vehicleQuery, setVehicleQuery] = useState('')
  const [candidates, setCandidates] = useState<Vehicle[]>([])
  const [targetVehicle, setTargetVehicle] = useState('')
  const [adForm, setAdForm] = useState(empty)
  const [editing, setEditing] = useState<EditAd | null>(null)
  const createRef = useRef<HTMLDivElement | null>(null)
  const isVehicle = mode === 'Veículos'
  const canWrite = enabled && writable && import.meta.env.DEV
  useEffect(() => {
    if (!isVehicle && initialVehicle) {
      setTargetVehicle(initialVehicle.id)
      setAdForm({ ...empty, title: `${initialVehicle.make} ${initialVehicle.model} ${initialVehicle.version ?? ''} ${initialVehicle.model_year}`.trim() })
      setNotice('Veículo cadastrado: informe o preço, revise o título e publique o anúncio.')
    }
  }, [isVehicle, initialVehicle?.id])

  useEffect(() => {
    const controller = new AbortController()
    void getJson<{ enabled: boolean }>('/crud/status', controller.signal)
      .then(r => { if (!controller.signal.aborted) setEnabled(r.enabled) })
      .catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => { setPage(1); setSearch(''); setStatus(''); setEditing(null); setError(''); setNotice('') }, [mode])

  const listPath = useMemo(() => {
    const q = new URLSearchParams({ page: String(page), limit: '12' })
    if (search.trim()) q.set('search', search.trim())
    if (status) q.set('status', status)
    return `/crud/stock/${isVehicle ? 'vehicles' : 'advertisements'}?${q}`
  }, [page, search, status, isVehicle])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    void getJson<List<Vehicle> | List<Ad>>(listPath, controller.signal)
      .then(result => {
        if (controller.signal.aborted) return
        if (isVehicle) setVehicles(result.data as Vehicle[])
        else setAds(result.data as Ad[])
        setTotal(result.pagination?.total ?? result.data.length)
        setPages(Math.max(1, result.pagination?.totalPages ?? 1))
      })
      .catch(cause => { if (!controller.signal.aborted) setError(describeError(cause)) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [listPath, revision, isVehicle])

  useEffect(() => {
    const controller = new AbortController()
    const qs = new URLSearchParams({ limit: '25' })
    if (vehicleQuery.trim()) qs.set('search', vehicleQuery.trim())
    void getJson<List<Vehicle>>(`/crud/stock/advertisable-vehicles?${qs}`, controller.signal)
      .then(result => { if (!controller.signal.aborted) setCandidates(result.data) })
      .catch(() => { if (!controller.signal.aborted) setCandidates([]) })
    return () => controller.abort()
  }, [vehicleQuery, revision])

  const refresh = () => { setRevision(n => n + 1); onChanged() }
  const execute = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      await action()
      setNotice(success)
      refresh()
    } catch (cause) { setError(describeError(cause)) }
    finally { setBusy(false) }
  }
  const choose = (id: string) => {
    setTargetVehicle(id)
    setAdForm(empty)
    setEditing(null)
    setNotice('')
    createRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const createAd = () => {
    if (!targetVehicle || !adForm.title.trim() || !adForm.price) return
    void execute(async () => {
      await postJson('/crud/stock/advertisements', {
        vehicleId: targetVehicle, title: adForm.title.trim(), description: adForm.description,
        price: adForm.price.replace(',', '.'), publish: adForm.publish,
      })
      setAdForm(empty)
      setTargetVehicle('')
    }, adForm.publish ? 'Anúncio publicado e visível no catálogo público.' : 'Rascunho de anúncio cadastrado.')
  }
  const changeAd = (ad: Ad, newStatus: string) => {
    if (!window.confirm(`Alterar anúncio "${ad.title}" de ${ad.status} para ${newStatus}?`)) return
    void execute(() => patchJson(`/crud/stock/advertisements/${ad.id}`, { status: newStatus }), `Anúncio atualizado: ${newStatus}.`)
  }
  const saveEdit = () => {
    if (!editing || !editing.title.trim() || !editing.price) return
    void execute(async () => {
      await patchJson(`/crud/stock/advertisements/${editing.id}`, {
        title: editing.title.trim(), description: editing.description,
        price: editing.price.replace(',', '.'),
      })
      setEditing(null)
    }, 'Dados do anúncio atualizados.')
  }
  const toggleFeatured = (ad: Ad) => {
    if (ad.status !== 'PUBLISHED') return
    void execute(async () => {
      await patchJson(`/crud/stock/advertisements/${ad.id}/featured`, { featured: !ad.featured })
    }, ad.featured ? 'Anúncio removido dos destaques.' : 'Anúncio incluído nos destaques da página inicial.')
  }
  const removeAd = (ad: Ad) => {
    if (!window.confirm(`Encerrar/remover o anúncio "${ad.title}" do catálogo? O histórico ficará preservado.`)) return
    void execute(async () => {
      const r = await fetch(`/api/crud/stock/advertisements/${ad.id}`, { method: 'DELETE' })
      if (!r.ok) { const body = await r.json().catch(() => ({})) as { message?: string; error?: string }; throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`) }
    }, 'Anúncio encerrado e removido do catálogo público, sem apagar o histórico.')
  }
  const removeVehicle = (v: Vehicle) => {
    if (!window.confirm(`Retirar ${v.make} ${v.model} do estoque ativo? Anúncios associados serão encerrados. Vendas e agendamentos ativos bloqueiam esta ação.`)) return
    void execute(async () => {
      const r = await fetch(`/api/crud/stock/vehicles/${v.id}`, { method: 'DELETE' })
      if (!r.ok) { const body = await r.json().catch(() => ({})) as { message?: string; error?: string }; throw new Error(body.message ?? body.error ?? `HTTP ${r.status}`) }
    }, 'Veículo retirado do estoque ativo. Histórico e vínculos preservados.')
  }
  return <section className="business-panel stock-manager">
    <div className="business-head">
      <div><h2>Gestão de {isVehicle ? 'estoque' : 'anúncios'}</h2><p>PostgreSQL · Registros administrativos, inclusive veículos sem anúncios e anúncios em rascunho.</p></div>
      <span className="business-badge">PostgreSQL</span>
    </div>
    {!enabled && <p className="business-alert">Modo de gestão desativado. Use somente o ambiente local com CRUD_DEMO_ENABLED=true.</p>}
    {enabled && <label className="stock-toggle"><input type="checkbox" checked={writable} onChange={e => setWritable(e.target.checked)}/> Habilitar alterações neste ambiente local</label>}
    {isVehicle && <div className="stock-section"><p>Cadastre novos veículos na aba <strong>Cadastro de veículo</strong>. Nesta página você gerencia o estoque existente.</p>
      <button type="button" onClick={onNavigateRegistration}>+ Cadastrar veículo</button></div>}
    {!isVehicle && <div className="stock-section" ref={createRef}>
      <h3>{isVehicle ? '2. Criar anúncio para o veículo cadastrado' : 'Criar anúncio'}</h3>
      <p>Escolha um veículo disponível, preencha as informações e decida se deseja publicar imediatamente ou salvar um rascunho.</p>
      <div className="stock-create-grid">
        <label className="business-field">Buscar veículo disponível
          <input value={vehicleQuery} onChange={e => setVehicleQuery(e.target.value)} placeholder="Marca, modelo ou UUID"/>
        </label>
        <label className="business-field">Veículo selecionado
          <select value={targetVehicle} onChange={e => setTargetVehicle(e.target.value)}>
            <option value="">Selecione um veículo sem anúncio publicado</option>
            {candidates.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} {v.model_year} · {v.id.slice(0, 8)}</option>)}
            {targetVehicle && !candidates.some(v => v.id === targetVehicle) && <option value={targetVehicle}>Selecionado: {targetVehicle.slice(0, 8)}</option>}
          </select>
        </label>
        <label className="business-field">Título do anúncio
          <input value={adForm.title} onChange={e => setAdForm(s => ({ ...s, title: e.target.value }))} maxLength={180} placeholder="Ex.: Toyota Corolla XEi 2023"/>
        </label>
        <label className="business-field">Preço (R$)
          <input type="number" min="0.01" step="0.01" value={adForm.price} onChange={e => setAdForm(s => ({ ...s, price: e.target.value }))} placeholder="125000.00"/>
        </label>
        <label className="business-field stock-wide">Descrição
          <textarea maxLength={3000} value={adForm.description} onChange={e => setAdForm(s => ({ ...s, description: e.target.value }))}/>
        </label>
      </div>
      <label className="stock-toggle"><input type="checkbox" checked={adForm.publish} onChange={e => setAdForm(s => ({ ...s, publish: e.target.checked }))}/> Publicar imediatamente (somente se não houver outro anúncio publicado)</label>
      <div className="business-actions"><button className="primary" disabled={!canWrite || busy || !targetVehicle || adForm.title.trim().length < 5 || !Number(adForm.price)} onClick={createAd}>{busy ? 'Salvando...' : adForm.publish ? 'Criar e publicar anúncio' : 'Salvar rascunho'}</button></div>
    </div>
    }
    <div className="stock-section">
      <div className="business-head"><h3>{isVehicle ? 'Veículos cadastrados' : 'Anúncios cadastrados'}</h3><button onClick={refresh}>Atualizar</button></div>
      <div className="stock-filters">
        <label className="business-field">Pesquisar
          <input value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder={isVehicle ? 'Marca, modelo ou UUID' : 'Título, modelo ou UUID'}/>
        </label>
        <label className="business-field">Situação
          <select value={status} onChange={e => { setPage(1); setStatus(e.target.value) }}>
            <option value="">Todas</option>
            {(isVehicle ? ['AVAILABLE','RESERVED','SOLD','INACTIVE'] : ['DRAFT','PUBLISHED','PAUSED','ENDED']).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="business-alert" role="alert">{error}</p>}
      {notice && <p className="business-success" role="status">{notice}</p>}
      {loading && <p>Consultando registros...</p>}
      <div className="business-rows">
        {isVehicle ? vehicles.map(v => <div className="business-row" key={v.id}>
          <div><strong>{v.make} {v.model} {v.version ?? ''} · {v.model_year}</strong><small>Status: {v.status} · Anúncios ativos: {v.active_ads}</small><small>ID: {v.id}</small></div>
          <div className="business-actions">
            {v.status === 'AVAILABLE' && <button disabled={!canWrite || busy || v.published_ads > 0} onClick={() => onCreateAd?.(v)}>{v.published_ads > 0 ? 'Já anunciado' : 'Criar anúncio'}</button>}
            {v.status !== 'SOLD' && v.status !== 'INACTIVE' && <button disabled={!canWrite || busy} onClick={() => removeVehicle(v)}>Retirar do estoque</button>}
          </div>
        </div>) : ads.map(a => <div className="business-row" key={a.id}>
          <div><strong>{a.title}</strong><small>{a.make} {a.model} {a.model_year} · {money(a.price)} · {a.status}</small><small>Anúncio: {a.id} · Veículo: {a.vehicle_id}{a.featured ? ' · ★ Destaque' : ''}</small></div>
          {a.status !== 'ENDED' && <div className="business-actions">
            <button disabled={!canWrite || busy} onClick={() => setEditing({ id: a.id, title: a.title, description: a.description ?? '', price: a.price })}>Editar</button>
            {(a.status === 'DRAFT' || a.status === 'PAUSED') && <button disabled={!canWrite || busy || a.vehicle_status !== 'AVAILABLE'} onClick={() => changeAd(a, 'PUBLISHED')}>Publicar</button>}
            {a.status === 'PUBLISHED' && <button disabled={!canWrite || busy} onClick={() => changeAd(a, 'PAUSED')}>Pausar</button>}
            {a.status === 'PUBLISHED' && a.vehicle_status === 'AVAILABLE' && <button disabled={!canWrite || busy} onClick={() => toggleFeatured(a)}>{a.featured ? 'Remover destaque' : 'Destacar no site'}</button>}
            <button disabled={!canWrite || busy} onClick={() => removeAd(a)}>Encerrar / remover</button>
          </div>}
        </div>)}
        {!loading && !(isVehicle ? vehicles : ads).length && <p>Nenhum registro nesta página.</p>}
      </div>
      {editing && !isVehicle && <div className="stock-edit"><h3>Editar anúncio</h3>
        <label className="business-field">Título<input value={editing.title} onChange={e => setEditing(s => s ? { ...s, title: e.target.value } : null)}/></label>
        <label className="business-field">Preço<input type="number" min="0.01" step="0.01" value={editing.price} onChange={e => setEditing(s => s ? { ...s, price: e.target.value } : null)}/></label>
        <label className="business-field">Descrição<textarea maxLength={3000} value={editing.description} onChange={e => setEditing(s => s ? { ...s, description: e.target.value } : null)}/></label>
        <div className="business-actions"><button className="primary" disabled={!canWrite || busy} onClick={saveEdit}>Salvar alterações</button><button onClick={() => setEditing(null)}>Cancelar</button></div>
      </div>}
      <div className="business-head"><span>{total.toLocaleString('pt-BR')} registros · Página {page}/{pages}</span><div className="business-actions"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button><button disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Próxima</button></div></div>
    </div>
    <p className="stock-footnote">Exclusão segura: retirar veículo altera seu status para INACTIVE; encerrar anúncio altera para ENDED. Referências e eventos históricos não são apagados. Operações de venda e agendamentos ativos podem bloquear a retirada.</p>
  </section>
}

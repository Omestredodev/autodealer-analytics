import { useEffect, useState } from 'react'
import { getJson, postJson } from './api'
import { describeError } from './live-business-api'
import './live-vehicle-registration.css'

type CatalogEntry = {
  id: string; make: string; model: string; version: string;
  manufacturing_year: number; model_year: number;
  engine: string; fuel_type: string; transmission: string;
  specification_verified: boolean; specification_source: string;
}
type VehicleCreated = {
  id: string; make: string; model: string; version: string | null;
  model_year: number; status: string; specification_verified: boolean;
}
type Form = {
  make: string; model: string; version: string;
  manufacturingYear: string; modelYear: string;
  mileage: string; color: string; licensePlate: string; vin: string;
}
const initial: Form = {
  make: '', model: '', version: '', manufacturingYear: String(new Date().getFullYear()),
  modelYear: String(new Date().getFullYear()), mileage: '0', color: '', licensePlate: '', vin: '',
}

export function LiveVehicleRegistration({ canWrite, onRegistered }: {
  canWrite: boolean;
  onRegistered: (vehicle: VehicleCreated) => void;
}) {
  const [mode, setMode] = useState<'catalog' | 'manual'>('catalog')
  const [search, setSearch] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [catalog, setCatalog] = useState<CatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [form, setForm] = useState<Form>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ limit: '25' })
    if (submittedSearch.trim()) query.set('search', submittedSearch.trim())
    setCatalogLoading(true)
    void getJson<{ data: CatalogEntry[] }>(`/crud/stock/vehicle-catalog?${query}`, controller.signal)
      .then(response => {
        if (controller.signal.aborted) return
        setCatalog(response.data)
        setSelectedCatalogId(current => response.data.some(c => c.id === current) ? current : '')
      })
      .catch(cause => { if (!controller.signal.aborted) setError(describeError(cause)) })
      .finally(() => { if (!controller.signal.aborted) setCatalogLoading(false) })
    return () => controller.abort()
  }, [submittedSearch])

  const selected = catalog.find(item => item.id === selectedCatalogId)
  const field = (key: keyof Form, value: string) => setForm(previous => ({ ...previous, [key]: value }))
  const submit = async () => {
    if (!canWrite || saving) return
    setError(''); setNotice('')
    const mileage = Number(form.mileage)
    if (!Number.isSafeInteger(mileage) || mileage < 0) { setError('Informe quilometragem válida.'); return }
    const shared = {
      mileage, color: form.color.trim() || null,
      licensePlate: form.licensePlate.trim() || null,
      vin: form.vin.trim() || null,
    }
    let payload: Record<string, unknown>
    if (mode === 'catalog') {
      if (!selectedCatalogId) { setError('Selecione uma configuração técnica.'); return }
      payload = { ...shared, catalogId: selectedCatalogId }
    } else {
      const manufacturingYear = Number(form.manufacturingYear)
      const modelYear = Number(form.modelYear)
      if (!form.make.trim() || !form.model.trim() || !Number.isInteger(manufacturingYear) ||
          manufacturingYear < 1900 || manufacturingYear > 2100 || !Number.isInteger(modelYear) ||
          modelYear < 1900 || modelYear > 2100) {
        setError('Preencha marca, modelo e anos válidos.'); return
      }
      payload = {
        ...shared, make: form.make.trim(), model: form.model.trim(), version: form.version.trim() || null,
        manufacturingYear, modelYear,
      }
    }
    setSaving(true)
    try {
      const result = await postJson<{ data: VehicleCreated; audit?: { pending?: number } }>(
        '/crud/stock/vehicles', payload,
      )
      setForm(initial)
      setNotice(`Veículo cadastrado: ${result.data.make} ${result.data.model} (${result.data.id.slice(0, 8)}).` +
        (result.audit?.pending ? ' Auditoria pendente de entrega.' : ''))
      onRegistered(result.data)
    } catch (cause) {
      setError(describeError(cause))
    } finally { setSaving(false) }
  }
  return <div className="stock-section vehicle-registration">
    <h3>1. Cadastrar veículo no estoque</h3>
    <p>Cadastre a unidade primeiro. Depois ela será selecionada automaticamente no formulário de anúncio.</p>
    <div className="business-actions vehicle-registration-modes">
      <label><input type="radio" name="vehicle-registration-mode" checked={mode === 'catalog'} onChange={() => setMode('catalog')}/> Do catálogo técnico</label>
      <label><input type="radio" name="vehicle-registration-mode" checked={mode === 'manual'} onChange={() => setMode('manual')}/> Cadastro manual</label>
    </div>
    {mode === 'catalog' ? <>
      <div className="vehicle-registration-search">
        <label className="business-field">Pesquisar marca, modelo ou versão
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Ex.: Corolla, Onix, Polo"/>
        </label>
        <button type="button" onClick={() => setSubmittedSearch(search)} disabled={catalogLoading}>Buscar configurações</button>
      </div>
      <label className="business-field">Configuração técnica
        <select value={selectedCatalogId} onChange={event => setSelectedCatalogId(event.target.value)}>
          <option value="">Selecione uma configuração</option>
          {catalog.map(item => <option key={item.id} value={item.id}>{item.make} {item.model} {item.version} · {item.manufacturing_year}/{item.model_year}</option>)}
        </select>
      </label>
      {selected && <p className="vehicle-registration-note">
        {selected.engine} · {selected.fuel_type} · {selected.transmission} ·
        {selected.specification_verified ? ' Fonte técnica verificada' : ' Configuração ainda não verificada'}
      </p>}
      {!catalogLoading && catalog.length === 0 && <p className="vehicle-registration-note">Nenhuma configuração encontrada. Use o cadastro manual para modelos ainda não cadastrados.</p>}
    </> : <>
      <div className="stock-create-grid">
        <label className="business-field">Marca *<input value={form.make} onChange={e => field('make', e.target.value)} maxLength={80} placeholder="Marca"/></label>
        <label className="business-field">Modelo *<input value={form.model} onChange={e => field('model', e.target.value)} maxLength={100} placeholder="Modelo"/></label>
        <label className="business-field">Versão<input value={form.version} onChange={e => field('version', e.target.value)} maxLength={100} placeholder="Versão"/></label>
        <label className="business-field">Ano fabricação *<input type="number" min="1900" max="2100" value={form.manufacturingYear} onChange={e => field('manufacturingYear', e.target.value)}/></label>
        <label className="business-field">Ano modelo *<input type="number" min="1900" max="2100" value={form.modelYear} onChange={e => field('modelYear', e.target.value)}/></label>
      </div>
      <p className="vehicle-registration-note">Cadastro manual sem atribuir especificações técnicas verificadas. As fichas oficiais poderão ser vinculadas posteriormente.</p>
    </>}
    <div className="stock-create-grid">
      <label className="business-field">Quilometragem *<input type="number" min="0" step="1" value={form.mileage} onChange={e => field('mileage', e.target.value)}/></label>
      <label className="business-field">Cor<input value={form.color} maxLength={50} onChange={e => field('color', e.target.value)} placeholder="Cor"/></label>
      <label className="business-field">Placa (opcional)<input value={form.licensePlate} maxLength={10} onChange={e => field('licensePlate', e.target.value)} placeholder="Placa"/></label>
      <label className="business-field">Chassi / VIN (opcional)<input value={form.vin} maxLength={30} onChange={e => field('vin', e.target.value)} placeholder="VIN"/></label>
    </div>
    {error && <p className="business-alert" role="alert">{error}</p>}
    {notice && <p className="business-success" role="status">{notice}</p>}
    <div className="business-actions"><button type="button" className="primary" onClick={() => void submit()} disabled={!canWrite || saving || (mode === 'catalog' && !selectedCatalogId)}>{saving ? 'Cadastrando...' : 'Cadastrar e preparar anúncio'}</button></div>
  </div>
}

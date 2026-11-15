import { useEffect, useState } from 'react'
import { getJson, patchJson, postJson, type ApiRow } from './api'
import { describeError, removeBusiness } from './live-business-api'
import './live-business.css'

type Condition = 'OK' | 'ATTENTION' | 'REPAIR'
type Field = 'bodywork' | 'mechanical' | 'tires' | 'documents'
type Checklist = Record<Field, Condition>
type Inspection = { id: string; vehicleId: string; checklist: Checklist; notes: string; status: 'DRAFT' | 'APPROVED'; createdAt: string }
const OPTIONS: { value: Condition; label: string }[] = [{ value: 'OK', label: 'Em ordem' }, { value: 'ATTENTION', label: 'Requer atenção' }, { value: 'REPAIR', label: 'Reparo necessário' }]
const FIELDS: { key: Field; label: string }[] = [{key:'bodywork',label:'Lataria'},{key:'mechanical',label:'Mecânica'},{key:'tires',label:'Pneus'},{key:'documents',label:'Documentação'}]
const initial: Checklist = { bodywork: 'OK', mechanical: 'OK', tires: 'OK', documents: 'OK' }

export function LiveInspectionsPanel({ onOpenHistory, initialVehicleId = '' }: { onOpenHistory?: () => void; initialVehicleId?: string }) {
  const [vehicles, setVehicles] = useState<ApiRow[]>([])
  const [vehicleId, setVehicleId] = useState(initialVehicleId)
  const [rows, setRows] = useState<Inspection[]>([])
  const [checklist, setChecklist] = useState<Checklist>(initial)
  const [notes, setNotes] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    void getJson<{ data: ApiRow[] }>('/vehicles?page=1&limit=30', controller.signal).then(r => {
      if (!controller.signal.aborted) { setVehicles(r.data); setVehicleId(v => v || String(r.data[0]?.id ?? '')) }
    }).catch(e => { if (!controller.signal.aborted) setError(describeError(e)) })
    void getJson<{ enabled: boolean }>('/crud/status', controller.signal).then(r => { if (!controller.signal.aborted) setEnabled(r.enabled) }).catch(() => {})
    return () => controller.abort()
  }, [])
  useEffect(() => {
    if (!vehicleId) return
    const controller = new AbortController()
    void getJson<{ data: Inspection[] }>(`/crud/inspections?vehicleId=${encodeURIComponent(vehicleId)}&limit=30`, controller.signal)
      .then(r => { if (!controller.signal.aborted) setRows(r.data) })
      .catch(e => { if (!controller.signal.aborted) setError(describeError(e)) })
    return () => controller.abort()
  }, [vehicleId, revision])
  const writable = enabled && import.meta.env.DEV
  const reset = () => { setEditing(null); setChecklist(initial); setNotes('') }
  const run = async (fn: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setMessage('')
    try { await fn(); reset(); setMessage(success); setRevision(x => x + 1) }
    catch (e) { setError(describeError(e)) } finally { setBusy(false) }
  }
  const save = () => void run(async () => {
    if (editing) await patchJson(`/crud/inspections/${editing}`, { checklist, notes })
    else await postJson('/crud/inspections', { vehicleId, checklist, notes })
  }, editing ? 'Rascunho atualizado.' : 'Vistoria criada como rascunho.')
  const openEdit = (i: Inspection) => { setEditing(i.id); setChecklist(i.checklist); setNotes(i.notes); setError(''); setMessage('') }
  const approve = (i: Inspection) => {
    if (!window.confirm('Aprovar esta vistoria? Após aprovação não será possível editar ou excluir.')) return
    void run(async () => { await patchJson(`/crud/inspections/${i.id}`, { status: 'APPROVED' }) }, 'Vistoria aprovada e preservada no histórico.')
  }
  const remove = (i: Inspection) => {
    if (!window.confirm('Excluir este rascunho de vistoria?')) return
    void run(() => removeBusiness(`/crud/inspections/${i.id}`), 'Rascunho excluído.')
  }
  return <section className="business-panel"><div className="business-head"><div><h2>Vistorias de veículos</h2><p>Checklist técnico, observações e histórico documental no MongoDB. Somente rascunhos podem ser editados ou excluídos.</p></div><div className="business-actions"><button type="button" onClick={onOpenHistory} disabled={!onOpenHistory}>Consultar todas as vistorias</button><span className="business-badge">MongoDB</span></div></div>
    {!writable && <p className="business-alert">Habilite o modo de demonstração local para operar o cadastro.</p>}
    <label className="business-field">Veículo do estoque publicado<select value={vehicleId} onChange={e => {setVehicleId(e.target.value);reset();setMessage('')}}>{vehicleId && !vehicles.some(v => String(v.id) === vehicleId) && <option value={vehicleId}>Veículo selecionado — {vehicleId.slice(0,8)}</option>}{vehicles.map(v => <option key={String(v.id)} value={String(v.id)}>{String(v.make)} {String(v.model)} — {String(v.id).slice(0,8)}</option>)}</select></label>
    {vehicleId && <div className="business-form">
      {FIELDS.map(f => <label key={f.key} className="business-field">{f.label}<select value={checklist[f.key]} onChange={e => setChecklist(s => ({...s,[f.key]:e.target.value as Condition}))}>{OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>)}
      <label className="business-field wide">Observações técnicas<textarea maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex.: pneus dianteiros com desgaste, laudo enviado ao responsável"/></label>
      <div className="business-actions"><button className="primary" disabled={!writable||busy} onClick={save}>{editing?'Salvar vistoria':'Criar vistoria'}</button>{editing&&<button onClick={reset}>Cancelar edição</button>}</div>
    </div>}
    {error&&<p className="business-alert" role="alert">{error}</p>}{message&&<p className="business-success" role="status">{message}</p>}
    <div className="business-head"><h3>Últimas vistorias deste veículo ({rows.length})</h3><button onClick={()=>setRevision(x=>x+1)}>Atualizar</button></div>
    <div className="business-rows">{rows.map(i=><div className="business-row" key={i.id}><div><strong>{i.status==='APPROVED'?'Vistoria aprovada':'Rascunho de vistoria'} · {new Date(i.createdAt).toLocaleString('pt-BR')}</strong><small>{FIELDS.map(f=>`${f.label}: ${OPTIONS.find(o=>o.value===i.checklist[f.key])?.label ?? i.checklist[f.key]}`).join(' • ')}</small><small>{i.notes || 'Sem observações'}</small></div>{i.status==='DRAFT'&&<div className="business-actions"><button disabled={!writable||busy} onClick={()=>openEdit(i)}>Editar</button><button disabled={!writable||busy} onClick={()=>approve(i)}>Aprovar</button><button disabled={!writable||busy} onClick={()=>remove(i)}>Excluir rascunho</button></div>}</div>)}{!rows.length&&<p>Ainda não há vistorias cadastradas para este veículo.</p>}</div>
  </section>
}

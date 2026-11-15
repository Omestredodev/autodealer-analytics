import { useEffect, useState } from 'react'
import { getJson, patchJson, postJson } from './api'
import { describeError, removeBusiness } from './live-business-api'
import './live-business.css'

type Customer = { id: string; full_name: string; email: string | null; phone: string | null }
type List = { data: Customer[]; pagination?: { total: number; totalPages: number } }
type Form = { full_name: string; email: string; phone: string }
const empty: Form = { full_name: '', email: '', phone: '' }

export function LiveCustomersPanel() {
  const [rows, setRows] = useState<Customer[]>([])
  const [form, setForm] = useState<Form>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  useEffect(() => {
    const controller = new AbortController()
    void getJson<{ enabled: boolean }>('/crud/status', controller.signal).then(s => { if (!controller.signal.aborted) setEnabled(s.enabled) }).catch(() => {})
    void getJson<List>(`/crud/customers?limit=20&page=${page}&search=${encodeURIComponent(query.trim())}`, controller.signal)
      .then(r => { if (!controller.signal.aborted) { setRows(r.data); setTotal(r.pagination?.total ?? r.data.length); setTotalPages(r.pagination?.totalPages ?? 1) } })
      .catch(e => { if (!controller.signal.aborted) setError(describeError(e)) })
    return () => controller.abort()
  }, [revision, page, query])
  const writable = enabled && import.meta.env.DEV
  const run = async (action: () => Promise<void>, success: string) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); setForm(empty); setEditing(null); setNotice(success); setRevision(n => n + 1) }
    catch (e) { setError(describeError(e)) } finally { setBusy(false) }
  }
  const save = () => {
    if (!form.full_name.trim()) return
    const payload = { full_name: form.full_name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null }
    void run(async () => {
      if (editing) await patchJson(`/crud/customers/${editing}`, payload)
      else await postJson('/crud/customers', payload)
    }, editing ? 'Cliente atualizado.' : 'Cliente cadastrado.')
  }
  const edit = (c: Customer) => { setEditing(c.id); setForm({ full_name: c.full_name, email: c.email ?? '', phone: c.phone ?? '' }); setError(''); setNotice('') }
  const remove = (c: Customer) => {
    if (!window.confirm(`Excluir o cliente ${c.full_name}? Registros relacionados bloqueiam a exclusão.`)) return
    void run(() => removeBusiness(`/crud/customers/${c.id}`), 'Cliente excluído.')
  }
  return <section className="business-panel">
    <div className="business-head"><div><h2>Gestão de clientes</h2><p>Cadastro comercial e relacionamento no PostgreSQL. Clientes vinculados a operações não podem ser excluídos.</p></div><span className="business-badge">PostgreSQL</span></div>
    {!writable && <p className="business-alert">Edição disponível apenas no modo local com CRUD_DEMO_ENABLED=true.</p>}
    <div className="business-form">
      <label className="business-field">Nome completo<input value={form.full_name} onChange={e => setForm(s => ({ ...s, full_name: e.target.value }))} maxLength={150}/></label>
      <label className="business-field">E-mail<input type="email" value={form.email} onChange={e => setForm(s => ({ ...s, email: e.target.value }))}/></label>
      <label className="business-field">Telefone<input value={form.phone} onChange={e => setForm(s => ({ ...s, phone: e.target.value }))}/></label>
      <div className="business-actions"><button type="button" className="primary" disabled={!writable || busy || !form.full_name.trim()} onClick={save}>{editing ? 'Salvar alterações' : 'Cadastrar cliente'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(empty) }}>Cancelar</button>}</div>
    </div>
    {error && <p className="business-alert" role="alert">{error}</p>}{notice && <p className="business-success" role="status">{notice}</p>}
    <div className="business-head"><label className="business-field">Pesquisar clientes no banco<input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} placeholder="Nome, e-mail ou telefone"/></label><button onClick={() => setRevision(n => n + 1)}>Atualizar listagem</button></div>
    <div className="business-rows">{rows.map(c => <div className="business-row" key={c.id}><div><strong>{c.full_name}</strong><small>{c.email || 'Sem e-mail'} · {c.phone || 'Sem telefone'}</small><small>ID: {c.id}</small></div><div className="business-actions"><button disabled={!writable || busy} onClick={() => edit(c)}>Editar</button><button disabled={!writable || busy} onClick={() => remove(c)}>Excluir</button></div></div>)}{!rows.length && <p>Nenhum cliente encontrado.</p>}</div>
    <div className="business-head"><span>{total.toLocaleString('pt-BR')} clientes • Página {page} de {totalPages}</span><div className="business-actions"><button disabled={page <= 1} onClick={() => setPage(v => v - 1)}>Anterior</button><button disabled={page >= totalPages} onClick={() => setPage(v => v + 1)}>Próxima</button></div></div>
    <p>As alterações são gravadas no cadastro comercial real; a exclusão respeita as referências de leads, agendamentos e vendas.</p>
  </section>
}

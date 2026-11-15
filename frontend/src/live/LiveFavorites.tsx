import { useEffect, useMemo, useState } from 'react'
import { getJson, patchJson, postJson } from './api'
import { describeError, removeBusiness } from './live-business-api'
import './live-business.css'

type Favorite = {
  userId: string; vehicleId: string; interestLevel: 'LOW' | 'MEDIUM' | 'HIGH'; createdAt?: string;
  vehicle?: { make: string; model: string; model_year: number; status: string } | null;
}
type User = { id: string; full_name: string }
type Level = Favorite['interestLevel']
const levels: { value: Level; label: string }[] = [
  {value:'LOW',label:'Interesse inicial'}, {value:'MEDIUM',label:'Em avaliação'}, {value:'HIGH',label:'Alta prioridade'},
]
function useFavorites() {
  const [user, setUser] = useState<User | null>(null)
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void getJson<{ enabled: boolean }>('/crud/status', controller.signal).then(r=>{
      if (!controller.signal.aborted) setEnabled(r.enabled)
      if (!r.enabled) return
      return getJson<{data:User}>('/crud/demo-user',controller.signal)
    }).then(r=>{if(r && !controller.signal.aborted)setUser(r.data)}).catch(e=>{if(!controller.signal.aborted)setError(describeError(e))})
    return ()=>controller.abort()
  }, [])
  useEffect(() => {
    if (!user) return
    const controller = new AbortController()
    void getJson<{data:Favorite[]}>(`/crud/favorites?userId=${encodeURIComponent(user.id)}`,controller.signal)
      .then(r=>{if(!controller.signal.aborted)setFavorites(r.data)})
      .catch(e=>{if(!controller.signal.aborted)setError(describeError(e))})
    return ()=>controller.abort()
  }, [user,revision])
  return { user, favorites, enabled, error, setError, refresh:()=>setRevision(r=>r+1) }
}

export function LiveFavoriteAction({ vehicleId }: { vehicleId: string }) {
  const {user,favorites,enabled,error,setError,refresh} = useFavorites()
  const [busy,setBusy] = useState(false)
  const [level,setLevel] = useState<Level>('MEDIUM')
  const found = favorites.find(f=>f.vehicleId===vehicleId)
  const writable = enabled && import.meta.env.DEV && user !== null
  const toggle=async()=>{
    if(!user) return
    setBusy(true);setError('')
    try{
      if(found) await removeBusiness(`/crud/favorites/${user.id}/${vehicleId}`)
      else await postJson('/crud/favorites',{userId:user.id,vehicleId,interestLevel:level})
      refresh()
    }catch(e){setError(describeError(e))}finally{setBusy(false)}
  }
  return <div className="business-favorites"><h3>Meu interesse</h3><p>Favoritos e prioridade de atendimento registrados no Cassandra para um perfil de demonstração local.</p>
    {!enabled&&<p>Favoritos disponíveis quando o modo local de negócios estiver habilitado.</p>}
    {!found && <select className="business-favorite-select" aria-label="Prioridade de interesse" value={level} onChange={e=>setLevel(e.target.value as Level)}>{levels.map(l=><option key={l.value} value={l.value}>{l.label}</option>)}</select>}
    <button className="business-favorite-button primary" disabled={!writable||busy} onClick={()=>void toggle()}>{found?'♥ Remover dos favoritos':'♡ Adicionar aos favoritos'}</button>
    {found&&<p>Salvo com prioridade: {levels.find(l=>l.value===found.interestLevel)?.label}</p>}
    {error&&<p className="business-alert" role="alert">{error}</p>}
  </div>
}

export function LiveFavoritesList({ onSelect }: { onSelect: (vehicleId: string)=>void }) {
  const {user,favorites,enabled,error,setError,refresh} = useFavorites()
  const [busy,setBusy] = useState(false)
  const [query,setQuery] = useState('')
  const [priority,setPriority] = useState('')
  const [notice,setNotice] = useState('')
  const visible = useMemo(() => favorites.filter(f => {
    if (priority && priority !== f.interestLevel) return false
    const haystack = `${f.vehicle?.make ?? ''} ${f.vehicle?.model ?? ''} ${f.vehicleId}`.toLocaleLowerCase('pt-BR')
    return haystack.includes(query.trim().toLocaleLowerCase('pt-BR'))
  }),[favorites,query,priority])
  const writable = enabled && import.meta.env.DEV && user !== null
  const update = async (vehicleId:string,interestLevel:Level)=>{
    if(!user) return
    setBusy(true);setError('');setNotice('')
    try{await patchJson(`/crud/favorites/${user.id}/${vehicleId}`,{interestLevel});setNotice('Prioridade atualizada.');refresh()}
    catch(e){setError(describeError(e))}finally{setBusy(false)}
  }
  const remove = async(vehicleId:string)=>{
    if(!user||!window.confirm('Remover veículo dos seus favoritos?'))return
    setBusy(true);setError('');setNotice('')
    try{await removeBusiness(`/crud/favorites/${user.id}/${vehicleId}`);setNotice('Veículo removido dos favoritos.');refresh()}
    catch(e){setError(describeError(e))}finally{setBusy(false)}
  }
  return <section className="business-favorites business-favorites-manage">
    <div className="business-head"><div><h3>Seus veículos salvos ({favorites.length})</h3>
      <p>Gerencie as prioridades e acesse o veículo. O Cassandra armazena os vínculos; as características vêm do PostgreSQL.</p></div>
      <button onClick={refresh}>Atualizar favoritos</button></div>
    {!enabled && <p className="business-alert">Recurso disponível somente no ambiente local com CRUD_DEMO_ENABLED=true.</p>}
    {enabled && user && <p className="business-profile">Perfil demonstrativo: <strong>{user.full_name}</strong> (sem login real)</p>}
    {notice && <p className="business-success" role="status">{notice}</p>}
    {error && <p className="business-alert" role="alert">{error}</p>}
    <div className="business-favorites-filters">
      <label className="business-field">Buscar veículo
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Marca, modelo ou ID" /></label>
      <label className="business-field">Prioridade
        <select value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">Todas as prioridades</option>
          {levels.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
        </select></label>
    </div>
    {enabled && user && !favorites.length && <p>Nenhum favorito salvo ainda. Abra um veículo no catálogo e clique em “Adicionar aos favoritos”.</p>}
    {enabled && user && !!favorites.length && !visible.length && <p>Nenhum favorito corresponde aos filtros selecionados.</p>}
    <div className="business-favorites-grid">
      {visible.map(f => <article key={f.vehicleId} className="business-favorite-card">
        <div className="business-favorite-photo" aria-hidden="true">🚘</div>
        <div className="business-favorite-content">
          <span className="business-badge">{levels.find(l => l.value === f.interestLevel)?.label}</span>
          <h3>{f.vehicle ? `${f.vehicle.make} ${f.vehicle.model}` : 'Veículo não encontrado'}</h3>
          <p>Ano {f.vehicle?.model_year ?? '—'} · Situação: {f.vehicle?.status ?? 'Indisponível'}</p>
          <small>ID: {f.vehicleId}</small>
          <div className="business-actions">
            <label className="business-field">Prioridade do interesse
              <select className="business-favorite-select" value={f.interestLevel} disabled={!writable || busy}
                onChange={e => void update(f.vehicleId, e.target.value as Level)}>
                {levels.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select></label>
            <button disabled={!f.vehicle || f.vehicle.status !== 'AVAILABLE'} onClick={() => onSelect(f.vehicleId)}>Ver veículo</button>
            <button disabled={!writable || busy} onClick={() => void remove(f.vehicleId)}>Remover favorito</button>
          </div>
        </div>
      </article>)}
    </div>
    <p className="business-note">Os favoritos são vinculados a um único usuário fictício de demonstração e esta listagem retorna até 100 registros. Não representa uma conta autenticada.</p>
  </section>
}

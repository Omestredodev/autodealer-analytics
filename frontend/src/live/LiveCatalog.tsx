import { useEffect, useMemo, useRef, useState } from 'react'
import { cellText, getJson, money, postJson, type ApiRow } from './api'
import { useResource } from './useResource'
import { LiveFavoriteAction } from './LiveFavorites'

type SelectProps = { onSelect: (id: string) => void }
export function LiveCatalog({onSelect,onFavorites}: SelectProps & {onFavorites?:()=>void}) {
  const [page,setPage]=useState(1)
  const [make,setMake]=useState('')
  const [minPrice,setMinPrice]=useState('')
  const [maxPrice,setMaxPrice]=useState('')
  const [sort,setSort]=useState('recent')
  const [filtersOpen,setFiltersOpen]=useState(false)
  const path=useMemo(()=>{
    const p=new URLSearchParams({page:String(page),limit:'12'})
    if(make.trim()) p.set('make',make.trim())
    if(minPrice.trim()) p.set('minPrice',minPrice.trim())
    if(maxPrice.trim()) p.set('maxPrice',maxPrice.trim())
    if(sort==='price_asc') p.set('sort','price_asc')
    else if(sort==='price_desc') p.set('sort','price_desc')
    return `/vehicles?${p.toString()}`
  },[page,make,minPrice,maxPrice,sort])
  const {data,pagination,loading,error}=useResource(path)
  return <main className="client-main inner-page" data-frame="C02 — Catálogo • dados reais"><div className="inner-head"><div><span>INÍCIO / VEÍCULOS</span><h1>Encontre seu próximo veículo</h1><p>Catálogo consultado diretamente no PostgreSQL: {pagination?.total?.toLocaleString('pt-BR') ?? '...'} veículos com anúncio publicado e disponibilidade.</p></div></div>
    <div className="catalog-layout"><aside className={`filters ${filtersOpen?'filters-open':''}`}><div><h2>Filtros</h2><button onClick={()=>setFiltersOpen(false)}>Fechar</button></div>
      <label>Marca<input value={make} onChange={e=>{setMake(e.target.value);setPage(1)}} placeholder="Ex.: BMW"/></label>
      <label>Preço mínimo (R$)<input type="number" min="0" value={minPrice} onChange={e=>{setMinPrice(e.target.value);setPage(1)}} placeholder="50000"/></label>
      <label>Preço máximo (R$)<input type="number" min="0" value={maxPrice} onChange={e=>{setMaxPrice(e.target.value);setPage(1)}} placeholder="200000"/></label>
      <button className="apply-filter" onClick={()=>setFiltersOpen(false)}>Aplicar filtros</button></aside>
      <section className="results"><div className="catalog-tools"><div className="catalog-search"><span>Veículos disponíveis</span></div>{onFavorites&&<button type="button" onClick={onFavorites}>♥ Meus favoritos</button>}<button className="mobile-filter" onClick={()=>setFiltersOpen(true)}>Filtros</button><select aria-label="Ordenar por" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}><option value="recent">Mais recentes</option><option value="price_asc">Menor preço</option><option value="price_desc">Maior preço</option></select></div>
      {loading&&<p className="live-info">Consultando catálogo...</p>}{error&&<p className="live-error" role="alert">{error} — verifique a API na porta 3333.</p>}
      {!loading&&!error&&<div className="live-catalog-grid">{data.map(car=><button className="live-car-card" onClick={()=>onSelect(String(car.id))} key={String(car.id)}><div className="live-photo"><span>🚘</span><small>Imagem ilustrativa indisponível</small></div><div className="live-car-info"><small>{cellText(car.model_year)} • {Number(car.mileage||0).toLocaleString('pt-BR')} km</small><h3>{cellText(car.make)} {cellText(car.model)}</h3><p>{cellText(car.version)}</p><strong>{money(car.price)}</strong><span className="live-availability">Disponível • Ver detalhes</span></div></button>)}</div>}
      {!loading&&!error&&!data.length&&<p className="live-info">Nenhum veículo encontrado. Ajuste os filtros.</p>}
      <div className="live-pagination"><span>Página {page} / {pagination?.totalPages ?? 1}</span><div><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><button disabled={page >= (pagination?.totalPages ?? 1)} onClick={()=>setPage(p=>p+1)}>Próxima</button></div></div>
      </section></div>

  </main>
}

export function LiveVehicleDetail({ id, onBack }: { id: string | null; onBack: () => void }) {
  const [row,setRow]=useState<ApiRow|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [telemetry,setTelemetry]=useState('')
  const tracked=useRef<Set<string>>(new Set())
  useEffect(()=>{
    if(!id) return
    setRow(null); setError(null); setTelemetry('')
    const controller=new AbortController()
    getJson<{data:ApiRow}>(`/vehicles/${encodeURIComponent(id)}`,controller.signal).then(result=>setRow(result.data)).catch(e=>{if(!controller.signal.aborted)setError(String(e))})
    return ()=>controller.abort()
  },[id])
  useEffect(()=>{
    if(!row || !id || row.id !== id || typeof row.advertisement_id !== 'string') return
    if(tracked.current.has(id)) return
    tracked.current.add(id)
    const event={eventId:crypto.randomUUID(), occurredAt:new Date().toISOString(),eventType:'ADVERTISEMENT_VIEWED',advertisementId:row.advertisement_id}
    setTelemetry('Registrando visualização no Cassandra...')
    postJson<{data:{eventId:string}}>('/activity-events',event)
      .then(()=>setTelemetry('Visualização registrada no Cassandra.'))
      .catch(()=>setTelemetry('Não foi possível registrar a visualização no Cassandra; o catálogo permanece disponível.'))
  },[id,row])
  return <main className="client-main inner-page detail-page"><button className="back-link" onClick={onBack}>← Voltar para veículos</button>
    {!id&&<p className="live-error">Selecione um veículo do catálogo.</p>}
    {error&&<p className="live-error">{error}</p>}
    {!error&&id&&!row&&<p className="live-info">Consultando veículo...</p>}
    {row&&<div className="live-vehicle-detail"><div className="live-photo large"><span>🚘</span><small>Foto não disponível na base atual</small></div><div className="live-detail-info"><span className="live-availability">● {cellText(row.status)}</span><small>{cellText(row.id)}</small><h1>{cellText(row.make)} {cellText(row.model)}</h1><p>{cellText(row.version)}</p><strong>{money(row.price)}</strong><dl>
      {([['Ano modelo',row.model_year],['Quilometragem',`${Number(row.mileage || 0).toLocaleString('pt-BR')} km`],['Combustível',row.fuel_type],['Câmbio',row.transmission],['Cor',row.color],['Motor',row.engine],['Anúncio',row.advertisement_id]] as [string,unknown][]).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{cellText(value)}</dd></div>)}
    </dl>{telemetry&&<p className={`live-telemetry-note ${telemetry.startsWith('Não')?'live-telemetry-error':''}`} role="status">{telemetry}</p>}<LiveFavoriteAction vehicleId={String(row.id)}/><p className="live-note">Consulta real do PostgreSQL. Fotos e solicitação de interesse dependem de funcionalidades ainda não implementadas no backend.</p></div></div>}
  </main>
}

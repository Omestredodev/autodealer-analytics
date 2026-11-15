import { useEffect, useState } from 'react'
import { getJson, money } from './api'
import './live-featured.css'

type Featured = {
  id: string; advertisement_id: string; title: string;
  make: string; model: string; version: string | null;
  model_year: number; mileage: number; transmission: string | null; price: string;
}

export function LiveFeaturedVehicles({ onSelect, onBrowse }: {
  onSelect: (vehicleId: string) => void;
  onBrowse: () => void;
}) {
  const [data, setData] = useState<Featured[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    getJson<{ data: Featured[] }>('/featured-vehicles', controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result.data) })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Erro na consulta') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [])
  return <section className="client-section" aria-label="Veículos em destaque">
    <div className="section-title"><div><span>SELEÇÃO ESPECIAL</span><h2>Veículos em destaque</h2>
      <p>Veículos reais do estoque, com anúncios publicados e selecionados pela concessionária.</p></div>
      <button type="button" onClick={onBrowse}>Ver todos →</button>
    </div>
    {loading && <p>Carregando destaques...</p>}
    {error && <p className="live-error" role="alert">Não foi possível carregar os destaques: {error}</p>}
    {!loading && !error && !data.length && <p className="featured-empty">Ainda não há anúncios destacados. Acesse Anúncios no painel administrativo e selecione “Destacar no site” em um anúncio publicado.</p>}
    {!loading && !error && !!data.length && <div className="car-grid featured-real-grid">
      {data.map(ad => <article className="car-card featured-real-card" key={ad.advertisement_id}>
        <div className="featured-photo-placeholder" aria-label="Sem fotografia cadastrada"><span>🚘</span><small>Foto do veículo ainda não cadastrada</small></div>
        <div className="car-info"><small className="featured-label">ANÚNCIO EM DESTAQUE</small>
          <h3>{ad.make} {ad.model}</h3><p>{ad.version ?? ''}</p>
          <div className="car-meta"><span>{ad.model_year}</span><i/><span>{Number(ad.mileage).toLocaleString('pt-BR')} km</span>
            {ad.transmission && <><i/><span>{ad.transmission}</span></>}</div>
          <div className="car-price"><span>Valor anunciado</span><strong>{money(ad.price)}</strong></div>
          <button type="button" onClick={() => onSelect(ad.id)}>Ver detalhes →</button>
        </div>
      </article>)}
    </div>}
  </section>
}

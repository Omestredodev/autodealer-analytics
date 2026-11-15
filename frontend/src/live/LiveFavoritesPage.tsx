import { LiveFavoritesList } from './LiveFavorites'
import './live-business.css'
import './live-history.css'

export function LiveFavoritesPage({ onSelect, onBrowse }: { onSelect: (vehicleId: string) => void; onBrowse: () => void }) {
  return <main className="client-main inner-page business-favorites-page">
    <div className="inner-head"><div>
      <span>INÍCIO / MEUS FAVORITOS</span>
      <h1>Meus favoritos</h1>
      <p>Organize os veículos de seu interesse, altere prioridades e retorne diretamente ao catálogo.</p>
    </div><button className="business-page-link" onClick={onBrowse}>Explorar veículos</button></div>
    <LiveFavoritesList onSelect={onSelect}/>
  </main>
}

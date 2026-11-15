"""Aplica apenas mudanças de navegação no App.tsx já integrado (Clientes/Vistorias).
Falha de forma segura se o arquivo divergir: nenhuma escrita parcial.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
path = root / 'frontend' / 'src' / 'App.tsx'
if not path.is_file():
    sys.exit('ERRO: frontend/src/App.tsx não foi encontrado.')
original = path.read_text(encoding='utf-8')
if "import { LiveFavoritesPage }" in original:
    print('[OK] Navegação de vistorias e favoritos já aplicada.')
    sys.exit(0)

changes = [
    (
        "import { LiveInspectionsPanel } from './live/LiveInspectionsPanel'",
        "import { LiveInspectionsPanel } from './live/LiveInspectionsPanel'\nimport { LiveInspectionsHistory } from './live/LiveInspectionsHistory'\nimport { LiveFavoritesPage } from './live/LiveFavoritesPage'",
    ),
    (
        "  { name: 'Vistorias', icon: 'audit' },",
        "  { name: 'Vistorias', icon: 'audit' },\n  { name: 'Histórico de vistorias', icon: 'clock' },",
    ),
    (
        "  const [active, setActive] = useState(initialActive)\n  const [drawer, setDrawer] = useState(false)",
        "  const [active, setActive] = useState(initialActive)\n  const [drawer, setDrawer] = useState(false)\n  const [inspectionVehicleId, setInspectionVehicleId] = useState('')",
    ),
    (
        "'Clientes','Vistorias','Agendamentos'",
        "'Clientes','Vistorias','Histórico de vistorias','Agendamentos'",
    ),
    (
        "active === 'Vistorias' ? <LiveInspectionsPanel/> :",
        "active === 'Vistorias' ? <LiveInspectionsPanel initialVehicleId={inspectionVehicleId} onOpenHistory={() => setActive('Histórico de vistorias')}/> :\n            active === 'Histórico de vistorias' ? <LiveInspectionsHistory onNew={(id = '') => { setInspectionVehicleId(id); setActive('Vistorias') }}/> :",
    ),
    (
        "type ClientPage = 'home' | 'catalog' | 'detail' | 'auth' | 'schedule' | 'account'",
        "type ClientPage = 'home' | 'catalog' | 'detail' | 'favorites' | 'auth' | 'schedule' | 'account'",
    ),
    (
        "<button onClick={() => go('catalog')} className={page === 'catalog' || page === 'detail' ? 'selected' : ''}>Veículos</button>",
        "<button onClick={() => go('catalog')} className={page === 'catalog' || page === 'detail' ? 'selected' : ''}>Veículos</button>\n        <button onClick={() => go('favorites')} className={page === 'favorites' ? 'selected' : ''}>♥ Favoritos</button>",
    ),
    (
        "{page === 'catalog' && <LiveCatalog onSelect={id=>{setSelectedVehicleId(id);go('detail')}}/>}",
        "{page === 'catalog' && <LiveCatalog onSelect={id=>{setSelectedVehicleId(id);go('detail')}} onFavorites={() => go('favorites')}/>}\n    {page === 'favorites' && <LiveFavoritesPage onSelect={id=>{setSelectedVehicleId(id);go('detail')}} onBrowse={() => go('catalog')}/>}"
    ),
    (
        "<button onClick={() => go('schedule')}>Agendamento</button><button onClick={() => go('auth')}>Entrar</button>",
        "<button onClick={() => go('schedule')}>Agendamento</button><button onClick={() => go('favorites')}>Meus favoritos</button><button onClick={() => go('auth')}>Entrar</button>",
    ),
    (
        "<button className={page==='schedule'?'active':''} onClick={()=>go('schedule')}><Icon name=\"calendar\"/><span>Agendar</span></button>",
        "<button className={page==='favorites'?'active':''} onClick={()=>go('favorites')}><Icon name=\"car\"/><span>Favoritos</span></button><button className={page==='schedule'?'active':''} onClick={()=>go('schedule')}><Icon name=\"calendar\"/><span>Agendar</span></button>",
    ),
]
result = original
for before, after in changes:
    found = result.count(before)
    # A lista de páginas aparece duas vezes (descrição e checagem do botão); ambas devem mudar.
    expected = 2 if before == "'Clientes','Vistorias','Agendamentos'" else 1
    if found != expected:
        sys.exit(f'ERRO: esperado {expected} ocorrência(s) de {before[:75]!r}; encontrado {found}. App.tsx não foi alterado.')
    result = result.replace(before, after)
path.write_text(result, encoding='utf-8')
print('[OK] App.tsx: telas de Histórico de vistorias e Meus favoritos integradas, sem substituir o restante do frontend.')

"""Patch conservador/idempotente: navegação comercial e anúncios reais em destaque.
Não altera bancos; execute a migration SQL separadamente.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
app = root / 'frontend/src/App.tsx'
module = root / 'frontend/src/live/LiveModule.tsx'
inventory = root / 'frontend/src/live/LiveInventoryManager.tsx'
api = root / 'backend/src/app.ts'
business = root / 'backend/src/modules/business/business.routes.ts'
stock = root / 'backend/src/modules/business/stock.routes.ts'
schema = root / 'database/postgresql/schema.sql'
files = [app, module, inventory, api, business, stock, schema]
for p in files:
    if not p.exists():
        sys.exit(f'ERRO: arquivo esperado não encontrado: {p}')

changes = {}
def replace(s, before, after, file, count=1):
    found = s.count(before)
    if found != count:
        raise ValueError(f'{file.relative_to(root)}: esperadas {count} ocorrências de {before[:85]!r}, encontradas {found}. Sem arquivos alterados.')
    return s.replace(before, after)

try:
    s = app.read_text(encoding='utf-8-sig')
    if "import { LiveFeaturedVehicles }" not in s:
        s = replace(s, "import { LiveCatalog, LiveVehicleDetail } from './live/LiveCatalog'",
            "import { LiveCatalog, LiveVehicleDetail } from './live/LiveCatalog'\nimport { LiveRegistrationPage, type VehicleSelection } from './live/LiveRegistrationPage'\nimport { LiveFeaturedVehicles } from './live/LiveFeaturedVehicles'", app)
        s = replace(s, '  const [drawer, setDrawer] = useState(false)',
            '  const [drawer, setDrawer] = useState(false)\n  const [pendingVehicle, setPendingVehicle] = useState<VehicleSelection | null>(null)', app)
        s = replace(s, "active === 'Clientes' ? <LiveCustomersPanel/>",
            "active === 'Cadastro de veículo' ? <LiveRegistrationPage onRegistered={vehicle => { setPendingVehicle(vehicle); setActive('Anúncios') }}/> :\n            active === 'Clientes' ? <LiveCustomersPanel/>", app)
        s = replace(s, '? <LiveModule name={active}/>',
            "? <LiveModule name={active} initialVehicle={active === 'Anúncios' ? pendingVehicle : null} onCreateAd={v => { setPendingVehicle(v); setActive('Anúncios') }} onNavigateRegistration={() => setActive('Cadastro de veículo')}/>", app)
        s = replace(s, "['Veículos','Anúncios','Leads','Clientes','Vistorias'", "['Veículos','Anúncios','Cadastro de veículo','Leads','Clientes','Vistorias'", app)
        s = replace(s, "['Visão geral','Veículos','Anúncios','Leads','Clientes','Vistorias'", "['Visão geral','Veículos','Anúncios','Cadastro de veículo','Leads','Clientes','Vistorias'", app)
        s = replace(s, "{page === 'home' && <ClientHome go={go}/>}",
            "{page === 'home' && <ClientHome go={go} onSelect={id => { setSelectedVehicleId(id); go('detail') }}/>}", app)
        s = replace(s, "function ClientHome({ go }: { go: (p: ClientPage) => void }) {",
            "function ClientHome({ go, onSelect }: { go: (p: ClientPage) => void; onSelect: (id:string) => void }) {", app)
        home_start = s.index('    <section className="client-section"><div className="section-title"><div><span>SELEÇÃO ESPECIAL</span><h2>Veículos em destaque</h2>')
        home_end = s.index('    <section className="categories client-section">', home_start)
        s = s[:home_start] + "    <LiveFeaturedVehicles onSelect={onSelect} onBrowse={() => go('catalog')}/>\n" + s[home_end:]
        changes[app] = s

    s = module.read_text(encoding='utf-8-sig')
    if 'initialVehicle?: VehicleSelection | null' not in s:
        s = replace(s, "import { LiveInventoryManager } from './LiveInventoryManager'",
            "import { LiveInventoryManager } from './LiveInventoryManager'\nimport type { VehicleSelection } from './LiveRegistrationPage'", module)
        s = replace(s, 'export function LiveModule({ name }: { name: string }) {',
            "export function LiveModule({ name, initialVehicle, onCreateAd, onNavigateRegistration }: { name: string; initialVehicle?: VehicleSelection | null; onCreateAd?: (vehicle: VehicleSelection) => void; onNavigateRegistration?: () => void }) {", module)
        # As versões anteriores da tela usam diferentes expressões para a prop "mode".
        # Acrescente as novas props sem alterar a expressão mode, a condição ou onChanged.
        linhas = s.splitlines(keepends=True)
        alvos = [i for i, linha in enumerate(linhas) if '<LiveInventoryManager ' in linha]
        if len(alvos) != 1:
            raise ValueError(f'{module.relative_to(root)}: esperado 1 componente LiveInventoryManager, encontrado {len(alvos)}. Sem arquivos alterados.')
        idx = alvos[0]
        if 'initialVehicle={initialVehicle}' not in linhas[idx]:
            if ' onChanged=' not in linhas[idx]:
                raise ValueError(f'{module.relative_to(root)}: componente sem propriedade onChanged. Sem arquivos alterados.')
            linhas[idx] = linhas[idx].replace(' onChanged=',
                ' initialVehicle={initialVehicle} onCreateAd={onCreateAd} onNavigateRegistration={onNavigateRegistration} onChanged=', 1)
        s = ''.join(linhas)
        changes[module] = s

    s = inventory.read_text(encoding='utf-8-sig')
    if 'initialVehicle?: VehicleSelection | null' not in s:
        s = replace(s, "import { LiveVehicleRegistration } from './LiveVehicleRegistration'",
            "import type { VehicleSelection } from './LiveRegistrationPage'", inventory)
        s = replace(s,
            "export function LiveInventoryManager({ mode, onChanged }: { mode: 'Veículos' | 'Anúncios'; onChanged: () => void }) {",
            "export function LiveInventoryManager({ mode, initialVehicle, onCreateAd, onNavigateRegistration, onChanged }: { mode: 'Veículos' | 'Anúncios'; initialVehicle?: VehicleSelection | null; onCreateAd?: (vehicle: VehicleSelection) => void; onNavigateRegistration?: () => void; onChanged: () => void }) {", inventory)
        s = replace(s, '  const canWrite = enabled && writable && import.meta.env.DEV',
            '''  const canWrite = enabled && writable && import.meta.env.DEV
  useEffect(() => {
    if (!isVehicle && initialVehicle) {
      setTargetVehicle(initialVehicle.id)
      setAdForm({ ...empty, title: `${initialVehicle.make} ${initialVehicle.model} ${initialVehicle.version ?? ''} ${initialVehicle.model_year}`.trim() })
      setNotice('Veículo cadastrado: informe o preço, revise o título e publique o anúncio.')
    }
  }, [isVehicle, initialVehicle?.id])''', inventory)
        begin = s.index('    {isVehicle && <LiveVehicleRegistration')
        end = s.index('    <div className="stock-section" ref={createRef}>', begin)
        s = s[:begin] + '''    {isVehicle && <div className="stock-section"><p>Cadastre novos veículos na aba <strong>Cadastro de veículo</strong>. Nesta página você gerencia o estoque existente.</p>
      <button type="button" onClick={onNavigateRegistration}>+ Cadastrar veículo</button></div>}
    {!isVehicle && <div className="stock-section" ref={createRef}>''' + s[end+len('    <div className="stock-section" ref={createRef}>'):]
        marker = '    <div className="stock-section">\n      <div className="business-head"><h3>{isVehicle'
        s = replace(s, marker, '    '+ '}'+'\n' + marker.replace('    <div', '    <div'), inventory)
        # The close of the preceding form is </div>; append closing } before the next section.
        s = s.replace('    }\n    <div className="stock-section">\n      <div className="business-head"><h3>{isVehicle', '    }\n    <div className="stock-section">\n      <div className="business-head"><h3>{isVehicle', 1)
        # The closing } inserted above is after the ad form </div>.
        s = replace(s, "{v.status === 'AVAILABLE' && <button disabled={!canWrite || busy || v.published_ads > 0} onClick={() => choose(v.id)}>{v.published_ads > 0 ? 'Já anunciado' : 'Criar anúncio'}</button>}",
            "{v.status === 'AVAILABLE' && <button disabled={!canWrite || busy || v.published_ads > 0} onClick={() => onCreateAd?.(v)}>{v.published_ads > 0 ? 'Já anunciado' : 'Criar anúncio'}</button>}", inventory)
        s = replace(s, 'status: string; published_at: string | null;', 'status: string; published_at: string | null; featured: boolean;', inventory)
        s = replace(s, '  const removeAd = (ad: Ad) => {',
            '''  const toggleFeatured = (ad: Ad) => {
    if (ad.status !== 'PUBLISHED') return
    void execute(async () => {
      await patchJson(`/crud/stock/advertisements/${ad.id}/featured`, { featured: !ad.featured })
    }, ad.featured ? 'Anúncio removido dos destaques.' : 'Anúncio incluído nos destaques da página inicial.')
  }
  const removeAd = (ad: Ad) => {''', inventory)
        s = replace(s, "<small>Anúncio: {a.id} · Veículo: {a.vehicle_id}</small>",
            "<small>Anúncio: {a.id} · Veículo: {a.vehicle_id}{a.featured ? ' · ★ Destaque' : ''}</small>", inventory)
        s = replace(s, "{a.status === 'PUBLISHED' && <button disabled={!canWrite || busy} onClick={() => changeAd(a, 'PAUSED')}>Pausar</button>}",
            "{a.status === 'PUBLISHED' && <button disabled={!canWrite || busy} onClick={() => changeAd(a, 'PAUSED')}>Pausar</button>}\n            {a.status === 'PUBLISHED' && a.vehicle_status === 'AVAILABLE' && <button disabled={!canWrite || busy} onClick={() => toggleFeatured(a)}>{a.featured ? 'Remover destaque' : 'Destacar no site'}</button>}", inventory)
        changes[inventory] = s

    s = api.read_text(encoding='utf-8-sig')
    if "import { featuredRoutes }" not in s:
        s = replace(s, "import { advertisementsRoutes } from './modules/advertisements/advertisements.routes';",
            "import { advertisementsRoutes } from './modules/advertisements/advertisements.routes';\nimport { featuredRoutes } from './modules/advertisements/featured.routes';", api)
        s = replace(s, '  app.register(advertisementsRoutes);',
            '  app.register(advertisementsRoutes);\n  app.register(featuredRoutes);', api)
        changes[api] = s

    s = business.read_text(encoding='utf-8-sig')
    if 'import { featuredAdminRoutes }' not in s:
        s = replace(s, "import { stockRoutes } from './stock.routes';",
            "import { stockRoutes } from './stock.routes';\nimport { featuredAdminRoutes } from './featured-admin.routes';", business)
        s = replace(s, '  await app.register(stockRoutes);',
            '  await app.register(stockRoutes);\n  await app.register(featuredAdminRoutes);', business)
        changes[business] = s

    s = stock.read_text(encoding='utf-8-sig')
    if 'a.is_featured AS featured' not in s:
        s = replace(s, 'a.price::text AS price,a.status,a.published_at,',
            'a.price::text AS price,a.status,a.published_at,a.is_featured AS featured,', stock)
        changes[stock] = s

    s = schema.read_text(encoding='utf-8-sig')
    if 'is_featured BOOLEAN' not in s:
        s = replace(s, "    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',",
            "    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',\n    is_featured BOOLEAN NOT NULL DEFAULT FALSE,", schema)
        changes[schema] = s

    for path, content in changes.items():
        path.write_text(content, encoding='utf-8')
        print('[OK] Atualizado:', path.relative_to(root))
    if not changes:
        print('[OK] Patch já aplicado, nenhum arquivo alterado.')
    print('[OK] Navegação e destaques integrados. A migration SQL deve ser aplicada separadamente.')
except ValueError as exc:
    sys.exit(f'ERRO: {exc}')

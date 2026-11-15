"""Incorpora cadastro -> anúncio sem sobrescrever a branch de desenvolvimento.
Idempotente, verifica todos os pontos esperados antes de qualquer gravação.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
business = root / 'backend/src/modules/business/business.routes.ts'
audit = root / 'backend/src/modules/operations/audit-outbox.ts'
inventory = root / 'frontend/src/live/LiveInventoryManager.tsx'

for p in (business, audit, inventory):
    if not p.is_file():
        sys.exit(f'ERRO: arquivo esperado ausente: {p}')

changes = {}

def inject(text: str, old: str, new: str, file: Path) -> str:
    n = text.count(old)
    if n != 1:
        sys.exit(f'ERRO em {file.relative_to(root)}: esperado um ponto de insercao, encontrados {n}. Nenhuma gravacao realizada. Trecho: {old!r}')
    return text.replace(old, new, 1)

s = business.read_text(encoding='utf-8-sig')
if "import { vehicleRegistrationRoutes }" not in s:
    s = inject(s,
        "import { stockRoutes } from './stock.routes';",
        "import { stockRoutes } from './stock.routes';\nimport { vehicleRegistrationRoutes } from './vehicle-registration.routes';",
        business)
    s = inject(s,
        '  await app.register(stockRoutes);',
        '  await app.register(stockRoutes);\n  await app.register(vehicleRegistrationRoutes);',
        business)
    changes[business] = s

s = audit.read_text(encoding='utf-8-sig')
if "  | 'VEHICLE_CREATED'" not in s:
    s = inject(s, "  | 'VEHICLE_STATUS_CHANGED'", "  | 'VEHICLE_CREATED'\n  | 'VEHICLE_STATUS_CHANGED'", audit)
    changes[audit] = s

s = inventory.read_text(encoding='utf-8-sig')
if "import { LiveVehicleRegistration }" not in s:
    s = inject(s,
        "import './live-stock.css'",
        "import './live-stock.css'\nimport { LiveVehicleRegistration } from './LiveVehicleRegistration'",
        inventory)
    s = inject(s,
        "    <div className=\"stock-section\" ref={createRef}>",
        """    {isVehicle && <LiveVehicleRegistration canWrite={canWrite && !busy} onRegistered={vehicle => {
      choose(vehicle.id)
      setAdForm({ ...empty, title: `${vehicle.make} ${vehicle.model} ${vehicle.version ?? ''} ${vehicle.model_year}`.trim() })
      setVehicleQuery('')
      setNotice(`Veículo cadastrado. Complete o preço e publique o anúncio de ${vehicle.make} ${vehicle.model}.`)
      refresh()
    }}/>}
    <div className="stock-section" ref={createRef}>""",
        inventory)
    s = inject(s, "      <h3>Criar anúncio</h3>", "      <h3>{isVehicle ? '2. Criar anúncio para o veículo cadastrado' : 'Criar anúncio'}</h3>", inventory)
    s = inject(s,
        "const qs = new URLSearchParams({ page: '1', limit: '15', status: 'AVAILABLE' })",
        "const qs = new URLSearchParams({ limit: '25' })",
        inventory)
    s = inject(s,
        '`/crud/stock/vehicles?${qs}`',
        '`/crud/stock/advertisable-vehicles?${qs}`',
        inventory)
    s = inject(s,
        '<option value="">Selecione um veículo</option>',
        '<option value="">Selecione um veículo sem anúncio publicado</option>',
        inventory)
    s = inject(s,
        "{v.status === 'AVAILABLE' && <button disabled={!canWrite || busy} onClick={() => choose(v.id)}>Criar anúncio</button>}",
        "{v.status === 'AVAILABLE' && <button disabled={!canWrite || busy || v.published_ads > 0} onClick={() => choose(v.id)}>{v.published_ads > 0 ? 'Já anunciado' : 'Criar anúncio'}</button>}",
        inventory)
    s = inject(s,
        'status: string; mileage: number; active_ads: number',
        'status: string; mileage: number; active_ads: number; published_ads: number',
        inventory)
    changes[inventory] = s

# Add only published_ad count as a separate field, preserve existing active_ads.
stock = root / 'backend/src/modules/business/stock.routes.ts'
if not stock.exists():
    sys.exit('ERRO: stock.routes.ts nao encontrado; aplicar pacote anterior de gestao de estoque primeiro.')
s = stock.read_text(encoding='utf-8-sig')
if 'AS published_ads' not in s:
    old = "(SELECT COUNT(*)::int FROM public.advertisements a WHERE a.vehicle_id=v.id AND a.status IN ('PUBLISHED','PAUSED')) AS active_ads"
    new = old + ",\n          (SELECT COUNT(*)::int FROM public.advertisements a WHERE a.vehicle_id=v.id AND a.status='PUBLISHED') AS published_ads"
    s = inject(s, old, new, stock)
    changes[stock] = s

for file, content in changes.items():
    file.write_text(content, encoding='utf-8')
    print('[OK] Atualizado:', file.relative_to(root))
if not changes:
    print('[OK] Integracao ja aplicada; nenhum arquivo existente alterado.')
print('[OK] Cadastro de veiculos e selecao para anuncio conectados.')

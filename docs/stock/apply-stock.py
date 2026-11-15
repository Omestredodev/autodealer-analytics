"""Integra as rotas e o painel administrativo sem substituir os arquivos atuais.
Verifica todos os pontos de inserção antes de gravar; pode ser executado novamente.
"""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
routes_file = root / 'backend/src/modules/business/business.routes.ts'
audit_file = root / 'backend/src/modules/operations/audit-outbox.ts'
module_file = root / 'frontend/src/live/LiveModule.tsx'
for path in (routes_file, audit_file, module_file):
    if not path.exists():
        sys.exit(f'ERRO: arquivo necessário não encontrado: {path}')

changes = {}

def apply(old: str, needle: str, replacement: str, dest: Path) -> str:
    n = old.count(needle)
    if n != 1:
        sys.exit(f'ERRO: esperado exatamente um ponto de alteração em {dest}: {needle[:75]!r}; encontrados {n}. Nenhuma gravação realizada.')
    return old.replace(needle, replacement, 1)

backend = routes_file.read_text(encoding='utf-8')
if "import { stockRoutes } from './stock.routes';" not in backend:
    backend = apply(backend,
        "import { favoritesRoutes } from './favorites.routes';",
        "import { favoritesRoutes } from './favorites.routes';\nimport { stockRoutes } from './stock.routes';", routes_file)
    backend = apply(backend,
        "  await app.register(favoritesRoutes);",
        "  await app.register(favoritesRoutes);\n  await app.register(stockRoutes);", routes_file)
    changes[routes_file] = backend

outbox = audit_file.read_text(encoding='utf-8')
if "| 'ADVERTISEMENT_CREATED'" not in outbox:
    outbox = apply(outbox,
        "  | 'ADVERTISEMENT_ENDED';",
        "  | 'ADVERTISEMENT_ENDED'\n  | 'ADVERTISEMENT_CREATED'\n  | 'ADVERTISEMENT_UPDATED'\n  | 'ADVERTISEMENT_PUBLISHED'\n  | 'ADVERTISEMENT_PAUSED';", audit_file)
    changes[audit_file] = outbox

frontend = module_file.read_text(encoding='utf-8')
if 'import { LiveInventoryManager }' not in frontend:
    frontend = apply(frontend,
        "import { useResource } from './useResource'",
        "import { useResource } from './useResource'\nimport { LiveInventoryManager } from './LiveInventoryManager'", module_file)
    frontend = apply(frontend,
        '    <div className="live-toolbar">',
        "    {(name === 'Veículos' || name === 'Anúncios') && <LiveInventoryManager mode={name === 'Veículos' ? 'Veículos' : 'Anúncios'} onChanged={() => setRevision(value => value + 1)}/>}\n    <div className=\"live-toolbar\">", module_file)
    changes[module_file] = frontend

for path, new_content in changes.items():
    path.write_text(new_content, encoding='utf-8')
    print('[OK] Atualizado:', path.relative_to(root))
if not changes:
    print('[OK] Integração de gestão de estoque/anúncios já aplicada; nenhuma alteração adicional.')
print('[OK] Arquivos existentes preservados; rotas administrativas disponíveis sob /crud/stock.')

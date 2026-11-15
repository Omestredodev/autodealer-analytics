"""Patch conservador de navegação do App.tsx (não substitui o arquivo Figma)."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[2]
app = root / 'frontend' / 'src' / 'App.tsx'
if not app.is_file():
    sys.exit('ERRO: frontend/src/App.tsx não encontrado.')
source = app.read_text(encoding='utf-8')
if "import { LiveCustomersPanel }" in source:
    print('[OK] Navegação de Clientes/Vistorias já integrada.')
    sys.exit(0)

pairs = [
    (
        "import { LiveModule } from './live/LiveModule'",
        "import { LiveModule } from './live/LiveModule'\nimport { LiveCustomersPanel } from './live/LiveCustomersPanel'\nimport { LiveInspectionsPanel } from './live/LiveInspectionsPanel'",
    ),
    (
        "  { section: 'COMERCIAL', name: 'Veículos', icon: 'car' },",
        "  { section: 'COMERCIAL', name: 'Veículos', icon: 'car' },\n  { name: 'Vistorias', icon: 'audit' },",
    ),
    (
        "  { name: 'Leads', icon: 'users' },",
        "  { name: 'Leads', icon: 'users' },\n  { name: 'Clientes', icon: 'users' },",
    ),
    (
        "['Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active) ? 'Consulta integrada à API local.'",
        "['Veículos','Anúncios','Leads','Clientes','Vistorias','Agendamentos','Vendas','Auditoria'].includes(active) ? 'Consulta integrada à API local.'",
    ),
    (
        "!['Visão geral','Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active)",
        "!['Visão geral','Veículos','Anúncios','Leads','Clientes','Vistorias','Agendamentos','Vendas','Auditoria'].includes(active)",
    ),
    (
        "['Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active)\n              ? <LiveModule name={active}/>",
        "active === 'Clientes' ? <LiveCustomersPanel/> :\n            active === 'Vistorias' ? <LiveInspectionsPanel/> :\n            ['Veículos','Anúncios','Leads','Agendamentos','Vendas','Auditoria'].includes(active)\n              ? <LiveModule name={active}/>",
    ),
]
for original, replacement in pairs:
    count = source.count(original)
    if count != 1:
        sys.exit(f'ERRO: esperado 1 trecho para atualizar App.tsx, encontrado {count}: {original[:95]!r}. Nenhuma alteração foi feita.')
    source = source.replace(original, replacement, 1)
app.write_text(source, encoding='utf-8')
print('[OK] App.tsx atualizado, com menus Clientes e Vistorias e sem remover módulos anteriores.')

# Idempotente: inclui a nova tabela no schema para inicializações futuras.
schema = root / 'database' / 'cassandra' / 'schema.cql'
migration = root / 'database' / 'cassandra' / 'favorites.cql'
if schema.exists() and migration.exists():
    cql = schema.read_text(encoding='utf-8')
    if 'CREATE TABLE IF NOT EXISTS autodealer.favorites_by_user' not in cql:
        schema.write_text(cql.rstrip() + '\n\n' + migration.read_text(encoding='utf-8') + '\n', encoding='utf-8')
        print('[OK] Schema Cassandra atualizado para uma instalação nova.')

# AutoDealer Analytics — CRUD integrado aos processos de negócio

Substitui o antigo laboratório CRUD (clientes, notas, etiquetas no painel de telemetria) por:

- **Clientes (PostgreSQL):** cadastro, busca, edição, exclusão somente quando sem relações transacionais.
- **Vistorias (MongoDB):** checklist de lataria, mecânica, pneus e documentos; criação/edição/exclusão de rascunhos e aprovação final imutável. Coleção separada de `audit_events`.
- **Favoritos (Cassandra):** usuário demonstrativo pode favoritar veículos publicados, consultar favoritos, mudar prioridade e desfavoritar. Tabela por partição `user_id`, independente da telemetria.

## Instalação incremental (branch feat/crud-poliglota)

1. **Não faça merge ainda**. Mantenha Docker, API e dados existentes.
2. Extraia o ZIP na raiz do repo (`Expand-Archive -Force`).
3. Execute `py -3.12 .\docs\business\apply-navigation.py`. O script confere os marcadores antes de alterar o `App.tsx`; se não bater, aborta sem salvar.
4. Execute `powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\business\init-business.ps1` para criar as novas estruturas. Ele não reinicia volumes.
5. `backend/.env` local: `CRUD_DEMO_ENABLED=true` (não publicar o `.env`). Reinicie somente a API (`npm run dev` na pasta backend).
6. Valide:

```powershell
npm --prefix backend run check
npm --prefix backend run build
npm --prefix frontend run build
powershell -NoProfile -ExecutionPolicy Bypass -File .\docs\business\test-business.ps1
```

7. Navegue por **Clientes**, **Vistorias** no menu comercial; em **Ver site da concessionária** abra o catálogo e use o botão de favoritar e a área **Meus favoritos**.
8. Depois de validar, remova os antigos arquivos de laboratório sem uso (listados abaixo) somente se ainda existirem e você tiver conferido o `git diff`.

### Arquivos antigos a remover da branch (não são dados)

- `backend/src/modules/crud/crud.routes.ts`
- `backend/src/modules/crud/customers.routes.ts` (movido para `modules/business`)
- `backend/src/modules/crud/vehicle-notes.routes.ts`
- `backend/src/modules/crud/vehicle-tags.routes.ts`
- `frontend/src/live/LiveCrudPanel.tsx`
- `frontend/src/live/live-crud.css`
- `database/mongodb/crud_notes.js`
- `database/cassandra/crud_tags.cql`
- `docs/crud/` (documentação/scripts do laboratório antigo)

**Não execute `DROP COLLECTION`, `DROP TABLE`, `docker compose down -v` ou seeds:** as antigas estruturas podem permanecer no Docker sem interferir. A operação de remoção aqui é apenas dos arquivos obsoletos, com revisão prévia.

## Endpoints

| Banco | Criação | Leitura | Atualização | Exclusão |
|---|---|---|---|---|
| PostgreSQL | POST `/crud/customers` | GET `/crud/customers` | PATCH `/crud/customers/:id` | DELETE `/crud/customers/:id` |
| MongoDB | POST `/crud/inspections` | GET `/crud/inspections?vehicleId=UUID` | PATCH `/crud/inspections/:id` | DELETE `/crud/inspections/:id` (só rascunhos) |
| Cassandra | POST `/crud/favorites` | GET `/crud/favorites?userId=UUID` | PATCH `/crud/favorites/:userId/:vehicleId` | DELETE `/crud/favorites/:userId/:vehicleId` |

`GET /crud/demo-user` escolhe um usuário ativo do seed para a demonstração. Esse perfil não representa login real.

## Limitações e segurança

- Os novos recursos dependem da inicialização com `init-business.ps1`; o README principal deve incluir esse passo no roteiro de instalação nova.
- **Não há autenticação/autorização real.** A API somente deve ser usada localmente, com escrita demonstrativa habilitada conscientemente. Em implantação pública, é obrigatório implementar autenticação, escopo por usuário e controle de acesso.
- Cassandra usa RF=1 no laboratório: não há tolerância a falha de nó; a atualização com `IF EXISTS` usa LWT/condicional e pode custar mais do que update simples.
- Vistorias aprovadas não são editadas ou excluídas, preservando um histórico útil ao negócio.
- O catálogo público original ainda possui algumas telas Figma ilustrativas (ex.: cadastro de veículo); a entrega deve descrevê-las com precisão.
- **Status de validação:** os arquivos foram inspecionados e suas sintaxes devem ser verificadas nos builds do Windows; os testes reais só podem ser confirmados por você, após executar o script.

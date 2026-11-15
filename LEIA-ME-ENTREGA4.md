# AutoDealer Analytics — Entrega 4 (operações comerciais + auditoria MongoDB)

O ZIP contém **somente arquivos novos e a atualização de `backend/src/app.ts`**. Foi preparado para a branch `feat/backend-api` após o commit `33f8dcd`.

## 1) Conteúdo

- `database/postgresql/migrations/001_audit_outbox.sql` — cria tabela de outbox (migração aditiva, não apaga dados)
- `backend/src/modules/operations/operations.routes.ts` — listas, detalhes e PATCH de status para leads, appointments e sales
- `backend/src/modules/operations/audit-outbox.ts` — gravação transacional de eventos + entrega idempotente ao MongoDB
- `backend/src/scripts/replay-audit.ts` — reenvio manual dos eventos pendentes
- `backend/src/app.ts` — registra `operationsRoutes` junto dos módulos existentes
- `testar-operacoes-auditoria.ps1` — testes de leitura e opção `-Mutate` que muda dados do seed

## 2) Instalação (PowerShell)

Extraia o ZIP **na raiz do repositório** `C:\Projetos\autodealer-analytics`. Verifique antes o conteúdo do pacote, pois ele atualiza `backend/src/app.ts`.

```powershell
cd C:\Projetos\autodealer-analytics
# Copie o arquivo ZIP de Downloads para a raiz, ou use o caminho completo em Expand-Archive.
Expand-Archive -LiteralPath "$env:USERPROFILE\Downloads\autodealer-operacoes-auditoria.zip" -DestinationPath . -Force

docker cp .\database\postgresql\migrations\001_audit_outbox.sql autodealer-postgres:/tmp/001_audit_outbox.sql
docker exec autodealer-postgres psql -X -v ON_ERROR_STOP=1 -U postgres -d autodealer_analytics -f /tmp/001_audit_outbox.sql

cd .\backend
npm run check
npm run build
npm run dev
```

Em outro terminal PowerShell:

```powershell
cd C:\Projetos\autodealer-analytics
powershell -NoProfile -ExecutionPolicy Bypass -File .\testar-operacoes-auditoria.ps1
# Altera registros do seed e registra auditorias nos bancos:
powershell -NoProfile -ExecutionPolicy Bypass -File .\testar-operacoes-auditoria.ps1 -Mutate
```

Se o MongoDB estiver offline durante uma alteração, a resposta PATCH pode ser HTTP **202** (`audit.status=pending`), pois a alteração foi persistida no PostgreSQL e a outbox aguardará envio. Quando a conexão voltar, reenvie:

```powershell
cd C:\Projetos\autodealer-analytics\backend
npx tsx src/scripts/replay-audit.ts
```

O script processa até 100 eventos por execução. Repita enquanto houver pendências. **Não execute `docker compose down -v`.**

## 3) Endpoints

- `GET /leads?status=NEW&page=1&limit=20`
- `GET /leads/:id`
- `PATCH /leads/:id/status` com `{ "status": "IN_PROGRESS" }`
- `GET /appointments?status=SCHEDULED&page=1&limit=20`
- `GET /appointments/:id`
- `PATCH /appointments/:id/status` com `{ "status": "CONFIRMED" }`
- `GET /sales?status=PENDING&page=1&limit=20`
- `GET /sales/:id`
- `PATCH /sales/:id/status` com `{ "status": "COMPLETED" }` ou `{ "status": "CANCELLED" }`

### Regras de transição

- Leads: `NEW -> IN_PROGRESS/LOST`; `IN_PROGRESS -> CONVERTED/LOST`
- Agendamentos: `SCHEDULED -> CONFIRMED/CANCELLED`; `CONFIRMED -> COMPLETED/CANCELLED`
- Vendas: `PENDING -> COMPLETED/CANCELLED`
- Atualização para o mesmo status retorna `200` sem criar auditoria duplicada.
- Venda concluída atualiza veículo para `SOLD`, encerra anúncios não encerrados e grava eventos de auditoria de cada mudança.
- UUID inválido: `400`; registro inexistente: `404`; transição proibida ou veículo indisponível: `409`.
- O código usa transação PostgreSQL, `SELECT ... FOR UPDATE`, SQL parametrizado e outbox. **Não existe transação distribuída PostgreSQL/MongoDB**; reenvio é idempotente pelo índice único `eventId` no MongoDB.

## 4) Observações de segurança

Estes endpoints **não possuem autenticação/autorização**. Servem somente ao ambiente de demonstração local `127.0.0.1`, não devem ser expostos publicamente. Adicionar autenticação e perfis antes do uso real. `userId` não é aceito no corpo do PATCH para evitar falsificação de autoria; quando houver login, o backend deverá obtê-lo da sessão autenticada.

O teste `-Mutate` altera dados do seed. Faça backup do volume se precisar preservar exatamente seu conteúdo atual. **Não reexecute os seeds por cima de dados modificados**, pois podem não ser idempotentes.

## 5) Git, depois dos testes

```powershell
cd C:\Projetos\autodealer-analytics
git add backend/src/app.ts backend/src/modules/operations backend/src/scripts/replay-audit.ts database/postgresql/migrations/001_audit_outbox.sql testar-operacoes-auditoria.ps1 LEIA-ME-ENTREGA4.md
git diff --cached --check
git diff --cached --stat
git commit -m "feat(backend): add commercial status operations with audit outbox"
git push origin feat/backend-api
```

Não adicione pastas extraídas ou arquivos `.zip` ao commit. As credenciais `.env` devem continuar ignoradas.
